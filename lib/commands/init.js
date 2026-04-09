/**
 * Devran AI Kit — Init Command
 *
 * Installs .agent folder, generates IDE configurations and slash
 * command bridges, and configures .gitignore for the target project.
 *
 * Extracted from bin/kit.js to keep the CLI entry point under
 * 800 lines per project coding style.
 *
 * @module lib/commands/init
 * @since v5.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { TRANSIENT_FS_ERRORS } = require('../constants');
const { safeCopyDirSync, readJsonSafe } = require('../io');
const { USER_DATA_FILES, USER_DATA_DIRS } = require('../updater');

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Creates a timestamped backup of a directory.
 *
 * @param {string} dirPath - Directory to back up
 * @returns {string} Path to the backup directory
 */
function backupDirectory(dirPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dirPath}.backup-${timestamp}`;
  safeCopyDirSync(dirPath, backupPath);
  return backupPath;
}

/**
 * Checks if there is an active session with in-progress work.
 *
 * @param {string} agentPath - Path to existing .agent directory
 * @returns {boolean} True if session-state indicates active work
 */
function hasActiveSession(agentPath) {
  const statePath = path.join(agentPath, 'session-state.json');
  const state = readJsonSafe(statePath, null);
  if (!state) return false;
  return state.currentTask || state.inProgress || state.activeWorkflow;
}

/**
 * Counts markdown items in a directory.
 *
 * @param {string} dir - Directory to count
 * @param {'dir'|'file'} type - Count directories or files
 * @returns {number}
 */
function countItems(dir, type = 'dir') {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (type === 'dir') {
      return entries.filter(e => e.isDirectory()).length;
    }
    return entries.filter(e => e.isFile() && e.name !== 'README.md' && e.name.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

/**
 * Generates IDE-specific config files (Cursor, OpenCode, Codex).
 *
 * @param {string} agentPath - Path to installed .agent directory
 * @param {string} targetDir - Project root directory
 * @param {object} options - CLI options
 * @param {Function} log - Logging function
 */
function generateIdeConfigsForInit(agentPath, targetDir, options, log) {
  try {
    const { generateAllIdeConfigs, writeIdeConfigs, generateCursorConfig, generateOpenCodeConfig, generateCodexConfig } = require('../ide-generator');
    const manifest = JSON.parse(fs.readFileSync(path.join(agentPath, 'manifest.json'), 'utf-8'));
    const rulesContent = fs.readFileSync(path.join(agentPath, 'rules.md'), 'utf-8');

    const generatorMap = {
      cursor: () => generateCursorConfig(manifest, rulesContent),
      opencode: () => generateOpenCodeConfig(manifest),
      codex: () => generateCodexConfig(manifest),
    };

    let configs;
    if (options.ide && generatorMap[options.ide]) {
      configs = [generatorMap[options.ide]()];
    } else if (options.ide) {
      const supported = Object.keys(generatorMap).join(', ');
      log(`   ⚠️  Unknown IDE: "${options.ide}". Supported: ${supported}`, 'yellow');
      log('   Skipping IDE config generation.', 'yellow');
      return;
    } else {
      configs = generateAllIdeConfigs(manifest, rulesContent);
    }

    const result = writeIdeConfigs(targetDir, configs, { force: options.force, skipExisting: !options.force });
    for (const f of result.written) log(`   ✓ ${f}`, 'green');
    for (const f of result.skipped) log(`   ⏭ ${f} (already exists)`, 'yellow');
  } catch (err) {
    log(`   ⚠️  IDE config generation failed: ${err.message}`, 'yellow');
    log('   .agent/ installed successfully — IDE configs can be generated later', 'yellow');
  }
}

// ---------------------------------------------------------------------------
// Main init command
// ---------------------------------------------------------------------------

/**
 * Executes the `kit init` command.
 *
 * @param {object} options - CLI options
 * @param {object} ctx - CLI context (colors, log, logStep, showBanner, packageDir)
 */
function initCommand(options, ctx) {
  const { log, logStep, showBanner, colors, packageDir } = ctx;
  const AGENT_FOLDER = '.agent';
  const targetDir = options.path || process.cwd();
  const agentPath = path.join(targetDir, AGENT_FOLDER);
  const sourcePath = path.join(packageDir, AGENT_FOLDER);
  let detectedIDEs = ['claude']; // hoisted for worktree step access

  // Verify source .agent folder exists
  if (!fs.existsSync(sourcePath)) {
    log(`\n❌ Source .agent folder not found at: ${sourcePath}`, 'red');
    log('   The package may be corrupted. Try reinstalling:', 'yellow');
    log('   npm install -g @devran-ai/kit\n', 'yellow');
    process.exit(1);
  }

  if (!options.quiet) {
    showBanner();
  }

  // Check if already exists
  if (fs.existsSync(agentPath) && !options.force) {
    log(`\n⚠️  ${AGENT_FOLDER} folder already exists!`, 'yellow');
    log('   Use --force to overwrite', 'yellow');
    log('   Use kit update for non-destructive updates\n', 'yellow');
    process.exit(1);
  }

  // M-3: Active session warning for --force
  if (options.force && fs.existsSync(agentPath) && hasActiveSession(agentPath)) {
    log('\n⚠️  Active session detected! Force-overwrite will destroy in-progress work.', 'yellow');
    log('   Consider using kit update instead.\n', 'yellow');
  }

  if (options.dryRun) {
    log('\n🔍 Dry run mode - no changes will be made\n', 'cyan');
    log(`   Would copy: ${sourcePath}`, 'cyan');
    log(`   To: ${agentPath}\n`, 'cyan');
    // M-2: Show force damage preview
    if (options.force && fs.existsSync(agentPath)) {
      log('   ⚠️  --force would overwrite these user files (restored from backup):', 'yellow');
      for (const f of USER_DATA_FILES) {
        if (fs.existsSync(path.join(agentPath, f))) {
          log(`      • ${f}`, 'yellow');
        }
      }
      for (const d of USER_DATA_DIRS) {
        if (fs.existsSync(path.join(agentPath, d))) {
          log(`      • ${d}/ (directory)`, 'yellow');
        }
      }
      log('', 'reset');
    }
    return;
  }

  // Step-builder pattern — declarative pipeline
  let backupPath = null;
  /** @type {Array<{ label: string, fn: () => void }>} */
  const steps = [];

  // C-2: Auto-backup before force-overwrite
  if (options.force && fs.existsSync(agentPath)) {
    steps.push({
      label: 'Backing up existing .agent folder',
      fn() {
        try {
          backupPath = backupDirectory(agentPath);
          log(`   ✓ Backup created: ${path.basename(backupPath)}`, 'green');
        } catch (err) {
          log(`   ⚠️  Backup failed: ${err.message}`, 'yellow');
          log('   Proceeding without backup...', 'yellow');
        }
      },
    });
  }

  // C-3: Atomic copy via temp directory
  steps.push({
    label: 'Copying .agent folder',
    fn() {
      const tempPath = `${agentPath}.tmp-${Date.now()}`;
      try {
        safeCopyDirSync(sourcePath, tempPath);
        if (fs.existsSync(agentPath)) {
          fs.rmSync(agentPath, { recursive: true, force: true });
        }
        let renameAttempts = 0;
        const maxRenameAttempts = 3;
        while (renameAttempts < maxRenameAttempts) {
          try {
            fs.renameSync(tempPath, agentPath);
            break;
          } catch (renameErr) {
            const isTransient = TRANSIENT_FS_ERRORS.has(renameErr.code);
            renameAttempts++;
            if (!isTransient || renameAttempts >= maxRenameAttempts) {
              throw renameErr;
            }
            log(`   ⚠ File locked (${renameErr.code}), retrying... (${renameAttempts}/${maxRenameAttempts})`, 'yellow');
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
          }
        }
        log('   ✓ Copied successfully', 'green');
      } catch (err) {
        try {
          if (fs.existsSync(tempPath)) {
            fs.rmSync(tempPath, { recursive: true, force: true });
          }
        } catch { /* Cleanup failure is non-critical */ }
        log(`   ✗ Failed to copy: ${err.message}`, 'red');
        process.exit(1);
      }
    },
  });

  // E3: Restore user data files from backup after force-overwrite
  if (options.force && fs.existsSync(agentPath)) {
    steps.push({
      label: 'Restoring user session data from backup',
      fn() {
        if (!backupPath) { log('   ○ No backup to restore from', 'yellow'); return; }
        let restoredCount = 0;

        for (const file of USER_DATA_FILES) {
          const backupFile = path.join(backupPath, file);
          const targetFile = path.join(agentPath, file);
          if (fs.existsSync(backupFile)) {
            const targetDirPath = path.dirname(targetFile);
            if (!fs.existsSync(targetDirPath)) {
              fs.mkdirSync(targetDirPath, { recursive: true });
            }
            fs.copyFileSync(backupFile, targetFile);
            log(`   ✓ Restored ${file}`, 'green');
            restoredCount++;
          }
        }

        for (const dir of USER_DATA_DIRS) {
          const backupDir = path.join(backupPath, dir);
          const targetDirPath = path.join(agentPath, dir);
          if (fs.existsSync(backupDir)) {
            safeCopyDirSync(backupDir, targetDirPath);
            log(`   ✓ Restored ${dir}/`, 'green');
            restoredCount++;
          }
        }

        if (restoredCount === 0) {
          log('   ○ No user data to restore', 'yellow');
        }
      },
    });
  }

  // Verify installation
  steps.push({
    label: 'Verifying installation',
    fn() {
      const skills = countItems(path.join(agentPath, 'skills'), 'dir');
      const commands = countItems(path.join(agentPath, 'commands'), 'file');
      const workflows = countItems(path.join(agentPath, 'workflows'), 'file');
      log(`   ✓ Skills: ${skills}, Commands: ${commands}, Workflows: ${workflows}`, 'green');
    },
  });

  // Generate IDE configurations (Cursor, OpenCode, Codex)
  if (!options.skipIde) {
    steps.push({
      label: 'Generating IDE configurations',
      fn() {
        generateIdeConfigsForInit(agentPath, targetDir, options, log);
      },
    });
  }

  // Generate slash command bridges for detected IDEs
  if (!options.skipCommands) {
    steps.push({
      label: 'Generating slash commands',
      fn() {
        try {
          const { generateCommandBridges } = require('../command-bridge');
          const { writeBridgeConfigs } = require('../ide-generator');
          const manifest = readJsonSafe(path.join(agentPath, 'manifest.json'), {});
          const bridges = generateCommandBridges(agentPath, manifest, {
            ide: options.ide,
            projectRoot: targetDir,
          });

          const allConfigs = Object.values(bridges).filter(v => v && v.files);
          const result = writeBridgeConfigs(targetDir, allConfigs, { force: options.force });

          detectedIDEs = bridges.detectedIDEs;
          log(`   ✓ ${result.written.length} command bridges generated (${bridges.detectedIDEs.join(', ')})`, 'green');
          if (result.skipped.length > 0) {
            log(`   ⏭ ${result.skipped.length} already exist`, 'yellow');
          }
          if (result.skippedUserFiles.length > 0) {
            log(`   ⚠ ${result.skippedUserFiles.length} user commands preserved (not Kit-generated)`, 'yellow');
          }
          for (const w of bridges.warnings) log(`   ⚠ ${w}`, 'yellow');
        } catch (err) {
          log(`   ⚠️  Slash command generation failed: ${err.message}`, 'yellow');
        }
      },
    });
  }

  // Worktree support (.worktreeinclude + post-checkout hook)
  if (!options.skipWorktree) {
    steps.push({
      label: 'Configuring worktree support',
      fn() {
        // If --skip-commands was used, detect IDEs independently
        if (options.skipCommands && detectedIDEs.length <= 1) {
          try {
            const { detectIDEs } = require('../command-bridge');
            detectedIDEs = detectIDEs(targetDir);
          } catch { /* fallback to default */ }
        }
        const { generateWorktreeInclude, installPostCheckoutHook } = require('../worktree');
        try {
          const result = generateWorktreeInclude(targetDir, detectedIDEs);
          if (result.created) {
            log('   ✓ .worktreeinclude generated for Claude Code', 'green');
          } else if (result.reason === 'updated') {
            log('   ✓ .worktreeinclude updated', 'green');
          } else if (result.reason === 'appended') {
            log('   ✓ Entries added to existing .worktreeinclude', 'green');
          }
        } catch (err) {
          log(`   ⚠️  Could not generate .worktreeinclude: ${err.message}`, 'yellow');
        }
        try {
          const hookResult = installPostCheckoutHook(targetDir);
          if (hookResult.installed) {
            log('   ✓ post-checkout hook installed for git worktree support', 'green');
          } else if (hookResult.reason === 'user-hook-exists') {
            log('   ℹ post-checkout hook exists (user-managed) — skipped', 'cyan');
          }
        } catch (err) {
          log(`   ⚠️  Could not install post-checkout hook: ${err.message}`, 'yellow');
        }
      },
    });
  }

  // Gitignore configuration
  if (!options.shared) {
    steps.push({
      label: 'Configuring .gitignore',
      fn() {
        const { addToGitignore, cleanupLegacyClaudeTracking, narrowBlanketClaudeIgnore } = require('../io');
        const { execSync } = require('child_process');

        // Step 1: Narrow blanket .claude/ → .claude/commands/ for CLI discovery
        try {
          const narrowResult = narrowBlanketClaudeIgnore(targetDir);
          if (narrowResult.narrowed) {
            log('   ✓ Narrowed .claude/ to .claude/commands/ for CLI discovery', 'green');
          }
        } catch (err) {
          log(`   ⚠️  Could not narrow .claude/ pattern: ${err.message}`, 'yellow');
        }

        // Step 2: Clean up legacy .claude/* + !.claude/commands/ from Kit v5.2.0
        try {
          const cleanupResult = cleanupLegacyClaudeTracking(targetDir);
          if (cleanupResult.cleaned) {
            log('   ✓ Cleaned up legacy .claude/* tracking pattern', 'green');
          }
        } catch (err) {
          log(`   ⚠️  Could not clean up legacy gitignore: ${err.message}`, 'yellow');
        }

        // Step 3: Add any missing gitignore entries
        try {
          const result = addToGitignore(targetDir, detectedIDEs);
          if (result.added) {
            const entries = result.entries || [];
            for (const entry of entries) {
              log(`   ✓ ${entry} added to .gitignore`, 'green');
            }
          } else {
            log('   ✓ .gitignore already configured', 'green');
          }
        } catch (err) {
          log(`   ⚠️  Could not update .gitignore: ${err.message}`, 'yellow');
        }

        // Detect if .claude/commands/ files are still git-tracked
        try {
          const trackedClaude = execSync('git ls-files .claude/commands/', {
            cwd: targetDir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
          }).trim();
          if (trackedClaude.length > 0) {
            log('', 'reset');
            log('   ⚠️  .claude/commands/ has files tracked by git from a previous Kit version.', 'yellow');
            log('   Run this to untrack (keeps local files):', 'yellow');
            log(`   ${colors.cyan}git rm -r --cached .claude/commands/${colors.reset}`, 'reset');
          }
        } catch {
          // Not a git repo or git not available
        }

        // Detect if .agent/ is still git-tracked despite being gitignored
        try {
          const tracked = execSync('git ls-files .agent/', { cwd: targetDir, encoding: 'utf-8' }).trim();
          if (tracked.length > 0) {
            log('', 'reset');
            log('   ⚠️  .agent/ is gitignored but still tracked by git.', 'yellow');
            log('   Run this to untrack (keeps local files):', 'yellow');
            log(`   ${colors.cyan}git rm -r --cached .agent/${colors.reset}`, 'reset');
          }
        } catch {
          // Not a git repo or git not available — skip hint
        }
      },
    });
  } else {
    steps.push({
      label: 'Shared mode — .agent/ will be committed',
      fn() {
        log('   ℹ .gitignore not modified (--shared flag)', 'cyan');
      },
    });
  }

  // Execute all steps with auto-numbered labels
  for (let i = 0; i < steps.length; i++) {
    logStep(`${i + 1}/${steps.length}`, `${steps[i].label}...`);
    steps[i].fn();
  }

  // Final message
  logStep('✓', 'Setup complete!');

  if (!options.quiet) {
    console.log(`
${colors.green}Devran AI Kit installed successfully.${colors.reset}

${colors.bright}Next steps:${colors.reset}
  1. Open your project in an AI-powered IDE
  2. Run ${colors.cyan}/project_status${colors.reset} to verify
  3. Use ${colors.cyan}/help${colors.reset} to see available commands

${colors.bright}Validate your installation:${colors.reset}
  ${colors.cyan}kit verify${colors.reset}   Manifest integrity check
  ${colors.cyan}kit scan${colors.reset}     Security scan

${colors.bright}Quick start:${colors.reset}
  ${colors.cyan}/plan${colors.reset}       Create implementation plan
  ${colors.cyan}/implement${colors.reset}  Execute the plan
  ${colors.cyan}/verify${colors.reset}     Run quality gates

${colors.yellow}📚 Documentation: https://github.com/devran-ai/kit${colors.reset}
`);
  }
}

module.exports = Object.freeze({
  initCommand,
  backupDirectory,
  hasActiveSession,
  countItems,
});
