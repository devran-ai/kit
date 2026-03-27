/**
 * Devran AI Kit — Skill Marketplace
 *
 * GitHub-based hybrid marketplace for discovering, installing,
 * and managing community skills and plugins.
 *
 * @module lib/marketplace
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createCircuitBreaker } = require('./circuit-breaker');
const { createRateLimiter } = require('./rate-limiter');

const { AGENT_DIR, ENGINE_DIR } = require('./constants');
const { writeJsonAtomic } = require('./io');
const { createLogger } = require('./logger');
const log = createLogger('marketplace');
const INDEX_FILE = 'marketplace-index.json';

/** Registry index TTL in milliseconds (24 hours) */
const INDEX_TTL_MS = 24 * 60 * 60 * 1000;

/** Git clone timeout in milliseconds */
const GIT_CLONE_TIMEOUT_MS = 30000;

/** Circuit breaker for git clone operations */
const gitCloneBreaker = createCircuitBreaker('marketplace-git-clone', {
  failureThreshold: 3,
  resetTimeoutMs: 120000,
});

/** Rate limiter for marketplace install operations (5 per minute) */
const installLimiter = createRateLimiter('marketplace-install', {
  maxTokens: 5,
  refillRateMs: 60000,
});

/**
 * @typedef {object} MarketEntry
 * @property {string} name - Plugin name
 * @property {string} description - Plugin description
 * @property {string} repository - GitHub repository URL
 * @property {string} version - Latest version
 * @property {string[]} tags - Discovery tags
 * @property {string} author - Author name
 */

/**
 * Resolves the marketplace index path.
 *
 * @param {string} projectRoot - Root directory
 * @returns {string}
 */
function resolveIndexPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, INDEX_FILE);
}

/**
 * Loads the marketplace index from disk.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ entries: MarketEntry[], lastUpdated: string | null }}
 */
function loadIndex(projectRoot) {
  const filePath = resolveIndexPath(projectRoot);

  if (!fs.existsSync(filePath)) {
    return { entries: [], lastUpdated: null };
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    log.warn('Corrupted marketplace index — resetting to empty', { file: filePath, error: err.message });
    return { entries: [], lastUpdated: null };
  }
}

/**
 * Writes the marketplace index atomically.
 *
 * @param {string} projectRoot - Root directory
 * @param {{ entries: MarketEntry[], lastUpdated: string | null }} data
 * @returns {void}
 */
function writeIndex(projectRoot, data) {
  const filePath = resolveIndexPath(projectRoot);
  writeJsonAtomic(filePath, data);
}

/**
 * Checks if the index is stale (older than TTL).
 *
 * @param {string | null} lastUpdated - ISO timestamp of last update
 * @returns {boolean}
 */
function isIndexStale(lastUpdated) {
  if (!lastUpdated) {
    return true;
  }

  const age = Date.now() - new Date(lastUpdated).getTime();
  return age > INDEX_TTL_MS;
}

/**
 * Validates file paths in a plugin manifest for path traversal (D-6).
 *
 * @param {object} manifest - Plugin manifest (plugin.json)
 * @returns {{ valid: boolean, violations: string[] }}
 */
function validateManifestPaths(manifest) {
  const violations = [];

  /** @type {string[]} */
  const pathFields = [];

  // Collect all file path references from manifest
  if (manifest.file) {
    pathFields.push(manifest.file);
  }
  if (manifest.files && Array.isArray(manifest.files)) {
    pathFields.push(...manifest.files);
  }
  if (manifest.entry) {
    pathFields.push(manifest.entry);
  }

  for (const filePath of pathFields) {
    if (typeof filePath !== 'string') {
      violations.push(`Invalid path type: ${typeof filePath}`);
      continue;
    }

    // Reject absolute paths
    if (path.isAbsolute(filePath)) {
      violations.push(`Absolute path not allowed: ${filePath}`);
      continue;
    }

    // Reject path traversal
    if (filePath.includes('..')) {
      violations.push(`Path traversal not allowed: ${filePath}`);
      continue;
    }

    // Reject paths that escape .agent/
    const normalized = path.normalize(filePath);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      violations.push(`Path escapes sandbox: ${filePath}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Searches the marketplace index.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} query - Search query
 * @returns {MarketEntry[]}
 */
function searchMarket(projectRoot, query) {
  const index = loadIndex(projectRoot);
  const search = query.toLowerCase();

  return index.entries.filter((entry) => {
    const searchable = [
      entry.name,
      entry.description,
      entry.author,
      ...(entry.tags || []),
    ].join(' ').toLowerCase();

    return searchable.includes(search);
  });
}

/**
 * Gets detailed info for a specific marketplace entry.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} pluginName - Plugin name
 * @returns {MarketEntry | null}
 */
function getMarketInfo(projectRoot, pluginName) {
  const index = loadIndex(projectRoot);
  return index.entries.find((e) => e.name === pluginName) || null;
}

/**
 * Installs a plugin from the marketplace via git clone.
 * Validates paths before installation.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} pluginName - Plugin name from the index
 * @returns {{ success: boolean, message: string }}
 */
function installFromMarket(projectRoot, pluginName) {
  const entry = getMarketInfo(projectRoot, pluginName);

  if (!entry) {
    return { success: false, message: `Plugin not found in marketplace: ${pluginName}` };
  }

  // Validate repository URL
  if (!entry.repository || (!entry.repository.startsWith('https://') && !entry.repository.startsWith('git@'))) {
    return { success: false, message: `Invalid repository URL: ${entry.repository}` };
  }
  // Reject URLs with embedded credentials (https://user:pass@...)
  if (entry.repository.includes('@') && entry.repository.startsWith('https://')) {
    const urlBody = entry.repository.slice('https://'.length);
    if (urlBody.includes('@') && urlBody.indexOf('@') < urlBody.indexOf('/')) {
      return { success: false, message: 'Repository URL must not contain embedded credentials' };
    }
  }

  // Rate limit check
  const rateCheck = installLimiter.tryAcquire();
  if (!rateCheck.allowed) {
    return {
      success: false,
      message: `Rate limit exceeded — retry after ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`,
    };
  }

  // Create temp directory for clone
  const tempDir = path.join(projectRoot, AGENT_DIR, ENGINE_DIR, `_temp_${Date.now()}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Shallow clone with circuit breaker and timeout (uses execFileSync to prevent shell injection)
    try {
      gitCloneBreaker.execute(() => {
        execFileSync(
          'git',
          ['clone', '--depth', '1', '--single-branch', entry.repository, tempDir],
          { timeout: GIT_CLONE_TIMEOUT_MS, stdio: 'pipe' }
        );
      });
    } catch (gitError) {
      return { success: false, message: `Git clone failed: ${gitError.message || 'timeout or network error'}` };
    }

    // Validate plugin.json exists
    const pluginJsonPath = path.join(tempDir, 'plugin.json');
    if (!fs.existsSync(pluginJsonPath)) {
      return { success: false, message: 'Plugin missing plugin.json manifest' };
    }

    // Parse and validate manifest paths (D-6)
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
    } catch {
      return { success: false, message: 'Invalid plugin.json format' };
    }

    const pathValidation = validateManifestPaths(manifest);
    if (!pathValidation.valid) {
      return {
        success: false,
        message: `Security violation — path traversal detected: ${pathValidation.violations.join('; ')}`,
      };
    }

    // Delegate to plugin system for actual installation
    try {
      const pluginSystem = require('./plugin-system');
      const result = pluginSystem.installPlugin(tempDir, projectRoot);
      const message = result.errors?.length > 0
        ? result.errors.join('; ')
        : 'Plugin installed successfully';
      return { success: result.success, message };
    } catch (installError) {
      return { success: false, message: `Plugin installation failed: ${installError.message}` };
    }
  } finally {
    // Always cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Cleanup failure is non-critical
    }
  }
}

/**
 * Updates the registry index from the bundled source.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} [options] - Update options
 * @param {boolean} [options.force] - Force update regardless of TTL
 * @returns {{ updated: boolean, entryCount: number }}
 */
function updateRegistryIndex(projectRoot, options = {}) {
  const currentIndex = loadIndex(projectRoot);

  if (!options.force && !isIndexStale(currentIndex.lastUpdated)) {
    return { updated: false, entryCount: currentIndex.entries.length };
  }

  // For MVP, the index is bundled — just stamp the update time
  currentIndex.lastUpdated = new Date().toISOString();
  writeIndex(projectRoot, currentIndex);

  return { updated: true, entryCount: currentIndex.entries.length };
}

module.exports = {
  searchMarket,
  getMarketInfo,
  installFromMarket,
  updateRegistryIndex,
  // Exported for testing
  validateManifestPaths,
  isIndexStale,
};
