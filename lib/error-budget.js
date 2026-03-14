/**
 * Antigravity AI Kit — Error Budget Tracker
 *
 * Enables reliability-config.json error budget tracking with
 * basic metrics collection. Records test, build, and deployment
 * results and calculates budget health.
 *
 * @module lib/error-budget
 * @author Emre Dursun
 * @since v2.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const AGENT_DIR = '.agent';
const ENGINE_DIR = 'engine';
const RELIABILITY_CONFIG = 'reliability-config.json';
const METRICS_FILE = 'metrics.json';

/**
 * @typedef {'HEALTHY' | 'WARNING' | 'EXHAUSTED'} BudgetStatus
 */

/**
 * @typedef {object} MetricsData
 * @property {number} testsPassed - Total tests passed
 * @property {number} testsFailed - Total tests failed
 * @property {number} buildsSucceeded - Total successful builds
 * @property {number} buildsFailed - Total failed builds
 * @property {number} deploysSucceeded - Total successful deploys
 * @property {number} deploysRolledBack - Total rolled-back deploys
 * @property {string} periodStart - ISO timestamp of period start
 * @property {string} lastUpdated - ISO timestamp of last update
 */

/**
 * @typedef {object} BudgetReport
 * @property {BudgetStatus} status - Overall budget health
 * @property {object} rates - Current failure rates
 * @property {number} rates.testFailureRate - Test failure rate (%)
 * @property {number} rates.buildFailureRate - Build failure rate (%)
 * @property {number} rates.deployRollbackRate - Deploy rollback rate (%)
 * @property {object} thresholds - Configured thresholds
 * @property {number} thresholds.testFailureRatePercent - Max test failure rate
 * @property {number} thresholds.buildFailureRatePercent - Max build failure rate
 * @property {number} thresholds.deployRollbackRatePercent - Max deploy rollback rate
 * @property {string[]} violations - Which metrics exceeded thresholds
 */

/**
 * Resolves the path to the metrics file.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Absolute path to metrics.json
 */
function resolveMetricsPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, METRICS_FILE);
}

/**
 * Resolves the path to the reliability config.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Absolute path to reliability-config.json
 */
function resolveConfigPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, RELIABILITY_CONFIG);
}

/**
 * Loads the reliability configuration.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {object} Parsed reliability config
 */
function loadConfig(projectRoot) {
  const configPath = resolveConfigPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Reliability config not found: ${configPath}`);
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

/**
 * Loads metrics data from disk, or returns defaults if file doesn't exist.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {MetricsData}
 */
function loadMetrics(projectRoot) {
  const metricsPath = resolveMetricsPath(projectRoot);

  if (!fs.existsSync(metricsPath)) {
    return createEmptyMetrics();
  }

  try {
    return JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
  } catch {
    return createEmptyMetrics();
  }
}

/**
 * Creates an empty metrics object.
 *
 * @returns {MetricsData}
 */
function createEmptyMetrics() {
  return {
    testsPassed: 0,
    testsFailed: 0,
    buildsSucceeded: 0,
    buildsFailed: 0,
    deploysSucceeded: 0,
    deploysRolledBack: 0,
    periodStart: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Writes metrics data to disk atomically.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {MetricsData} metrics - Metrics data to write
 * @returns {void}
 */
function writeMetrics(projectRoot, metrics) {
  const metricsPath = resolveMetricsPath(projectRoot);
  const tempPath = `${metricsPath}.tmp`;

  metrics.lastUpdated = new Date().toISOString();

  fs.writeFileSync(tempPath, JSON.stringify(metrics, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, metricsPath);
}

/**
 * Records the result of a test run.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {number} passed - Number of tests passed
 * @param {number} failed - Number of tests failed
 * @returns {void}
 */
function recordTestResult(projectRoot, passed, failed) {
  const metrics = loadMetrics(projectRoot);
  metrics.testsPassed += passed;
  metrics.testsFailed += failed;
  writeMetrics(projectRoot, metrics);
}

/**
 * Records the result of a build.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {boolean} success - Whether the build succeeded
 * @returns {void}
 */
function recordBuildResult(projectRoot, success) {
  const metrics = loadMetrics(projectRoot);

  if (success) {
    metrics.buildsSucceeded += 1;
  } else {
    metrics.buildsFailed += 1;
  }

  writeMetrics(projectRoot, metrics);
}

/**
 * Records the result of a deployment.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {boolean} success - Whether deploy succeeded
 * @param {boolean} [rolledBack=false] - Whether it was rolled back
 * @returns {void}
 */
function recordDeployResult(projectRoot, success, rolledBack = false) {
  const metrics = loadMetrics(projectRoot);

  if (success && !rolledBack) {
    metrics.deploysSucceeded += 1;
  }

  if (rolledBack) {
    metrics.deploysRolledBack += 1;
  }

  writeMetrics(projectRoot, metrics);
}

/**
 * Calculates a failure rate percentage safely.
 *
 * @param {number} failed - Number of failures
 * @param {number} total - Total attempts
 * @returns {number} Failure rate as percentage (0-100)
 */
function calculateRate(failed, total) {
  if (total === 0) {
    return 0;
  }
  return Number(((failed / total) * 100).toFixed(2));
}

/**
 * Generates a budget health report.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {BudgetReport}
 */
function getBudgetReport(projectRoot) {
  const config = loadConfig(projectRoot);
  const metrics = loadMetrics(projectRoot);
  const thresholds = config.errorBudget?.thresholds || {};

  const testTotal = metrics.testsPassed + metrics.testsFailed;
  const buildTotal = metrics.buildsSucceeded + metrics.buildsFailed;
  const deployTotal = metrics.deploysSucceeded + metrics.deploysRolledBack;

  const rates = {
    testFailureRate: calculateRate(metrics.testsFailed, testTotal),
    buildFailureRate: calculateRate(metrics.buildsFailed, buildTotal),
    deployRollbackRate: calculateRate(metrics.deploysRolledBack, deployTotal),
  };

  /** @type {string[]} */
  const violations = [];

  if (rates.testFailureRate > (thresholds.testFailureRatePercent || 5)) {
    violations.push('testFailureRate');
  }
  if (rates.buildFailureRate > (thresholds.buildFailureRatePercent || 2)) {
    violations.push('buildFailureRate');
  }
  if (rates.deployRollbackRate > (thresholds.deployRollbackRatePercent || 10)) {
    violations.push('deployRollbackRate');
  }

  /** @type {BudgetStatus} */
  let status = 'HEALTHY';

  if (violations.length > 0) {
    status = 'EXHAUSTED';
  } else {
    // Warning if any rate is above 80% of threshold
    const testWarning = rates.testFailureRate > (thresholds.testFailureRatePercent || 5) * 0.8;
    const buildWarning = rates.buildFailureRate > (thresholds.buildFailureRatePercent || 2) * 0.8;
    const deployWarning = rates.deployRollbackRate > (thresholds.deployRollbackRatePercent || 10) * 0.8;

    if (testWarning || buildWarning || deployWarning) {
      status = 'WARNING';
    }
  }

  return {
    status,
    rates,
    thresholds: {
      testFailureRatePercent: thresholds.testFailureRatePercent || 5,
      buildFailureRatePercent: thresholds.buildFailureRatePercent || 2,
      deployRollbackRatePercent: thresholds.deployRollbackRatePercent || 10,
    },
    violations,
  };
}

/**
 * Resets metrics for a new tracking period.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {void}
 */
function resetMetrics(projectRoot) {
  writeMetrics(projectRoot, createEmptyMetrics());
}

module.exports = {
  loadConfig,
  loadMetrics,
  recordTestResult,
  recordBuildResult,
  recordDeployResult,
  getBudgetReport,
  resetMetrics,
};
