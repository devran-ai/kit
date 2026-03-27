/**
 * Devran AI Kit — Workflow Persistence
 *
 * Extends the workflow engine with checkpoint/resume capability.
 * Workflow state survives across agent sessions via JSON file snapshots.
 *
 * @module lib/workflow-persistence
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const workflowEngine = require('./workflow-engine');

const { AGENT_DIR, ENGINE_DIR } = require('./constants');
const { writeJsonAtomic } = require('./io');
const { createLogger } = require('./logger');
const log = createLogger('workflow-persistence');
const CHECKPOINTS_DIR = 'checkpoints';

/**
 * Resolves the checkpoints directory path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Absolute path to checkpoints directory
 */
function resolveCheckpointsDir(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, CHECKPOINTS_DIR);
}

/**
 * Creates a checkpoint of the current workflow state.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} [label] - Optional human-readable label
 * @returns {{ checkpointId: string, filePath: string, timestamp: string }}
 */
function createCheckpoint(projectRoot, label) {
  const { state } = workflowEngine.loadWorkflowState(projectRoot);
  const checkpointsDir = resolveCheckpointsDir(projectRoot);

  const timestamp = new Date().toISOString();
  const checkpointId = crypto.randomUUID().slice(0, 8);

  const checkpoint = {
    id: checkpointId,
    label: label || `Checkpoint at ${state.currentPhase}`,
    timestamp,
    phase: state.currentPhase,
    state: JSON.parse(JSON.stringify(state)),
  };

  const filePath = path.join(checkpointsDir, `${checkpointId}.json`);
  writeJsonAtomic(filePath, checkpoint);

  return { checkpointId, filePath, timestamp };
}

/**
 * Lists all available checkpoints, sorted by timestamp (newest first).
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {Array<{ id: string, label: string, phase: string, timestamp: string }>}
 */
function listCheckpoints(projectRoot) {
  const checkpointsDir = resolveCheckpointsDir(projectRoot);

  if (!fs.existsSync(checkpointsDir)) {
    return [];
  }

  const files = fs.readdirSync(checkpointsDir).filter((f) => f.endsWith('.json'));

  return files
    .map((file) => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(checkpointsDir, file), 'utf-8'));
        return { id: data.id, label: data.label, phase: data.phase, timestamp: data.timestamp };
      } catch (err) {
        log.warn('Corrupted checkpoint file — skipping', { file, error: err.message });
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Restores workflow state from a checkpoint.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} checkpointId - ID of the checkpoint to restore
 * @returns {{ success: boolean, restoredPhase: string }}
 */
function resumeFromCheckpoint(projectRoot, checkpointId) {
  const checkpointsDir = resolveCheckpointsDir(projectRoot);
  const filePath = path.join(checkpointsDir, `${checkpointId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }

  const checkpoint = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const statePath = path.join(projectRoot, AGENT_DIR, ENGINE_DIR, 'workflow-state.json');

  // Create restored state with appended history (H-9: immutable — no mutation of checkpoint)
  const restoredState = {
    ...checkpoint.state,
    history: [
      ...(checkpoint.state.history || []),
      {
        from: 'RESTORED',
        to: checkpoint.state.currentPhase,
        trigger: `Restored from checkpoint ${checkpointId}`,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  writeJsonAtomic(statePath, restoredState);

  return { success: true, restoredPhase: checkpoint.state.currentPhase };
}

/**
 * Returns a rich summary of the current workflow state.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {object} Workflow summary with phase durations and checkpoint count
 */
function getWorkflowSummary(projectRoot) {
  const { state } = workflowEngine.loadWorkflowState(projectRoot);
  const checkpoints = listCheckpoints(projectRoot);
  const history = state.history || [];

  const phaseDurations = {};
  for (const [phaseName, phaseData] of Object.entries(state.phases || {})) {
    if (phaseData.startedAt && phaseData.completedAt) {
      const duration = new Date(phaseData.completedAt).getTime() - new Date(phaseData.startedAt).getTime();
      phaseDurations[phaseName] = Math.round(duration / 1000);
    }
  }

  return {
    currentPhase: state.currentPhase,
    startedAt: state.startedAt,
    transitionCount: history.length,
    checkpointCount: checkpoints.length,
    phaseDurations,
    lastTransition: history.length > 0 ? history[history.length - 1] : null,
  };
}

module.exports = {
  createCheckpoint,
  listCheckpoints,
  resumeFromCheckpoint,
  getWorkflowSummary,
};
