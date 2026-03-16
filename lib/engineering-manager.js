/**
 * Antigravity AI Kit — Autonomous Engineering Manager
 *
 * Data engine for sprint planning, task auto-assignment,
 * and velocity metrics. Powers the sprint-orchestrator agent.
 *
 * @module lib/engineering-manager
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const taskModel = require('./task-model');
const agentRegistry = require('./agent-registry');
const agentReputation = require('./agent-reputation');

const { AGENT_DIR, ENGINE_DIR } = require('./constants');
const { writeJsonAtomic } = require('./io');
const SPRINT_FILE = 'sprint-plans.json';

/** Maximum tasks per sprint suggestion */
const MAX_SPRINT_SIZE = 20;

/**
 * @typedef {object} SprintPlan
 * @property {string} id - Sprint plan ID
 * @property {string} name - Sprint name
 * @property {string} createdAt - ISO timestamp
 * @property {object[]} assignments - Task assignments
 * @property {string} status - Plan status: 'draft' | 'active' | 'completed'
 */

/**
 * @typedef {object} TaskAssignment
 * @property {string} taskId - Task ID
 * @property {string} taskTitle - Task title
 * @property {string} suggestedAgent - Recommended agent
 * @property {string} reason - Why this agent was chosen
 * @property {string} priority - Task priority
 */

/**
 * Resolves the sprint plans file path.
 *
 * @param {string} projectRoot - Root directory
 * @returns {string}
 */
function resolveSprintPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, SPRINT_FILE);
}

/**
 * Loads sprint plans from disk.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ plans: SprintPlan[] }}
 */
function loadSprintData(projectRoot) {
  const filePath = resolveSprintPath(projectRoot);

  if (!fs.existsSync(filePath)) {
    return { plans: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { plans: [] };
  }
}

/**
 * Writes sprint data atomically.
 *
 * @param {string} projectRoot - Root directory
 * @param {{ plans: SprintPlan[] }} data
 * @returns {void}
 */
function writeSprintData(projectRoot, data) {
  const filePath = resolveSprintPath(projectRoot);
  writeJsonAtomic(filePath, data);
}

/**
 * Gets the current workload (in-progress task count) for an agent.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} agentName - Agent name
 * @returns {number}
 */
function getAgentWorkload(projectRoot, agentName) {
  try {
    const inProgressTasks = taskModel.listTasks(projectRoot, {
      status: 'in-progress',
      assignee: agentName,
    });
    return inProgressTasks.length;
  } catch {
    return 0;
  }
}

/**
 * Finds the best agent for a task based on domain, reputation, and workload.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} taskTitle - Task title for domain matching
 * @param {string} taskPriority - Task priority
 * @returns {{ agent: string, reason: string }}
 */
function findBestAgent(projectRoot, taskTitle, taskPriority) {
  let agents = [];

  try {
    const registry = agentRegistry.loadRegistry(projectRoot);
    agents = registry.agents;
  } catch {
    return { agent: 'unassigned', reason: 'No agent registry available' };
  }

  if (agents.length === 0) {
    return { agent: 'unassigned', reason: 'No agents registered' };
  }

  // Score each agent
  const scored = agents.map((agent) => {
    let score = 0;
    let reasons = [];

    // 1. Domain match (keyword overlap between task title and agent domain)
    const titleWords = taskTitle.toLowerCase().split(/\W+/);
    const domainWords = (agent.domain || '').toLowerCase().split(/\W+/);
    const domainOverlap = titleWords.filter((word) =>
      word.length > 2 && domainWords.some((dw) => dw.includes(word) || word.includes(dw))
    ).length;

    if (domainOverlap > 0) {
      score += domainOverlap * 30;
      reasons.push(`domain match (${domainOverlap} keywords)`);
    }

    // 2. Reputation score
    try {
      const reputation = agentReputation.getReputation(projectRoot, agent.name);
      score += reputation.score / 10; // Normalize to ~0-100 range
      if (reputation.score > 0) {
        reasons.push(`reputation ${reputation.score}`);
      }
    } catch {
      // No reputation data — neutral
    }

    // 3. Workload penalty (fewer in-progress tasks = better)
    const workload = getAgentWorkload(projectRoot, agent.name);
    score -= workload * 20;
    if (workload > 0) {
      reasons.push(`workload ${workload} tasks`);
    }

    return {
      agent: agent.name,
      score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'general availability',
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return {
    agent: scored[0].agent,
    reason: scored[0].reason,
  };
}

/**
 * Generates a sprint plan from open tasks.
 * This is an advisory suggestion — never auto-executed.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} [options] - Sprint options
 * @param {string} [options.name] - Sprint name
 * @param {number} [options.maxTasks] - Max tasks to include
 * @returns {SprintPlan}
 */
function generateSprintPlan(projectRoot, options = {}) {
  const sprintName = options.name || `Sprint-${new Date().toISOString().slice(0, 10)}`;
  const maxTasks = options.maxTasks || MAX_SPRINT_SIZE;

  // Get all open/blocked tasks, prioritized
  let tasks = [];
  try {
    const openTasks = taskModel.listTasks(projectRoot, { status: 'open' });
    const blockedTasks = taskModel.listTasks(projectRoot, { status: 'blocked' });
    tasks = [...openTasks, ...blockedTasks];
  } catch {
    tasks = [];
  }

  // Priority sort using shared utility
  const sortedTasks = taskModel.sortByPriority(tasks);

  // Take top N
  const sprintTasks = sortedTasks.slice(0, maxTasks);

  // Auto-assign each
  /** @type {TaskAssignment[]} */
  const assignments = sprintTasks.map((task) => {
    const best = findBestAgent(projectRoot, task.title, task.priority);
    return {
      taskId: task.id,
      taskTitle: task.title,
      suggestedAgent: best.agent,
      reason: best.reason,
      priority: task.priority,
    };
  });

  /** @type {SprintPlan} */
  const plan = {
    id: `SPR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    name: sprintName,
    createdAt: new Date().toISOString(),
    assignments,
    status: 'draft',
  };

  // Persist
  const data = loadSprintData(projectRoot);
  data.plans.push(plan);
  writeSprintData(projectRoot, data);

  return plan;
}

/**
 * Auto-assigns a single task to the best available agent.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} taskId - Task ID
 * @returns {{ success: boolean, agent?: string, reason?: string, error?: string }}
 */
function autoAssignTask(projectRoot, taskId) {
  const task = taskModel.getTask(projectRoot, taskId);
  if (!task) {
    return { success: false, error: `Task not found: ${taskId}` };
  }

  const best = findBestAgent(projectRoot, task.title, task.priority);

  if (best.agent === 'unassigned') {
    return { success: false, error: best.reason };
  }

  const result = taskModel.updateTask(projectRoot, taskId, { assignee: best.agent });

  if (result.success) {
    return { success: true, agent: best.agent, reason: best.reason };
  }

  return { success: false, error: 'Failed to update task' };
}

/**
 * Suggests the next highest-priority unblocked task.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ task: object | null, reason: string }}
 */
function suggestNextTask(projectRoot) {
  let openTasks = [];
  try {
    openTasks = taskModel.listTasks(projectRoot, { status: 'open' });
  } catch {
    return { task: null, reason: 'No tasks available' };
  }

  if (openTasks.length === 0) {
    return { task: null, reason: 'No open tasks remaining' };
  }

  // Priority sort using shared utility
  const sorted = taskModel.sortByPriority(openTasks);

  const topTask = sorted[0];
  return {
    task: topTask,
    reason: `Highest priority open task (${topTask.priority})`,
  };
}

/**
 * Returns sprint velocity and progress metrics.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ totalSprints: number, activeSprint: SprintPlan | null, velocity: number, completionRate: number }}
 */
function getSprintMetrics(projectRoot) {
  const data = loadSprintData(projectRoot);
  const activeSprint = data.plans.find((p) => p.status === 'active') || null;
  const completedSprints = data.plans.filter((p) => p.status === 'completed');

  // Velocity: average assignments per completed sprint
  const velocity = completedSprints.length > 0
    ? Math.round(
        completedSprints.reduce((sum, s) => sum + s.assignments.length, 0) / completedSprints.length
      )
    : 0;

  // Task metrics
  let completionRate = 0;
  try {
    const metrics = taskModel.getTaskMetrics(projectRoot);
    completionRate = metrics.completionRate;
  } catch {
    completionRate = 0;
  }

  return {
    totalSprints: data.plans.length,
    activeSprint,
    velocity,
    completionRate,
  };
}

module.exports = {
  generateSprintPlan,
  autoAssignTask,
  suggestNextTask,
  getSprintMetrics,
};
