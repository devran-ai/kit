import { describe, it, expect } from 'vitest';
const { createRateLimiter } = require('../../lib/rate-limiter');

describe('Rate Limiter', () => {
  it('should allow requests within token limit', () => {
    const limiter = createRateLimiter('test', { maxTokens: 3, refillRateMs: 60000 });

    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);
  });

  it('should reject requests when tokens exhausted', () => {
    const limiter = createRateLimiter('test', { maxTokens: 2, refillRateMs: 60000 });

    limiter.tryAcquire();
    limiter.tryAcquire();

    const result = limiter.tryAcquire();
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(0);
  });

  it('should track total allowed and rejected counts', () => {
    const limiter = createRateLimiter('test', { maxTokens: 1, refillRateMs: 60000 });

    limiter.tryAcquire();
    limiter.tryAcquire();

    const state = limiter.getState();
    expect(state.totalAllowed).toBe(1);
    expect(state.totalRejected).toBe(1);
  });

  it('should reset to full capacity', () => {
    const limiter = createRateLimiter('test', { maxTokens: 3, refillRateMs: 60000 });

    limiter.tryAcquire();
    limiter.tryAcquire();
    limiter.tryAcquire();

    limiter.reset();

    const state = limiter.getState();
    expect(state.tokens).toBe(3);
    expect(limiter.tryAcquire().allowed).toBe(true);
  });

  it('should include name in state', () => {
    const limiter = createRateLimiter('my-limiter');
    expect(limiter.getState().name).toBe('my-limiter');
  });

  it('should use default values when no options provided', () => {
    const limiter = createRateLimiter('default');
    const state = limiter.getState();
    expect(state.maxTokens).toBe(5);
    expect(state.refillRateMs).toBe(60000);
  });
});
