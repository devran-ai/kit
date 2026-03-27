/**
 * Devran AI Kit — Agent Conflict Detection
 *
 * Tracks file ownership by agents and detects concurrent modifications.
 * Uses JSON-based locks for cross-platform compatibility.
 *
 * @module lib/conflict-detector
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { AGENT_DIR, ENGINE_DIR } = require('./constants');
const { writeJsonAtomic } = require('./io');
const { createLogger } = require('./logger');
const log = createLogger('conflict-detector');
const FILE_LOCKS_FILE = 'file-locks.json';

/** Default lock TTL in milliseconds (30 minutes) */
const DEFAULT_LOCK_TTL_MS = 30 * 60 * 1000;

/**
 * @typedef {object} FileLock
 * @property {string} filePath - Relative path to the claimed file
 * @property {string} agent - Agent name holding the lock
 * @property {string} claimedAt - ISO timestamp
 * @property {number} ttlMs - Time-to-live in milliseconds
 */

/**
 * @typedef {object} ConflictReport
 * @property {string} filePath - Path with conflict
 * @property {string[]} agents - Agents claiming this file
 * @property {'warning' | 'blocking'} severity - Conflict severity
 */

/**
 * Resolves the file locks path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string}
 */
function resolveLocksPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, FILE_LOCKS_FILE);
}

/**
 * Loads current file locks, filtering out stale ones.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {FileLock[]}
 */
function loadLocks(projectRoot) {
  const locksPath = resolveLocksPath(projectRoot);

  if (!fs.existsSync(locksPath)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(locksPath, 'utf-8'));
    const locks = data.locks || [];
    const now = Date.now();

    // Filter out expired locks
    const activeLocks = locks.filter((lock) => {
      const claimedTime = new Date(lock.claimedAt).getTime();
      return (now - claimedTime) < (lock.ttlMs || DEFAULT_LOCK_TTL_MS);
    });

    // Persist pruned list if stale locks were removed
    if (activeLocks.length < locks.length) {
      writeLocks(projectRoot, activeLocks);
    }

    return activeLocks;
  } catch (err) {
    log.warn('Corrupted file locks — resetting to empty', { file: locksPath, error: err.message });
    return [];
  }
}

/**
 * Writes locks to disk atomically.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {FileLock[]} locks - Current locks
 * @returns {void}
 */
function writeLocks(projectRoot, locks) {
  const locksPath = resolveLocksPath(projectRoot);
  const data = {
    schemaVersion: '1.0.0',
    lastUpdated: new Date().toISOString(),
    locks,
  };

  writeJsonAtomic(locksPath, data);
}

/**
 * Claims a file for an agent.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} filePath - Relative path to file
 * @param {string} agent - Agent name
 * @param {number} [ttlMs] - Lock TTL in milliseconds
 * @returns {{ success: boolean, conflict?: ConflictReport }}
 */
function claimFile(projectRoot, filePath, agent, ttlMs) {
  const locks = loadLocks(projectRoot);
  const normalizedPath = filePath.replace(/\\/g, '/');
  const lockTtl = ttlMs || DEFAULT_LOCK_TTL_MS;

  // Check for existing claim by a different agent
  const existingLock = locks.find((l) => l.filePath === normalizedPath && l.agent !== agent);

  if (existingLock) {
    return {
      success: false,
      conflict: {
        filePath: normalizedPath,
        agents: [existingLock.agent, agent],
        severity: 'blocking',
      },
    };
  }

  // Update or create lock immutably
  const existingIndex = locks.findIndex((l) => l.filePath === normalizedPath && l.agent === agent);
  const now = new Date().toISOString();

  let updatedLocks;
  if (existingIndex !== -1) {
    updatedLocks = locks.map((l, i) =>
      i === existingIndex
        ? { ...l, claimedAt: now, ttlMs: lockTtl }
        : l
    );
  } else {
    updatedLocks = [
      ...locks,
      {
        filePath: normalizedPath,
        agent,
        claimedAt: now,
        ttlMs: lockTtl,
      },
    ];
  }

  writeLocks(projectRoot, updatedLocks);
  return { success: true };
}

/**
 * Releases a file lock held by an agent.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} filePath - Relative path to file
 * @param {string} agent - Agent name
 * @returns {{ success: boolean }}
 */
function releaseFile(projectRoot, filePath, agent) {
  const locks = loadLocks(projectRoot);
  const normalizedPath = filePath.replace(/\\/g, '/');
  const filteredLocks = locks.filter((l) => !(l.filePath === normalizedPath && l.agent === agent));

  if (filteredLocks.length === locks.length) {
    return { success: false };
  }

  writeLocks(projectRoot, filteredLocks);
  return { success: true };
}

/**
 * Detects all current file conflicts.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {ConflictReport[]}
 */
function detectConflicts(projectRoot) {
  const locks = loadLocks(projectRoot);
  /** @type {Map<string, string[]>} */
  const fileAgents = new Map();

  for (const lock of locks) {
    const existing = fileAgents.get(lock.filePath) || [];
    if (!existing.includes(lock.agent)) {
      fileAgents.set(lock.filePath, [...existing, lock.agent]);
    } else {
      fileAgents.set(lock.filePath, existing);
    }
  }

  /** @type {ConflictReport[]} */
  const conflicts = Array.from(fileAgents.entries())
    .filter(([, agents]) => agents.length > 1)
    .map(([filePath, agents]) => ({
      filePath,
      agents,
      severity: agents.length > 2 ? 'blocking' : 'warning',
    }));

  return conflicts;
}

/**
 * Gets file ownership information.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {Array<{ filePath: string, agent: string, claimedAt: string }>}
 */
function getFileOwnership(projectRoot) {
  const locks = loadLocks(projectRoot);

  return locks.map((lock) => ({
    filePath: lock.filePath,
    agent: lock.agent,
    claimedAt: lock.claimedAt,
  }));
}

/**
 * Generates a full conflict report with metrics.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ activeLocks: number, conflicts: ConflictReport[], hasBlockingConflict: boolean }}
 */
function reportConflicts(projectRoot) {
  const locks = loadLocks(projectRoot);
  const conflicts = detectConflicts(projectRoot);

  return {
    activeLocks: locks.length,
    conflicts,
    hasBlockingConflict: conflicts.some((c) => c.severity === 'blocking'),
  };
}

module.exports = {
  claimFile,
  releaseFile,
  detectConflicts,
  getFileOwnership,
  reportConflicts,
};
