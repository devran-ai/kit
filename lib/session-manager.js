/**
 * Devran AI Kit — Session Manager
 *
 * Automates session-state.json updates so it is no longer
 * a blank template. Tracks active sessions, tasks, and
 * repository state.
 *
 * @module lib/session-manager
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const { AGENT_DIR } = require('./constants');
const { writeJsonAtomic } = require('./io');
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
  const updatedState = { ...state, lastUpdated: new Date().toISOString() };
  writeJsonAtomic(filePath, updatedState);
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
  const loadedState = loadSessionState(projectRoot);
  const sessionId = crypto.randomUUID();

  const state = {
    ...loadedState,
    session: {
      id: sessionId,
      date: new Date().toISOString(),
      focus: focus || null,
      status: 'active',
    },
    repository: {
      currentBranch: getGitBranch(projectRoot),
      lastCommit: getGitLastCommit(projectRoot),
      remoteSynced: false,
    },
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
  const loadedState = loadSessionState(projectRoot);

  if (!loadedState.session || !loadedState.session.id) {
    return { success: false, sessionId: null };
  }

  const sessionId = loadedState.session.id;
  const state = {
    ...loadedState,
    session: { ...loadedState.session, status: 'completed' },
    notes: `Session ${sessionId} completed at ${new Date().toISOString()}`,
  };

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
  const loadedState = loadSessionState(projectRoot);
  const taskId = `TASK-${Date.now().toString(36).toUpperCase()}`;

  const task = {
    id: taskId,
    title,
    description: description || null,
    createdAt: new Date().toISOString(),
    status: 'open',
  };

  const existingTasks = Array.isArray(loadedState.openTasks) ? loadedState.openTasks : [];
  const state = {
    ...loadedState,
    openTasks: [...existingTasks, task],
    currentTask: taskId,
  };

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
  const loadedState = loadSessionState(projectRoot);

  if (!Array.isArray(loadedState.openTasks)) {
    return { success: false };
  }

  const taskIndex = loadedState.openTasks.findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return { success: false };
  }

  const completedTask = {
    ...loadedState.openTasks[taskIndex],
    status: 'completed',
    completedAt: new Date().toISOString(),
  };

  const remainingTasks = loadedState.openTasks.filter((_, i) => i !== taskIndex);
  const existingCompleted = Array.isArray(loadedState.completedTasks) ? loadedState.completedTasks : [];

  const state = {
    ...loadedState,
    openTasks: remainingTasks,
    completedTasks: [...existingCompleted, completedTask],
    currentTask: loadedState.currentTask === taskId
      ? (remainingTasks.length > 0 ? remainingTasks[0].id : null)
      : loadedState.currentTask,
  };

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
