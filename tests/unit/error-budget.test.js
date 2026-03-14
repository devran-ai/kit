import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-budget-test');
const ENGINE_DIR = path.join(TMP_PROJECT, '.agent', 'engine');
const CONFIG_FILE = path.join(ENGINE_DIR, 'reliability-config.json');

function createTestConfig() {
  return {
    schemaVersion: '1.0.0',
    description: 'Test config',
    errorBudget: {
      enabled: true,
      thresholds: {
        testFailureRatePercent: 5,
        buildFailureRatePercent: 2,
        deployRollbackRatePercent: 10,
      },
      resetCadence: 'monthly',
    },
  };
}

function setupTestProject() {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(createTestConfig(), null, 2), 'utf-8');
}

function teardownTestProject() {
  if (fs.existsSync(TMP_PROJECT)) {
    fs.rmSync(TMP_PROJECT, { recursive: true });
  }
}

async function loadBudget() {
  const modulePath = path.join(ROOT, 'lib', 'error-budget.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Error Budget Tracker', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should record test results and calculate failure rate', async () => {
    const budget = await loadBudget();

    budget.recordTestResult(TMP_PROJECT, 95, 5);
    const report = budget.getBudgetReport(TMP_PROJECT);

    expect(report.rates.testFailureRate).toBe(5);
  });

  it('should return HEALTHY when under thresholds', async () => {
    const budget = await loadBudget();

    budget.recordTestResult(TMP_PROJECT, 99, 1);
    budget.recordBuildResult(TMP_PROJECT, true);
    budget.recordDeployResult(TMP_PROJECT, true);

    const report = budget.getBudgetReport(TMP_PROJECT);
    expect(report.status).toBe('HEALTHY');
    expect(report.violations).toHaveLength(0);
  });

  it('should return EXHAUSTED when over thresholds', async () => {
    const budget = await loadBudget();

    budget.recordTestResult(TMP_PROJECT, 90, 10);
    const report = budget.getBudgetReport(TMP_PROJECT);

    expect(report.status).toBe('EXHAUSTED');
    expect(report.violations).toContain('testFailureRate');
  });

  it('should return WARNING near threshold boundary', async () => {
    const budget = await loadBudget();

    // 4.5% failure rate (90% of 5% threshold = 4%, so 4.5 > 4 → WARNING)
    budget.recordTestResult(TMP_PROJECT, 191, 9);
    budget.recordBuildResult(TMP_PROJECT, true);
    budget.recordDeployResult(TMP_PROJECT, true);

    const report = budget.getBudgetReport(TMP_PROJECT);
    expect(report.status).toBe('WARNING');
  });

  it('should handle empty metrics gracefully', async () => {
    const budget = await loadBudget();
    const report = budget.getBudgetReport(TMP_PROJECT);

    expect(report.status).toBe('HEALTHY');
    expect(report.rates.testFailureRate).toBe(0);
    expect(report.rates.buildFailureRate).toBe(0);
    expect(report.rates.deployRollbackRate).toBe(0);
  });

  it('should record build results correctly', async () => {
    const budget = await loadBudget();

    budget.recordBuildResult(TMP_PROJECT, true);
    budget.recordBuildResult(TMP_PROJECT, true);
    budget.recordBuildResult(TMP_PROJECT, false);

    const report = budget.getBudgetReport(TMP_PROJECT);
    expect(report.rates.buildFailureRate).toBeCloseTo(33.33, 1);
    expect(report.violations).toContain('buildFailureRate');
  });

  it('should record deploy results correctly', async () => {
    const budget = await loadBudget();

    budget.recordDeployResult(TMP_PROJECT, true);
    budget.recordDeployResult(TMP_PROJECT, false, true);

    const report = budget.getBudgetReport(TMP_PROJECT);
    expect(report.rates.deployRollbackRate).toBe(50);
    expect(report.violations).toContain('deployRollbackRate');
  });

  it('should reset metrics to zero', async () => {
    const budget = await loadBudget();

    budget.recordTestResult(TMP_PROJECT, 100, 50);
    budget.resetMetrics(TMP_PROJECT);

    const report = budget.getBudgetReport(TMP_PROJECT);
    expect(report.rates.testFailureRate).toBe(0);
    expect(report.status).toBe('HEALTHY');
  });
});
