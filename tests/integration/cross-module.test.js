import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Cross-Module Integration', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-integration-'));
    // Set up minimal .agent structure
    const agentDir = path.join(tempRoot, '.agent');
    const engineDir = path.join(agentDir, 'engine');
    fs.mkdirSync(engineDir, { recursive: true });

    // Copy workflow-state.json from project
    const projectRoot = path.resolve(__dirname, '../..');
    const wsSource = path.join(projectRoot, '.agent', 'engine', 'workflow-state.json');
    fs.copyFileSync(wsSource, path.join(engineDir, 'workflow-state.json'));

    // Copy reliability-config.json
    const rcSource = path.join(projectRoot, '.agent', 'engine', 'reliability-config.json');
    fs.copyFileSync(rcSource, path.join(engineDir, 'reliability-config.json'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  describe('Workflow Engine + Task Model', () => {
    it('should transition workflow and create tasks in same project', () => {
      const workflowEngine = require('../../lib/workflow-engine');
      const taskModel = require('../../lib/task-model');

      // Start at IDLE, transition to EXPLORE
      const result = workflowEngine.executeTransition(tempRoot, 'EXPLORE');
      expect(result.success).toBe(true);
      expect(result.fromPhase).toBe('IDLE');
      expect(result.toPhase).toBe('EXPLORE');

      // Create a task in the same project
      const task = taskModel.createTask(tempRoot, {
        title: 'Explore codebase structure',
        priority: 'high',
      });
      expect(task.id).toMatch(/^TSK-/);
      expect(task.status).toBe('open');

      // Verify workflow phase persisted
      const phase = workflowEngine.getCurrentPhase(tempRoot);
      expect(phase).toBe('EXPLORE');

      // Verify tasks persisted
      const tasks = taskModel.listTasks(tempRoot);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Explore codebase structure');
    });
  });

  describe('Workflow Engine + Events', () => {
    it('should emit events on workflow transitions', () => {
      const workflowEngine = require('../../lib/workflow-engine');
      const workflowEvents = require('../../lib/workflow-events');

      const events = [];
      workflowEvents.on(workflowEvents.EVENTS.TRANSITION_COMPLETE, (event) => {
        events.push(event);
      });

      workflowEngine.executeTransition(tempRoot, 'EXPLORE');

      expect(events).toHaveLength(1);
      expect(events[0].fromPhase).toBe('IDLE');
      expect(events[0].toPhase).toBe('EXPLORE');

      workflowEvents.removeAllListeners();
    });
  });

  describe('Task Model + Engineering Manager', () => {
    it('should sort tasks by priority using shared utility', () => {
      const taskModel = require('../../lib/task-model');

      taskModel.createTask(tempRoot, { title: 'Low priority', priority: 'low' });
      taskModel.createTask(tempRoot, { title: 'Critical fix', priority: 'critical' });
      taskModel.createTask(tempRoot, { title: 'Medium task', priority: 'medium' });

      const tasks = taskModel.listTasks(tempRoot);
      const sorted = taskModel.sortByPriority(tasks);

      expect(sorted[0].priority).toBe('critical');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');

      // Verify original array was not mutated
      expect(tasks[0].priority).toBe('low');
    });
  });

  describe('Error Budget + Metrics', () => {
    it('should record results and generate budget report', () => {
      const errorBudget = require('../../lib/error-budget');

      errorBudget.recordTestResult(tempRoot, 99, 1);
      errorBudget.recordBuildResult(tempRoot, true);
      errorBudget.recordDeployResult(tempRoot, true);

      const report = errorBudget.getBudgetReport(tempRoot);
      expect(report.status).toBe('HEALTHY');
      expect(report.rates.testFailureRate).toBe(1);
      expect(report.rates.buildFailureRate).toBe(0);
    });

    it('should archive metrics before reset', () => {
      const errorBudget = require('../../lib/error-budget');

      errorBudget.recordTestResult(tempRoot, 90, 10);
      const result = errorBudget.resetMetrics(tempRoot);

      expect(result.archived).toBe(true);
      expect(result.archivePath).toBeTruthy();
      expect(fs.existsSync(result.archivePath)).toBe(true);

      // Verify metrics were reset
      const metrics = errorBudget.loadMetrics(tempRoot);
      expect(metrics.testsPassed).toBe(0);
      expect(metrics.testsFailed).toBe(0);

      // Verify archive has history
      const history = errorBudget.getMetricsHistory(tempRoot);
      expect(history).toHaveLength(1);
      expect(history[0].testsPassed).toBe(90);
    });
  });

  describe('Conflict Detector + Task Governance', () => {
    it('should detect file conflicts between agents', () => {
      const conflictDetector = require('../../lib/conflict-detector');

      // Agent A claims a file
      const claim1 = conflictDetector.claimFile(tempRoot, 'src/app.js', 'architect');
      expect(claim1.success).toBe(true);

      // Agent B tries to claim the same file
      const claim2 = conflictDetector.claimFile(tempRoot, 'src/app.js', 'frontend-specialist');
      expect(claim2.success).toBe(false);
      expect(claim2.conflict.agents).toContain('architect');
      expect(claim2.conflict.agents).toContain('frontend-specialist');

      // Release and re-claim should succeed
      conflictDetector.releaseFile(tempRoot, 'src/app.js', 'architect');
      const claim3 = conflictDetector.claimFile(tempRoot, 'src/app.js', 'frontend-specialist');
      expect(claim3.success).toBe(true);
    });
  });

  describe('Circuit Breaker + Rate Limiter', () => {
    it('should work together to protect operations', () => {
      const { createCircuitBreaker } = require('../../lib/circuit-breaker');
      const { createRateLimiter } = require('../../lib/rate-limiter');

      const breaker = createCircuitBreaker('test-op', { failureThreshold: 2 });
      const limiter = createRateLimiter('test-op', { maxTokens: 3 });

      // Successful operations consume rate limit tokens
      const result1 = limiter.tryAcquire();
      expect(result1.allowed).toBe(true);
      const value = breaker.execute(() => 'success');
      expect(value).toBe('success');

      // Failed operations trigger circuit breaker
      try { breaker.execute(() => { throw new Error('fail'); }); } catch {}
      try { breaker.execute(() => { throw new Error('fail'); }); } catch {}

      // Circuit is now open
      expect(breaker.getState().state).toBe('OPEN');

      // Rate limit still has tokens but circuit prevents execution
      const result2 = limiter.tryAcquire();
      expect(result2.allowed).toBe(true);
      expect(() => breaker.execute(() => 'test')).toThrow('OPEN');
    });
  });
});
