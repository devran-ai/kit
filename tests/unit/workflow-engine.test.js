import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Workflow Engine Tests
 *
 * Tests the first runtime enforcement layer — validates that
 * workflow-state.json transitions are correctly enforced.
 */

const crypto = await import('crypto');

const ROOT = path.resolve(import.meta.dirname, '../..');

// Use a UNIQUE temp directory for each test run to prevent race conditions
// when Vitest runs test files in parallel threads
let TMP_PROJECT;
let STATE_DIR;
let STATE_FILE;

/** @returns {object} A fresh workflow state for testing */
function createTestState() {
  return {
    schemaVersion: '1.0.0',
    currentPhase: 'IDLE',
    startedAt: null,
    phases: {
      EXPLORE: { status: 'pending', description: 'Discovery', startedAt: null, completedAt: null, artifact: null },
      PLAN: { status: 'pending', description: 'Planning', startedAt: null, completedAt: null, artifact: null },
      IMPLEMENT: { status: 'pending', description: 'Implementation', startedAt: null, completedAt: null, artifact: null },
      VERIFY: { status: 'pending', description: 'Verification', startedAt: null, completedAt: null, artifact: null },
      CHECKPOINT: { status: 'pending', description: 'Decision gate', startedAt: null, completedAt: null, artifact: null },
      REVIEW: { status: 'pending', description: 'Review', startedAt: null, completedAt: null, artifact: null },
      DEPLOY: { status: 'pending', description: 'Deployment', startedAt: null, completedAt: null, artifact: null },
      MAINTAIN: { status: 'pending', description: 'Maintenance', startedAt: null, completedAt: null, artifact: null },
    },
    transitions: [
      { from: 'IDLE', to: 'EXPLORE', trigger: 'New task started', guard: 'No active workflow' },
      { from: 'IDLE', to: 'PLAN', trigger: 'Known requirements', guard: 'Requirements clear' },
      { from: 'EXPLORE', to: 'PLAN', trigger: 'Discovery complete', guard: 'Artifact exists' },
      { from: 'PLAN', to: 'IMPLEMENT', trigger: 'Plan approved', guard: 'Approved by user' },
      { from: 'IMPLEMENT', to: 'VERIFY', trigger: 'Implementation complete', guard: 'All items complete' },
      { from: 'VERIFY', to: 'CHECKPOINT', trigger: 'Quality gates pass', guard: 'All gates pass' },
      { from: 'VERIFY', to: 'IMPLEMENT', trigger: 'Quality gates fail', guard: 'Gates failed' },
      { from: 'CHECKPOINT', to: 'REVIEW', trigger: 'Developer chooses review/commit', guard: 'Developer selects option' },
      { from: 'CHECKPOINT', to: 'IMPLEMENT', trigger: 'Developer chooses continue working', guard: 'Developer selects continue' },
      { from: 'REVIEW', to: 'DEPLOY', trigger: 'Review approved', guard: 'No critical findings' },
      { from: 'REVIEW', to: 'IMPLEMENT', trigger: 'Changes requested', guard: 'Critical findings' },
      { from: 'DEPLOY', to: 'MAINTAIN', trigger: 'Health check passes', guard: 'Healthy' },
      { from: 'DEPLOY', to: 'REVIEW', trigger: 'Health check fails', guard: 'Failure detected' },
      { from: 'IMPLEMENT', to: 'PLAN', trigger: 'Unexpected complexity', guard: 'Plan inadequacy' },
      { from: 'MAINTAIN', to: 'IDLE', trigger: 'Monitoring complete', guard: 'No issues' },
    ],
    history: [],
  };
}

function setupTestProject() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(createTestState(), null, 2), 'utf-8');
}

function teardownTestProject() {
  if (fs.existsSync(TMP_PROJECT)) {
    fs.rmSync(TMP_PROJECT, { recursive: true });
  }
}

// Dynamic import to load CommonJS module in ESM test context
async function loadEngine() {
  // Clear require cache to get fresh state on each import
  const modulePath = path.join(ROOT, 'lib', 'workflow-engine.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Workflow Engine — Transition Enforcement', () => {
  beforeEach(() => {
    const uniqueId = crypto.randomUUID();
    TMP_PROJECT = path.join(ROOT, 'tests', `.tmp-workflow-test-${uniqueId}`);
    STATE_DIR = path.join(TMP_PROJECT, '.agent', 'engine');
    STATE_FILE = path.join(STATE_DIR, 'workflow-state.json');
    setupTestProject();
  });

  afterEach(() => {
    teardownTestProject();
  });

  // --- Load & Read ---

  it('should load workflow state from disk', async () => {
    const engine = await loadEngine();
    const { state } = engine.loadWorkflowState(TMP_PROJECT);

    expect(state.schemaVersion).toBe('1.0.0');
    expect(state.currentPhase).toBe('IDLE');
    expect(state.transitions).toHaveLength(15);
  });

  it('should return current phase as IDLE for fresh state', async () => {
    const engine = await loadEngine();
    const phase = engine.getCurrentPhase(TMP_PROJECT);

    expect(phase).toBe('IDLE');
  });

  it('should return empty history for fresh state', async () => {
    const engine = await loadEngine();
    const history = engine.getTransitionHistory(TMP_PROJECT);

    expect(history).toEqual([]);
  });

  it('should throw when workflow state file is missing', async () => {
    const engine = await loadEngine();
    const fakePath = path.join(TMP_PROJECT, 'nonexistent');

    expect(() => engine.loadWorkflowState(fakePath)).toThrow('not found');
  });

  // --- Validate ---

  it('should validate IDLE → EXPLORE as valid', async () => {
    const engine = await loadEngine();
    const result = engine.validateTransition(TMP_PROJECT, 'EXPLORE');

    expect(result.success).toBe(true);
    expect(result.fromPhase).toBe('IDLE');
    expect(result.toPhase).toBe('EXPLORE');
    expect(result.trigger).toBe('New task started');
  });

  it('should validate IDLE → PLAN as valid', async () => {
    const engine = await loadEngine();
    const result = engine.validateTransition(TMP_PROJECT, 'PLAN');

    expect(result.success).toBe(true);
  });

  it('should reject IDLE → IMPLEMENT as invalid', async () => {
    const engine = await loadEngine();
    const result = engine.validateTransition(TMP_PROJECT, 'IMPLEMENT');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid transition');
    expect(result.error).toContain('EXPLORE');
    expect(result.error).toContain('PLAN');
  });

  it('should reject IDLE → DEPLOY as invalid', async () => {
    const engine = await loadEngine();
    const result = engine.validateTransition(TMP_PROJECT, 'DEPLOY');

    expect(result.success).toBe(false);
  });

  it('should reject self-transition (same phase)', async () => {
    const engine = await loadEngine();
    const result = engine.validateTransition(TMP_PROJECT, 'IDLE');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Already in phase');
  });

  // --- Execute ---

  it('should execute IDLE → EXPLORE transition', async () => {
    const engine = await loadEngine();
    const result = engine.executeTransition(TMP_PROJECT, 'EXPLORE');

    expect(result.success).toBe(true);
    expect(result.fromPhase).toBe('IDLE');
    expect(result.toPhase).toBe('EXPLORE');
    expect(result.timestamp).toBeTruthy();

    // Verify persisted state
    const phase = engine.getCurrentPhase(TMP_PROJECT);
    expect(phase).toBe('EXPLORE');
  });

  it('should update phase records on transition', async () => {
    const engine = await loadEngine();
    engine.executeTransition(TMP_PROJECT, 'EXPLORE');

    const { state } = engine.loadWorkflowState(TMP_PROJECT);
    expect(state.phases.EXPLORE.status).toBe('active');
    expect(state.phases.EXPLORE.startedAt).toBeTruthy();
    expect(state.startedAt).toBeTruthy();
  });

  it('should append to history on each transition', async () => {
    const engine = await loadEngine();

    engine.executeTransition(TMP_PROJECT, 'EXPLORE');
    engine.executeTransition(TMP_PROJECT, 'PLAN');

    const history = engine.getTransitionHistory(TMP_PROJECT);
    expect(history).toHaveLength(2);
    expect(history[0].from).toBe('IDLE');
    expect(history[0].to).toBe('EXPLORE');
    expect(history[1].from).toBe('EXPLORE');
    expect(history[1].to).toBe('PLAN');
  });

  it('should reject invalid transition in execute', async () => {
    const engine = await loadEngine();
    const result = engine.executeTransition(TMP_PROJECT, 'DEPLOY');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid transition');

    // State should be unchanged
    const phase = engine.getCurrentPhase(TMP_PROJECT);
    expect(phase).toBe('IDLE');
  });

  it('should support multi-step workflow path', async () => {
    const engine = await loadEngine();

    // Full happy path: IDLE → EXPLORE → PLAN → IMPLEMENT → VERIFY → CHECKPOINT → REVIEW → DEPLOY → MAINTAIN → IDLE
    expect(engine.executeTransition(TMP_PROJECT, 'EXPLORE').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'PLAN').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'IMPLEMENT').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'VERIFY').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'CHECKPOINT').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'REVIEW').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'DEPLOY').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'MAINTAIN').success).toBe(true);
    expect(engine.executeTransition(TMP_PROJECT, 'IDLE').success).toBe(true);

    const history = engine.getTransitionHistory(TMP_PROJECT);
    expect(history).toHaveLength(9);
    expect(engine.getCurrentPhase(TMP_PROJECT)).toBe('IDLE');
  });

  it('should support backtracking (VERIFY → IMPLEMENT)', async () => {
    const engine = await loadEngine();

    engine.executeTransition(TMP_PROJECT, 'PLAN');
    engine.executeTransition(TMP_PROJECT, 'IMPLEMENT');
    engine.executeTransition(TMP_PROJECT, 'VERIFY');

    // Backtrack: quality gates failed
    const result = engine.executeTransition(TMP_PROJECT, 'IMPLEMENT');
    expect(result.success).toBe(true);
    expect(result.trigger).toBe('Quality gates fail');
  });

  // --- Reset ---

  it('should reset workflow to IDLE', async () => {
    const engine = await loadEngine();

    engine.executeTransition(TMP_PROJECT, 'EXPLORE');
    engine.executeTransition(TMP_PROJECT, 'PLAN');

    const result = engine.resetWorkflow(TMP_PROJECT);
    expect(result.success).toBe(true);
    expect(result.previousPhase).toBe('PLAN');
    expect(engine.getCurrentPhase(TMP_PROJECT)).toBe('IDLE');
  });

  it('should preserve history by default on reset', async () => {
    const engine = await loadEngine();

    engine.executeTransition(TMP_PROJECT, 'EXPLORE');
    engine.resetWorkflow(TMP_PROJECT);

    const history = engine.getTransitionHistory(TMP_PROJECT);
    // 1 transition + 1 reset entry
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('should clear history when preserveHistory is false', async () => {
    const engine = await loadEngine();

    engine.executeTransition(TMP_PROJECT, 'EXPLORE');
    engine.resetWorkflow(TMP_PROJECT, false);

    const history = engine.getTransitionHistory(TMP_PROJECT);
    expect(history).toHaveLength(0);
  });

  // --- Available Transitions ---

  it('should list available transitions from IDLE', async () => {
    const engine = await loadEngine();
    const { currentPhase, validTransitions } = engine.getAvailableTransitions(TMP_PROJECT);

    expect(currentPhase).toBe('IDLE');
    expect(validTransitions).toHaveLength(2);
    expect(validTransitions.map((t) => t.to)).toContain('EXPLORE');
    expect(validTransitions.map((t) => t.to)).toContain('PLAN');
  });

  it('should list available transitions from IMPLEMENT', async () => {
    const engine = await loadEngine();

    engine.executeTransition(TMP_PROJECT, 'PLAN');
    engine.executeTransition(TMP_PROJECT, 'IMPLEMENT');

    const { currentPhase, validTransitions } = engine.getAvailableTransitions(TMP_PROJECT);

    expect(currentPhase).toBe('IMPLEMENT');
    // IMPLEMENT can go to: VERIFY or PLAN
    expect(validTransitions).toHaveLength(2);
    expect(validTransitions.map((t) => t.to)).toContain('VERIFY');
    expect(validTransitions.map((t) => t.to)).toContain('PLAN');
  });
});
