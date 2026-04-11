/**
 * Devran AI Kit — Shared I/O Utilities
 *
 * Provides atomic file write operations and safe JSON parsing
 * used across all runtime modules. Single point for error
 * handling around filesystem operations.
 *
 * @module lib/io
 * @author Emre Dursun
 * @since v3.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const { TRANSIENT_FS_ERRORS } = require('./constants');
const log = createLogger('io');

/**
 * Writes JSON data to a file atomically (temp file + rename).
 * Creates parent directories if they don't exist.
 *
 * @param {string} filePath - Target file path
 * @param {object} data - Data to serialize as JSON
 * @returns {void}
 */
function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(data, null, 2) + '\n';
  const tempPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
  } catch (writeErr) {
    throw writeErr;
  }

  // Rename temp → target. On Windows, EPERM/EACCES can occur when
  // another handle briefly holds the target file (antivirus, prior
  // read, etc.). Retry up to 3 times with a small delay before
  // falling back to a direct overwrite.
  let renamed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.renameSync(tempPath, filePath);
      renamed = true;
      break;
    } catch (renameErr) {
      const isTransient = TRANSIENT_FS_ERRORS.has(renameErr.code);
      if (!isTransient || attempt === 2) {
        // Final attempt failed — fall back to direct write
        try {
          fs.writeFileSync(filePath, content, 'utf-8');
          renamed = true;
        } catch (fallbackErr) {
          // Clean up temp file before throwing
          try { fs.unlinkSync(tempPath); } catch { /* non-critical */ }
          throw fallbackErr;
        }
        break;
      }
      // Brief pause before retry (1ms, 5ms) — non-blocking via Atomics.wait
      const delay = attempt === 0 ? 1 : 5;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }

  // Clean up temp file if direct-write fallback was used
  if (renamed) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Cleanup failure is non-critical
    }
  }
}

/**
 * Safely parses a JSON file, returning a default value on failure.
 *
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Value to return if file doesn't exist or is invalid
 * @returns {*} Parsed JSON or default value
 */
function readJsonSafe(filePath, defaultValue = null) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    log.debug('Failed to parse JSON file, returning default', { filePath, error: error.message });
    return defaultValue;
  }
}

/**
 * Recursively copies a directory, skipping symbolic links for security.
 *
 * Symlinks are skipped because they could point outside the intended
 * scope (e.g., outside .agent/), enabling path traversal attacks.
 *
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 * @returns {void}
 */
function safeCopyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Security: skip symlinks to prevent path traversal
    const stat = fs.lstatSync(srcPath);
    if (stat.isSymbolicLink()) {
      log.debug('Skipping symlink for security', { path: srcPath });
      continue;
    }

    if (entry.isDirectory()) {
      safeCopyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Adds Devran AI Kit entries to a project's .gitignore.
 * Creates .gitignore if it doesn't exist. Idempotent — skips
 * if entries already present. Uses marker-based detection to
 * avoid duplicate entries across multiple runs.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ added: boolean, reason: string }}
 */
function addToGitignore(projectRoot, detectedIDEs) {
  if (!path.isAbsolute(projectRoot)) {
    throw new Error('addToGitignore: projectRoot must be an absolute path');
  }
  const { IDE_BRIDGE_DIRS, IDE_CONFIG_PATHS } = require('./constants');
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const marker = '# Devran AI Kit';

  // Build the full list of entries that must be gitignored
  const requiredEntries = ['.agent/'];
  if (Array.isArray(detectedIDEs)) {
    for (const ide of detectedIDEs) {
      if (IDE_BRIDGE_DIRS[ide]) {
        requiredEntries.push(IDE_BRIDGE_DIRS[ide]);
      }
    }
  }
  // IDE configs are always generated (cursor, opencode, codex) — gitignore all
  for (const configPath of Object.values(IDE_CONFIG_PATHS)) {
    requiredEntries.push(configPath);
  }
  requiredEntries.push('.worktreeinclude');

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  // Find entries not yet covered by existing gitignore patterns
  // A parent dir pattern (e.g. .cursor/) covers child paths (e.g. .cursor/commands/)
  // Exception: .claude/ does NOT count as coverage for .claude/commands/ because
  // blanket .claude/ breaks Claude Code CLI directory discovery.
  // We check for standalone lines only — .cursor/rules/foo does NOT cover .cursor/commands/
  const lines = content.split('\n').map(l => l.trim());
  const missing = requiredEntries.filter(entry => {
    if (lines.includes(entry)) return false;
    // Check if a parent directory pattern exists as its own gitignore line
    const parts = entry.replace(/\/$/, '').split('/');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('/') + '/';
      if (lines.includes(parent)) {
        // Blanket .claude/ breaks CLI slash command discovery — do not treat as coverage
        if (parent === '.claude/') return true;
        return false;
      }
    }
    return true;
  });

  if (missing.length === 0) {
    return { added: false, reason: content.includes(marker) ? 'already-present' : 'already-ignored' };
  }

  // Build the block to append
  const blockLines = [];
  if (!content.includes(marker)) {
    blockLines.push('', '# Devran AI Kit (local dev tooling)', '# Install: npx @devran-ai/kit init');
  } else {
    blockLines.push('');
  }
  blockLines.push(...missing);

  fs.appendFileSync(gitignorePath, blockLines.join('\n') + '\n', 'utf-8');
  return { added: true, reason: 'added', entries: missing };
}

/**
 * Checks if a file at the given path was generated by Devran AI Kit.
 * Reads the first 512 bytes atomically (single open-read-close) to avoid
 * TOCTOU races between existence check and provenance check.
 *
 * 512 bytes accommodates VS Code prompt files where the provenance header
 * is placed after YAML frontmatter (which can include a 200-char description).
 *
 * @param {string} absolutePath - Absolute path to the file
 * @returns {boolean|null} true = Kit-generated, false = user file, null = not found
 */
function checkKitProvenance(absolutePath) {
  const { KIT_BRIDGE_HEADER } = require('./constants');
  let fd;
  try {
    fd = fs.openSync(absolutePath, 'r');
    const buf = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    return buf.toString('utf-8', 0, bytesRead).includes(KIT_BRIDGE_HEADER);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    return false;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* non-critical */ }
    }
  }
}

/**
 * Cleans up legacy .claude/* + !.claude/commands/ gitignore patterns
 * left by Kit v5.2.0. Narrows to .claude/commands/ — preserves CLI directory discovery.
 *
 * Only acts when BOTH patterns are present (Kit's unique fingerprint).
 * Will NOT touch .claude/* if the negation pattern is absent — that
 * may be the user's own configuration.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ cleaned: boolean, reason: string }}
 */
function cleanupLegacyClaudeTracking(projectRoot) {
  if (!path.isAbsolute(projectRoot)) {
    throw new Error('cleanupLegacyClaudeTracking: projectRoot must be an absolute path');
  }
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return { cleaned: false, reason: 'no-gitignore' };
  }

  let content = fs.readFileSync(gitignorePath, 'utf-8');

  // Guard: only act when BOTH patterns are active (not commented out)
  const legacyPattern = /^\.claude\/\*/m;
  const legacyNegation = /^!\.claude\/commands\//m;
  if (!legacyPattern.test(content) || !legacyNegation.test(content)) {
    return { cleaned: false, reason: 'not-kit-pattern' };
  }

  // Narrow .claude/* to .claude/commands/ (preserving trailing comments, CRLF-safe)
  content = content.replace(/^\.claude\/\*(\s*(?:#.*)?)?(\r?)$/m, '.claude/commands/$1$2');

  // Remove the !.claude/commands/ negation line entirely (CRLF-safe)
  content = content.replace(/^!\.claude\/commands\/?\s*(?:#.*)?\r?\n?/m, '');

  fs.writeFileSync(gitignorePath, content, 'utf-8');
  return { cleaned: true, reason: 'legacy-patterns-removed' };
}

/**
 * Narrows blanket .claude/ gitignore to .claude/commands/ so that
 * Claude Code CLI can discover the .claude/ directory for slash commands.
 *
 * Blanket .claude/ hides the entire directory tree from gitignore-aware
 * discovery tools (Claude Code CLI/Desktop). The specific .claude/commands/
 * pattern keeps the parent directory discoverable while still ignoring
 * the auto-generated bridge files.
 *
 * Only acts on standalone .claude/ lines — does not touch .claude/*
 * (handled by cleanupLegacyClaudeTracking) or .claude/commands/ (already correct).
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ narrowed: boolean, reason: string }}
 */
function narrowBlanketClaudeIgnore(projectRoot) {
  if (!path.isAbsolute(projectRoot)) {
    throw new Error('narrowBlanketClaudeIgnore: projectRoot must be an absolute path');
  }
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return { narrowed: false, reason: 'no-gitignore' };
  }

  let content = fs.readFileSync(gitignorePath, 'utf-8');

  // Match standalone .claude/ line (not .claude/* or .claude/commands/)
  // Uses negative lookahead to avoid matching .claude/commands/ or .claude/*
  // CRLF-safe: optional \r before end-of-line
  const blanketPattern = /^(\.claude\/)(?!commands\/|\*)(\s*(?:#.*)?)?(\r?)$/m;
  if (!blanketPattern.test(content)) {
    return { narrowed: false, reason: 'no-blanket-pattern' };
  }

  content = content.replace(blanketPattern, '.claude/commands/$2$3');
  fs.writeFileSync(gitignorePath, content, 'utf-8');
  return { narrowed: true, reason: 'blanket-narrowed' };
}

/**
 * Known Kit-generated artifacts that must NEVER be tracked in user repos.
 * Consumers of Devran AI Kit sometimes accidentally commit these via
 * `git add -A` before `.gitignore` is configured, or because an agent's
 * tooling picked them up. This list drives the auto-untrack cleanup.
 *
 * Each entry is a path relative to the project root. Directories should
 * end with `/`. The cleanup runs `git rm -r --cached` on anything that
 * exists in the git index.
 */
const KIT_TRACKED_ARTIFACTS = Object.freeze([
  // Framework directory
  '.agent/',
  // IDE bridge directories (slash command files) — Kit fully owns these dirs.
  // Safe to list at directory-level because: (1) Kit regenerates every file
  // inside them on init/update and (2) the `git check-ignore` gate in
  // untrackKitArtifacts skips them unless they are explicitly gitignored,
  // which only happens after Kit's addToGitignore() has run.
  '.claude/commands/',
  '.cursor/commands/',
  '.opencode/commands/',
  '.windsurf/workflows/',
  '.github/prompts/',
  // IDE config files — list specific Kit-written paths only. Previous
  // versions listed parent dirs like `.cursor/rules/` and `.opencode/`, but
  // those dirs commonly contain user-authored configs that must not be
  // touched.
  '.cursor/rules/kit-governance.mdc',
  '.opencode/opencode.json',
  '.codex/instructions.md',
  // Worktree support
  '.worktreeinclude',
  // Windows literal path bug: someone set `core.hooksPath dev/null` without
  // leading slash, which creates a real `dev/null/` directory when git-lfs
  // or similar hook installers run. These are never Kit files but they are
  // always bogus and should be removed wherever they appear.
  'dev/null/',
]);

/**
 * Removes Kit-generated artifacts from the git index (keeps working-tree
 * files intact). Uses `git rm -r --cached` so files remain on disk but
 * stop being tracked by git. Idempotent — paths that aren't tracked are
 * silently skipped.
 *
 * This addresses a common failure mode: an agent or contributor runs
 * `git add -A` before Kit's gitignore entries are in place, accidentally
 * committing hundreds of bridge files. Running `kit init` or `kit update`
 * later adds the gitignore entries, but gitignore has no effect on
 * already-tracked files. This function closes that loop.
 *
 * @param {string} projectRoot - Project root directory (absolute path)
 * @returns {{ untracked: string[], skipped: string[], reason: string }}
 */
function untrackKitArtifacts(projectRoot) {
  if (!path.isAbsolute(projectRoot)) {
    throw new Error('untrackKitArtifacts: projectRoot must be an absolute path');
  }

  // Use execFileSync (not execSync) so arguments never pass through a shell.
  // Artifact paths are hardcoded constants today, but execFileSync prevents
  // any future regression from introducing a command-injection surface.
  const { execFileSync } = require('child_process');

  // Verify we're inside a git repo; no-op if not
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return { untracked: [], skipped: [], reason: 'not-a-git-repo' };
  }

  const untracked = [];
  const skipped = [];

  for (const artifact of KIT_TRACKED_ARTIFACTS) {
    // Gate 1: only touch paths that are explicitly gitignored. This protects
    // intentionally-tracked files — shared mode projects (`kit init --shared`)
    // do not add `.agent/` to .gitignore, so check-ignore rejects it and we
    // leave it alone. Same applies to user-authored configs under
    // `.cursor/rules/`, `.github/prompts/`, etc. that happen to sit beside
    // Kit bridge files.
    //
    // `git check-ignore` exit codes: 0 = ignored, 1 = not ignored, 128 = error.
    // We strip the trailing slash because older gits can reject a pure
    // directory pathspec against check-ignore.
    //
    // `--no-index` is CRITICAL: by default `git check-ignore` skips paths
    // that are already tracked in the index (returns exit 1 regardless of
    // .gitignore patterns). Since the whole point of this function is to
    // untrack files that were accidentally committed, we explicitly need
    // check-ignore to ignore the index state and match against .gitignore
    // patterns only.
    const checkPath = artifact.endsWith('/') ? artifact.slice(0, -1) : artifact;
    let isIgnored = false;
    try {
      execFileSync('git', ['check-ignore', '--no-index', '-q', '--', checkPath], {
        cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'],
      });
      isIgnored = true;
    } catch {
      isIgnored = false;
    }
    if (!isIgnored) {
      skipped.push(artifact);
      continue;
    }

    // Gate 2: ask git which files at this path are tracked (if any).
    // The `--` guard ensures the artifact is treated as a pathspec,
    // never as a flag, even if it were to start with a dash.
    let trackedOutput = '';
    try {
      trackedOutput = execFileSync(
        'git',
        ['ls-files', '-z', '--', artifact],
        { cwd: projectRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
      );
    } catch {
      skipped.push(artifact);
      continue;
    }

    if (!trackedOutput || trackedOutput.length === 0) {
      skipped.push(artifact);
      continue;
    }

    // Something is tracked — run `git rm --cached` to untrack (keeps files on disk).
    try {
      execFileSync(
        'git',
        ['rm', '-r', '--cached', '--quiet', '--', artifact],
        { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }
      );
      untracked.push(artifact);
    } catch {
      skipped.push(artifact);
    }
  }

  return {
    untracked,
    skipped,
    reason: untracked.length > 0 ? 'artifacts-untracked' : 'nothing-to-untrack',
  };
}

/**
 * Detects whether a project is in "shared mode" — i.e. the user ran
 * `kit init --shared` (or equivalent) and is intentionally committing the
 * `.agent/` framework directory to version control alongside the team.
 *
 * Heuristic: `.agent/` is currently tracked in git AND is NOT listed in
 * `.gitignore`. Both conditions must hold — a project where `.agent/` is
 * tracked AND gitignored is the accidental-commit bug that
 * `untrackKitArtifacts` exists to fix, not shared mode.
 *
 * Used by `kit update` to skip the entire gitignore pipeline (narrow →
 * cleanup → add → untrack) so shared-mode projects don't get their
 * `.agent/` directory forced back into `.gitignore` on every update.
 *
 * @param {string} projectRoot - Project root directory (absolute path)
 * @returns {boolean}
 */
function isSharedMode(projectRoot) {
  if (!path.isAbsolute(projectRoot)) {
    return false;
  }
  const { execFileSync } = require('child_process');

  // Verify we're inside a git repo; otherwise "shared mode" is undefined.
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return false;
  }

  // Is .agent/ currently tracked?
  let tracked = false;
  try {
    const out = execFileSync('git', ['ls-files', '--', '.agent/'], {
      cwd: projectRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    tracked = out.trim().length > 0;
  } catch {
    tracked = false;
  }
  if (!tracked) {
    return false;
  }

  // Is .agent/ explicitly gitignored? If yes, this is the bug scenario,
  // not shared mode — let the rest of the pipeline untrack it.
  //
  // `--no-index` is required here: without it, `git check-ignore` would
  // silently return "not ignored" for any tracked path regardless of
  // .gitignore contents, falsely classifying the bug scenario as shared mode.
  try {
    execFileSync('git', ['check-ignore', '--no-index', '-q', '--', '.agent'], {
      cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'],
    });
    // Exit 0 → ignored → bug scenario
    return false;
  } catch {
    // Exit non-0 → not ignored → shared mode
    return true;
  }
}

module.exports = Object.freeze({
  writeJsonAtomic,
  readJsonSafe,
  safeCopyDirSync,
  addToGitignore,
  checkKitProvenance,
  cleanupLegacyClaudeTracking,
  narrowBlanketClaudeIgnore,
  untrackKitArtifacts,
  isSharedMode,
  KIT_TRACKED_ARTIFACTS,
});
