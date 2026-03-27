/**
 * Devran AI Kit — Agent Reputation Scoring
 *
 * Tracks agent task outcomes and computes reputation scores
 * using a weighted formula with time-decay and cold-start bonus.
 *
 * @module lib/agent-reputation
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { AGENT_DIR, ENGINE_DIR } = require('./constants');
const { writeJsonAtomic } = require('./io');
const { createLogger } = require('./logger');
const log = createLogger('agent-reputation');
const REPUTATION_FILE = 'reputation.json';

/** Score bounds */
const MIN_SCORE = 0;
const MAX_SCORE = 1000;

/** Scoring weights */
const COMPLETION_WEIGHT = 10;
const FAILURE_WEIGHT = 15;

/** Cold-start threshold — bonus for agents with fewer than this many outcomes */
const COLD_START_THRESHOLD = 3;
const COLD_START_BONUS = 250;

/** Default half-life in days for time decay */
const DEFAULT_HALF_LIFE_DAYS = 30;

/**
 * @typedef {object} OutcomeRecord
 * @property {string} id - Unique outcome ID
 * @property {string} agent - Agent name
 * @property {'success' | 'failure'} result - Outcome result
 * @property {number} cycleTimeMs - Time to complete in milliseconds
 * @property {string} taskId - Associated task ID
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {object} AgentReputation
 * @property {string} agent - Agent name
 * @property {number} score - Clamped reputation score [0, 1000]
 * @property {number} completions - Total successful outcomes
 * @property {number} failures - Total failed outcomes
 * @property {number} avgCycleTimeMs - Average cycle time in milliseconds
 * @property {string | null} lastActive - ISO timestamp of last outcome
 * @property {string} trend - Trend indicator: '↑', '↓', or '→'
 * @property {number} reliability - Reliability percentage (0-100)
 */

/**
 * Resolves the reputation file path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string}
 */
function resolveReputationPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, REPUTATION_FILE);
}

/**
 * Loads the reputation data from disk.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ outcomes: OutcomeRecord[], lastDecayed: string | null }}
 */
function loadReputationData(projectRoot) {
  const filePath = resolveReputationPath(projectRoot);

  if (!fs.existsSync(filePath)) {
    return { outcomes: [], lastDecayed: null };
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    log.warn('Corrupted reputation data — resetting to defaults', { file: filePath, error: err.message });
    return { outcomes: [], lastDecayed: null };
  }
}

/**
 * Writes reputation data to disk atomically.
 *
 * @param {string} projectRoot - Root directory
 * @param {{ outcomes: OutcomeRecord[], lastDecayed: string | null }} data
 * @returns {void}
 */
function writeReputationData(projectRoot, data) {
  const filePath = resolveReputationPath(projectRoot);
  writeJsonAtomic(filePath, data);
}

/**
 * Clamps a value between min and max.
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Records an agent task outcome.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} params - Outcome parameters
 * @param {string} params.agent - Agent name
 * @param {'success' | 'failure'} params.result - Outcome result
 * @param {number} [params.cycleTimeMs] - Cycle time in ms (default: 0)
 * @param {string} [params.taskId] - Associated task ID
 * @returns {OutcomeRecord}
 */
function recordOutcome(projectRoot, { agent, result, cycleTimeMs, taskId }) {
  if (!agent || typeof agent !== 'string') {
    throw new Error('Agent name is required');
  }
  if (!['success', 'failure'].includes(result)) {
    throw new Error(`Invalid result: ${result}. Must be 'success' or 'failure'`);
  }

  const data = loadReputationData(projectRoot);

  /** @type {OutcomeRecord} */
  const record = {
    id: `OUT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    agent,
    result,
    cycleTimeMs: cycleTimeMs || 0,
    taskId: taskId || 'unknown',
    timestamp: new Date().toISOString(),
  };

  const updatedData = { ...data, outcomes: [...data.outcomes, record] };
  writeReputationData(projectRoot, updatedData);

  return record;
}

/**
 * Calculates the consistency bonus based on outcome streak.
 * Rewards agents with consecutive successes.
 *
 * @param {OutcomeRecord[]} agentOutcomes - Sorted outcomes for an agent
 * @returns {number} Consistency bonus (0-100)
 */
function calculateConsistencyBonus(agentOutcomes) {
  if (agentOutcomes.length === 0) {
    return 0;
  }

  // Count consecutive successes from most recent.
  // Use original index as a stable tiebreaker when timestamps are identical
  // (prevents non-deterministic sort across JS engines).
  let streak = 0;
  const indexed = agentOutcomes.map((o, i) => ({ ...o, _idx: i }));
  const sorted = indexed.sort((a, b) => {
    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    return timeDiff !== 0 ? timeDiff : b._idx - a._idx;
  });

  for (const outcome of sorted) {
    if (outcome.result === 'success') {
      streak += 1;
    } else {
      break;
    }
  }

  // Cap bonus at 100 (10 consecutive successes)
  return Math.min(streak * 10, 100);
}

/**
 * Computes reputation for a single agent.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} agentName - Agent name
 * @returns {AgentReputation}
 */
function getReputation(projectRoot, agentName) {
  const data = loadReputationData(projectRoot);
  const agentOutcomes = data.outcomes.filter((o) => o.agent === agentName);

  const completions = agentOutcomes.filter((o) => o.result === 'success').length;
  const failures = agentOutcomes.filter((o) => o.result === 'failure').length;
  const totalOutcomes = agentOutcomes.length;

  // Average cycle time
  const successOutcomes = agentOutcomes.filter((o) => o.result === 'success' && o.cycleTimeMs > 0);
  const avgCycleTimeMs = successOutcomes.length > 0
    ? Math.round(successOutcomes.reduce((sum, o) => sum + o.cycleTimeMs, 0) / successOutcomes.length)
    : 0;

  // Last active
  const lastActive = agentOutcomes.length > 0
    ? agentOutcomes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
    : null;

  // Consistency bonus
  const consistencyBonus = calculateConsistencyBonus(agentOutcomes);

  // Cold-start bonus — only for agents with at least 1 but fewer than threshold outcomes
  const coldStartBonus = (totalOutcomes > 0 && totalOutcomes < COLD_START_THRESHOLD) ? COLD_START_BONUS : 0;

  // Raw score
  const rawScore = (completions * COMPLETION_WEIGHT) - (failures * FAILURE_WEIGHT) + consistencyBonus + coldStartBonus;

  // Clamped score
  const score = clamp(Math.round(rawScore), MIN_SCORE, MAX_SCORE);

  // Trend — compare last 5 vs previous 5
  const trend = calculateTrend(agentOutcomes);

  // Reliability percentage
  const reliability = totalOutcomes > 0 ? Math.round((completions / totalOutcomes) * 100) : 0;

  return {
    agent: agentName,
    score,
    completions,
    failures,
    avgCycleTimeMs,
    lastActive,
    trend,
    reliability,
  };
}

/**
 * Calculates trend from recent outcomes.
 *
 * @param {OutcomeRecord[]} outcomes - Agent outcomes
 * @returns {string} '↑', '↓', or '→'
 */
function calculateTrend(outcomes) {
  if (outcomes.length < 2) {
    return '→';
  }

  const sorted = [...outcomes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const recentFive = sorted.slice(0, 5);
  const previousFive = sorted.slice(5, 10);

  if (previousFive.length === 0) {
    return '→';
  }

  const recentSuccessRate = recentFive.filter((o) => o.result === 'success').length / recentFive.length;
  const previousSuccessRate = previousFive.filter((o) => o.result === 'success').length / previousFive.length;

  const delta = recentSuccessRate - previousSuccessRate;

  if (delta > 0.1) {
    return '↑';
  }
  if (delta < -0.1) {
    return '↓';
  }
  return '→';
}

/**
 * Returns all agents ranked by reputation score (descending).
 * Agents with fewer than COLD_START_THRESHOLD outcomes are marked as 'new'.
 *
 * @param {string} projectRoot - Root directory
 * @returns {AgentReputation[]}
 */
function getRankings(projectRoot) {
  const data = loadReputationData(projectRoot);

  // Get unique agent names
  const agentNames = [...new Set(data.outcomes.map((o) => o.agent))];

  const rankings = agentNames.map((name) => getReputation(projectRoot, name));

  // Sort by score descending, then by completions descending
  rankings.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.completions - a.completions;
  });

  return rankings;
}

/**
 * Applies time-decay to all outcome records.
 * Removes outcomes older than 2× half-life to keep data manageable.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} [options] - Decay options
 * @param {number} [options.halfLifeDays] - Half-life in days (default: 30)
 * @returns {{ decayed: number, removed: number, remaining: number }}
 */
function decayScores(projectRoot, options = {}) {
  const halfLifeDays = options.halfLifeDays || DEFAULT_HALF_LIFE_DAYS;
  const maxAgeDays = halfLifeDays * 2;
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const data = loadReputationData(projectRoot);
  const originalCount = data.outcomes.length;

  // Remove outcomes older than 2× half-life (immutable)
  const remainingOutcomes = data.outcomes.filter((outcome) => {
    const ageMs = now - new Date(outcome.timestamp).getTime();
    return ageMs < maxAgeMs;
  });

  const removedCount = originalCount - remainingOutcomes.length;

  const updatedData = { ...data, outcomes: remainingOutcomes, lastDecayed: new Date().toISOString() };
  writeReputationData(projectRoot, updatedData);

  return {
    decayed: originalCount,
    removed: removedCount,
    remaining: remainingOutcomes.length,
  };
}

module.exports = {
  recordOutcome,
  getReputation,
  getRankings,
  decayScores,
};
