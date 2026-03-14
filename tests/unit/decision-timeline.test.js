/**
 * Tests for Decision Timeline (extension of task-governance)
 * @module tests/unit/decision-timeline.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_ROOT = path.join(os.tmpdir(), `ag-timeline-test-${Date.now()}`);
const ENGINE_DIR = path.join(TEST_ROOT, '.agent', 'engine');

let governance;

beforeEach(() => {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  // Create minimal tasks.json for task-model dependency
  fs.writeFileSync(
    path.join(ENGINE_DIR, 'tasks.json'),
    JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), tasks: [] }, null, 2),
    'utf-8'
  );
  governance = require('../../lib/task-governance');
});

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  delete require.cache[require.resolve('../../lib/task-governance')];
  delete require.cache[require.resolve('../../lib/task-model')];
});

describe('recordDecision', () => {
  it('records a decision with all fields', () => {
    const entry = governance.recordDecision(TEST_ROOT, {
      actor: 'architect',
      actorType: 'agent',
      action: 'refactor-module',
      files: ['lib/engine.js', 'lib/utils.js'],
      outcome: 'success',
      metadata: { taskId: 'TSK-001' },
    });

    expect(entry.actor).toBe('architect');
    expect(entry.actorType).toBe('agent');
    expect(entry.action).toBe('refactor-module');
    expect(entry.files).toEqual(['lib/engine.js', 'lib/utils.js']);
    expect(entry.outcome).toBe('success');
    expect(entry.timestamp).toBeTruthy();
    // Legacy compat
    expect(entry.performedBy).toBe('architect');
    expect(entry.taskId).toBe('TSK-001');
  });

  it('defaults actorType to developer', () => {
    const entry = governance.recordDecision(TEST_ROOT, {
      actor: 'emre',
      action: 'approve-pr',
    });

    expect(entry.actorType).toBe('developer');
    expect(entry.files).toEqual([]);
    expect(entry.outcome).toBe('pending');
  });

  it('rejects missing actor', () => {
    expect(() => governance.recordDecision(TEST_ROOT, { action: 'test' }))
      .toThrow('Actor name is required');
  });

  it('rejects missing action', () => {
    expect(() => governance.recordDecision(TEST_ROOT, { actor: 'test' }))
      .toThrow('Action is required');
  });

  it('persists decisions to audit-log.json', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'a', action: 'x' });
    governance.recordDecision(TEST_ROOT, { actor: 'b', action: 'y' });

    const filePath = path.join(ENGINE_DIR, 'audit-log.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.entries).toHaveLength(2);
  });
});

describe('getTimeline', () => {
  it('returns empty array when no entries', () => {
    const timeline = governance.getTimeline(TEST_ROOT);
    expect(timeline).toEqual([]);
  });

  it('returns all entries in chronological order', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'a', action: 'first' });
    governance.recordDecision(TEST_ROOT, { actor: 'b', action: 'second' });

    const timeline = governance.getTimeline(TEST_ROOT);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].action).toBe('first');
    expect(timeline[1].action).toBe('second');
  });

  it('filters by actor', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'alice', action: 'code' });
    governance.recordDecision(TEST_ROOT, { actor: 'bob', action: 'review' });

    const timeline = governance.getTimeline(TEST_ROOT, { actor: 'alice' });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].actor).toBe('alice');
  });

  it('filters by actorType', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'architect', actorType: 'agent', action: 'plan' });
    governance.recordDecision(TEST_ROOT, { actor: 'emre', actorType: 'developer', action: 'approve' });

    const agents = governance.getTimeline(TEST_ROOT, { actorType: 'agent' });
    expect(agents).toHaveLength(1);
    expect(agents[0].actor).toBe('architect');
  });

  it('filters by action', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'a', action: 'deploy' });
    governance.recordDecision(TEST_ROOT, { actor: 'b', action: 'review' });

    const deploys = governance.getTimeline(TEST_ROOT, { action: 'deploy' });
    expect(deploys).toHaveLength(1);
  });
});

describe('legacy entry compatibility (D-1)', () => {
  it('normalizes legacy audit entries with missing fields', () => {
    // Simulate legacy entries written by Phase 3 task-governance
    const legacyLog = {
      entries: [
        {
          taskId: 'TSK-OLD',
          action: 'lock',
          performedBy: 'dev-abc123',
          timestamp: '2026-01-01T00:00:00.000Z',
          details: { reason: 'test' },
        },
      ],
    };

    fs.writeFileSync(
      path.join(ENGINE_DIR, 'audit-log.json'),
      JSON.stringify(legacyLog, null, 2),
      'utf-8'
    );

    const timeline = governance.getTimeline(TEST_ROOT);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].actor).toBe('dev-abc123'); // Falls back to performedBy
    expect(timeline[0].actorType).toBe('developer'); // Default
    expect(timeline[0].files).toEqual([]); // Default
    expect(timeline[0].outcome).toBe('unknown'); // Default
  });
});

describe('getDecisionsByActor', () => {
  it('returns decisions for a specific actor', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'architect', actorType: 'agent', action: 'design' });
    governance.recordDecision(TEST_ROOT, { actor: 'planner', actorType: 'agent', action: 'plan' });
    governance.recordDecision(TEST_ROOT, { actor: 'architect', actorType: 'agent', action: 'review' });

    const decisions = governance.getDecisionsByActor(TEST_ROOT, 'architect');
    expect(decisions).toHaveLength(2);
  });

  it('filters by actorType when provided', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'emre', actorType: 'developer', action: 'approve' });
    governance.recordDecision(TEST_ROOT, { actor: 'emre', actorType: 'agent', action: 'auto-fix' });

    const devDecisions = governance.getDecisionsByActor(TEST_ROOT, 'emre', 'developer');
    expect(devDecisions).toHaveLength(1);
    expect(devDecisions[0].actorType).toBe('developer');
  });
});

describe('getDecisionSummary', () => {
  it('returns zeros for empty log', () => {
    const summary = governance.getDecisionSummary(TEST_ROOT);
    expect(summary.totalDecisions).toBe(0);
    expect(summary.mostActive).toBeNull();
    expect(summary.decisionFrequency).toBe('0/day');
  });

  it('identifies most active actor', () => {
    governance.recordDecision(TEST_ROOT, { actor: 'architect', actorType: 'agent', action: 'a' });
    governance.recordDecision(TEST_ROOT, { actor: 'architect', actorType: 'agent', action: 'b' });
    governance.recordDecision(TEST_ROOT, { actor: 'planner', actorType: 'agent', action: 'c' });

    const summary = governance.getDecisionSummary(TEST_ROOT);
    expect(summary.totalDecisions).toBe(3);
    expect(summary.mostActive).toBe('architect (agent)');
    expect(summary.actorCounts['architect (agent)']).toBe(2);
    expect(summary.actorCounts['planner (agent)']).toBe(1);
  });
});

describe('log rotation (C-1)', () => {
  it('archives log when exceeding 500 entries', () => {
    // Pre-fill with 500 entries
    const entries = [];
    for (let i = 0; i < 500; i++) {
      entries.push({
        actor: `agent-${i}`,
        actorType: 'agent',
        action: 'test',
        files: [],
        outcome: 'success',
        performedBy: `agent-${i}`,
        taskId: 'decision',
        timestamp: new Date().toISOString(),
      });
    }

    fs.writeFileSync(
      path.join(ENGINE_DIR, 'audit-log.json'),
      JSON.stringify({ entries }, null, 2),
      'utf-8'
    );

    // This should trigger rotation
    governance.recordDecision(TEST_ROOT, { actor: 'trigger', action: 'rotate' });

    // Archive should exist
    const archiveFiles = fs.readdirSync(ENGINE_DIR).filter((f) => f.startsWith('audit-log-') && f.endsWith('.json'));
    expect(archiveFiles.length).toBeGreaterThanOrEqual(1);

    // Current log should be small (just the new entry post-rotation triggers a fresh log)
    const currentLog = JSON.parse(fs.readFileSync(path.join(ENGINE_DIR, 'audit-log.json'), 'utf-8'));
    expect(currentLog.entries.length).toBeLessThan(500);
  });
});
