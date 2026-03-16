/**
 * Antigravity AI Kit — Enhanced Security Scanner
 *
 * Runtime injection detection, secret scanning, and anomaly alerting
 * for agent and skill files.
 *
 * @module lib/security-scanner
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { AGENT_DIR } = require('./constants');

/** Paths that are known-safe and should be excluded from injection/secret scanning */
const ALLOWLISTED_DIRS = ['decisions', 'engine'];

/** Prompt injection patterns */
const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/gi, name: 'ignore-previous', severity: 'critical' },
  { pattern: /system\s+override/gi, name: 'system-override', severity: 'critical' },
  { pattern: /you\s+are\s+now\s+a/gi, name: 'role-hijacking', severity: 'critical' },
  { pattern: /act\s+as\s+(if\s+you\s+are|a\s+different)/gi, name: 'persona-override', severity: 'high' },
  { pattern: /forget\s+(everything|your|all)/gi, name: 'memory-wipe', severity: 'critical' },
  { pattern: /disregard\s+(all|your|the)/gi, name: 'disregard-instructions', severity: 'high' },
  { pattern: /\bDAN\b.*\bjailbreak\b/gi, name: 'jailbreak-reference', severity: 'critical' },
  { pattern: /bypass\s+(safety|security|filter|restriction)/gi, name: 'bypass-safety', severity: 'critical' },
  { pattern: /pretend\s+(you|that)\s+(are|have)\s+no\s+(restrictions|rules|limits)/gi, name: 'pretend-no-rules', severity: 'high' },
];

/** Secret patterns */
const SECRET_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, name: 'api-key', severity: 'critical' },
  { pattern: /ghp_[A-Za-z0-9_]{36,}/g, name: 'github-pat', severity: 'critical' },
  { pattern: /gho_[A-Za-z0-9_]{36,}/g, name: 'github-oauth', severity: 'critical' },
  { pattern: /sk-[A-Za-z0-9]{32,}/g, name: 'openai-key', severity: 'critical' },
  { pattern: /AKIA[A-Z0-9]{16}/g, name: 'aws-access-key', severity: 'critical' },
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g, name: 'private-key', severity: 'critical' },
];

/** Maximum expected file size for agent/skill files (100KB) */
const MAX_EXPECTED_SIZE = 100 * 1024;
/** Minimum expected file size for legitimate files */
const MIN_EXPECTED_SIZE = 50;

/**
 * @typedef {object} SecurityFinding
 * @property {string} type - Finding type (injection, secret, anomaly)
 * @property {string} name - Pattern name
 * @property {'critical' | 'high' | 'medium' | 'low'} severity - Finding severity
 * @property {string} file - File where finding was detected
 * @property {number} [line] - Line number
 * @property {string} detail - Description of the finding
 */

/**
 * @typedef {object} SecurityReport
 * @property {number} filesScanned - Total files scanned
 * @property {number} criticalCount - Critical findings count
 * @property {number} highCount - High findings count
 * @property {number} mediumCount - Medium findings count
 * @property {number} lowCount - Low findings count
 * @property {SecurityFinding[]} findings - All findings
 * @property {boolean} clean - Whether no critical/high findings exist
 */

/**
 * Recursively collects scannable files from a directory.
 *
 * @param {string} dirPath - Directory to scan
 * @param {string} projectRoot - Project root for relative paths
 * @returns {string[]}
 */
function collectFiles(dirPath, projectRoot) {
  /** @type {string[]} */
  const files = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      files.push(...collectFiles(fullPath, projectRoot));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.js'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Scans for prompt injection patterns.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {SecurityFinding[]}
 */
function scanForInjection(projectRoot) {
  const agentDir = path.join(projectRoot, AGENT_DIR);
  const files = collectFiles(agentDir, projectRoot);
  /** @type {SecurityFinding[]} */
  const findings = [];

  for (const file of files) {
    const relativePath = path.relative(path.join(projectRoot, AGENT_DIR), file);

    // Skip allowlisted directories (governance docs, engine configs)
    if (ALLOWLISTED_DIRS.some((dir) => relativePath.startsWith(dir + path.sep) || relativePath.startsWith(dir + '/'))) {
      continue;
    }
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const { pattern, name, severity } of INJECTION_PATTERNS) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          findings.push({
            type: 'injection',
            name,
            severity,
            file: path.relative(projectRoot, file),
            line: lineIndex + 1,
            detail: `Prompt injection pattern "${name}" detected`,
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Scans for hardcoded secrets.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {SecurityFinding[]}
 */
function scanForSecrets(projectRoot) {
  const agentDir = path.join(projectRoot, AGENT_DIR);
  const files = collectFiles(agentDir, projectRoot);
  /** @type {SecurityFinding[]} */
  const findings = [];

  for (const file of files) {
    const relativePath = path.relative(path.join(projectRoot, AGENT_DIR), file);

    // Skip allowlisted directories and skill documentation
    if (ALLOWLISTED_DIRS.some((dir) => relativePath.startsWith(dir + path.sep) || relativePath.startsWith(dir + '/'))) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const { pattern, name, severity } of SECRET_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          findings.push({
            type: 'secret',
            name,
            severity,
            file: path.relative(projectRoot, file),
            line: lineIndex + 1,
            detail: `Potential ${name} found — never commit secrets`,
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Scans for file anomalies (unusual sizes, unexpected file types).
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {SecurityFinding[]}
 */
function scanForAnomalies(projectRoot) {
  const agentDir = path.join(projectRoot, AGENT_DIR);
  /** @type {SecurityFinding[]} */
  const findings = [];

  if (!fs.existsSync(agentDir)) {
    return findings;
  }

  const allFiles = collectAllFiles(agentDir);

  for (const file of allFiles) {
    const stats = fs.statSync(file);
    const relativePath = path.relative(projectRoot, file);
    const ext = path.extname(file).toLowerCase();

    // Check for binary files in agent directories
    const textExtensions = ['.md', '.json', '.js', '.ts', '.yaml', '.yml', '.txt', '.csv', '.toml'];
    if (!textExtensions.includes(ext) && ext !== '') {
      findings.push({
        type: 'anomaly',
        name: 'unexpected-file-type',
        severity: 'medium',
        file: relativePath,
        detail: `Unexpected file type "${ext}" in agent directory`,
      });
    }

    // Check for oversized files
    if (stats.size > MAX_EXPECTED_SIZE) {
      findings.push({
        type: 'anomaly',
        name: 'oversized-file',
        severity: 'high',
        file: relativePath,
        detail: `File size ${Math.round(stats.size / 1024)}KB exceeds ${MAX_EXPECTED_SIZE / 1024}KB limit`,
      });
    }

    // Check for suspiciously small files (possible stubs)
    if (stats.size < MIN_EXPECTED_SIZE && stats.size > 0 && textExtensions.includes(ext)) {
      findings.push({
        type: 'anomaly',
        name: 'tiny-file',
        severity: 'low',
        file: relativePath,
        detail: `File is only ${stats.size} bytes — possible incomplete stub`,
      });
    }
  }

  return findings;
}

/**
 * Collects ALL files (not just text) from a directory.
 *
 * @param {string} dirPath - Directory to scan
 * @returns {string[]}
 */
function collectAllFiles(dirPath) {
  /** @type {string[]} */
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Security: skip symlinks to prevent path traversal
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      files.push(...collectAllFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Generates a comprehensive security report.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {SecurityReport}
 */
function getSecurityReport(projectRoot) {
  const injectionFindings = scanForInjection(projectRoot);
  const secretFindings = scanForSecrets(projectRoot);
  const anomalyFindings = scanForAnomalies(projectRoot);

  const allFindings = [...injectionFindings, ...secretFindings, ...anomalyFindings];
  const agentDir = path.join(projectRoot, AGENT_DIR);
  const filesScanned = fs.existsSync(agentDir) ? collectAllFiles(agentDir).length : 0;

  return {
    filesScanned,
    criticalCount: allFindings.filter((f) => f.severity === 'critical').length,
    highCount: allFindings.filter((f) => f.severity === 'high').length,
    mediumCount: allFindings.filter((f) => f.severity === 'medium').length,
    lowCount: allFindings.filter((f) => f.severity === 'low').length,
    findings: allFindings,
    clean: allFindings.filter((f) => f.severity === 'critical' || f.severity === 'high').length === 0,
  };
}

module.exports = {
  scanForInjection,
  scanForSecrets,
  scanForAnomalies,
  getSecurityReport,
};
