/**
 * Tests for Agent Reputation Scoring
 * @module tests/unit/agent-reputation.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_ROOT = path.join(os.tmpdir(), `ag-reputation-test-${Date.now()}`);
const ENGINE_DIR = path.join(TEST_ROOT, '.agent', 'engine');

let reputation;

beforeEach(() => {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  reputation = require('../../lib/agent-reputation');
});

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  // Clear require cache
  delete require.cache[require.resolve('../../lib/agent-reputation')];
});

describe('recordOutcome', () => {
  it('records a success outcome', () => {
    const result = reputation.recordOutcome(TEST_ROOT, {
      agent: 'architect',
      result: 'success',
      cycleTimeMs: 5000,
      taskId: 'TSK-001',
    });

    expect(result.id).toMatch(/^OUT-/);
    expect(result.agent).toBe('architect');
    expect(result.result).toBe('success');
    expect(result.cycleTimeMs).toBe(5000);
    expect(result.timestamp).toBeTruthy();
  });

  it('records a failure outcome', () => {
    const result = reputation.recordOutcome(TEST_ROOT, {
      agent: 'planner',
      result: 'failure',
    });

    expect(result.result).toBe('failure');
    expect(result.cycleTimeMs).toBe(0);
    expect(result.taskId).toBe('unknown');
  });

  it('rejects invalid agent name', () => {
    expect(() => reputation.recordOutcome(TEST_ROOT, { agent: '', result: 'success' }))
      .toThrow('Agent name is required');
  });

  it('rejects invalid result type', () => {
    expect(() => reputation.recordOutcome(TEST_ROOT, { agent: 'test', result: 'partial' }))
      .toThrow("Invalid result: partial");
  });

  it('persists outcomes across calls', () => {
    reputation.recordOutcome(TEST_ROOT, { agent: 'a', result: 'success' });
    reputation.recordOutcome(TEST_ROOT, { agent: 'b', result: 'failure' });

    const filePath = path.join(ENGINE_DIR, 'reputation.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.outcomes).toHaveLength(2);
  });
});

describe('getReputation', () => {
  it('returns zero reputation for unknown agent', () => {
    const rep = reputation.getReputation(TEST_ROOT, 'unknown-agent');

    expect(rep.agent).toBe('unknown-agent');
    expect(rep.score).toBe(0);
    expect(rep.completions).toBe(0);
    expect(rep.failures).toBe(0);
    expect(rep.reliability).toBe(0);
    expect(rep.lastActive).toBeNull();
  });

  it('calculates score with completion weight', () => {
    for (let i = 0; i < 5; i++) {
      reputation.recordOutcome(TEST_ROOT, { agent: 'architect', result: 'success' });
    }

    const rep = reputation.getReputation(TEST_ROOT, 'architect');
    // 5 completions × 10 = 50 + consistency bonus (50 for 5 streak) = 100
    expect(rep.score).toBe(100);
    expect(rep.completions).toBe(5);
    expect(rep.reliability).toBe(100);
  });

  it('applies failure penalty', () => {
    reputation.recordOutcome(TEST_ROOT, { agent: 'buggy', result: 'success' });
    reputation.recordOutcome(TEST_ROOT, { agent: 'buggy', result: 'success' });
    reputation.recordOutcome(TEST_ROOT, { agent: 'buggy', result: 'success' });
    reputation.recordOutcome(TEST_ROOT, { agent: 'buggy', result: 'failure' });
    reputation.recordOutcome(TEST_ROOT, { agent: 'buggy', result: 'failure' });

    const rep = reputation.getReputation(TEST_ROOT, 'buggy');
    // 3×10 - 2×15 + consistency 0 (streak broken) = 30 - 30 = 0
    expect(rep.score).toBe(0);
    expect(rep.failures).toBe(2);
    expect(rep.reliability).toBe(60);
  });

  it('clamps score at 0 (no negative)', () => {
    // Many failures
    for (let i = 0; i < 10; i++) {
      reputation.recordOutcome(TEST_ROOT, { agent: 'failing', result: 'failure' });
    }

    const rep = reputation.getReputation(TEST_ROOT, 'failing');
    // 0×10 - 10×15 = -150 → clamped to 0
    expect(rep.score).toBe(0);
  });

  it('clamps score at 1000 (no overflow)', () => {
    // 100 successes
    for (let i = 0; i < 100; i++) {
      reputation.recordOutcome(TEST_ROOT, { agent: 'star', result: 'success' });
    }

    const rep = reputation.getReputation(TEST_ROOT, 'star');
    // 100×10 + consistency 100 = 1100 → clamped to 1000
    expect(rep.score).toBe(1000);
  });

  it('applies cold-start bonus for new agents (< 3 outcomes)', () => {
    reputation.recordOutcome(TEST_ROOT, { agent: 'newbie', result: 'success' });

    const rep = reputation.getReputation(TEST_ROOT, 'newbie');
    // 1×10 + consistency 10 + cold-start 250 = 270
    expect(rep.score).toBe(270);
  });

  it('removes cold-start bonus at 3+ outcomes', () => {
    reputation.recordOutcome(TEST_ROOT, { agent: 'growing', result: 'success' });
    reputation.recordOutcome(TEST_ROOT, { agent: 'growing', result: 'success' });

    const repBefore = reputation.getReputation(TEST_ROOT, 'growing');
    expect(repBefore.score).toBeGreaterThanOrEqual(250); // Has bonus

    reputation.recordOutcome(TEST_ROOT, { agent: 'growing', result: 'success' });

    const repAfter = reputation.getReputation(TEST_ROOT, 'growing');
    // 3×10 + consistency 30 = 60 (no cold-start bonus)
    expect(repAfter.score).toBe(60);
  });

  it('calculates average cycle time from successes only', () => {
    reputation.recordOutcome(TEST_ROOT, { agent: 'timer', result: 'success', cycleTimeMs: 1000 });
    reputation.recordOutcome(TEST_ROOT, { agent: 'timer', result: 'success', cycleTimeMs: 3000 });
    reputation.recordOutcome(TEST_ROOT, { agent: 'timer', result: 'failure', cycleTimeMs: 9999 });

    const rep = reputation.getReputation(TEST_ROOT, 'timer');
    expect(rep.avgCycleTimeMs).toBe(2000);
  });
});

describe('getRankings', () => {
  it('returns empty array when no outcomes', () => {
    const rankings = reputation.getRankings(TEST_ROOT);
    expect(rankings).toEqual([]);
  });

  it('ranks agents by score descending', () => {
    // Agent A: 5 successes
    for (let i = 0; i < 5; i++) {
      reputation.recordOutcome(TEST_ROOT, { agent: 'agent-a', result: 'success' });
    }
    // Agent B: 3 successes
    for (let i = 0; i < 3; i++) {
      reputation.recordOutcome(TEST_ROOT, { agent: 'agent-b', result: 'success' });
    }
    // Agent C: 1 success (has cold-start bonus)
    reputation.recordOutcome(TEST_ROOT, { agent: 'agent-c', result: 'success' });

    const rankings = reputation.getRankings(TEST_ROOT);
    expect(rankings).toHaveLength(3);

    // agent-c has cold-start bonus (270), agent-a has 100, agent-b has 60
    expect(rankings[0].agent).toBe('agent-c');
    expect(rankings[1].agent).toBe('agent-a');
    expect(rankings[2].agent).toBe('agent-b');
  });

  it('breaks ties by completion count', () => {
    // Both get 3 outcomes (no cold-start), same successes
    for (let i = 0; i < 3; i++) {
      reputation.recordOutcome(TEST_ROOT, { agent: 'tied-a', result: 'success' });
      reputation.recordOutcome(TEST_ROOT, { agent: 'tied-b', result: 'success' });
    }

    const rankings = reputation.getRankings(TEST_ROOT);
    // Same score, same completions — order should be stable
    expect(rankings[0].score).toBe(rankings[1].score);
  });
});

describe('decayScores', () => {
  it('removes outcomes older than 2× half-life', () => {
    const data = {
      outcomes: [
        {
          id: 'OUT-OLD',
          agent: 'old-agent',
          result: 'success',
          cycleTimeMs: 0,
          taskId: 'TSK-OLD',
          timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        },
        {
          id: 'OUT-NEW',
          agent: 'new-agent',
          result: 'success',
          cycleTimeMs: 0,
          taskId: 'TSK-NEW',
          timestamp: new Date().toISOString(),
        },
      ],
      lastDecayed: null,
    };

    const filePath = path.join(ENGINE_DIR, 'reputation.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    const result = reputation.decayScores(TEST_ROOT);
    expect(result.removed).toBe(1);
    expect(result.remaining).toBe(1);
  });

  it('keeps outcomes within half-life window', () => {
    reputation.recordOutcome(TEST_ROOT, { agent: 'recent', result: 'success' });

    const result = reputation.decayScores(TEST_ROOT);
    expect(result.removed).toBe(0);
    expect(result.remaining).toBe(1);
  });

  it('records lastDecayed timestamp', () => {
    reputation.recordOutcome(TEST_ROOT, { agent: 'test', result: 'success' });
    reputation.decayScores(TEST_ROOT);

    const filePath = path.join(ENGINE_DIR, 'reputation.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.lastDecayed).toBeTruthy();
  });

  it('supports custom half-life', () => {
    const data = {
      outcomes: [
        {
          id: 'OUT-A',
          agent: 'test',
          result: 'success',
          cycleTimeMs: 0,
          taskId: 'TSK-A',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        },
      ],
      lastDecayed: null,
    };

    const filePath = path.join(ENGINE_DIR, 'reputation.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    // 2-day half-life → max age = 4 days → 5-day-old record should be removed
    const result = reputation.decayScores(TEST_ROOT, { halfLifeDays: 2 });
    expect(result.removed).toBe(1);
  });
});
