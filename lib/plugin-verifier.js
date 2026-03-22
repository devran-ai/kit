/**
 * Devran AI Kit — Plugin Signature Verification
 *
 * Generates and validates SHA-256 checksums for plugin integrity.
 * Prevents supply chain attacks by verifying plugin contents
 * have not been tampered with after installation.
 *
 * @module lib/plugin-verifier
 * @author Emre Dursun
 * @since v3.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AGENT_DIR, ENGINE_DIR, PLUGINS_DIR } = require('./constants');

/**
 * @typedef {object} PluginChecksum
 * @property {string} pluginName - Plugin name
 * @property {string} checksum - SHA-256 checksum of concatenated file contents
 * @property {string[]} files - Files included in checksum
 * @property {string} generatedAt - ISO timestamp
 */

/**
 * Collects all files in a directory recursively.
 *
 * @param {string} dirPath - Directory to scan
 * @returns {string[]} Sorted list of relative file paths
 */
function collectPluginFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      files.push(...collectPluginFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

/**
 * Generates a SHA-256 checksum for a plugin directory.
 *
 * @param {string} pluginDir - Path to plugin directory
 * @returns {PluginChecksum}
 */
function generateChecksum(pluginDir) {
  const files = collectPluginFiles(pluginDir);
  const hash = crypto.createHash('sha256');
  const relativeFiles = [];

  for (const file of files) {
    const relativePath = path.relative(pluginDir, file).replace(/\\/g, '/');
    relativeFiles.push(relativePath);

    // Hash both the file path and contents for integrity
    hash.update(relativePath);
    hash.update(fs.readFileSync(file));
  }

  const manifestPath = path.join(pluginDir, 'plugin.json');
  let pluginName = 'unknown';
  if (fs.existsSync(manifestPath)) {
    try {
      pluginName = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).name || 'unknown';
    } catch {
      // Use default
    }
  }

  return {
    pluginName,
    checksum: hash.digest('hex'),
    files: relativeFiles,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Verifies a plugin's current state matches its stored checksum.
 *
 * @param {string} pluginDir - Path to plugin directory
 * @param {string} expectedChecksum - Expected SHA-256 checksum
 * @returns {{ valid: boolean, currentChecksum: string, expectedChecksum: string }}
 */
function verifyChecksum(pluginDir, expectedChecksum) {
  const current = generateChecksum(pluginDir);

  return {
    valid: current.checksum === expectedChecksum,
    currentChecksum: current.checksum,
    expectedChecksum,
  };
}

/**
 * Stores a checksum in the plugin's registry entry.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} pluginName - Plugin name
 * @param {string} checksum - SHA-256 checksum to store
 * @returns {void}
 */
function storeChecksum(projectRoot, pluginName, checksum) {
  const checksumDir = path.join(projectRoot, AGENT_DIR, ENGINE_DIR, 'plugin-checksums');

  if (!fs.existsSync(checksumDir)) {
    fs.mkdirSync(checksumDir, { recursive: true });
  }

  const checksumPath = path.join(checksumDir, `${pluginName}.sha256`);
  fs.writeFileSync(checksumPath, checksum, 'utf-8');
}

/**
 * Retrieves a stored checksum for a plugin.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} pluginName - Plugin name
 * @returns {string | null}
 */
function getStoredChecksum(projectRoot, pluginName) {
  const checksumPath = path.join(projectRoot, AGENT_DIR, ENGINE_DIR, 'plugin-checksums', `${pluginName}.sha256`);

  if (!fs.existsSync(checksumPath)) {
    return null;
  }

  return fs.readFileSync(checksumPath, 'utf-8').trim();
}

/**
 * Verifies all installed plugins against their stored checksums.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ total: number, valid: number, invalid: string[], unverified: string[] }}
 */
function verifyAllPlugins(projectRoot) {
  const pluginsDir = path.join(projectRoot, AGENT_DIR, PLUGINS_DIR);

  if (!fs.existsSync(pluginsDir)) {
    return { total: 0, valid: 0, invalid: [], unverified: [] };
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  const invalid = [];
  const unverified = [];
  let valid = 0;

  for (const entry of entries) {
    const pluginDir = path.join(pluginsDir, entry.name);
    const storedChecksum = getStoredChecksum(projectRoot, entry.name);

    if (!storedChecksum) {
      unverified.push(entry.name);
      continue;
    }

    const result = verifyChecksum(pluginDir, storedChecksum);
    if (result.valid) {
      valid += 1;
    } else {
      invalid.push(entry.name);
    }
  }

  return {
    total: entries.length,
    valid,
    invalid,
    unverified,
  };
}

module.exports = {
  generateChecksum,
  verifyChecksum,
  storeChecksum,
  getStoredChecksum,
  verifyAllPlugins,
};
