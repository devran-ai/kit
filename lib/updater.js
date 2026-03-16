/**
 * Antigravity AI Kit — CLI Updater
 *
 * Non-destructive update mechanism that merges new framework
 * files into an existing .agent/ installation while preserving
 * user customizations.
 *
 * @module lib/updater
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { AGENT_DIR } = require('./constants');

/** Files that should never be overwritten during updates */
const PRESERVED_FILES = new Set([
  'session-context.md',
  'session-state.json',
]);

/** Directories whose contents should never be overwritten */
const PRESERVED_DIRS = new Set([
  'decisions',
]);

/**
 * @typedef {object} UpdateReport
 * @property {string[]} added - Files that were added (new in source)
 * @property {string[]} updated - Files that were updated (hash mismatch)
 * @property {string[]} skipped - Files that were preserved (user customizations)
 * @property {string[]} unchanged - Files that are identical
 */

/**
 * Computes a SHA-256 hash of a file's contents.
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {string} Hex-encoded SHA-256 hash
 */
function fileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Recursively collects all file paths relative to a root directory.
 *
 * @param {string} rootDir - Root directory to scan
 * @param {string} [prefix=''] - Path prefix for recursion
 * @returns {string[]} Array of relative paths
 */
function collectFiles(rootDir, prefix = '') {
  /** @type {string[]} */
  const files = [];

  if (!fs.existsSync(rootDir)) {
    return files;
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(rootDir, entry.name), relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Determines if a relative file path is in the preserved set.
 *
 * @param {string} relativePath - Relative path from .agent/ root
 * @returns {boolean} True if the file should be preserved
 */
function isPreservedFile(relativePath) {
  // Check exact filename matches
  const basename = path.basename(relativePath);
  if (PRESERVED_FILES.has(basename)) {
    return true;
  }

  // Check if inside a preserved directory
  const parts = relativePath.split(/[/\\]/);
  for (const dir of PRESERVED_DIRS) {
    if (parts.includes(dir)) {
      return true;
    }
  }

  return false;
}

/**
 * Generates a diff report comparing source and target .agent/ directories.
 *
 * @param {string} sourceRoot - Root of the package (source .agent/ location)
 * @param {string} targetRoot - Root of the project (target .agent/ location)
 * @returns {UpdateReport}
 */
function generateDiff(sourceRoot, targetRoot) {
  const sourceDir = path.join(sourceRoot, AGENT_DIR);
  const targetDir = path.join(targetRoot, AGENT_DIR);

  const sourceFiles = collectFiles(sourceDir);
  const targetFiles = new Set(collectFiles(targetDir));

  /** @type {UpdateReport} */
  const report = {
    added: [],
    updated: [],
    skipped: [],
    unchanged: [],
  };

  for (const relativeFile of sourceFiles) {
    const sourcePath = path.join(sourceDir, relativeFile);
    const targetPath = path.join(targetDir, relativeFile);

    if (isPreservedFile(relativeFile) && targetFiles.has(relativeFile)) {
      report.skipped.push(relativeFile);
      continue;
    }

    if (!targetFiles.has(relativeFile)) {
      report.added.push(relativeFile);
      continue;
    }

    const sourceHash = fileHash(sourcePath);
    const targetHash = fileHash(targetPath);

    if (sourceHash !== targetHash) {
      report.updated.push(relativeFile);
    } else {
      report.unchanged.push(relativeFile);
    }
  }

  return report;
}

/**
 * Applies a non-destructive update from source to target.
 *
 * @param {string} sourceRoot - Root of the package
 * @param {string} targetRoot - Root of the project
 * @param {boolean} [dryRun=false] - If true, report only without modifying
 * @returns {UpdateReport}
 */
function applyUpdate(sourceRoot, targetRoot, dryRun = false) {
  const report = generateDiff(sourceRoot, targetRoot);

  if (dryRun) {
    return report;
  }

  const sourceDir = path.join(sourceRoot, AGENT_DIR);
  const targetDir = path.join(targetRoot, AGENT_DIR);

  // Copy new files
  for (const relativeFile of report.added) {
    const sourcePath = path.join(sourceDir, relativeFile);
    const targetPath = path.join(targetDir, relativeFile);
    const targetDirPath = path.dirname(targetPath);

    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
  }

  // Update modified files
  for (const relativeFile of report.updated) {
    const sourcePath = path.join(sourceDir, relativeFile);
    const targetPath = path.join(targetDir, relativeFile);

    fs.copyFileSync(sourcePath, targetPath);
  }

  return report;
}

module.exports = {
  generateDiff,
  applyUpdate,
  isPreservedFile,
  collectFiles,
};
