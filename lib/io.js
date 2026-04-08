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
function addToGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const marker = '# Devran AI Kit';
  const block = [
    '',
    '# Devran AI Kit (local dev tooling)',
    '# Install: npx @devran-ai/kit init',
    '.agent/',
  ].join('\n') + '\n';

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
    // Primary check: is .agent/ already ignored?
    if (content.includes('.agent/')) {
      if (content.includes(marker)) {
        return { added: false, reason: 'already-present' };
      }
      return { added: false, reason: 'already-ignored' };
    }
  }

  fs.appendFileSync(gitignorePath, block, 'utf-8');
  return { added: true, reason: 'added' };
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
 * Ensures .claude/commands/ is tracked in git despite .claude/ being gitignored.
 * Uses the .claude/* glob + !.claude/commands/ negation pattern.
 * Handles migration from older .claude/ (directory) pattern to .claude/* (glob).
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ action: string, reason: string }}
 */
function ensureClaudeCommandsTracked(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return { action: 'skipped', reason: 'no-gitignore' };
  }

  let content = fs.readFileSync(gitignorePath, 'utf-8');

  if (content.includes('.claude/*') && content.includes('!.claude/commands/')) {
    return { action: 'already-tracked', reason: 'patterns-present' };
  }

  // Migration: replace standalone .claude/ entry with .claude/* (glob for negation)
  if (/^\.claude\/(\s*(?:#.*)?)$/m.test(content) && !content.includes('.claude/*')) {
    content = content.replace(/^\.claude\/(\s*(?:#.*)?)$/m, '.claude/*$1');
  }

  const lines = [];
  if (!content.includes('.claude/*')) {
    lines.push('.claude/*');
  }
  if (!content.includes('!.claude/commands/')) {
    lines.push('!.claude/commands/');
  }

  if (lines.length > 0) {
    // Single atomic write to avoid Windows EPERM between write+append
    const newContent = content + '\n' + lines.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, newContent, 'utf-8');
    return { action: 'updated', reason: 'patterns-added' };
  }

  return { action: 'already-tracked', reason: 'patterns-present' };
}

/**
 * Checks if any detected IDE bridge directories are gitignored.
 * Returns warning messages for user display — does NOT modify gitignore.
 *
 * @param {string} projectRoot - Project root directory
 * @param {string[]} detectedIDEs - Array of IDE identifiers
 * @returns {string[]} Warning messages
 */
function checkBridgeGitignoreWarnings(projectRoot, detectedIDEs) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const warnings = [];

  const idePatterns = {
    cursor: { dir: '.cursor/', commands: '.cursor/commands/' },
    opencode: { dir: '.opencode/', commands: '.opencode/commands/' },
    windsurf: { dir: '.windsurf/', commands: '.windsurf/workflows/' },
  };

  for (const ide of detectedIDEs) {
    const pattern = idePatterns[ide];
    if (!pattern) continue;

    // Use line-anchored regex to avoid matching comments or partial paths
    const escapedDir = pattern.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/$/, '');
    const dirIgnored = new RegExp(`^${escapedDir}/?\\*?(?:\\s*(?:#.*)?)$`, 'm').test(content);
    const escapedCmd = ('!' + pattern.commands).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/$/, '');
    const hasNegation = new RegExp(`^${escapedCmd}/?(?:\\s*(?:#.*)?)$`, 'm').test(content);

    if (dirIgnored && !hasNegation) {
      warnings.push(
        `${pattern.dir} is gitignored — bridge commands won't appear in worktrees. ` +
        `Add "!${pattern.commands}" to .gitignore to fix.`
      );
    }
  }

  return warnings;
}

module.exports = Object.freeze({
  writeJsonAtomic,
  readJsonSafe,
  safeCopyDirSync,
  addToGitignore,
  checkKitProvenance,
  ensureClaudeCommandsTracked,
  checkBridgeGitignoreWarnings,
});
