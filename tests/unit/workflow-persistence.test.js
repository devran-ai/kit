import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-persistence-test');
const ENGINE_DIR = path.join(TMP_PROJECT, '.agent', 'engine');
const STATE_FILE = path.join(ENGINE_DIR, 'workflow-state.json');

function createTestState() {
  return {
    schemaVersion: '1.0.0',
    currentPhase: 'PLANNING',
    startedAt: '2026-01-01T00:00:00Z',
    phases: {
      IDLE: { startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T01:00:00Z' },
      PLANNING: { startedAt: '2026-01-01T01:00:00Z', completedAt: null },
    },
    transitions: [
      { from: 'IDLE', to: 'PLANNING', trigger: 'plan_approved', guard: null },
      { from: 'PLANNING', to: 'BUILDING', trigger: 'plan_approved', guard: null },
    ],
    history: [
      { from: 'IDLE', to: 'PLANNING', trigger: 'plan_approved', timestamp: '2026-01-01T01:00:00Z' },
    ],
  };
}

function setupTestProject() {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(createTestState(), null, 2), 'utf-8');
}

function teardownTestProject() {
  if (fs.existsSync(TMP_PROJECT)) {
    fs.rmSync(TMP_PROJECT, { recursive: true });
  }
}

async function loadPersistence() {
  const modulePath = path.join(ROOT, 'lib', 'workflow-persistence.js');
  delete require.cache[require.resolve(modulePath)];
  // Also clear workflow-engine cache
  const enginePath = path.join(ROOT, 'lib', 'workflow-engine.js');
  delete require.cache[require.resolve(enginePath)];
  return require(modulePath);
}

describe('Workflow Persistence', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should create a checkpoint', async () => {
    const persistence = await loadPersistence();
    const result = persistence.createCheckpoint(TMP_PROJECT, 'Before build');

    expect(result.checkpointId).toBeTruthy();
    expect(result.filePath).toContain('checkpoints');
    expect(fs.existsSync(result.filePath)).toBe(true);
  });

  it('should list checkpoints', async () => {
    const persistence = await loadPersistence();
    persistence.createCheckpoint(TMP_PROJECT, 'CP-1');
    persistence.createCheckpoint(TMP_PROJECT, 'CP-2');

    const list = persistence.listCheckpoints(TMP_PROJECT);
    expect(list.length).toBe(2);
    expect(list[0].label).toBeTruthy();
  });

  it('should resume from a checkpoint', async () => {
    const persistence = await loadPersistence();
    const { checkpointId } = persistence.createCheckpoint(TMP_PROJECT, 'Save point');

    const result = persistence.resumeFromCheckpoint(TMP_PROJECT, checkpointId);
    expect(result.success).toBe(true);
    expect(result.restoredPhase).toBe('PLANNING');
  });

  it('should throw when resuming from non-existent checkpoint', async () => {
    const persistence = await loadPersistence();
    expect(() => persistence.resumeFromCheckpoint(TMP_PROJECT, 'nonexistent')).toThrow();
  });

  it('should return workflow summary', async () => {
    const persistence = await loadPersistence();
    persistence.createCheckpoint(TMP_PROJECT);

    const summary = persistence.getWorkflowSummary(TMP_PROJECT);
    expect(summary.currentPhase).toBe('PLANNING');
    expect(summary.checkpointCount).toBe(1);
    expect(summary.transitionCount).toBeGreaterThanOrEqual(1);
  });

  it('should return empty list when no checkpoints exist', async () => {
    const persistence = await loadPersistence();
    const list = persistence.listCheckpoints(TMP_PROJECT);
    expect(list).toEqual([]);
  });
});
