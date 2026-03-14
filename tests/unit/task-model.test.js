import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-task-model-test');
const ENGINE_DIR = path.join(TMP_PROJECT, '.agent', 'engine');

function setupTestProject() {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
}

function teardownTestProject() {
  if (fs.existsSync(TMP_PROJECT)) {
    fs.rmSync(TMP_PROJECT, { recursive: true });
  }
}

async function loadTaskModel() {
  const modulePath = path.join(ROOT, 'lib', 'task-model.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Task Data Model', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should create a task with generated ID', async () => {
    const model = await loadTaskModel();
    const task = model.createTask(TMP_PROJECT, { title: 'Fix login bug' });

    expect(task.id).toMatch(/^TSK-/);
    expect(task.title).toBe('Fix login bug');
    expect(task.status).toBe('open');
    expect(task.priority).toBe('medium');
  });

  it('should create a task with custom priority', async () => {
    const model = await loadTaskModel();
    const task = model.createTask(TMP_PROJECT, { title: 'Critical fix', priority: 'critical' });

    expect(task.priority).toBe('critical');
  });

  it('should retrieve a task by ID', async () => {
    const model = await loadTaskModel();
    const created = model.createTask(TMP_PROJECT, { title: 'Task A' });
    const retrieved = model.getTask(TMP_PROJECT, created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved.title).toBe('Task A');
  });

  it('should list tasks with filters', async () => {
    const model = await loadTaskModel();
    model.createTask(TMP_PROJECT, { title: 'Task 1', priority: 'high' });
    model.createTask(TMP_PROJECT, { title: 'Task 2', priority: 'low' });
    model.createTask(TMP_PROJECT, { title: 'Task 3', priority: 'high' });

    const highPriority = model.listTasks(TMP_PROJECT, { priority: 'high' });
    expect(highPriority.length).toBe(2);

    const allTasks = model.listTasks(TMP_PROJECT);
    expect(allTasks.length).toBe(3);
  });

  it('should transition task through FSM: open → in-progress → review → done', async () => {
    const model = await loadTaskModel();
    const task = model.createTask(TMP_PROJECT, { title: 'Full lifecycle' });

    expect(model.transitionTask(TMP_PROJECT, task.id, 'in-progress').success).toBe(true);
    expect(model.transitionTask(TMP_PROJECT, task.id, 'review').success).toBe(true);
    expect(model.transitionTask(TMP_PROJECT, task.id, 'done').success).toBe(true);

    const completed = model.getTask(TMP_PROJECT, task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeTruthy();
  });

  it('should reject invalid status transitions', async () => {
    const model = await loadTaskModel();
    const task = model.createTask(TMP_PROJECT, { title: 'Invalid transition' });

    const result = model.transitionTask(TMP_PROJECT, task.id, 'done');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid transition');
  });

  it('should support blocked status', async () => {
    const model = await loadTaskModel();
    const task = model.createTask(TMP_PROJECT, { title: 'Blocked task' });

    expect(model.transitionTask(TMP_PROJECT, task.id, 'blocked').success).toBe(true);
    expect(model.transitionTask(TMP_PROJECT, task.id, 'open').success).toBe(true);
  });

  it('should update task fields', async () => {
    const model = await loadTaskModel();
    const task = model.createTask(TMP_PROJECT, { title: 'Original' });

    const { success, task: updated } = model.updateTask(TMP_PROJECT, task.id, {
      title: 'Updated',
      priority: 'high',
      assignee: 'architect',
    });

    expect(success).toBe(true);
    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
    expect(updated.assignee).toBe('architect');
  });

  it('should soft-delete a task', async () => {
    const model = await loadTaskModel();
    const task = model.createTask(TMP_PROJECT, { title: 'To delete' });

    model.deleteTask(TMP_PROJECT, task.id);
    const retrieved = model.getTask(TMP_PROJECT, task.id);
    expect(retrieved).toBeNull();

    // Soft-deleted tasks should not appear in list
    const allTasks = model.listTasks(TMP_PROJECT);
    expect(allTasks.length).toBe(0);
  });

  it('should compute task metrics', async () => {
    const model = await loadTaskModel();
    model.createTask(TMP_PROJECT, { title: 'Open task' });
    const doneTask = model.createTask(TMP_PROJECT, { title: 'Done task' });
    model.transitionTask(TMP_PROJECT, doneTask.id, 'in-progress');
    model.transitionTask(TMP_PROJECT, doneTask.id, 'review');
    model.transitionTask(TMP_PROJECT, doneTask.id, 'done');

    const metrics = model.getTaskMetrics(TMP_PROJECT);
    expect(metrics.total).toBe(2);
    expect(metrics.counts.open).toBe(1);
    expect(metrics.counts.done).toBe(1);
    expect(metrics.completionRate).toBe(50);
  });
});
