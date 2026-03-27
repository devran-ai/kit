/**
 * Devran AI Kit — Circuit Breaker
 *
 * Implements the circuit breaker pattern for protecting external
 * operations (git clones, network requests) from cascading failures.
 *
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
 *
 * @module lib/circuit-breaker
 * @author Emre Dursun
 * @since v3.2.0
 */

'use strict';

/** @typedef {'CLOSED' | 'OPEN' | 'HALF_OPEN'} CircuitState */

/**
 * @typedef {object} CircuitBreakerOptions
 * @property {number} [failureThreshold=3] - Failures before opening circuit
 * @property {number} [resetTimeoutMs=60000] - Time before attempting recovery (ms)
 * @property {number} [halfOpenMaxAttempts=1] - Max attempts in half-open state
 */

/**
 * @typedef {object} CircuitBreakerState
 * @property {CircuitState} state - Current circuit state
 * @property {number} failureCount - Consecutive failure count
 * @property {number} successCount - Consecutive success count in half-open
 * @property {number | null} lastFailureTime - Timestamp of last failure
 * @property {number} totalFailures - Lifetime failure count
 * @property {number} totalSuccesses - Lifetime success count
 */

/**
 * Creates a new circuit breaker instance.
 *
 * @param {string} name - Circuit breaker name for identification
 * @param {CircuitBreakerOptions} [options] - Configuration options
 * @returns {{ execute: Function, getState: Function, reset: Function }}
 */
function createCircuitBreaker(name, options = {}) {
  const failureThreshold = options.failureThreshold || 3;
  const resetTimeoutMs = options.resetTimeoutMs || 60000;
  const halfOpenMaxAttempts = options.halfOpenMaxAttempts || 1;

  /** @type {CircuitBreakerState} */
  let state = Object.freeze({
    state: 'CLOSED',
    failureCount: 0,
    successCount: 0,
    lastFailureTime: null,
    totalFailures: 0,
    totalSuccesses: 0,
  });

  /**
   * Checks if the circuit should transition from OPEN to HALF_OPEN.
   *
   * @returns {boolean}
   */
  function shouldAttemptReset() {
    if (state.state !== 'OPEN' || state.lastFailureTime === null) {
      return false;
    }
    return (Date.now() - state.lastFailureTime) >= resetTimeoutMs;
  }

  /**
   * Records a successful operation.
   *
   * @returns {void}
   */
  function onSuccess() {
    if (state.state === 'HALF_OPEN') {
      const newSuccessCount = state.successCount + 1;
      state = Object.freeze(
        newSuccessCount >= halfOpenMaxAttempts
          ? { ...state, state: 'CLOSED', failureCount: 0, successCount: 0, lastFailureTime: null, totalSuccesses: state.totalSuccesses + 1 }
          : { ...state, successCount: newSuccessCount, totalSuccesses: state.totalSuccesses + 1 }
      );
    } else {
      state = Object.freeze({ ...state, failureCount: 0, totalSuccesses: state.totalSuccesses + 1 });
    }
  }

  /**
   * Records a failed operation.
   *
   * @returns {void}
   */
  function onFailure() {
    const newFailureCount = state.failureCount + 1;
    const now = Date.now();

    if (state.state === 'HALF_OPEN') {
      state = Object.freeze({ ...state, state: 'OPEN', successCount: 0, failureCount: newFailureCount, lastFailureTime: now, totalFailures: state.totalFailures + 1 });
    } else {
      const newState = newFailureCount >= failureThreshold ? 'OPEN' : state.state;
      state = Object.freeze({ ...state, state: newState, failureCount: newFailureCount, lastFailureTime: now, totalFailures: state.totalFailures + 1 });
    }
  }

  /**
   * Executes an operation through the circuit breaker.
   *
   * @param {Function} operation - Async or sync operation to execute
   * @returns {*} Result of the operation
   * @throws {Error} If circuit is open or operation fails
   */
  function execute(operation) {
    if (state.state === 'OPEN') {
      if (shouldAttemptReset()) {
        state = Object.freeze({ ...state, state: 'HALF_OPEN', successCount: 0 });
      } else {
        throw new Error(
          `Circuit breaker "${name}" is OPEN — operation rejected. ` +
          `${state.failureCount} consecutive failures. ` +
          `Will retry after ${Math.ceil((resetTimeoutMs - (Date.now() - state.lastFailureTime)) / 1000)}s.`
        );
      }
    }

    try {
      const result = operation();
      onSuccess();
      return result;
    } catch (error) {
      onFailure();
      throw error;
    }
  }

  /**
   * Executes an asynchronous operation through the circuit breaker.
   * Properly tracks Promise resolution/rejection for state management.
   *
   * @param {Function} operation - Async operation to execute (must return a Promise)
   * @returns {Promise<*>} Result of the operation
   * @throws {Error} If circuit is open or operation fails
   */
  async function executeAsync(operation) {
    if (state.state === 'OPEN') {
      if (shouldAttemptReset()) {
        state = Object.freeze({ ...state, state: 'HALF_OPEN', successCount: 0 });
      } else {
        throw new Error(
          `Circuit breaker "${name}" is OPEN — operation rejected. ` +
          `${state.failureCount} consecutive failures. ` +
          `Will retry after ${Math.ceil((resetTimeoutMs - (Date.now() - state.lastFailureTime)) / 1000)}s.`
        );
      }
    }

    try {
      const result = await operation();
      onSuccess();
      return result;
    } catch (error) {
      onFailure();
      throw error;
    }
  }

  /**
   * Returns a snapshot of the circuit breaker state.
   *
   * @returns {CircuitBreakerState & { name: string }}
   */
  function getState() {
    return { name, ...state };
  }

  /**
   * Resets the circuit breaker to CLOSED state.
   *
   * @returns {void}
   */
  function reset() {
    state = Object.freeze({ ...state, state: 'CLOSED', failureCount: 0, successCount: 0, lastFailureTime: null });
  }

  return { execute, executeAsync, getState, reset };
}

module.exports = { createCircuitBreaker };
