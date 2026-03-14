import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-governance-test');
const ENGINE_DIR = path.join(TMP_PROJECT, '.agent', 'engine');

function setupTestProject() {
  fs.mkdirSync(path.join(ENGINE_DIR, 'locks'), { recursive: true });
}

function teardownTestProject() {
  if (fs.existsSync(TMP_PROJECT)) {
    fs.rmSync(TMP_PROJECT, { recursive: true });
  }
}

async function loadGovernance() {
  const modulePath = path.join(ROOT, 'lib', 'task-governance.js');
  delete require.cache[require.resolve(modulePath)];
  // Also clear task-model cache
  delete require.cache[require.resolve(path.join(ROOT, 'lib', 'task-model.js'))];
  return require(modulePath);
}

async function loadTaskModel() {
  const modulePath = path.join(ROOT, 'lib', 'task-model.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Task Governance Engine', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should lock a task', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Test task' });

    const result = governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123', 'Working on it');
    expect(result.success).toBe(true);
  });

  it('should prevent double-locking by different identity', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Test task' });

    governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123');
    const result = governance.lockTask(TMP_PROJECT, task.id, 'dev-def456');

    expect(result.success).toBe(false);
    expect(result.error).toContain('already locked');
  });

  it('should allow same identity to re-lock', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Test task' });

    governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123');
    const result = governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123');

    expect(result.success).toBe(true);
  });

  it('should unlock a task by lock holder', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Test task' });

    governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123');
    const result = governance.unlockTask(TMP_PROJECT, task.id, 'dev-abc123');

    expect(result.success).toBe(true);
  });

  it('should check task lock status', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Test task' });

    expect(governance.isTaskLocked(TMP_PROJECT, task.id).locked).toBe(false);

    governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123');
    const lockStatus = governance.isTaskLocked(TMP_PROJECT, task.id);

    expect(lockStatus.locked).toBe(true);
    expect(lockStatus.lock.lockedBy).toBe('dev-abc123');
  });

  it('should assign a task with governance', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Assign test' });

    const result = governance.assignTask(TMP_PROJECT, task.id, 'dev-target', 'dev-performer');
    expect(result.success).toBe(true);
  });

  it('should block assignment when locked by another identity', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Locked task' });

    governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123');
    const result = governance.assignTask(TMP_PROJECT, task.id, 'dev-target', 'dev-other');

    expect(result.success).toBe(false);
    expect(result.error).toContain('locked');
  });

  it('should record audit trail entries', async () => {
    const taskModel = await loadTaskModel();
    const governance = await loadGovernance();
    const task = taskModel.createTask(TMP_PROJECT, { title: 'Audited task' });

    governance.lockTask(TMP_PROJECT, task.id, 'dev-abc123');
    governance.assignTask(TMP_PROJECT, task.id, 'dev-target', 'dev-abc123');
    governance.unlockTask(TMP_PROJECT, task.id, 'dev-abc123');

    const trail = governance.getAuditTrail(TMP_PROJECT, task.id);
    expect(trail.length).toBe(3); // lock + assign + unlock
    expect(trail[0].action).toBe('lock');
    expect(trail[1].action).toBe('assign');
    expect(trail[2].action).toBe('unlock');
  });
});
