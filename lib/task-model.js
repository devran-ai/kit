/**
 * Antigravity AI Kit — Task Data Model
 *
 * JSON file-backed task CRUD with status FSM tracking.
 * Provides the data layer for task governance.
 *
 * @module lib/task-model
 * @author Emre Dursun
 * @since v2.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AGENT_DIR = '.agent';
const ENGINE_DIR = 'engine';
const TASKS_FILE = 'tasks.json';

/** Valid task status values */
const VALID_STATUSES = ['open', 'in-progress', 'review', 'done', 'blocked'];

/** Valid status transitions */
const STATUS_TRANSITIONS = {
  'open': ['in-progress', 'blocked'],
  'in-progress': ['review', 'blocked', 'open'],
  'review': ['done', 'in-progress'],
  'done': ['open'],
  'blocked': ['open', 'in-progress'],
};

/** Valid priority levels */
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];

/**
 * @typedef {object} Task
 * @property {string} id - Unique task ID
 * @property {string} title - Task title
 * @property {string | null} description - Optional description
 * @property {string} status - Current status
 * @property {string} priority - Priority level
 * @property {string | null} assignee - Assigned agent or person
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {string | null} completedAt - Completion timestamp
 * @property {boolean} deleted - Soft delete flag
 */

/**
 * Resolves the tasks file path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Absolute path to tasks.json
 */
function resolveTasksPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, TASKS_FILE);
}

/**
 * Loads all tasks from disk.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {Task[]}
 */
function loadTasks(projectRoot) {
  const tasksPath = resolveTasksPath(projectRoot);

  if (!fs.existsSync(tasksPath)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
    return data.tasks || [];
  } catch {
    return [];
  }
}

/**
 * Writes tasks to disk atomically.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {Task[]} tasks - Tasks array
 * @returns {void}
 */
function writeTasks(projectRoot, tasks) {
  const tasksPath = resolveTasksPath(projectRoot);
  const tempPath = `${tasksPath}.tmp`;
  const dir = path.dirname(tasksPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data = {
    schemaVersion: '1.0.0',
    lastUpdated: new Date().toISOString(),
    tasks,
  };

  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, tasksPath);
}

/**
 * Creates a new task.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {object} params - Task parameters
 * @param {string} params.title - Task title
 * @param {string} [params.description] - Optional description
 * @param {string} [params.assignee] - Optional assignee
 * @param {string} [params.priority] - Priority (default: 'medium')
 * @returns {Task}
 */
function createTask(projectRoot, { title, description, assignee, priority }) {
  const tasks = loadTasks(projectRoot);
  const now = new Date().toISOString();

  const taskPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'medium';

  /** @type {Task} */
  const task = {
    id: `TSK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    title,
    description: description || null,
    status: 'open',
    priority: taskPriority,
    assignee: assignee || null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    deleted: false,
  };

  tasks.push(task);
  writeTasks(projectRoot, tasks);

  return task;
}

/**
 * Retrieves a task by ID.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID
 * @returns {Task | null}
 */
function getTask(projectRoot, taskId) {
  const tasks = loadTasks(projectRoot);
  return tasks.find((t) => t.id === taskId && !t.deleted) || null;
}

/**
 * Lists tasks with optional filters.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {object} [filters] - Filter options
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.priority] - Filter by priority
 * @param {string} [filters.assignee] - Filter by assignee
 * @returns {Task[]}
 */
function listTasks(projectRoot, filters = {}) {
  let tasks = loadTasks(projectRoot).filter((t) => !t.deleted);

  if (filters.status) {
    tasks = tasks.filter((t) => t.status === filters.status);
  }
  if (filters.priority) {
    tasks = tasks.filter((t) => t.priority === filters.priority);
  }
  if (filters.assignee) {
    tasks = tasks.filter((t) => t.assignee === filters.assignee);
  }

  return tasks;
}

/**
 * Updates a task's fields.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID
 * @param {object} updates - Fields to update
 * @returns {{ success: boolean, task: Task | null }}
 */
function updateTask(projectRoot, taskId, updates) {
  const tasks = loadTasks(projectRoot);
  const taskIndex = tasks.findIndex((t) => t.id === taskId && !t.deleted);

  if (taskIndex === -1) {
    return { success: false, task: null };
  }

  const allowedFields = ['title', 'description', 'assignee', 'priority'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      tasks[taskIndex][field] = updates[field];
    }
  }

  tasks[taskIndex].updatedAt = new Date().toISOString();
  writeTasks(projectRoot, tasks);

  return { success: true, task: tasks[taskIndex] };
}

/**
 * Transitions a task to a new status following the FSM.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID
 * @param {string} newStatus - Target status
 * @returns {{ success: boolean, error?: string }}
 */
function transitionTask(projectRoot, taskId, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    return { success: false, error: `Invalid status: ${newStatus}. Valid: ${VALID_STATUSES.join(', ')}` };
  }

  const tasks = loadTasks(projectRoot);
  const taskIndex = tasks.findIndex((t) => t.id === taskId && !t.deleted);

  if (taskIndex === -1) {
    return { success: false, error: `Task not found: ${taskId}` };
  }

  const currentStatus = tasks[taskIndex].status;
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: [${allowed.join(', ')}]`,
    };
  }

  tasks[taskIndex].status = newStatus;
  tasks[taskIndex].updatedAt = new Date().toISOString();

  if (newStatus === 'done') {
    tasks[taskIndex].completedAt = new Date().toISOString();
  }

  writeTasks(projectRoot, tasks);

  return { success: true };
}

/**
 * Soft-deletes a task.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} taskId - Task ID
 * @returns {{ success: boolean }}
 */
function deleteTask(projectRoot, taskId) {
  const tasks = loadTasks(projectRoot);
  const taskIndex = tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) {
    return { success: false };
  }

  tasks[taskIndex].deleted = true;
  tasks[taskIndex].updatedAt = new Date().toISOString();
  writeTasks(projectRoot, tasks);

  return { success: true };
}

/**
 * Returns task metrics: counts by status, avg cycle time.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {object} Task metrics
 */
function getTaskMetrics(projectRoot) {
  const tasks = loadTasks(projectRoot).filter((t) => !t.deleted);

  const counts = {};
  for (const status of VALID_STATUSES) {
    counts[status] = tasks.filter((t) => t.status === status).length;
  }

  // Calculate average cycle time for completed tasks
  const completedTasks = tasks.filter((t) => t.status === 'done' && t.completedAt);
  let avgCycleTimeSeconds = 0;

  if (completedTasks.length > 0) {
    const totalCycleTime = completedTasks.reduce((sum, t) => {
      return sum + (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime());
    }, 0);
    avgCycleTimeSeconds = Math.round(totalCycleTime / completedTasks.length / 1000);
  }

  return {
    total: tasks.length,
    counts,
    avgCycleTimeSeconds,
    completionRate: tasks.length > 0 ? Math.round((counts.done / tasks.length) * 100) : 0,
  };
}

module.exports = {
  createTask,
  getTask,
  listTasks,
  updateTask,
  transitionTask,
  deleteTask,
  getTaskMetrics,
};
