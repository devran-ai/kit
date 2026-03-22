/**
 * Devran AI Kit — Rate Limiter
 *
 * Token bucket rate limiter for protecting external operations
 * (marketplace git clones, API calls) from abuse and resource exhaustion.
 *
 * @module lib/rate-limiter
 * @author Emre Dursun
 * @since v3.2.0
 */

'use strict';

/**
 * @typedef {object} RateLimiterOptions
 * @property {number} [maxTokens=5] - Maximum tokens (burst capacity)
 * @property {number} [refillRateMs=60000] - Time to refill one token (ms)
 */

/**
 * @typedef {object} RateLimiterState
 * @property {string} name - Limiter name
 * @property {number} tokens - Current available tokens
 * @property {number} maxTokens - Maximum capacity
 * @property {number} refillRateMs - Refill interval per token
 * @property {number} lastRefillTime - Last refill timestamp
 * @property {number} totalAllowed - Lifetime allowed count
 * @property {number} totalRejected - Lifetime rejected count
 */

/**
 * Creates a new rate limiter instance.
 *
 * @param {string} name - Rate limiter name for identification
 * @param {RateLimiterOptions} [options] - Configuration
 * @returns {{ tryAcquire: Function, getState: Function, reset: Function }}
 */
function createRateLimiter(name, options = {}) {
  const maxTokens = options.maxTokens || 5;
  const refillRateMs = options.refillRateMs || 60000;

  /** @type {RateLimiterState} */
  const state = {
    name,
    tokens: maxTokens,
    maxTokens,
    refillRateMs,
    lastRefillTime: Date.now(),
    totalAllowed: 0,
    totalRejected: 0,
  };

  /**
   * Refills tokens based on elapsed time since last refill.
   *
   * @returns {void}
   */
  function refill() {
    const now = Date.now();
    const elapsed = now - state.lastRefillTime;
    const tokensToAdd = Math.floor(elapsed / refillRateMs);

    if (tokensToAdd > 0) {
      state.tokens = Math.min(maxTokens, state.tokens + tokensToAdd);
      state.lastRefillTime = now;
    }
  }

  /**
   * Attempts to acquire a token for an operation.
   *
   * @returns {{ allowed: boolean, retryAfterMs?: number }}
   */
  function tryAcquire() {
    refill();

    if (state.tokens > 0) {
      state.tokens -= 1;
      state.totalAllowed += 1;
      return { allowed: true };
    }

    state.totalRejected += 1;
    const timeSinceLastRefill = Date.now() - state.lastRefillTime;
    const retryAfterMs = Math.max(0, refillRateMs - timeSinceLastRefill);

    return { allowed: false, retryAfterMs };
  }

  /**
   * Returns a snapshot of the rate limiter state.
   *
   * @returns {RateLimiterState}
   */
  function getState() {
    refill();
    return { ...state };
  }

  /**
   * Resets the rate limiter to full capacity.
   *
   * @returns {void}
   */
  function reset() {
    state.tokens = maxTokens;
    state.lastRefillTime = Date.now();
  }

  return { tryAcquire, getState, reset };
}

module.exports = { createRateLimiter };
