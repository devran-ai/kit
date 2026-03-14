/**
 * Antigravity AI Kit — Session Manager
 *
 * Automates session-state.json updates so it is no longer
 * a blank template. Tracks active sessions, tasks, and
 * repository state.
 *
 * @module lib/session-manager
 * @author Emre Dursun
 * @since v2.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const AGENT_DIR = '.agent';
const STATE_FILENAME = 'session-state.json';

/**
 * Resolves the absolute path to session-state.json.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Absolute path to session-state.json
 */
function resolveStatePath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, STATE_FILENAME);
}

/**
 * Loads session state from disk.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {object} Parsed session state
 */
function loadSessionState(projectRoot) {
  const filePath = resolveStatePath(projectRoot);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Session state file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Writes session state to disk atomically.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {object} state - Session state object to write
 * @returns {void}
 */
function writeSessionState(projectRoot, state) {
  const filePath = resolveStatePath(projectRoot);
  const tempPath = `${filePath}.tmp`;

  state.lastUpdated = new Date().toISOString();

  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Retrieves current Git branch name safely.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string | null} Branch name or null if not a git repo
 */
function getGitBranch(projectRoot) {
  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the last Git commit SHA safely.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string | null} Commit SHA or null
 */
function getGitLastCommit(projectRoot) {
  try {
    const result = execSync('git log -1 --format=%H', {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Starts a new session. Generates a session ID, populates
 * date, Git info, and sets status to "active".
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} [focus] - Optional session focus description
 * @returns {{ sessionId: string, state: object }}
 */
function startSession(projectRoot, focus) {
  const state = loadSessionState(projectRoot);
  const sessionId = crypto.randomUUID();

  state.session = {
    id: sessionId,
    date: new Date().toISOString(),
    focus: focus || null,
    status: 'active',
  };

  state.repository = {
    currentBranch: getGitBranch(projectRoot),
    lastCommit: getGitLastCommit(projectRoot),
    remoteSynced: false,
  };

  writeSessionState(projectRoot, state);

  return { sessionId, state };
}

/**
 * Ends the current session. Sets status to "completed".
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ success: boolean, sessionId: string | null }}
 */
function endSession(projectRoot) {
  const state = loadSessionState(projectRoot);

  if (!state.session || !state.session.id) {
    return { success: false, sessionId: null };
  }

  const sessionId = state.session.id;
  state.session.status = 'completed';

  // Archive completed tasks count
  state.notes = `Session ${sessionId} completed at ${new Date().toISOString()}`;

  writeSessionState(projectRoot, state);

  return { success: true, sessionId };
}

/**
 * Adds a task to the open tasks list.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} title - Task title
 * @param {string} [description] - Optional description
 * @returns {{ taskId: string }}
 */
function addTask(projectRoot, title, description) {
  const state = loadSessionState(projectRoot);
  const taskId = `TASK-${Date.now().toString(36).toUpperCase()}`;

  const task = {
    id: taskId,
    title,
    description: description || null,
    createdAt: new Date().toISOString(),
    status: 'open',
  };

  if (!Array.isArray(state.openTasks)) {
    state.openTasks = [];
  }

  state.openTasks.push(task);
  state.currentTask = taskId;

  writeSessionState(projectRoot, state);

  return { taskId };
}

/**
 * Marks a task as completed, moving it from openTasks to completedTasks.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - ID of the task to complete
 * @returns {{ success: boolean }}
 */
function completeTask(projectRoot, taskId) {
  const state = loadSessionState(projectRoot);

  if (!Array.isArray(state.openTasks)) {
    return { success: false };
  }

  const taskIndex = state.openTasks.findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return { success: false };
  }

  const [task] = state.openTasks.splice(taskIndex, 1);
  task.status = 'completed';
  task.completedAt = new Date().toISOString();

  if (!Array.isArray(state.completedTasks)) {
    state.completedTasks = [];
  }

  state.completedTasks.push(task);

  // Update currentTask
  if (state.currentTask === taskId) {
    state.currentTask = state.openTasks.length > 0 ? state.openTasks[0].id : null;
  }

  writeSessionState(projectRoot, state);

  return { success: true };
}

/**
 * Returns a summary of the current session state.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {object} Session summary
 */
function getSessionSummary(projectRoot) {
  const state = loadSessionState(projectRoot);

  return {
    sessionId: state.session?.id || null,
    status: state.session?.status || 'new',
    focus: state.session?.focus || null,
    branch: state.repository?.currentBranch || null,
    openTaskCount: Array.isArray(state.openTasks) ? state.openTasks.length : 0,
    completedTaskCount: Array.isArray(state.completedTasks) ? state.completedTasks.length : 0,
    currentTask: state.currentTask || null,
    lastUpdated: state.lastUpdated || null,
  };
}

module.exports = {
  loadSessionState,
  startSession,
  endSession,
  addTask,
  completeTask,
  getSessionSummary,
};
