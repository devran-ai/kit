/**
 * Devran AI Kit — Workflow Event Emitter
 *
 * Provides an event-driven interface for workflow state transitions.
 * Enables reactive hook triggering and observability when the
 * workflow engine changes phases.
 *
 * @module lib/workflow-events
 * @author Emre Dursun
 * @since v3.2.0
 */

'use strict';

const { EventEmitter } = require('events');

/**
 * @typedef {object} WorkflowEvent
 * @property {string} type - Event type
 * @property {string} fromPhase - Source phase
 * @property {string} toPhase - Target phase
 * @property {string} trigger - What triggered the transition
 * @property {string} timestamp - ISO timestamp
 */

/** Singleton workflow event bus */
const workflowBus = new EventEmitter();

/** Event type constants */
const EVENTS = {
  TRANSITION_START: 'workflow:transition:start',
  TRANSITION_COMPLETE: 'workflow:transition:complete',
  TRANSITION_FAILED: 'workflow:transition:failed',
  PHASE_ENTERED: 'workflow:phase:entered',
  WORKFLOW_RESET: 'workflow:reset',
};

/**
 * Emits a transition start event.
 *
 * @param {string} fromPhase - Source phase
 * @param {string} toPhase - Target phase
 * @param {string} trigger - Transition trigger
 * @returns {void}
 */
function emitTransitionStart(fromPhase, toPhase, trigger) {
  const event = {
    type: EVENTS.TRANSITION_START,
    fromPhase,
    toPhase,
    trigger,
    timestamp: new Date().toISOString(),
  };
  workflowBus.emit(EVENTS.TRANSITION_START, event);
}

/**
 * Emits a transition complete event.
 *
 * @param {string} fromPhase - Source phase
 * @param {string} toPhase - Target phase
 * @param {string} trigger - Transition trigger
 * @returns {void}
 */
function emitTransitionComplete(fromPhase, toPhase, trigger) {
  const event = {
    type: EVENTS.TRANSITION_COMPLETE,
    fromPhase,
    toPhase,
    trigger,
    timestamp: new Date().toISOString(),
  };
  workflowBus.emit(EVENTS.TRANSITION_COMPLETE, event);
  workflowBus.emit(EVENTS.PHASE_ENTERED, { ...event, type: EVENTS.PHASE_ENTERED, phase: toPhase });
}

/**
 * Emits a transition failed event.
 *
 * @param {string} fromPhase - Source phase
 * @param {string} toPhase - Target phase
 * @param {string} error - Error message
 * @returns {void}
 */
function emitTransitionFailed(fromPhase, toPhase, error) {
  const event = {
    type: EVENTS.TRANSITION_FAILED,
    fromPhase,
    toPhase,
    trigger: '',
    error,
    timestamp: new Date().toISOString(),
  };
  workflowBus.emit(EVENTS.TRANSITION_FAILED, event);
}

/**
 * Emits a workflow reset event.
 *
 * @param {string} previousPhase - Phase before reset
 * @returns {void}
 */
function emitWorkflowReset(previousPhase) {
  const event = {
    type: EVENTS.WORKFLOW_RESET,
    fromPhase: previousPhase,
    toPhase: 'IDLE',
    trigger: 'reset',
    timestamp: new Date().toISOString(),
  };
  workflowBus.emit(EVENTS.WORKFLOW_RESET, event);
}

/**
 * Subscribes to a workflow event.
 *
 * @param {string} eventType - Event type from EVENTS
 * @param {Function} handler - Event handler
 * @returns {void}
 */
function on(eventType, handler) {
  workflowBus.on(eventType, handler);
}

/**
 * Subscribes to a workflow event once.
 *
 * @param {string} eventType - Event type from EVENTS
 * @param {Function} handler - Event handler
 * @returns {void}
 */
function once(eventType, handler) {
  workflowBus.once(eventType, handler);
}

/**
 * Removes an event listener.
 *
 * @param {string} eventType - Event type
 * @param {Function} handler - Handler to remove
 * @returns {void}
 */
function off(eventType, handler) {
  workflowBus.off(eventType, handler);
}

/**
 * Removes all listeners for testing cleanup.
 *
 * @returns {void}
 */
function removeAllListeners() {
  workflowBus.removeAllListeners();
}

module.exports = {
  EVENTS,
  emitTransitionStart,
  emitTransitionComplete,
  emitTransitionFailed,
  emitWorkflowReset,
  on,
  once,
  off,
  removeAllListeners,
};
