import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const engine = require('../../lib/onboarding-engine');

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-resume-'));
  fs.mkdirSync(path.join(dir, '.agent', 'engine'), { recursive: true });
  return dir;
}

describe('Integration — Session Resumption', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should detect incomplete onboarding and offer resumption', () => {
    // Start a session and advance 2 steps
    let state = engine.createSession('greenfield', tmpDir);
    state = engine.advancePhase(tmpDir, state);
    state = engine.advancePhase(tmpDir, state);

    // Simulate new session — check for resumable state
    const check = engine.checkSession(tmpDir);
    expect(check.active).toBe(true);
    expect(check.canResume).toBe(true);
    expect(check.stale).toBe(false);
    expect(check.state.currentStep).toBe(2);
    expect(check.state.resumeFrom).toBe(2);
  });

  it('should preserve staging directory after interruption', () => {
    const state = engine.createSession('greenfield', tmpDir);
    const stagingDir = engine.ensureStagingDir(tmpDir, state);

    // Write some files to staging
    fs.writeFileSync(path.join(stagingDir, 'ARCHITECTURE.md'), '# Arch');
    fs.writeFileSync(path.join(stagingDir, 'PRD.md'), '# PRD');

    // Simulate restart — verify staging intact
    const check = engine.checkSession(tmpDir);
    expect(check.active).toBe(true);
    expect(fs.existsSync(stagingDir)).toBe(true);
    expect(fs.readdirSync(stagingDir).filter((f) => f.endsWith('.md'))).toHaveLength(2);
  });

  it('should allow continuing from checkpointed step', () => {
    let state = engine.createSession('greenfield', tmpDir);
    state = engine.advancePhase(tmpDir, state); // step 0→1
    state = engine.advancePhase(tmpDir, state); // step 1→2

    // Simulate restart — load state from disk
    const loaded = engine.loadState(tmpDir);
    expect(loaded.currentStep).toBe(2);
    expect(loaded.completedSteps).toEqual([0, 1]);

    // Continue from step 2
    const next = engine.advancePhase(tmpDir, loaded);
    expect(next.currentStep).toBe(3);
    expect(next.completedSteps).toEqual([0, 1, 2]);
  });

  it('should clean staging on reset', () => {
    const state = engine.createSession('greenfield', tmpDir);
    const stagingDir = engine.ensureStagingDir(tmpDir, state);
    fs.writeFileSync(path.join(stagingDir, 'TEST.md'), '# Test');

    engine.resetSession(tmpDir, { cleanStaging: true });

    expect(fs.existsSync(stagingDir)).toBe(false);
    const check = engine.checkSession(tmpDir);
    expect(check.active).toBe(false);
  });

  it('should preserve staging on reset with cleanStaging=false', () => {
    const state = engine.createSession('greenfield', tmpDir);
    const stagingDir = engine.ensureStagingDir(tmpDir, state);
    fs.writeFileSync(path.join(stagingDir, 'TEST.md'), '# Test');

    engine.resetSession(tmpDir, { cleanStaging: false });

    expect(fs.existsSync(stagingDir)).toBe(true);
    expect(fs.existsSync(path.join(stagingDir, 'TEST.md'))).toBe(true);
  });

  it('should detect stale session and block resume', () => {
    const state = engine.createSession('greenfield', tmpDir);

    // Make it stale (10 days ago)
    const staleState = {
      ...state,
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    engine.saveState(tmpDir, staleState);

    const check = engine.checkSession(tmpDir);
    expect(check.stale).toBe(true);
    expect(check.canResume).toBe(false);
    expect(check.active).toBe(true);
  });

  it('should allow new session after reset of stale session', () => {
    const state = engine.createSession('greenfield', tmpDir);
    const staleState = {
      ...state,
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    engine.saveState(tmpDir, staleState);

    // Reset clears the stale session
    engine.resetSession(tmpDir);

    // Now a new session should work
    const newState = engine.createSession('brownfield', tmpDir);
    expect(newState.status).toBe('in-progress');
    expect(newState.workflow).toBe('brownfield');
  });

  it('should preserve completed steps and artifacts across restart', () => {
    let state = engine.createSession('greenfield', tmpDir);
    state = engine.advancePhase(tmpDir, state, { discovery: 'profile-data' });

    // Restart
    const loaded = engine.loadState(tmpDir);
    expect(loaded.artifacts.DISCOVERY).toEqual({ discovery: 'profile-data' });
    expect(loaded.stepMetrics).toHaveLength(1);
    expect(loaded.stepMetrics[0].phase).toBe('DISCOVERY');
  });
});
