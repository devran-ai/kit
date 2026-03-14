/**
 * Antigravity AI Kit — Self-Healing Pipeline
 *
 * Detects CI failures, diagnoses root causes, generates
 * JSON fix patches, and applies with confirmation.
 *
 * @module lib/self-healing
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AGENT_DIR = '.agent';
const ENGINE_DIR = 'engine';
const HEALING_LOG_FILE = 'healing-log.json';
const LAST_CI_OUTPUT_FILE = 'last-ci-output.txt';

/** Maximum healing log entries before pruning */
const MAX_LOG_ENTRIES = 100;

/**
 * @typedef {object} FailureDetection
 * @property {string} type - Failure type: 'test' | 'build' | 'dependency' | 'lint'
 * @property {string} message - Failure message
 * @property {string | null} file - Affected file (if detectable)
 * @property {number | null} line - Line number (if detectable)
 * @property {string} severity - 'critical' | 'high' | 'medium' | 'low'
 */

/**
 * @typedef {object} Diagnosis
 * @property {string} category - Root cause: 'syntax' | 'import' | 'type' | 'config' | 'assertion' | 'unknown'
 * @property {string} explanation - Human-readable diagnosis
 * @property {boolean} autoFixable - Whether auto-fix is possible
 */

/**
 * @typedef {object} FixPatch
 * @property {string} patchId - Unique patch ID
 * @property {string} file - Target file path
 * @property {'insert' | 'replace' | 'delete'} type - Patch operation type
 * @property {number | null} line - Target line number
 * @property {string} original - Original content (for replace/delete)
 * @property {string} replacement - New content (for insert/replace)
 * @property {'high' | 'medium' | 'low'} confidence - Fix confidence level
 */

/**
 * Resolves the healing log file path.
 *
 * @param {string} projectRoot - Root directory
 * @returns {string}
 */
function resolveHealingLogPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, HEALING_LOG_FILE);
}

/**
 * Loads the healing log from disk.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ entries: object[] }}
 */
function loadHealingLog(projectRoot) {
  const filePath = resolveHealingLogPath(projectRoot);

  if (!fs.existsSync(filePath)) {
    return { entries: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { entries: [] };
  }
}

/**
 * Writes the healing log atomically with pruning.
 *
 * @param {string} projectRoot - Root directory
 * @param {{ entries: object[] }} data
 * @returns {void}
 */
function writeHealingLog(projectRoot, data) {
  const filePath = resolveHealingLogPath(projectRoot);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Prune to last MAX_LOG_ENTRIES
  if (data.entries.length > MAX_LOG_ENTRIES) {
    data.entries = data.entries.slice(-MAX_LOG_ENTRIES);
  }

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, filePath);
}

// ═══════════════════════════════════════════════════
// Failure Detection Patterns
// ═══════════════════════════════════════════════════

/** @type {{ pattern: RegExp, type: string, severity: string }[]} */
const FAILURE_PATTERNS = [
  // Test failures
  {
    pattern: /FAIL\s+([\w./\\-]+)\s*>/,
    type: 'test',
    severity: 'high',
  },
  {
    pattern: /AssertionError:\s*(.+)/,
    type: 'test',
    severity: 'high',
  },
  {
    pattern: /Expected\s*(.+)\s*to\s*(equal|be|match)/i,
    type: 'test',
    severity: 'high',
  },
  // Build failures
  {
    pattern: /error TS(\d+):\s*(.+)/,
    type: 'build',
    severity: 'critical',
  },
  {
    pattern: /SyntaxError:\s*(.+)/,
    type: 'build',
    severity: 'critical',
  },
  // Import/dependency issues
  {
    pattern: /Cannot find module '([^']+)'/,
    type: 'dependency',
    severity: 'high',
  },
  {
    pattern: /Module not found:\s*(.+)/,
    type: 'dependency',
    severity: 'high',
  },
  {
    pattern: /ERR_MODULE_NOT_FOUND/,
    type: 'dependency',
    severity: 'high',
  },
  // Lint errors
  {
    pattern: /(\d+):(\d+)\s+error\s+(.+?)\s+([\w/-]+)$/m,
    type: 'lint',
    severity: 'medium',
  },
  {
    pattern: /eslint.*error/i,
    type: 'lint',
    severity: 'medium',
  },
];

/**
 * Detects failures from raw CI output text.
 *
 * @param {string} ciOutput - Raw CI log text
 * @returns {FailureDetection[]}
 */
function detectFailure(ciOutput) {
  if (!ciOutput || typeof ciOutput !== 'string') {
    return [];
  }

  /** @type {FailureDetection[]} */
  const failures = [];
  const lines = ciOutput.split('\n');

  for (const line of lines) {
    for (const { pattern, type, severity } of FAILURE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Try to extract file and line from context
        const fileMatch = line.match(/([\w./\\-]+\.(js|ts|jsx|tsx|json))/);
        const lineMatch = line.match(/:(\d+):/);

        failures.push({
          type,
          message: match[0].trim(),
          file: fileMatch ? fileMatch[1] : null,
          line: lineMatch ? parseInt(lineMatch[1], 10) : null,
          severity,
        });
        break; // One match per line
      }
    }
  }

  return failures;
}

// ═══════════════════════════════════════════════════
// Failure Diagnosis
// ═══════════════════════════════════════════════════

/**
 * Diagnoses the root cause of a detected failure.
 *
 * @param {FailureDetection} failure - Detected failure
 * @returns {Diagnosis}
 */
function diagnoseFailure(failure) {
  const message = failure.message.toLowerCase();

  // Import/module issues
  if (failure.type === 'dependency' || message.includes('cannot find module') || message.includes('module not found')) {
    return {
      category: 'import',
      explanation: `Missing module or incorrect import path: ${failure.message}`,
      autoFixable: true,
    };
  }

  // Syntax errors
  if (failure.type === 'build' && message.includes('syntaxerror')) {
    return {
      category: 'syntax',
      explanation: `Syntax error in source code: ${failure.message}`,
      autoFixable: false,
    };
  }

  // TypeScript type errors
  if (failure.type === 'build' && message.includes('error ts')) {
    return {
      category: 'type',
      explanation: `TypeScript type error: ${failure.message}`,
      autoFixable: false,
    };
  }

  // Test assertion failures
  if (failure.type === 'test') {
    return {
      category: 'assertion',
      explanation: `Test assertion failed — requires manual review: ${failure.message}`,
      autoFixable: false,
    };
  }

  // Lint errors
  if (failure.type === 'lint') {
    return {
      category: 'config',
      explanation: `Lint rule violation: ${failure.message}`,
      autoFixable: true,
    };
  }

  return {
    category: 'unknown',
    explanation: `Unclassified failure: ${failure.message}`,
    autoFixable: false,
  };
}

// ═══════════════════════════════════════════════════
// Fix Patch Generation
// ═══════════════════════════════════════════════════

/**
 * Generates a fix patch for a diagnosed failure.
 * Only generates patches for auto-fixable issues.
 *
 * @param {FailureDetection} failure - Detected failure
 * @param {Diagnosis} diagnosis - Diagnosis result
 * @returns {FixPatch | null} Generated patch, or null if not auto-fixable
 */
function generateFixPatch(failure, diagnosis) {
  if (!diagnosis.autoFixable) {
    return null;
  }

  const patchId = `HEAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // Missing import → suggest adding import
  if (diagnosis.category === 'import') {
    const moduleMatch = failure.message.match(/(?:Cannot find module|Module not found)[:\s]*'?([^'"\s]+)/i);
    const moduleName = moduleMatch ? moduleMatch[1] : 'unknown-module';

    return {
      patchId,
      file: failure.file || 'unknown',
      type: 'insert',
      line: 1,
      original: '',
      replacement: `const ${moduleName.replace(/[^a-zA-Z]/g, '')} = require('${moduleName}');`,
      confidence: 'medium',
    };
  }

  // Lint fix → suggest formatting change
  if (diagnosis.category === 'config') {
    return {
      patchId,
      file: failure.file || 'unknown',
      type: 'replace',
      line: failure.line,
      original: failure.message,
      replacement: `// TODO: Fix lint rule — ${failure.message}`,
      confidence: 'low',
    };
  }

  return null;
}

/**
 * Applies a fix patch with confirmation safeguard.
 * Dry-run by default — requires explicit opt-in for file writes.
 *
 * @param {string} projectRoot - Root directory
 * @param {FixPatch} patch - Patch to apply
 * @param {object} [options] - Apply options
 * @param {boolean} [options.dryRun] - If true (default), just preview
 * @returns {{ applied: boolean, preview: string, patchId: string }}
 */
function applyFixWithConfirmation(projectRoot, patch, options = {}) {
  const dryRun = options.dryRun !== false; // Default: true

  const logEntry = {
    patchId: patch.patchId,
    file: patch.file,
    type: patch.type,
    applied: false,
    dryRun,
    timestamp: new Date().toISOString(),
    rollbackData: {
      original: patch.original,
      line: patch.line,
    },
  };

  const preview = [
    `Patch: ${patch.patchId}`,
    `File: ${patch.file}`,
    `Type: ${patch.type}`,
    `Line: ${patch.line || 'N/A'}`,
    `Confidence: ${patch.confidence}`,
    `Original: ${patch.original || '(empty)'}`,
    `Replacement: ${patch.replacement}`,
    dryRun ? '[DRY RUN — no changes applied]' : '[APPLIED]',
  ].join('\n');

  if (!dryRun && patch.file !== 'unknown') {
    const targetPath = path.join(projectRoot, patch.file);

    if (fs.existsSync(targetPath)) {
      try {
        const content = fs.readFileSync(targetPath, 'utf-8');
        const lines = content.split('\n');

        if (patch.type === 'insert' && patch.line !== null) {
          const insertIndex = Math.max(0, (patch.line || 1) - 1);
          lines.splice(insertIndex, 0, patch.replacement);
        } else if (patch.type === 'replace' && patch.line !== null) {
          const replaceIndex = (patch.line || 1) - 1;
          if (replaceIndex >= 0 && replaceIndex < lines.length) {
            lines[replaceIndex] = patch.replacement;
          }
        } else if (patch.type === 'delete' && patch.line !== null) {
          const deleteIndex = (patch.line || 1) - 1;
          if (deleteIndex >= 0 && deleteIndex < lines.length) {
            lines.splice(deleteIndex, 1);
          }
        }

        const tempPath = `${targetPath}.tmp`;
        fs.writeFileSync(tempPath, lines.join('\n'), 'utf-8');
        fs.renameSync(tempPath, targetPath);

        logEntry.applied = true;
      } catch {
        logEntry.applied = false;
      }
    }
  }

  // Log the action
  const log = loadHealingLog(projectRoot);
  log.entries.push(logEntry);
  writeHealingLog(projectRoot, log);

  return {
    applied: logEntry.applied,
    preview,
    patchId: patch.patchId,
  };
}

/**
 * Returns the healing report: recent heal activities and stats.
 *
 * @param {string} projectRoot - Root directory
 * @returns {{ totalHeals: number, successRate: number, recentEntries: object[], pendingPatches: number }}
 */
function getHealingReport(projectRoot) {
  const log = loadHealingLog(projectRoot);
  const entries = log.entries || [];

  const applied = entries.filter((e) => e.applied).length;
  const dryRuns = entries.filter((e) => e.dryRun && !e.applied).length;

  return {
    totalHeals: entries.length,
    successRate: entries.length > 0 ? Math.round((applied / entries.length) * 100) : 0,
    recentEntries: entries.slice(-5),
    pendingPatches: dryRuns,
  };
}

module.exports = {
  detectFailure,
  diagnoseFailure,
  generateFixPatch,
  applyFixWithConfirmation,
  getHealingReport,
};
