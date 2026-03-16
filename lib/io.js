/**
 * Antigravity AI Kit — Shared I/O Utilities
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

  const tempPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temp file on failure
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Cleanup failure is non-critical
    }
    throw err;
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

module.exports = {
  writeJsonAtomic,
  readJsonSafe,
};
