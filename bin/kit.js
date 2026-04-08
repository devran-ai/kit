#!/usr/bin/env node

/**
 * Devran AI Kit CLI
 *
 * Usage:
 *   npx @devran-ai/kit init
 *   kit init [options]
 *
 * @author Emre Dursun
 * @license MIT
 */

const fs = require('fs');
const path = require('path');

const VERSION = require('../package.json').version;
const AGENT_FOLDER = '.agent';
const { safeCopyDirSync, readJsonSafe } = require('../lib/io');
const { TRANSIENT_FS_ERRORS } = require('../lib/constants');
const { USER_DATA_FILES, USER_DATA_DIRS } = require('../lib/updater');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function loadBannerCounts() {
  try {
    const manifestPath = path.join(__dirname, '..', AGENT_FOLDER, 'manifest.json');
    const manifest = readJsonSafe(manifestPath, null);
    if (manifest?.capabilities) {
      return {
        agents: manifest.capabilities.agents?.count || 19,
        skills: manifest.capabilities.skills?.count || 32,
        commands: manifest.capabilities.commands?.count || 31,
        workflows: manifest.capabilities.workflows?.count || 14,
      };
    }
  } catch { /* fallback to defaults */ }
  return { agents: 19, skills: 32, commands: 31, workflows: 14 };
}

function showBanner() {
  const counts = loadBannerCounts();
  console.log(`
${colors.bright}${colors.blue}Devran AI Kit${colors.reset} ${colors.green}v${VERSION}${colors.reset}
Trust-grade AI development framework

   ${counts.agents} Agents  |  ${counts.skills} Skills  |  ${counts.commands} Commands  |  ${counts.workflows} Workflows
`);
}

function showHelp() {
  showBanner();
  console.log(`
${colors.bright}Usage:${colors.reset}
  kit init [options]        Install .agent folder to your project
  kit update                Update to latest version
  kit status                Check installation status (alias: dashboard)
  kit verify                Run manifest integrity checks
  kit scan                  Run security scan
  kit plugin list           List installed plugins
  kit plugin install <p>    Install plugin from directory
  kit plugin remove <n>     Remove installed plugin
  kit market search <q>     Search marketplace plugins
  kit market info <name>    Get marketplace plugin details
  kit market install <n>    Install from marketplace
  kit heal [--file <f>]     Detect and diagnose CI failures
  kit health                Run aggregated health check
  kit sync-bot-commands     Sync workflows to Telegram bot menu
                            [--scope <type>] [--token <t>] [--dry-run]
                            [--clear] (delete commands from scope(s))
  kit --help                Show this help message
  kit --version             Show version

${colors.bright}Options:${colors.reset}
  --force                   Overwrite existing .agent folder
  --path <dir>              Install to specific directory
  --quiet                   Suppress output (for CI/CD)
  --dry-run                 Preview actions without executing
  --apply                   Apply self-healing patches (default: dry-run)
  --file <path>             CI log file for heal command
  --ide <name>              Generate config for single IDE or comma-separated list
                            (claude,cursor,opencode,codex,vscode,windsurf,all)
  --skip-ide                Skip IDE config generation
  --skip-commands           Skip slash command bridge generation
  --skip-worktree           Skip worktree support (.worktreeinclude + post-checkout hook)
  --shared                  Commit .agent/ to repo (team mode — skip .gitignore)

${colors.bright}Examples:${colors.reset}
  npx @devran-ai/kit init
  kit init --force
  kit scan
  kit plugin list

${colors.bright}IDE Reference:${colors.reset}
  Type ${colors.cyan}/help${colors.reset} in your AI-powered IDE for the full reference:
  commands, workflows, agents, skills, rules, and checklists.
`);
}

// Init command extracted to lib/commands/init.js for file size compliance (<800 lines)
const { initCommand: initCommandImpl, countItems, hasActiveSession } = require('../lib/commands/init');

function initCommand(options) {
  initCommandImpl(options, {
    log,
    logStep,
    showBanner,
    colors,
    packageDir: path.join(__dirname, '..'),
  });
}

function statusCommand() {
  showBanner();
  
  const agentPath = path.join(process.cwd(), AGENT_FOLDER);
  
  if (!fs.existsSync(agentPath)) {
    log('❌ Not installed in current directory', 'red');
    log('   Run: kit init\n', 'yellow');
    return;
  }
  
  log('Devran AI Kit is installed\n', 'green');
  
  const skills = countItems(path.join(agentPath, 'skills'), 'dir');
  const commands = countItems(path.join(agentPath, 'commands'), 'file');
  const workflows = countItems(path.join(agentPath, 'workflows'), 'file');
  
  log('   ═══ Capabilities ═══', 'cyan');
  console.log(`   📦 Skills:    ${skills}`);
  console.log(`   ⌨️  Commands:  ${commands}`);
  console.log(`   🔄 Workflows: ${workflows}`);
  
  // Workflow phase + available transitions
  try {
    const workflowEngine = require('../lib/workflow-engine');
    const phase = workflowEngine.getCurrentPhase(process.cwd());
    const available = workflowEngine.getAvailableTransitions(process.cwd());
    console.log(`   🔁 Phase:     ${phase}`);
    if (available.length > 0) {
      const nextPhases = available.map((t) => t.to).join(', ');
      console.log(`   ➡️  Next:      ${nextPhases}`);
    }
  } catch {
    // Engine not available, skip silently
  }
  
  // Error budget
  try {
    const errorBudget = require('../lib/error-budget');
    const report = errorBudget.getBudgetReport(process.cwd());
    const statusIcon = report.status === 'HEALTHY' ? '🟢' : report.status === 'WARNING' ? '🟡' : '🔴';
    console.log(`   ${statusIcon} Budget:   ${report.status}`);
    if (report.violations.length > 0) {
      log(`   ⚠️  Violations: ${report.violations.join(', ')}`, 'yellow');
    }
  } catch {
    // Budget not available, skip silently
  }
  
  // Task metrics
  try {
    const taskModel = require('../lib/task-model');
    const metrics = taskModel.getTaskMetrics(process.cwd());
    if (metrics.total > 0) {
      console.log('');
      log('   ═══ Tasks ═══', 'cyan');
      console.log(`   📋 Open:        ${metrics.counts.open || 0}`);
      console.log(`   🔨 In Progress: ${metrics.counts['in-progress'] || 0}`);
      console.log(`   👁️  In Review:   ${metrics.counts.review || 0}`);
      console.log(`   ✅ Done:        ${metrics.counts.done || 0}`);
      console.log(`   🚫 Blocked:     ${metrics.counts.blocked || 0}`);
      if (metrics.completionRate > 0) {
        console.log(`   📊 Completion:  ${metrics.completionRate}%`);
      }
    }
  } catch {
    // Task model not available, skip silently
  }
  
  // Hook readiness
  try {
    const hookSystem = require('../lib/hook-system');
    const hookReport = hookSystem.getHookReport(process.cwd());
    console.log('');
    log('   ═══ Hooks ═══', 'cyan');
    console.log(`   🪝 Events:    ${hookReport.events.length}`);
    console.log(`   ✅ Ready:     ${hookReport.readyCount}/${hookReport.events.length}`);
  } catch {
    // Hook system not available, skip silently
  }
  
  // Developer identity
  try {
    const identity = require('../lib/identity');
    const current = identity.getCurrentIdentity(process.cwd());
    if (current) {
      console.log('');
      log('   ═══ Identity ═══', 'cyan');
      console.log(`   👤 Developer: ${current.name}`);
      console.log(`   🔑 Role:      ${current.role}`);
    }
  } catch {
    // Identity not available, skip silently
  }
  
  // Plugins
  try {
    const pluginSystem = require('../lib/plugin-system');
    const plugins = pluginSystem.listPlugins(process.cwd());
    if (plugins.length > 0) {
      console.log('');
      log('   ═══ Plugins ═══', 'cyan');
      console.log(`   🔌 Installed: ${plugins.length}`);
      for (const plugin of plugins) {
        console.log(`      • ${plugin.name} v${plugin.version}`);
      }
    }
  } catch {
    // Plugin system not available, skip silently
  }
  
  // Phase 4 dashboard sections (D-5, E-5)
  try {
    const cliCommands = require('../lib/cli-commands');
    cliCommands.renderDashboardSections(process.cwd());
  } catch {
    // Phase 4 modules not available, skip silently
  }
  
  console.log('');
}

function verifyCommand() {
  showBanner();
  logStep('1/1', 'Running manifest integrity checks...\n');

  try {
    const verify = require('../lib/verify');
    const report = verify.runAllChecks(process.cwd());

    for (const result of report.results) {
      const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
      const color = result.status === 'pass' ? 'green' : result.status === 'fail' ? 'red' : 'yellow';
      log(`   ${icon} ${result.message}`, color);
    }

    console.log('');
    log(`   Passed: ${report.passed}  Failed: ${report.failed}  Warnings: ${report.warnings}`, report.failed > 0 ? 'red' : 'green');
    console.log('');

    if (report.failed > 0) {
      process.exit(1);
    }
  } catch (/** @type {any} */ error) {
    log(`   ✗ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function updateCommand(updateOptions) {
  showBanner();

  const agentPath = path.join(updateOptions.path || process.cwd(), '.agent');
  if (!fs.existsSync(agentPath)) {
    log('\n❌ No .agent/ folder found. Run: kit init\n', 'red');
    process.exit(1);
  }

  const sourceRoot = path.join(__dirname, '..');
  const targetRoot = updateOptions.path || process.cwd();

  try {
    const updater = require('../lib/updater');
    const isDryRun = updateOptions.dryRun;

    // M-1: Show version transition (use source kit version, not CLI version)
    const sourcePackage = readJsonSafe(path.join(sourceRoot, 'package.json'), {});
    const kitVersion = sourcePackage.version || VERSION;
    const currentManifest = readJsonSafe(path.join(agentPath, 'manifest.json'), {});
    const currentVersion = currentManifest.kitVersion || 'unknown';
    if (currentVersion !== kitVersion) {
      log(`\n   📦 Upgrading: v${currentVersion} → v${kitVersion}`, 'cyan');
    }

    if (isDryRun) {
      log('\n🔍 Dry run mode — no changes will be made\n', 'cyan');
    }

    logStep('1/2', isDryRun ? 'Analyzing differences...' : 'Applying updates...');

    const report = updater.applyUpdate(sourceRoot, targetRoot, isDryRun);

    if (report.added.length > 0) {
      log(`\n   📁 New files (${report.added.length}):`, 'green');
      for (const file of report.added) {
        log(`      + ${file}`, 'green');
      }
    }

    if (report.updated.length > 0) {
      log(`\n   📝 Updated files (${report.updated.length}):`, 'cyan');
      for (const file of report.updated) {
        log(`      ~ ${file}`, 'cyan');
      }
    }

    if (report.skipped.length > 0) {
      log(`\n   🔒 Preserved files (${report.skipped.length}):`, 'yellow');
      for (const file of report.skipped) {
        log(`      ○ ${file}`, 'yellow');
      }
    }

    logStep('2/2', 'Summary');
    console.log(`\n   Added: ${report.added.length}  Updated: ${report.updated.length}  Skipped: ${report.skipped.length}  Unchanged: ${report.unchanged.length}\n`);

    if (report.added.length === 0 && report.updated.length === 0) {
      log('   ✅ Already up to date!\n', 'green');
    } else if (!isDryRun) {
      log('   ✅ Update complete!\n', 'green');
    }
  } catch (/** @type {any} */ error) {
    log(`   ✗ Update failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function scanCommand() {
  showBanner();
  logStep('1/1', 'Running enhanced security scan...\n');

  try {
    const scanner = require('../lib/security-scanner');
    const report = scanner.getSecurityReport(process.cwd());

    log(`   📂 Files scanned: ${report.filesScanned}`, 'cyan');
    console.log('');

    if (report.findings.length === 0) {
      log('   ✅ No security findings — all clear!\n', 'green');
    } else {
      for (const finding of report.findings) {
        const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : finding.severity === 'medium' ? '🟡' : '⚪';
        log(`   ${icon} [${finding.severity.toUpperCase()}] ${finding.detail}`, finding.severity === 'critical' ? 'red' : finding.severity === 'high' ? 'yellow' : 'reset');
        console.log(`      File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
      }
      console.log('');
    }

    log(`   🔴 Critical: ${report.criticalCount}  🟠 High: ${report.highCount}  🟡 Medium: ${report.mediumCount}  ⚪ Low: ${report.lowCount}`, report.clean ? 'green' : 'red');
    console.log('');

    if (!report.clean) {
      process.exit(1);
    }
  } catch (/** @type {any} */ error) {
    log(`   ✗ Security scan failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function pluginCommand(subCommand, pluginArg) {
  showBanner();

  try {
    const pluginSystem = require('../lib/plugin-system');

    switch (subCommand) {
      case 'list': {
        const plugins = pluginSystem.listPlugins(process.cwd());
        if (plugins.length === 0) {
          log('   No plugins installed\n', 'yellow');
        } else {
          log(`   ═══ Installed Plugins (${plugins.length}) ═══\n`, 'cyan');
          for (const plugin of plugins) {
            console.log(`   🔌 ${plugin.name} v${plugin.version}`);
            console.log(`      Author: ${plugin.author}`);
            console.log(`      Installed: ${plugin.installedAt}`);
            console.log('');
          }
        }
        break;
      }
      case 'install': {
        if (!pluginArg) {
          log('   ✗ Usage: kit plugin install <path>\n', 'red');
          process.exit(1);
        }
        const pluginPath = path.resolve(pluginArg);
        logStep('1/1', `Installing plugin from ${pluginPath}...`);
        const result = pluginSystem.installPlugin(pluginPath, process.cwd());
        if (result.success) {
          log('\n   ✅ Plugin installed successfully!', 'green');
          console.log(`      Agents: ${result.installed.agents}  Skills: ${result.installed.skills}  Workflows: ${result.installed.workflows}  Hooks: ${result.installed.hooks}\n`);
        } else {
          log('\n   ✗ Plugin installation failed:', 'red');
          for (const error of result.errors) {
            log(`      • ${error}`, 'red');
          }
          console.log('');
          process.exit(1);
        }
        break;
      }
      case 'remove': {
        if (!pluginArg) {
          log('   ✗ Usage: kit plugin remove <name>\n', 'red');
          process.exit(1);
        }
        logStep('1/1', `Removing plugin: ${pluginArg}...`);
        const result = pluginSystem.removePlugin(pluginArg, process.cwd());
        if (result.success) {
          log('\n   ✅ Plugin removed successfully!\n', 'green');
        } else {
          log(`\n   ✗ ${result.error}\n`, 'red');
          process.exit(1);
        }
        break;
      }
      default:
        log('   Usage: kit plugin <list|install|remove>', 'yellow');
        console.log('');
        break;
    }
  } catch (/** @type {any} */ error) {
    log(`   ✗ Plugin command failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];

const options = {
  force: args.includes('--force'),
  quiet: args.includes('--quiet'),
  dryRun: args.includes('--dry-run'),
  apply: args.includes('--apply'),
  skipIde: args.includes('--skip-ide'),
  skipCommands: args.includes('--skip-commands'),
  shared: args.includes('--shared'),
  skipWorktree: args.includes('--skip-worktree'),
  ide: null,
  path: null,
  file: null,
};

// Parse --ide option
const ideIndex = args.indexOf('--ide');
if (ideIndex !== -1 && args[ideIndex + 1]) {
  options.ide = args[ideIndex + 1].toLowerCase();
}

// Parse --path option with traversal protection (H-7: use path.resolve boundary check)
const pathIndex = args.indexOf('--path');
if (pathIndex !== -1 && args[pathIndex + 1]) {
  const resolvedPath = path.resolve(args[pathIndex + 1]);
  const cwd = process.cwd();
  if (!resolvedPath.startsWith(cwd + path.sep) && resolvedPath !== cwd) {
    log('Error: --path must resolve within current working directory', 'red');
    process.exit(1);
  }
  options.path = resolvedPath;
}

// Parse --file option with traversal protection (H-7: use path.resolve boundary check)
const fileIndex = args.indexOf('--file');
if (fileIndex !== -1 && args[fileIndex + 1]) {
  const resolvedFile = path.resolve(args[fileIndex + 1]);
  const cwdForFile = process.cwd();
  if (!resolvedFile.startsWith(cwdForFile + path.sep) && resolvedFile !== cwdForFile) {
    log('Error: --file must resolve within current working directory', 'red');
    process.exit(1);
  }
  options.file = resolvedFile;
}

// Execute command
switch (command) {
  case 'init':
    initCommand(options);
    break;
  case 'status':
  case 'dashboard':
    statusCommand();
    break;
  case 'update':
    updateCommand(options);
    break;
  case 'verify':
    verifyCommand();
    break;
  case 'scan':
    scanCommand();
    break;
  case 'plugin':
    pluginCommand(args[1], args[2]);
    break;
  case 'market': {
    const cliCommands = require('../lib/cli-commands');
    cliCommands.marketCommand(process.cwd(), args[1], args[2], options);
    break;
  }
  case 'heal': {
    const cliCmd = require('../lib/cli-commands');
    cliCmd.healCommand(process.cwd(), { file: options.file, apply: options.apply });
    break;
  }
  case 'health': {
    const cliHealth = require('../lib/cli-commands');
    const result = cliHealth.healthCommand(process.cwd());
    if (!result.healthy) {
      process.exit(1);
    }
    break;
  }
  case 'sync-bot-commands': {
    showBanner();
    const telegramSync = require('../lib/telegram-sync');

    // --guard: restore cached commands to private chat (lightweight re-sync)
    if (args.includes('--guard')) {
      logStep('1/1', 'Restoring menu from cache...');
      (async () => {
        try {
          const tokenIdx = args.indexOf('--token');
          const guardOpts = tokenIdx !== -1 ? { token: args[tokenIdx + 1] } : {};
          const result = await telegramSync.guardPrivateChat(guardOpts);
          if (result.success) {
            log(`   ✅ ${result.message}\n`, 'green');
          } else {
            log(`   ⚠️  ${result.message}\n`, 'yellow');
            process.exit(1);
          }
        } catch (err) {
          log(`   ✗ Guard failed: ${err?.message || String(err)}`, 'red');
          process.exit(1);
        }
      })();
      break;
    }

    // --install-guard: install SessionStart hook in global settings
    if (args.includes('--install-guard')) {
      logStep('1/2', 'Installing SessionStart guard hook...');
      const guardPath = path.resolve(__dirname, '..', 'lib', 'telegram-menu-guard.js');

      if (!fs.existsSync(guardPath)) {
        log(`   ✗ Guard script not found: ${guardPath}`, 'red');
        process.exit(1);
      }

      const settingsPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'settings.json');
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        const hookCommand = `node "${guardPath.replace(/\\/g, '\\\\')}"`;

        // Check if already installed
        const sessionHooks = settings.hooks?.SessionStart || [];
        const alreadyInstalled = sessionHooks.some(entry =>
          entry.hooks?.some(h => h.command?.includes('telegram-menu-guard'))
        );

        if (alreadyInstalled) {
          logStep('2/2', 'Guard hook already installed');
          log('   ✅ SessionStart guard is active\n', 'green');
          break;
        }

        // Add the guard hook
        if (!settings.hooks) settings.hooks = {};
        if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

        settings.hooks.SessionStart.push({
          matcher: '*',
          hooks: [{
            type: 'command',
            command: hookCommand,
          }],
        });

        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

        logStep('2/2', 'Guard hook installed');
        log(`   ✅ SessionStart hook added to ${settingsPath}`, 'green');
        log('   Menu will auto-restore on every new session\n', 'cyan');

        // Also ensure cache exists
        const cache = telegramSync.readCachedCommands();
        if (!cache) {
          log('   ⚠️  No command cache found. Running sync to create cache...\n', 'yellow');
          (async () => {
            try {
              const syncResult = await telegramSync.syncBotCommands(process.cwd());
              if (syncResult.success) {
                log(`   ✅ Cache created with ${syncResult.commands.length} commands\n`, 'green');
              }
            } catch (syncErr) {
              log(`   ⚠️  Cache creation failed: ${syncErr?.message || String(syncErr)}`, 'yellow');
            }
          })();
        }
      } catch (err) {
        log(`   ✗ Failed to install guard: ${err?.message || String(err)}`, 'red');
        process.exit(1);
      }
      break;
    }

    // Standard sync flow
    const tokenIdx = args.indexOf('--token');
    if (tokenIdx !== -1 && !args[tokenIdx + 1]) {
      log('Error: --token requires a value', 'red');
      process.exit(1);
    }
    const limitIdx = args.indexOf('--limit');
    if (limitIdx !== -1) {
      const lv = parseInt(args[limitIdx + 1], 10);
      if (isNaN(lv) || lv < 1 || lv > telegramSync.MAX_COMMANDS) {
        log(`Error: --limit must be 1-${telegramSync.MAX_COMMANDS}`, 'red');
        process.exit(1);
      }
    }
    const sourceIdx = args.indexOf('--source');
    if (sourceIdx !== -1 && !['workflows', 'commands', 'both'].includes(args[sourceIdx + 1])) {
      log('Error: --source must be workflows|commands|both', 'red');
      process.exit(1);
    }
    const scopeIdx = args.indexOf('--scope');
    if (scopeIdx !== -1 && !telegramSync.VALID_SCOPES.includes(args[scopeIdx + 1])) {
      log(`Error: --scope must be ${telegramSync.VALID_SCOPES.join('|')}`, 'red');
      process.exit(1);
    }
    const syncOptions = {
      token: tokenIdx !== -1 ? args[tokenIdx + 1] : undefined,
      limit: limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined,
      source: sourceIdx !== -1 ? args[sourceIdx + 1] : 'workflows',
      scope: scopeIdx !== -1 ? args[scopeIdx + 1] : undefined,
      dryRun: args.includes('--dry-run'),
      clear: args.includes('--clear'),
    };

    logStep('1/2', syncOptions.clear ? 'Clearing commands...' : 'Scanning workflows...');
    (async () => {
      try {
        const result = await telegramSync.syncBotCommands(process.cwd(), syncOptions);

        if (result.commands.length > 0) {
          log(`\n   Commands (${result.commands.length}):`, 'cyan');
          for (const cmd of result.commands) {
            const desc = cmd.description.length > 60 ? cmd.description.slice(0, 60) + '...' : cmd.description;
            log(`   /${cmd.command} — ${desc}`, 'reset');
          }
          console.log('');
        }

        logStep('2/2', result.message);

        if (result.scopeResults && result.scopeResults.length > 0) {
          for (const sr of result.scopeResults) {
            const icon = sr.success ? 'OK' : 'FAIL';
            const clr = sr.success ? 'green' : 'red';
            log(`   [${icon}] ${sr.scope}: ${sr.message}`, clr);
          }
        }
        console.log('');

        if (result.success) {
          const icon = syncOptions.dryRun ? '🔍' : '✅';
          const clr = syncOptions.dryRun ? 'cyan' : 'green';
          log(`   ${icon} ${result.message}\n`, clr);
        } else {
          log(`   ⚠️  ${result.message}\n`, 'yellow');
          if (!syncOptions.clear && !syncOptions.token && !telegramSync.readBotToken()) {
            log('   Provide a bot token:', 'yellow');
            log('   kit sync-bot-commands --token <BOT_TOKEN>', 'cyan');
            log('   Or set TELEGRAM_BOT_TOKEN environment variable\n', 'cyan');
          }
          process.exit(1);
        }
      } catch (err) {
        log(`   ✗ Sync failed: ${err?.message || String(err)}`, 'red');
        process.exit(1);
      }
    })();
    break;
  }
  case '--version':
  case '-v':
    console.log(VERSION);
    break;
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
  default:
    log(`Unknown command: ${command}`, 'red');
    log('Run kit --help for usage\n', 'yellow');
    process.exit(1);
}
