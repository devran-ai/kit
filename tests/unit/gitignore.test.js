import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT = path.resolve(import.meta.dirname, '../..');

function loadModule() {
  const modulePath = path.join(ROOT, 'lib', 'io.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('addToGitignore', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .gitignore if it does not exist', () => {
    const { addToGitignore } = loadModule();
    const result = addToGitignore(tmpDir);

    expect(result.added).toBe(true);
    expect(result.reason).toBe('added');
    expect(fs.existsSync(path.join(tmpDir, '.gitignore'))).toBe(true);

    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.agent/');
    expect(content).toContain('# Devran AI Kit');
  });

  it('appends to existing .gitignore', () => {
    const { addToGitignore } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n', 'utf-8');

    const result = addToGitignore(tmpDir);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.agent/');
  });

  it('skips if .agent/ already present (idempotent)', () => {
    const { addToGitignore } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.agent/\n', 'utf-8');

    const result = addToGitignore(tmpDir);

    expect(result.added).toBe(false);
    expect(result.reason).toBe('already-ignored');
  });

  it('skips if marker comment already present', () => {
    const { addToGitignore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '# Devran AI Kit\n.agent/\n',
      'utf-8'
    );

    const result = addToGitignore(tmpDir);

    expect(result.added).toBe(false);
    expect(result.reason).toBe('already-present');
  });

  it('returns { added: true } when entry was added', () => {
    const { addToGitignore } = loadModule();
    const result = addToGitignore(tmpDir);
    expect(result).toEqual({ added: true, reason: 'added' });
  });

  it('returns { added: false } when skipped', () => {
    const { addToGitignore } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.agent/\n', 'utf-8');
    const result = addToGitignore(tmpDir);
    expect(result).toEqual({ added: false, reason: 'already-ignored' });
  });
});

describe('cleanupLegacyClaudeTracking', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reverts .claude/* to .claude/ and removes !.claude/commands/', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\n.claude/*\n!.claude/commands/\n',
      'utf-8'
    );

    const result = cleanupLegacyClaudeTracking(tmpDir);

    expect(result).toEqual({ cleaned: true, reason: 'legacy-patterns-removed' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/');
    expect(content).not.toContain('.claude/*');
    expect(content).not.toContain('!.claude/commands/');
    expect(content).toContain('node_modules/');
  });

  it('preserves all other gitignore entries during cleanup', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\n.env\n.claude/*\n!.claude/commands/\ndist/\n',
      'utf-8'
    );

    cleanupLegacyClaudeTracking(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.env');
    expect(content).toContain('dist/');
  });

  it('is idempotent when legacy pattern not present', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.claude/\nnode_modules/\n', 'utf-8');

    const result = cleanupLegacyClaudeTracking(tmpDir);

    expect(result).toEqual({ cleaned: false, reason: 'not-kit-pattern' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toBe('.claude/\nnode_modules/\n');
  });

  it('does NOT touch .claude/* without !.claude/commands/', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.claude/*\nnode_modules/\n', 'utf-8');

    const result = cleanupLegacyClaudeTracking(tmpDir);

    expect(result).toEqual({ cleaned: false, reason: 'not-kit-pattern' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/*');
  });

  it('is idempotent when run twice', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.claude/*\n!.claude/commands/\n',
      'utf-8'
    );

    cleanupLegacyClaudeTracking(tmpDir);
    const result = cleanupLegacyClaudeTracking(tmpDir);

    expect(result).toEqual({ cleaned: false, reason: 'not-kit-pattern' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/');
    expect(content).not.toContain('.claude/*');
  });

  it('returns not-needed when no .gitignore exists', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    const result = cleanupLegacyClaudeTracking(tmpDir);
    expect(result).toEqual({ cleaned: false, reason: 'no-gitignore' });
  });

  it('does not corrupt gitignore with trailing comments on patterns', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.claude/* # IDE state\n!.claude/commands/\n',
      'utf-8'
    );

    cleanupLegacyClaudeTracking(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/ # IDE state');
    expect(content).not.toContain('.claude/*');
    expect(content).not.toContain('!.claude/commands/');
  });

  it('does not act if one pattern is commented out', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '# .claude/*\n!.claude/commands/\n',
      'utf-8'
    );

    const result = cleanupLegacyClaudeTracking(tmpDir);
    expect(result.cleaned).toBe(false);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('!.claude/commands/');
  });
});
