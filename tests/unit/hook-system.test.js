import { describe, it, expect } from 'vitest';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');

async function loadHookSystem() {
  const modulePath = path.join(ROOT, 'lib', 'hook-system.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Hook Trigger System', () => {
  it('should list all 8 hook events', async () => {
    const hooks = await loadHookSystem();
    const events = hooks.listEvents(ROOT);

    expect(events.length).toBe(9);
    expect(events.map((e) => e.event)).toContain('session-start');
    expect(events.map((e) => e.event)).toContain('session-end');
    expect(events.map((e) => e.event)).toContain('pre-commit');
    expect(events.map((e) => e.event)).toContain('phase-transition');
    expect(events.map((e) => e.event)).toContain('plan-complete');
    expect(events.map((e) => e.event)).toContain('task-complete');
  });

  it('should return actions for session-start event', async () => {
    const hooks = await loadHookSystem();
    const actions = hooks.getHookActions('session-start', ROOT);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]).toHaveProperty('action');
    expect(actions[0]).toHaveProperty('severity');
    expect(actions[0]).toHaveProperty('onFailure');
  });

  it('should evaluate session-start hook against actual project', async () => {
    const hooks = await loadHookSystem();
    const result = hooks.evaluateHook('session-start', { projectRoot: ROOT });

    expect(result.event).toBe('session-start');
    expect(result.passed).toBeGreaterThan(0);
    // session-context.md and session-state.json should exist
    expect(result.blocked).toBe(false);
  });

  it('should return empty evaluation for non-existent project', async () => {
    const hooks = await loadHookSystem();
    const result = hooks.evaluateHook('session-start', { projectRoot: '/tmp/nonexistent-project' });

    // No hooks file means no actions -> empty evaluation
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.blocked).toBe(false);
  });

  it('should evaluate pre-commit hook with test context', async () => {
    const hooks = await loadHookSystem();
    const result = hooks.evaluateHook('pre-commit', {
      projectRoot: ROOT,
      testsPass: true,
      buildPass: true,
      lintPass: true,
    });

    expect(result.event).toBe('pre-commit');
    // With all contexts provided, applicable checks should pass
    expect(result.passed).toBeGreaterThan(0);
  });

  it('should block pre-commit when tests fail', async () => {
    const hooks = await loadHookSystem();
    const result = hooks.evaluateHook('pre-commit', {
      projectRoot: ROOT,
      testsPass: false,
      buildPass: true,
      lintPass: true,
    });

    expect(result.blocked).toBe(true);
    expect(result.failed).toBeGreaterThan(0);
  });

  it('should return empty actions for unknown event', async () => {
    const hooks = await loadHookSystem();
    const actions = hooks.getHookActions('unknown-event', ROOT);
    expect(actions).toEqual([]);
  });

  it('should generate a full hook report', async () => {
    const hooks = await loadHookSystem();
    const report = hooks.getHookReport(ROOT);

    expect(report).toHaveProperty('events');
    expect(report).toHaveProperty('totalActions');
    expect(report).toHaveProperty('readyCount');
    expect(report.events.length).toBe(9);
    expect(report.totalActions).toBeGreaterThan(0);
  });
});
