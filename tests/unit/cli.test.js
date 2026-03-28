import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const CLI_PATH = path.join(ROOT, 'bin', 'kit.js');

describe('kit CLI', () => {
  it('should display version with --version flag', () => {
    const output = execSync(`node "${CLI_PATH}" --version`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should display help with --help flag', () => {
    const output = execSync(`node "${CLI_PATH}" --help`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output).toContain('Devran AI Kit');
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

    // Retry helper for Windows EPERM (antivirus/indexer file locks)
    const rmWithRetry = (dir, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
          }
          return;
        } catch {
          if (i < retries - 1) {
            const { execSync: es } = require('child_process');
            es('sleep 1 || timeout /t 1 >nul 2>&1', { stdio: 'ignore' });
          }
        }
      }
    };

    rmWithRetry(tmpDir);
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
      rmWithRetry(tmpDir);
    }
  });

  it('should run verify command without errors', () => {
    const output = execSync(`node "${CLI_PATH}" verify`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output).toContain('manifest integrity');
    expect(output).toMatch(/Passed:\s+\d+/);
  });

  it('should run scan command without errors', () => {
    const output = execSync(`node "${CLI_PATH}" scan`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output).toContain('security scan');
    expect(output).toContain('Files scanned');
  });

  it('should run plugin list command', () => {
    const output = execSync(`node "${CLI_PATH}" plugin list`, { cwd: ROOT, encoding: 'utf-8' });
    // Either shows plugins or "No plugins installed"
    expect(output).toMatch(/Installed Plugins|No plugins installed/);
  });

  it('should run heal command with no CI output gracefully', () => {
    const tmpDir = path.join(ROOT, 'tests', '.tmp-heal-test');
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      const output = execSync(`node "${CLI_PATH}" heal`, { cwd: tmpDir, encoding: 'utf-8' });
      expect(output).toContain('No CI output found');
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });

  it('should run health command and report status', () => {
    const output = execSync(`node "${CLI_PATH}" health`, { cwd: ROOT, encoding: 'utf-8' });
    expect(output).toContain('Health Check');
    expect(output).toMatch(/Error Budget|Config Validation|Plugin Integrity|Self-Healing/);
  });

  it('should fail gracefully on unknown command', () => {
    let output = '';
    try {
      output = execSync(`node "${CLI_PATH}" nonexistent`, { cwd: ROOT, encoding: 'utf-8' });
    } catch (/** @type {any} */ error) {
      output = (error.stdout || '') + (error.stderr || '');
    }
    expect(output).toContain('Unknown command');
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
