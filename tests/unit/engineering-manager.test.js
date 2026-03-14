/**
 * Tests for Autonomous Engineering Manager
 * @module tests/unit/engineering-manager.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_ROOT = path.join(os.tmpdir(), `ag-engmgr-test-${Date.now()}`);
const ENGINE_DIR = path.join(TEST_ROOT, '.agent', 'engine');

let engMgr;
let taskModel;

/**
 * Creates a minimal manifest.json for agent registry.
 */
function createTestManifest() {
  const manifestDir = path.join(TEST_ROOT, '.agent');
  fs.mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    capabilities: {
      agents: {
        count: 3,
        items: [
          { name: 'architect', file: 'agents/architect.md', domain: 'System design, DDD, architecture' },
          { name: 'frontend-specialist', file: 'agents/frontend.md', domain: 'React, Next.js, UI' },
          { name: 'devops-engineer', file: 'agents/devops.md', domain: 'CI/CD, Docker, deployment' },
        ],
      },
    },
  };

  fs.writeFileSync(
    path.join(manifestDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
}

beforeEach(() => {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });

  // Create empty tasks.json
  fs.writeFileSync(
    path.join(ENGINE_DIR, 'tasks.json'),
    JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), tasks: [] }, null, 2),
    'utf-8'
  );

  createTestManifest();

  taskModel = require('../../lib/task-model');
  engMgr = require('../../lib/engineering-manager');
});

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  delete require.cache[require.resolve('../../lib/engineering-manager')];
  delete require.cache[require.resolve('../../lib/task-model')];
  delete require.cache[require.resolve('../../lib/agent-registry')];
  delete require.cache[require.resolve('../../lib/agent-reputation')];
});

describe('generateSprintPlan', () => {
  it('generates a sprint plan with assignments', () => {
    taskModel.createTask(TEST_ROOT, { title: 'Design system architecture', priority: 'high' });
    taskModel.createTask(TEST_ROOT, { title: 'Build React UI components', priority: 'medium' });

    const plan = engMgr.generateSprintPlan(TEST_ROOT, { name: 'Sprint-42' });

    expect(plan.id).toMatch(/^SPR-/);
    expect(plan.name).toBe('Sprint-42');
    expect(plan.status).toBe('draft');
    expect(plan.assignments).toHaveLength(2);
    expect(plan.assignments[0].taskTitle).toBe('Design system architecture');
    expect(plan.assignments[0].suggestedAgent).toBeTruthy();
  });

  it('prioritizes critical tasks over low', () => {
    taskModel.createTask(TEST_ROOT, { title: 'Low priority task', priority: 'low' });
    taskModel.createTask(TEST_ROOT, { title: 'Critical deployment fix', priority: 'critical' });

    const plan = engMgr.generateSprintPlan(TEST_ROOT);
    expect(plan.assignments[0].priority).toBe('critical');
    expect(plan.assignments[1].priority).toBe('low');
  });

  it('respects maxTasks limit', () => {
    for (let i = 0; i < 5; i++) {
      taskModel.createTask(TEST_ROOT, { title: `Task ${i}`, priority: 'medium' });
    }

    const plan = engMgr.generateSprintPlan(TEST_ROOT, { maxTasks: 2 });
    expect(plan.assignments).toHaveLength(2);
  });

  it('handles empty task list gracefully', () => {
    const plan = engMgr.generateSprintPlan(TEST_ROOT);
    expect(plan.assignments).toHaveLength(0);
    expect(plan.status).toBe('draft');
  });

  it('persists sprint plans', () => {
    taskModel.createTask(TEST_ROOT, { title: 'Test task' });
    engMgr.generateSprintPlan(TEST_ROOT);

    const filePath = path.join(ENGINE_DIR, 'sprint-plans.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(data.plans).toHaveLength(1);
  });

  it('matches domain keywords to agents', () => {
    taskModel.createTask(TEST_ROOT, { title: 'Refactor system architecture patterns', priority: 'high' });

    const plan = engMgr.generateSprintPlan(TEST_ROOT);
    // 'architecture' and 'system' match the architect agent's domain
    expect(plan.assignments[0].suggestedAgent).toBe('architect');
  });
});

describe('autoAssignTask', () => {
  it('assigns a task to the best agent', () => {
    const task = taskModel.createTask(TEST_ROOT, { title: 'Design database schema' });

    const result = engMgr.autoAssignTask(TEST_ROOT, task.id);
    expect(result.success).toBe(true);
    expect(result.agent).toBeTruthy();
  });

  it('returns error for non-existent task', () => {
    const result = engMgr.autoAssignTask(TEST_ROOT, 'TSK-NONEXIST');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Task not found');
  });
});

describe('suggestNextTask', () => {
  it('suggests highest priority open task', () => {
    taskModel.createTask(TEST_ROOT, { title: 'Low task', priority: 'low' });
    taskModel.createTask(TEST_ROOT, { title: 'Critical bug', priority: 'critical' });

    const suggestion = engMgr.suggestNextTask(TEST_ROOT);
    expect(suggestion.task).not.toBeNull();
    expect(suggestion.task.title).toBe('Critical bug');
    expect(suggestion.reason).toContain('critical');
  });

  it('returns null when no open tasks', () => {
    const suggestion = engMgr.suggestNextTask(TEST_ROOT);
    expect(suggestion.task).toBeNull();
    expect(suggestion.reason).toContain('No open tasks');
  });
});

describe('getSprintMetrics', () => {
  it('returns zero metrics initially', () => {
    const metrics = engMgr.getSprintMetrics(TEST_ROOT);
    expect(metrics.totalSprints).toBe(0);
    expect(metrics.activeSprint).toBeNull();
    expect(metrics.velocity).toBe(0);
  });

  it('counts sprints after generation', () => {
    taskModel.createTask(TEST_ROOT, { title: 'Test' });
    engMgr.generateSprintPlan(TEST_ROOT);

    const metrics = engMgr.getSprintMetrics(TEST_ROOT);
    expect(metrics.totalSprints).toBe(1);
  });
});
