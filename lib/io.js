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
      const isTransient = renameErr.code === 'EPERM' || renameErr.code === 'EACCES';
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
      // Brief pause before retry (1ms, 5ms)
      const delay = attempt === 0 ? 1 : 5;
      const start = Date.now();
      while (Date.now() - start < delay) { /* spin wait */ }
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
    if (content.includes(marker)) {
      return { added: false, reason: 'already-present' };
    }
    if (content.includes('.agent/')) {
      return { added: false, reason: 'already-ignored' };
    }
  }

  fs.appendFileSync(gitignorePath, block, 'utf-8');
  return { added: true, reason: 'added' };
}

module.exports = {
  writeJsonAtomic,
  readJsonSafe,
  safeCopyDirSync,
  addToGitignore,
};
