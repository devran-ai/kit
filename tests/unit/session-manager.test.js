import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-session-test');
const STATE_DIR = path.join(TMP_PROJECT, '.agent');
const STATE_FILE = path.join(STATE_DIR, 'session-state.json');

function createTestState() {
  return {
    schemaVersion: '1.0',
    lastUpdated: null,
    session: { id: null, date: null, focus: null, status: 'new' },
    repository: { currentBranch: null, lastCommit: null, remoteSynced: false },
    currentTask: null,
    openTasks: [],
    completedTasks: [],
    blockers: [],
    notes: 'Template',
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

async function loadManager() {
  const modulePath = path.join(ROOT, 'lib', 'session-manager.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Session Manager', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should start a session with valid UUID', async () => {
    const manager = await loadManager();
    const { sessionId, state } = manager.startSession(TMP_PROJECT, 'Test focus');

    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(state.session.status).toBe('active');
    expect(state.session.focus).toBe('Test focus');
    expect(state.session.date).toBeTruthy();
  });

  it('should end a session and set status to completed', async () => {
    const manager = await loadManager();
    manager.startSession(TMP_PROJECT);
    const { success } = manager.endSession(TMP_PROJECT);

    expect(success).toBe(true);
    const state = manager.loadSessionState(TMP_PROJECT);
    expect(state.session.status).toBe('completed');
  });

  it('should return false when ending session with no active session', async () => {
    const manager = await loadManager();
    const { success } = manager.endSession(TMP_PROJECT);
    expect(success).toBe(false);
  });

  it('should add and track tasks', async () => {
    const manager = await loadManager();
    manager.startSession(TMP_PROJECT);

    const { taskId } = manager.addTask(TMP_PROJECT, 'Fix login bug', 'Auth module issue');
    expect(taskId).toMatch(/^TASK-/);

    const summary = manager.getSessionSummary(TMP_PROJECT);
    expect(summary.openTaskCount).toBe(1);
    expect(summary.currentTask).toBe(taskId);
  });

  it('should complete a task and move to completed list', async () => {
    const manager = await loadManager();
    manager.startSession(TMP_PROJECT);

    const { taskId } = manager.addTask(TMP_PROJECT, 'Task A');
    manager.completeTask(TMP_PROJECT, taskId);

    const summary = manager.getSessionSummary(TMP_PROJECT);
    expect(summary.openTaskCount).toBe(0);
    expect(summary.completedTaskCount).toBe(1);
    expect(summary.currentTask).toBeNull();
  });

  it('should handle multiple tasks correctly', async () => {
    const manager = await loadManager();
    manager.startSession(TMP_PROJECT);

    const task1 = manager.addTask(TMP_PROJECT, 'Task 1');
    await new Promise((resolve) => setTimeout(resolve, 5));
    const task2 = manager.addTask(TMP_PROJECT, 'Task 2');

    manager.completeTask(TMP_PROJECT, task1.taskId);

    const summary = manager.getSessionSummary(TMP_PROJECT);
    expect(summary.openTaskCount).toBe(1);
    expect(summary.completedTaskCount).toBe(1);
    expect(summary.currentTask).toBe(task2.taskId);
  });

  it('should write valid JSON to disk', async () => {
    const manager = await loadManager();
    manager.startSession(TMP_PROJECT);
    manager.addTask(TMP_PROJECT, 'Verify JSON');

    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});
