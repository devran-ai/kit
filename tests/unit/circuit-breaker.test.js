import { describe, it, expect } from 'vitest';
const { createCircuitBreaker } = require('../../lib/circuit-breaker');

describe('Circuit Breaker', () => {
  it('should start in CLOSED state', () => {
    const breaker = createCircuitBreaker('test');
    expect(breaker.getState().state).toBe('CLOSED');
  });

  it('should execute operations successfully in CLOSED state', () => {
    const breaker = createCircuitBreaker('test');
    const result = breaker.execute(() => 42);
    expect(result).toBe(42);
    expect(breaker.getState().totalSuccesses).toBe(1);
  });

  it('should count failures and stay CLOSED below threshold', () => {
    const breaker = createCircuitBreaker('test', { failureThreshold: 3 });

    expect(() => breaker.execute(() => { throw new Error('fail'); })).toThrow('fail');
    expect(() => breaker.execute(() => { throw new Error('fail'); })).toThrow('fail');

    expect(breaker.getState().state).toBe('CLOSED');
    expect(breaker.getState().failureCount).toBe(2);
  });

  it('should open circuit after reaching failure threshold', () => {
    const breaker = createCircuitBreaker('test', { failureThreshold: 3 });

    for (let i = 0; i < 3; i++) {
      try { breaker.execute(() => { throw new Error('fail'); }); } catch {}
    }

    expect(breaker.getState().state).toBe('OPEN');
  });

  it('should reject operations when OPEN', () => {
    const breaker = createCircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 60000 });

    try { breaker.execute(() => { throw new Error('fail'); }); } catch {}

    expect(() => breaker.execute(() => 42)).toThrow('Circuit breaker "test" is OPEN');
  });

  it('should reset consecutive failure count on success', () => {
    const breaker = createCircuitBreaker('test', { failureThreshold: 3 });

    try { breaker.execute(() => { throw new Error('fail'); }); } catch {}
    try { breaker.execute(() => { throw new Error('fail'); }); } catch {}

    breaker.execute(() => 'success');
    expect(breaker.getState().failureCount).toBe(0);
    expect(breaker.getState().state).toBe('CLOSED');
  });

  it('should reset to CLOSED state via reset()', () => {
    const breaker = createCircuitBreaker('test', { failureThreshold: 1 });

    try { breaker.execute(() => { throw new Error('fail'); }); } catch {}
    expect(breaker.getState().state).toBe('OPEN');

    breaker.reset();
    expect(breaker.getState().state).toBe('CLOSED');
    expect(breaker.getState().failureCount).toBe(0);
  });

  it('should track total successes and failures', () => {
    const breaker = createCircuitBreaker('test', { failureThreshold: 10 });

    breaker.execute(() => 1);
    breaker.execute(() => 2);
    try { breaker.execute(() => { throw new Error('fail'); }); } catch {}

    const state = breaker.getState();
    expect(state.totalSuccesses).toBe(2);
    expect(state.totalFailures).toBe(1);
  });

  it('should include name in state', () => {
    const breaker = createCircuitBreaker('my-breaker');
    expect(breaker.getState().name).toBe('my-breaker');
  });
});
