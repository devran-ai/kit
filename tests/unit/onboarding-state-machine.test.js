import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const engine = require('../../lib/onboarding-engine');

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-sm-'));
  fs.mkdirSync(path.join(dir, '.agent', 'engine'), { recursive: true });
  return dir;
}

describe('State Machine — Full Phase Traversal', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should traverse all 6 phases from DISCOVERY to COMPLETE', () => {
    let state = engine.createSession('greenfield', tmpDir);
    expect(state.currentStep).toBe(0);

    for (let i = 0; i < engine.PHASES.length; i++) {
      expect(state.status).toBe(i < engine.PHASES.length ? 'in-progress' : 'complete');
      state = engine.advancePhase(tmpDir, state, { step: i });
    }

    expect(state.status).toBe('complete');
    expect(state.completedSteps).toHaveLength(engine.PHASES.length);
    expect(state.currentStep).toBe(engine.PHASES.length);
    expect(state.canResume).toBe(false);
    expect(state.resumeFrom).toBeNull();
    expect(state.completedAt).toBeDefined();
  });

  it('should record all artifacts during traversal', () => {
    let state = engine.createSession('greenfield', tmpDir);
    const artifacts = {};

    for (let i = 0; i < engine.PHASES.length; i++) {
      const artifact = { phase: engine.PHASES[i], data: `result-${i}` };
      state = engine.advancePhase(tmpDir, state, artifact);
      artifacts[engine.PHASES[i]] = artifact;
    }

    for (const phase of engine.PHASES) {
      expect(state.artifacts[phase]).toBeDefined();
      expect(state.artifacts[phase].phase).toBe(phase);
    }
  });
});

describe('State Machine — Resumption from Every Checkpoint', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should be resumable from each intermediate step', () => {
    let state = engine.createSession('greenfield', tmpDir);

    for (let i = 0; i < engine.PHASES.length - 1; i++) {
      state = engine.advancePhase(tmpDir, state);
      expect(state.canResume).toBe(true);
      expect(state.resumeFrom).toBe(i + 1);

      // Verify persisted state is resumable
      const loaded = engine.loadState(tmpDir);
      expect(loaded.canResume).toBe(true);
      expect(loaded.resumeFrom).toBe(i + 1);
      expect(loaded.currentStep).toBe(i + 1);
    }
  });

  it('should preserve state across session restart', () => {
    let state = engine.createSession('greenfield', tmpDir);
    state = engine.advancePhase(tmpDir, state); // step 0 → 1
    state = engine.advancePhase(tmpDir, state); // step 1 → 2

    // Simulate session restart by loading from disk
    const loaded = engine.loadState(tmpDir);
    expect(loaded.currentStep).toBe(2);
    expect(loaded.completedSteps).toEqual([0, 1]);
    expect(loaded.status).toBe('in-progress');

    // Can continue advancing from loaded state
    const next = engine.advancePhase(tmpDir, loaded);
    expect(next.currentStep).toBe(3);
  });
});

describe('State Machine — Invalid Transitions Rejected', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should reject advancement from idle status', () => {
    const state = engine.createInitialState();
    expect(() => engine.advancePhase(tmpDir, state)).toThrow('Cannot advance');
  });

  it('should reject advancement from complete status', () => {
    let state = engine.createSession('greenfield', tmpDir);
    for (let i = 0; i < engine.PHASES.length; i++) {
      state = engine.advancePhase(tmpDir, state);
    }
    expect(state.status).toBe('complete');
    expect(() => engine.advancePhase(tmpDir, state)).toThrow('Cannot advance');
  });

  it('should reject advancement from failed status', () => {
    const state = { ...engine.createInitialState(), status: 'failed' };
    expect(() => engine.advancePhase(tmpDir, state)).toThrow('Cannot advance');
  });
});

describe('State Machine — Stale Session Detection', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should detect stale session (>7 days old)', () => {
    const state = engine.createSession('greenfield', tmpDir);

    // Overwrite startedAt to 10 days ago
    const staleState = {
      ...state,
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    engine.saveState(tmpDir, staleState);

    const check = engine.checkSession(tmpDir);
    expect(check.active).toBe(true);
    expect(check.stale).toBe(true);
    expect(check.canResume).toBe(false);
  });

  it('should not flag fresh session as stale', () => {
    engine.createSession('greenfield', tmpDir);
    const check = engine.checkSession(tmpDir);
    expect(check.stale).toBe(false);
    expect(check.canResume).toBe(true);
  });
});

describe('State Machine — Brownfield Refresh Mode', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should preserve previousProfile when re-onboarding brownfield', () => {
    // Complete a greenfield session first
    let state = engine.createSession('greenfield', tmpDir);
    for (let i = 0; i < engine.PHASES.length; i++) {
      state = engine.advancePhase(tmpDir, state);
    }

    // Manually set projectProfile on the completed state
    const completedState = { ...state, projectProfile: { name: 'OldApp' } };
    engine.saveState(tmpDir, completedState);

    // Now start brownfield — should preserve previousProfile
    const bfState = engine.createSession('brownfield', tmpDir);
    expect(bfState.previousProfile).toEqual({ name: 'OldApp' });
  });
});

describe('State Machine — Interaction Modes', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  for (const mode of ['interactive', 'telegram', 'headless']) {
    it(`should accept ${mode} interaction mode`, () => {
      const state = engine.createSession('greenfield', tmpDir, { interactionMode: mode });
      expect(state.interactionMode).toBe(mode);
      // Reset for next iteration
      engine.resetSession(tmpDir);
    });
  }
});
