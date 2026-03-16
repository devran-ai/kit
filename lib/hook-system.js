/**
 * Antigravity AI Kit — Hook Trigger System
 *
 * Event-driven lifecycle hook execution based on hooks.json.
 * Evaluates hook actions and reports results with severity awareness.
 *
 * @module lib/hook-system
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { AGENT_DIR, ENGINE_DIR, HOOKS_DIR } = require('./constants');

const HOOKS_FILE = 'hooks.json';

/**
 * @typedef {object} ActionResult
 * @property {string} action - Action description
 * @property {'critical' | 'high' | 'medium' | 'low'} severity - Action severity
 * @property {'block' | 'warn' | 'log'} onFailure - Failure behavior
 * @property {'pass' | 'fail' | 'skip'} status - Evaluation result
 * @property {string} reason - Reason for status
 */

/**
 * @typedef {object} HookEvaluation
 * @property {string} event - Hook event name
 * @property {boolean} blocked - Whether any blocking action failed
 * @property {number} passed - Count of passed actions
 * @property {number} failed - Count of failed actions
 * @property {number} skipped - Count of skipped actions
 * @property {ActionResult[]} results - Individual action results
 */

/**
 * Loads hooks definition from hooks.json.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {object} Parsed hooks config
 */
function loadHooks(projectRoot) {
  const hooksPath = path.join(projectRoot, AGENT_DIR, HOOKS_DIR, HOOKS_FILE);

  if (!fs.existsSync(hooksPath)) {
    return { hooks: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
  } catch {
    return { hooks: [] };
  }
}

/**
 * Gets the action definitions for a specific event.
 *
 * @param {string} eventName - Hook event name (e.g., 'session-start')
 * @param {string} projectRoot - Root directory of the project
 * @returns {object[]} Action definitions for this event
 */
function getHookActions(eventName, projectRoot) {
  const config = loadHooks(projectRoot);
  const hook = (config.hooks || []).find((h) => h.event === eventName);

  if (!hook) {
    return [];
  }

  return hook.actions || [];
}

/**
 * Evaluates a hook event against the current project state.
 *
 * This performs a "check" pass — it determines which actions would
 * pass or fail without actually executing them. Actions are evaluated
 * based on the existence of required files and configurations.
 *
 * @param {string} eventName - Hook event name
 * @param {object} context - Evaluation context
 * @param {string} context.projectRoot - Root directory of the project
 * @param {boolean} [context.gitClean] - Whether git status is clean
 * @param {boolean} [context.testsPass] - Whether tests pass
 * @param {boolean} [context.buildPass] - Whether build passes
 * @param {boolean} [context.lintPass] - Whether lint passes
 * @returns {HookEvaluation}
 */
function evaluateHook(eventName, context) {
  const projectRoot = context.projectRoot;
  const actions = getHookActions(eventName, projectRoot);

  if (actions.length === 0) {
    return { event: eventName, blocked: false, passed: 0, failed: 0, skipped: 0, results: [] };
  }

  /** @type {ActionResult[]} */
  const results = [];
  let blocked = false;

  for (const action of actions) {
    const result = evaluateAction(action, context);
    results.push(result);

    if (result.status === 'fail' && action.onFailure === 'block') {
      blocked = true;
    }
  }

  return {
    event: eventName,
    blocked,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    skipped: results.filter((r) => r.status === 'skip').length,
    results,
  };
}

/**
 * Evaluates a single action based on context.
 *
 * @param {object} action - Action definition from hooks.json
 * @param {object} context - Evaluation context
 * @returns {ActionResult}
 */
function evaluateAction(action, context) {
  const actionLower = action.action.toLowerCase();
  const projectRoot = context.projectRoot;

  // File existence checks
  if (actionLower.includes('session-context.md') || actionLower.includes('session-state.json')) {
    const targetFile = actionLower.includes('session-context.md') ? 'session-context.md' : 'session-state.json';
    const filePath = path.join(projectRoot, AGENT_DIR, targetFile);
    const exists = fs.existsSync(filePath);

    return {
      action: action.action,
      severity: action.severity,
      onFailure: action.onFailure,
      status: exists ? 'pass' : 'fail',
      reason: exists ? `${targetFile} exists` : `${targetFile} not found`,
    };
  }

  if (actionLower.includes('loading-rules.json') || actionLower.includes('workflow-state.json')) {
    const targetFile = actionLower.includes('loading-rules.json') ? 'loading-rules.json' : 'workflow-state.json';
    const filePath = path.join(projectRoot, AGENT_DIR, ENGINE_DIR, targetFile);
    const exists = fs.existsSync(filePath);

    return {
      action: action.action,
      severity: action.severity,
      onFailure: action.onFailure,
      status: exists ? 'pass' : 'fail',
      reason: exists ? `${targetFile} exists and readable` : `${targetFile} not found`,
    };
  }

  // Git status check
  if (actionLower.includes('git status')) {
    const gitClean = context.gitClean !== undefined ? context.gitClean : true;
    return {
      action: action.action,
      severity: action.severity,
      onFailure: action.onFailure,
      status: gitClean ? 'pass' : 'fail',
      reason: gitClean ? 'Git status clean' : 'Git has uncommitted changes',
    };
  }

  // Build/test/lint checks
  if (actionLower.includes('build passes') || actionLower.includes('npm run build')) {
    return {
      action: action.action,
      severity: action.severity,
      onFailure: action.onFailure,
      status: context.buildPass ? 'pass' : context.buildPass === false ? 'fail' : 'skip',
      reason: context.buildPass ? 'Build passes' : context.buildPass === false ? 'Build failed' : 'Build not checked',
    };
  }

  if (actionLower.includes('tests pass') || actionLower.includes('npm test')) {
    return {
      action: action.action,
      severity: action.severity,
      onFailure: action.onFailure,
      status: context.testsPass ? 'pass' : context.testsPass === false ? 'fail' : 'skip',
      reason: context.testsPass ? 'Tests pass' : context.testsPass === false ? 'Tests failed' : 'Tests not checked',
    };
  }

  if (actionLower.includes('lint passes') || actionLower.includes('npm run lint')) {
    return {
      action: action.action,
      severity: action.severity,
      onFailure: action.onFailure,
      status: context.lintPass ? 'pass' : context.lintPass === false ? 'fail' : 'skip',
      reason: context.lintPass ? 'Lint passes' : context.lintPass === false ? 'Lint failed' : 'Lint not checked',
    };
  }

  // Default: skip actions we can't evaluate programmatically
  return {
    action: action.action,
    severity: action.severity,
    onFailure: action.onFailure,
    status: 'skip',
    reason: 'Cannot evaluate programmatically — requires agent execution',
  };
}

/**
 * Lists all available hook events.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {Array<{ event: string, description: string, actionCount: number }>}
 */
function listEvents(projectRoot) {
  const config = loadHooks(projectRoot);

  return (config.hooks || []).map((hook) => ({
    event: hook.event,
    description: hook.description,
    actionCount: (hook.actions || []).length,
  }));
}

/**
 * Generates a full hook readiness report for all events.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ events: HookEvaluation[], totalActions: number, readyCount: number }}
 */
function getHookReport(projectRoot) {
  const events = listEvents(projectRoot);
  const context = { projectRoot };

  const evaluations = events.map((e) => evaluateHook(e.event, context));
  const totalActions = evaluations.reduce((sum, e) => sum + e.passed + e.failed + e.skipped, 0);
  const readyCount = evaluations.filter((e) => !e.blocked).length;

  return { events: evaluations, totalActions, readyCount };
}

module.exports = {
  getHookActions,
  evaluateHook,
  listEvents,
  getHookReport,
};
