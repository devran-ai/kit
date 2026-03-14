/**
 * Tests for Self-Healing Pipeline
 * @module tests/unit/self-healing.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_ROOT = path.join(os.tmpdir(), `ag-healing-test-${Date.now()}`);
const ENGINE_DIR = path.join(TEST_ROOT, '.agent', 'engine');

let healing;

beforeEach(() => {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  healing = require('../../lib/self-healing');
});

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  delete require.cache[require.resolve('../../lib/self-healing')];
});

describe('detectFailure', () => {
  it('detects test failures', () => {
    const ciOutput = `
 FAIL  tests/unit/auth.test.js > login > validates password
AssertionError: expected 401 to be 200
    `;

    const failures = healing.detectFailure(ciOutput);
    expect(failures.length).toBeGreaterThanOrEqual(1);
    expect(failures.some((f) => f.type === 'test')).toBe(true);
  });

  it('detects missing module errors', () => {
    const ciOutput = `Error: Cannot find module './utils/helpers'`;

    const failures = healing.detectFailure(ciOutput);
    expect(failures).toHaveLength(1);
    expect(failures[0].type).toBe('dependency');
    expect(failures[0].severity).toBe('high');
  });

  it('detects TypeScript build errors', () => {
    const ciOutput = `src/app.ts:15:3 - error TS2345: Argument of type 'string' is not assignable`;

    const failures = healing.detectFailure(ciOutput);
    expect(failures).toHaveLength(1);
    expect(failures[0].type).toBe('build');
    expect(failures[0].severity).toBe('critical');
  });

  it('detects syntax errors', () => {
    const ciOutput = `SyntaxError: Unexpected token '}'`;

    const failures = healing.detectFailure(ciOutput);
    expect(failures).toHaveLength(1);
    expect(failures[0].type).toBe('build');
  });

  it('returns empty for clean output', () => {
    const ciOutput = `All tests passed. Build successful.`;
    const failures = healing.detectFailure(ciOutput);
    expect(failures).toHaveLength(0);
  });

  it('handles null/empty input', () => {
    expect(healing.detectFailure(null)).toEqual([]);
    expect(healing.detectFailure('')).toEqual([]);
  });
});

describe('diagnoseFailure', () => {
  it('diagnoses import errors as auto-fixable', () => {
    const failure = { type: 'dependency', message: "Cannot find module './utils'", file: 'app.js', line: 5, severity: 'high' };
    const diagnosis = healing.diagnoseFailure(failure);

    expect(diagnosis.category).toBe('import');
    expect(diagnosis.autoFixable).toBe(true);
  });

  it('diagnoses test failures as not auto-fixable', () => {
    const failure = { type: 'test', message: 'Expected 200 to equal 401', file: 'test.js', line: 10, severity: 'high' };
    const diagnosis = healing.diagnoseFailure(failure);

    expect(diagnosis.category).toBe('assertion');
    expect(diagnosis.autoFixable).toBe(false);
  });

  it('diagnoses syntax errors as not auto-fixable', () => {
    const failure = { type: 'build', message: "SyntaxError: Unexpected token", file: 'src.js', line: 3, severity: 'critical' };
    const diagnosis = healing.diagnoseFailure(failure);

    expect(diagnosis.category).toBe('syntax');
    expect(diagnosis.autoFixable).toBe(false);
  });

  it('diagnoses lint errors as auto-fixable', () => {
    const failure = { type: 'lint', message: '10:5 error no-unused-vars', file: 'app.js', line: 10, severity: 'medium' };
    const diagnosis = healing.diagnoseFailure(failure);

    expect(diagnosis.category).toBe('config');
    expect(diagnosis.autoFixable).toBe(true);
  });
});

describe('generateFixPatch', () => {
  it('generates import fix patch', () => {
    const failure = { type: 'dependency', message: "Cannot find module './utils'", file: 'app.js', line: 1, severity: 'high' };
    const diagnosis = { category: 'import', explanation: 'Missing module', autoFixable: true };

    const patch = healing.generateFixPatch(failure, diagnosis);

    expect(patch).not.toBeNull();
    expect(patch.patchId).toMatch(/^HEAL-/);
    expect(patch.type).toBe('insert');
    expect(patch.file).toBe('app.js');
    expect(patch.confidence).toBe('medium');
  });

  it('returns null for non-fixable issues', () => {
    const failure = { type: 'test', message: 'Assertion failed', file: 'test.js', line: 5, severity: 'high' };
    const diagnosis = { category: 'assertion', explanation: 'Test failed', autoFixable: false };

    const patch = healing.generateFixPatch(failure, diagnosis);
    expect(patch).toBeNull();
  });

  it('generates patch with correct JSON structure (D-4)', () => {
    const failure = { type: 'dependency', message: "Cannot find module 'lodash'", file: 'src/app.js', line: 1, severity: 'high' };
    const diagnosis = { category: 'import', explanation: 'Missing', autoFixable: true };

    const patch = healing.generateFixPatch(failure, diagnosis);
    expect(patch).toHaveProperty('patchId');
    expect(patch).toHaveProperty('file');
    expect(patch).toHaveProperty('type');
    expect(patch).toHaveProperty('line');
    expect(patch).toHaveProperty('original');
    expect(patch).toHaveProperty('replacement');
    expect(patch).toHaveProperty('confidence');
  });
});

describe('applyFixWithConfirmation', () => {
  it('defaults to dry-run (no file changes)', () => {
    const patch = {
      patchId: 'HEAL-TEST01',
      file: 'test-file.js',
      type: 'insert',
      line: 1,
      original: '',
      replacement: "const x = 1;",
      confidence: 'high',
    };

    const result = healing.applyFixWithConfirmation(TEST_ROOT, patch);
    expect(result.applied).toBe(false);
    expect(result.preview).toContain('DRY RUN');
    expect(result.patchId).toBe('HEAL-TEST01');
  });

  it('applies patch when dryRun is false', () => {
    // Create a target file
    const targetFile = path.join(TEST_ROOT, 'fix-target.js');
    fs.writeFileSync(targetFile, 'line1\nline2\nline3\n', 'utf-8');

    const patch = {
      patchId: 'HEAL-APPLY1',
      file: 'fix-target.js',
      type: 'replace',
      line: 2,
      original: 'line2',
      replacement: 'FIXED_LINE',
      confidence: 'high',
    };

    const result = healing.applyFixWithConfirmation(TEST_ROOT, patch, { dryRun: false });
    expect(result.applied).toBe(true);

    const content = fs.readFileSync(targetFile, 'utf-8');
    expect(content).toContain('FIXED_LINE');
    expect(content).not.toContain('line2');
  });

  it('logs patch with rollback data', () => {
    const patch = {
      patchId: 'HEAL-LOG01',
      file: 'unknown',
      type: 'insert',
      line: 1,
      original: '',
      replacement: 'fix',
      confidence: 'low',
    };

    healing.applyFixWithConfirmation(TEST_ROOT, patch);

    const logPath = path.join(ENGINE_DIR, 'healing-log.json');
    const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0].rollbackData).toBeTruthy();
    expect(log.entries[0].patchId).toBe('HEAL-LOG01');
  });
});

describe('getHealingReport', () => {
  it('returns empty report initially', () => {
    const report = healing.getHealingReport(TEST_ROOT);
    expect(report.totalHeals).toBe(0);
    expect(report.successRate).toBe(0);
    expect(report.pendingPatches).toBe(0);
  });

  it('tracks heal statistics', () => {
    const patch = { patchId: 'H1', file: 'x', type: 'insert', line: 1, original: '', replacement: 'y', confidence: 'high' };

    healing.applyFixWithConfirmation(TEST_ROOT, patch); // dry-run
    healing.applyFixWithConfirmation(TEST_ROOT, patch); // dry-run

    const report = healing.getHealingReport(TEST_ROOT);
    expect(report.totalHeals).toBe(2);
    expect(report.pendingPatches).toBe(2);
  });
});

describe('log retention (C-3)', () => {
  it('prunes log to last 100 entries', () => {
    // Pre-fill with 105 entries
    const data = { entries: [] };
    for (let i = 0; i < 105; i++) {
      data.entries.push({ patchId: `H-${i}`, applied: false, dryRun: true, timestamp: new Date().toISOString() });
    }

    const logPath = path.join(ENGINE_DIR, 'healing-log.json');
    fs.writeFileSync(logPath, JSON.stringify(data, null, 2), 'utf-8');

    // Trigger a write via applyFix
    const patch = { patchId: 'H-NEW', file: 'x', type: 'insert', line: 1, original: '', replacement: 'y', confidence: 'high' };
    healing.applyFixWithConfirmation(TEST_ROOT, patch);

    const updatedLog = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    expect(updatedLog.entries.length).toBeLessThanOrEqual(100);
  });
});
