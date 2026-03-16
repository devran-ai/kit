/**
 * Antigravity AI Kit — Task Governance Engine
 *
 * Extends task-model.js with locking, assignment enforcement,
 * and audit trail for multi-developer task governance.
 *
 * @module lib/task-governance
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const taskModel = require('./task-model');

const { AGENT_DIR, ENGINE_DIR } = require('./constants');
const { writeJsonAtomic } = require('./io');
const LOCKS_DIR = 'locks';
const AUDIT_FILE = 'audit-log.json';

/**
 * @typedef {object} TaskLock
 * @property {string} taskId - Locked task ID
 * @property {string} lockedBy - Identity ID of the lock holder
 * @property {string} lockedAt - ISO timestamp
 * @property {string} reason - Reason for locking
 */

/**
 * @typedef {object} AuditEntry
 * @property {string} taskId - Task ID
 * @property {string} action - Action performed
 * @property {string} performedBy - Identity ID of the performer
 * @property {string} timestamp - ISO timestamp
 * @property {object} [details] - Additional action details
 */

/**
 * Resolves the locks directory path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string}
 */
function resolveLocksDir(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, LOCKS_DIR);
}

/**
 * Resolves the audit log file path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string}
 */
function resolveAuditPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, AUDIT_FILE);
}

/**
 * Locks a task for exclusive modification.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID to lock
 * @param {string} identityId - Identity ID of the lock requester
 * @param {string} [reason] - Optional reason for locking
 * @returns {{ success: boolean, error?: string }}
 */
function lockTask(projectRoot, taskId, identityId, reason) {
  // Validate taskId format to prevent path traversal (M-12)
  if (typeof taskId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
    return { success: false, error: `Invalid task ID format: ${taskId}` };
  }

  const task = taskModel.getTask(projectRoot, taskId);
  if (!task) {
    return { success: false, error: `Task not found: ${taskId}` };
  }

  const locksDir = resolveLocksDir(projectRoot);
  if (!fs.existsSync(locksDir)) {
    fs.mkdirSync(locksDir, { recursive: true });
  }

  const lockFile = path.join(locksDir, `${taskId}.lock.json`);

  // Check for existing lock
  if (fs.existsSync(lockFile)) {
    const existingLock = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
    if (existingLock.lockedBy !== identityId) {
      return {
        success: false,
        error: `Task already locked by ${existingLock.lockedBy} since ${existingLock.lockedAt}`,
      };
    }
    // Same identity re-locking — refresh timestamp
  }

  /** @type {TaskLock} */
  const lock = {
    taskId,
    lockedBy: identityId,
    lockedAt: new Date().toISOString(),
    reason: reason || 'Working on task',
  };

  writeJsonAtomic(lockFile, lock);

  appendAudit(projectRoot, {
    taskId,
    action: 'lock',
    performedBy: identityId,
    timestamp: lock.lockedAt,
    details: { reason: lock.reason },
  });

  return { success: true };
}

/**
 * Unlocks a task. Only the lock holder or an owner can unlock.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID to unlock
 * @param {string} identityId - Identity ID of the unlock requester
 * @returns {{ success: boolean, error?: string }}
 */
function unlockTask(projectRoot, taskId, identityId) {
  const lockFile = path.join(resolveLocksDir(projectRoot), `${taskId}.lock.json`);

  if (!fs.existsSync(lockFile)) {
    return { success: false, error: `Task is not locked: ${taskId}` };
  }

  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));

  if (lock.lockedBy !== identityId) {
    // Allow owner override — check identity registry
    try {
      const identity = require('./identity');
      const registry = identity.listIdentities(projectRoot);
      const requester = registry.developers.find((d) => d.id === identityId);

      if (!requester || requester.role !== 'owner') {
        return { success: false, error: `Only lock holder (${lock.lockedBy}) or owner can unlock` };
      }
    } catch {
      return { success: false, error: `Only lock holder (${lock.lockedBy}) can unlock` };
    }
  }

  fs.unlinkSync(lockFile);

  appendAudit(projectRoot, {
    taskId,
    action: 'unlock',
    performedBy: identityId,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Checks if a task is currently locked.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID to check
 * @returns {{ locked: boolean, lock?: TaskLock }}
 */
function isTaskLocked(projectRoot, taskId) {
  const lockFile = path.join(resolveLocksDir(projectRoot), `${taskId}.lock.json`);

  if (!fs.existsSync(lockFile)) {
    return { locked: false };
  }

  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
  return { locked: true, lock };
}

/**
 * Assigns a task to a specific identity with governance checks.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID
 * @param {string} assigneeId - Identity ID to assign to
 * @param {string} performedBy - Identity ID performing the assignment
 * @returns {{ success: boolean, error?: string }}
 */
function assignTask(projectRoot, taskId, assigneeId, performedBy) {
  const task = taskModel.getTask(projectRoot, taskId);
  if (!task) {
    return { success: false, error: `Task not found: ${taskId}` };
  }

  // Check lock — only lock holder can reassign
  const lockStatus = isTaskLocked(projectRoot, taskId);
  if (lockStatus.locked && lockStatus.lock.lockedBy !== performedBy) {
    return { success: false, error: `Task is locked by ${lockStatus.lock.lockedBy} — cannot reassign` };
  }

  const result = taskModel.updateTask(projectRoot, taskId, { assignee: assigneeId });

  if (result.success) {
    appendAudit(projectRoot, {
      taskId,
      action: 'assign',
      performedBy,
      timestamp: new Date().toISOString(),
      details: { assigneeId },
    });
  }

  return result;
}

/**
 * Appends an entry to the audit log.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {AuditEntry} entry - Audit entry to append
 * @returns {void}
 */
function appendAudit(projectRoot, entry) {
  const auditPath = resolveAuditPath(projectRoot);
  const dir = path.dirname(auditPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let auditLog = { entries: [] };

  if (fs.existsSync(auditPath)) {
    try {
      auditLog = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
    } catch {
      auditLog = { entries: [] };
    }
  }

  auditLog.entries.push(entry);

  writeJsonAtomic(auditPath, auditLog);
}

/**
 * Gets the audit trail for a specific task or all tasks.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} [taskId] - Optional filter by task ID
 * @returns {AuditEntry[]}
 */
function getAuditTrail(projectRoot, taskId) {
  const auditPath = resolveAuditPath(projectRoot);

  if (!fs.existsSync(auditPath)) {
    return [];
  }

  try {
    const auditLog = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
    const entries = auditLog.entries || [];

    if (taskId) {
      return entries.filter((e) => e.taskId === taskId);
    }

    return entries;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// Decision Timeline Extension (Phase 4 — Deliverable 4.2)
// ═══════════════════════════════════════════════════════════

/** Maximum entries before rotation */
const MAX_AUDIT_ENTRIES = 500;

/**
 * @typedef {object} DecisionEntry
 * @property {string} actor - Name of the actor (agent or developer)
 * @property {'agent' | 'developer'} actorType - Type of actor
 * @property {string} action - Action performed
 * @property {string[]} files - Files affected
 * @property {string} outcome - Result of the decision
 * @property {object} [metadata] - Additional context
 * @property {string} timestamp - ISO timestamp
 */

/**
 * Normalizes a legacy audit entry into decision-compatible format.
 * Legacy entries (from Phase 3) may lack actor/actorType/files/outcome fields.
 *
 * @param {object} entry - Raw audit entry
 * @returns {object} Normalized entry with decision fields
 */
function normalizeEntry(entry) {
  return {
    ...entry,
    actor: entry.actor || entry.performedBy || 'unknown',
    actorType: entry.actorType || 'developer',
    files: entry.files || [],
    outcome: entry.outcome || 'unknown',
  };
}

/**
 * Rotates the audit log when it exceeds MAX_AUDIT_ENTRIES.
 * Archives the current log to `audit-log-{date}.json` and starts fresh.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} auditLog - Current audit log data
 * @returns {object} Potentially trimmed audit log
 */
function rotateIfNeeded(projectRoot, auditLog) {
  if (!auditLog.entries || auditLog.entries.length < MAX_AUDIT_ENTRIES) {
    return auditLog;
  }

  const auditPath = resolveAuditPath(projectRoot);
  const dir = path.dirname(auditPath);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const archiveName = `audit-log-${dateStamp}.json`;
  const archivePath = path.join(dir, archiveName);

  // Write archive atomically
  const archiveTmp = `${archivePath}.tmp`;
  fs.writeFileSync(archiveTmp, JSON.stringify(auditLog, null, 2) + '\n', 'utf-8');
  fs.renameSync(archiveTmp, archivePath);

  // Return fresh log
  return { entries: [] };
}

/**
 * Records an enriched decision in the audit trail.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} params - Decision parameters
 * @param {string} params.actor - Who made the decision
 * @param {'agent' | 'developer'} [params.actorType] - Actor type (default: 'developer')
 * @param {string} params.action - What was decided
 * @param {string[]} [params.files] - Affected files
 * @param {string} [params.outcome] - Decision outcome
 * @param {object} [params.metadata] - Additional context
 * @returns {DecisionEntry}
 */
function recordDecision(projectRoot, { actor, actorType, action, files, outcome, metadata }) {
  if (!actor || typeof actor !== 'string') {
    throw new Error('Actor name is required');
  }
  if (!action || typeof action !== 'string') {
    throw new Error('Action is required');
  }

  const validTypes = ['agent', 'developer'];
  const resolvedType = validTypes.includes(actorType) ? actorType : 'developer';

  /** @type {DecisionEntry} */
  const entry = {
    actor,
    actorType: resolvedType,
    action,
    files: files || [],
    outcome: outcome || 'pending',
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
    // Also include legacy fields for backward compatibility
    performedBy: actor,
    taskId: (metadata && metadata.taskId) || 'decision',
  };

  const auditPath = resolveAuditPath(projectRoot);
  const dir = path.dirname(auditPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let auditLog = { entries: [] };

  if (fs.existsSync(auditPath)) {
    try {
      auditLog = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
    } catch {
      auditLog = { entries: [] };
    }
  }

  auditLog.entries.push(entry);

  // Rotate if needed
  auditLog = rotateIfNeeded(projectRoot, auditLog);

  writeJsonAtomic(auditPath, auditLog);

  return entry;
}

/**
 * Returns the decision timeline with optional filters.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} [filters] - Filter options
 * @param {string} [filters.actor] - Filter by actor name
 * @param {string} [filters.actorType] - Filter by actor type
 * @param {string} [filters.action] - Filter by action type
 * @param {string} [filters.since] - ISO date — only entries after this
 * @param {string} [filters.until] - ISO date — only entries before this
 * @returns {object[]} Normalized and filtered entries
 */
function getTimeline(projectRoot, filters = {}) {
  const entries = getAuditTrail(projectRoot).map(normalizeEntry);

  let filtered = entries;

  if (filters.actor) {
    filtered = filtered.filter((e) => e.actor === filters.actor);
  }
  if (filters.actorType) {
    filtered = filtered.filter((e) => e.actorType === filters.actorType);
  }
  if (filters.action) {
    filtered = filtered.filter((e) => e.action === filters.action);
  }
  if (filters.since) {
    const sinceTime = new Date(filters.since).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
  }
  if (filters.until) {
    const untilTime = new Date(filters.until).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= untilTime);
  }

  // Chronological order (oldest first)
  return filtered.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Returns decisions filtered by a specific actor.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} actorName - Actor name
 * @param {'agent' | 'developer'} [actorType] - Optional actor type filter
 * @returns {object[]} Matching entries
 */
function getDecisionsByActor(projectRoot, actorName, actorType) {
  const filters = { actor: actorName };
  if (actorType) {
    filters.actorType = actorType;
  }
  return getTimeline(projectRoot, filters);
}

/**
 * Returns a summary of decision activity.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ totalDecisions: number, actorCounts: object, mostActive: string | null, decisionFrequency: string }}
 */
function getDecisionSummary(projectRoot) {
  const entries = getAuditTrail(projectRoot).map(normalizeEntry);

  /** @type {Record<string, number>} */
  const actorCounts = {};

  for (const entry of entries) {
    const key = `${entry.actor} (${entry.actorType})`;
    actorCounts[key] = (actorCounts[key] || 0) + 1;
  }

  // Most active
  let mostActive = null;
  let maxCount = 0;
  for (const [actor, count] of Object.entries(actorCounts)) {
    if (count > maxCount) {
      mostActive = actor;
      maxCount = count;
    }
  }

  // Frequency: decisions per day based on time span
  let decisionFrequency = '0/day';
  if (entries.length >= 2) {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const spanMs = new Date(sorted[sorted.length - 1].timestamp).getTime() - new Date(sorted[0].timestamp).getTime();
    const spanDays = Math.max(spanMs / (24 * 60 * 60 * 1000), 1);
    const perDay = (entries.length / spanDays).toFixed(1);
    decisionFrequency = `${perDay}/day`;
  } else if (entries.length === 1) {
    decisionFrequency = '1/day';
  }

  return {
    totalDecisions: entries.length,
    actorCounts,
    mostActive,
    decisionFrequency,
  };
}

module.exports = {
  lockTask,
  unlockTask,
  isTaskLocked,
  assignTask,
  getAuditTrail,
  // Decision timeline (Phase 4)
  recordDecision,
  getTimeline,
  getDecisionsByActor,
  getDecisionSummary,
};

