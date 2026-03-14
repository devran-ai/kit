/**
 * Antigravity AI Kit — Workflow Engine
 *
 * Runtime module that enforces workflow-state.json transitions.
 * This is the first true runtime enforcement layer — transitions
 * are validated against the defined state machine before being applied.
 *
 * @module lib/workflow-engine
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** @typedef {'IDLE' | 'EXPLORE' | 'PLAN' | 'IMPLEMENT' | 'VERIFY' | 'REVIEW' | 'DEPLOY' | 'MAINTAIN'} WorkflowPhase */

/**
 * @typedef {object} TransitionResult
 * @property {boolean} success - Whether the transition was applied
 * @property {string} fromPhase - Phase before transition
 * @property {string} toPhase - Target phase
 * @property {string} trigger - What triggered the transition
 * @property {string} guard - Guard condition for this transition
 * @property {string} [timestamp] - ISO timestamp of when transition occurred
 * @property {string} [error] - Error message if transition failed
 */

/**
 * @typedef {object} HistoryEntry
 * @property {string} from - Source phase
 * @property {string} to - Target phase
 * @property {string} trigger - Transition trigger
 * @property {string} timestamp - ISO timestamp
 */

const WORKFLOW_STATE_FILENAME = 'workflow-state.json';
const ENGINE_DIR = 'engine';
const AGENT_DIR = '.agent';

/**
 * Resolves the absolute path to workflow-state.json for a given project root.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Absolute path to workflow-state.json
 */
function resolveStatePath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, WORKFLOW_STATE_FILENAME);
}

/**
 * Loads and parses the workflow state from disk.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ state: object, filePath: string }}
 * @throws {Error} If file does not exist or contains invalid JSON
 */
function loadWorkflowState(projectRoot) {
  const filePath = resolveStatePath(projectRoot);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow state file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');

  try {
    const state = JSON.parse(raw);
    return { state, filePath };
  } catch (parseError) {
    throw new Error(`Invalid JSON in workflow state file: ${parseError.message}`);
  }
}

/**
 * Returns the current workflow phase for a project.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Current phase name (e.g., 'IDLE', 'PLAN')
 */
function getCurrentPhase(projectRoot) {
  const { state } = loadWorkflowState(projectRoot);
  return state.currentPhase;
}

/**
 * Returns the full transition history.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {HistoryEntry[]} Array of historical transitions
 */
function getTransitionHistory(projectRoot) {
  const { state } = loadWorkflowState(projectRoot);
  return state.history || [];
}

/**
 * Finds a matching transition definition from the state machine.
 *
 * @param {object[]} transitions - Array of transition definitions
 * @param {string} fromPhase - Source phase
 * @param {string} toPhase - Target phase
 * @returns {object | null} Matching transition or null
 */
function findTransition(transitions, fromPhase, toPhase) {
  return transitions.find(
    (transition) => transition.from === fromPhase && transition.to === toPhase
  ) || null;
}

/**
 * Validates whether a transition from the current phase to the target phase
 * is permitted by the state machine definition.
 *
 * Does NOT execute the transition — use executeTransition() for that.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} toPhase - Target phase to transition to
 * @returns {TransitionResult} Validation result (success does not mean executed)
 */
function validateTransition(projectRoot, toPhase) {
  const { state } = loadWorkflowState(projectRoot);
  const currentPhase = state.currentPhase;
  const transitions = state.transitions || [];

  if (currentPhase === toPhase) {
    return {
      success: false,
      fromPhase: currentPhase,
      toPhase,
      trigger: '',
      guard: '',
      error: `Already in phase ${toPhase} — no transition needed`,
    };
  }

  const match = findTransition(transitions, currentPhase, toPhase);

  if (!match) {
    const validTargets = transitions
      .filter((transition) => transition.from === currentPhase)
      .map((transition) => transition.to);

    return {
      success: false,
      fromPhase: currentPhase,
      toPhase,
      trigger: '',
      guard: '',
      error: `Invalid transition: ${currentPhase} → ${toPhase}. Valid targets from ${currentPhase}: [${validTargets.join(', ')}]`,
    };
  }

  return {
    success: true,
    fromPhase: currentPhase,
    toPhase,
    trigger: match.trigger,
    guard: match.guard,
  };
}

/**
 * Executes a workflow transition atomically.
 *
 * 1. Validates the transition is permitted
 * 2. Updates the current phase
 * 3. Records timestamps on phase records
 * 4. Appends to history
 * 5. Writes updated state to disk
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} toPhase - Target phase to transition to
 * @param {string} [triggerOverride] - Optional override for the trigger description
 * @returns {TransitionResult} Result of the transition attempt
 */
function executeTransition(projectRoot, toPhase, triggerOverride) {
  const { state, filePath } = loadWorkflowState(projectRoot);
  const currentPhase = state.currentPhase;
  const transitions = state.transitions || [];

  if (currentPhase === toPhase) {
    return {
      success: false,
      fromPhase: currentPhase,
      toPhase,
      trigger: '',
      guard: '',
      error: `Already in phase ${toPhase} — no transition needed`,
    };
  }

  const match = findTransition(transitions, currentPhase, toPhase);

  if (!match) {
    const validTargets = transitions
      .filter((transition) => transition.from === currentPhase)
      .map((transition) => transition.to);

    return {
      success: false,
      fromPhase: currentPhase,
      toPhase,
      trigger: '',
      guard: '',
      error: `Invalid transition: ${currentPhase} → ${toPhase}. Valid targets from ${currentPhase}: [${validTargets.join(', ')}]`,
    };
  }

  const timestamp = new Date().toISOString();
  const trigger = triggerOverride || match.trigger;

  // Update previous phase completion timestamp
  if (currentPhase !== 'IDLE' && state.phases[currentPhase]) {
    state.phases[currentPhase].completedAt = timestamp;
    state.phases[currentPhase].status = 'completed';
  }

  // Update target phase start timestamp
  if (state.phases[toPhase]) {
    state.phases[toPhase].startedAt = timestamp;
    state.phases[toPhase].status = 'active';
    state.phases[toPhase].completedAt = null;
  }

  // Update top-level state
  state.currentPhase = toPhase;

  if (!state.startedAt && currentPhase === 'IDLE') {
    state.startedAt = timestamp;
  }

  // Append to history
  if (!Array.isArray(state.history)) {
    state.history = [];
  }

  state.history.push({
    from: currentPhase,
    to: toPhase,
    trigger,
    timestamp,
  });

  // Atomic write: write to temp file, then rename
  const tempPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (writeError) {
    // Clean up temp file if rename failed
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Swallow cleanup errors
      }
    }
    return {
      success: false,
      fromPhase: currentPhase,
      toPhase,
      trigger,
      guard: match.guard,
      error: `Failed to write state: ${writeError.message}`,
    };
  }

  return {
    success: true,
    fromPhase: currentPhase,
    toPhase,
    trigger,
    guard: match.guard,
    timestamp,
  };
}

/**
 * Resets the workflow to IDLE state with clean phase records.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {boolean} [preserveHistory=true] - Whether to keep transition history
 * @returns {{ success: boolean, previousPhase: string }}
 */
function resetWorkflow(projectRoot, preserveHistory = true) {
  const { state, filePath } = loadWorkflowState(projectRoot);
  const previousPhase = state.currentPhase;

  state.currentPhase = 'IDLE';
  state.startedAt = null;

  // Reset all phase records
  for (const phaseName of Object.keys(state.phases || {})) {
    state.phases[phaseName].status = 'pending';
    state.phases[phaseName].startedAt = null;
    state.phases[phaseName].completedAt = null;
    state.phases[phaseName].artifact = null;
  }

  if (!preserveHistory) {
    state.history = [];
  } else {
    // Record the reset in history
    state.history.push({
      from: previousPhase,
      to: 'IDLE',
      trigger: 'Workflow reset',
      timestamp: new Date().toISOString(),
    });
  }

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, filePath);

  return { success: true, previousPhase };
}

/**
 * Returns all valid transitions from the current phase.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ currentPhase: string, validTransitions: object[] }}
 */
function getAvailableTransitions(projectRoot) {
  const { state } = loadWorkflowState(projectRoot);
  const currentPhase = state.currentPhase;
  const transitions = state.transitions || [];

  const validTransitions = transitions
    .filter((transition) => transition.from === currentPhase)
    .map((transition) => ({
      to: transition.to,
      trigger: transition.trigger,
      guard: transition.guard,
    }));

  return { currentPhase, validTransitions };
}

module.exports = {
  loadWorkflowState,
  getCurrentPhase,
  getTransitionHistory,
  validateTransition,
  executeTransition,
  resetWorkflow,
  getAvailableTransitions,
};
