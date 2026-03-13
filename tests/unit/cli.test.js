import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const CLI_PATH = path.join(ROOT, 'bin', 'ag-kit.js');

describe('ag-kit CLI', () => {
  it('should display version with --version flag', () => {
    const output = execSync(`node "${CLI_PATH}" --version`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should display help with --help flag', () => {
    const output = execSync(`node "${CLI_PATH}" --help`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output).toContain('Antigravity AI Kit');
    expect(output).toContain('init');
    expect(output).toContain('status');
  });

  it('should display status with correct counts', () => {
    const output = execSync(`node "${CLI_PATH}" status`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output).toContain('Agents');
    expect(output).toContain('Skills');
    expect(output).toContain('Commands');
    expect(output).toContain('Workflows');
  });

  it('should init into a clean directory', () => {
    const tmpDir = path.join(ROOT, 'tests', '.tmp-init-test');
    
    // Clean up if exists from previous run
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      execSync(`node "${CLI_PATH}" init`, { cwd: tmpDir, encoding: 'utf-8' });
      
      const agentDir = path.join(tmpDir, '.agent');
      expect(fs.existsSync(agentDir)).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'agents'))).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'skills'))).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'commands'))).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'workflows'))).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'rules.md'))).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'manifest.json'))).toBe(true);
    } finally {
      // Cleanup
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });

  it('should refuse init when .agent/ already exists without --force', () => {
    const tmpDir = path.join(ROOT, 'tests', '.tmp-exists-test');
    
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    fs.mkdirSync(path.join(tmpDir, '.agent'), { recursive: true });

    try {
      let output = '';
      try {
        output = execSync(`node "${CLI_PATH}" init`, { cwd: tmpDir, encoding: 'utf-8' });
      } catch (/** @type {any} */ error) {
        output = (error.stdout || '') + (error.stderr || '');
      }
      expect(output).toContain('already exists');
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });
});
