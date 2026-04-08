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

describe('ensureClaudeCommandsTracked', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adds .claude/* and !.claude/commands/ to gitignore', () => {
    const { ensureClaudeCommandsTracked } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n', 'utf-8');

    const result = ensureClaudeCommandsTracked(tmpDir);

    expect(result.action).toBe('updated');
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/*');
    expect(content).toContain('!.claude/commands/');
  });

  it('is idempotent when patterns already present', () => {
    const { ensureClaudeCommandsTracked } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.claude/*\n!.claude/commands/\n', 'utf-8');

    const result = ensureClaudeCommandsTracked(tmpDir);

    expect(result.action).toBe('already-tracked');
  });

  it('migrates .claude/ to .claude/* with negation', () => {
    const { ensureClaudeCommandsTracked } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.claude/\n', 'utf-8');

    const result = ensureClaudeCommandsTracked(tmpDir);

    expect(result.action).toBe('updated');
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/*');
    expect(content).toContain('!.claude/commands/');
    // Should not have the old pattern as a standalone line
    expect(content).not.toMatch(/^\.claude\/$/m);
  });

  it('skips when no .gitignore exists', () => {
    const { ensureClaudeCommandsTracked } = loadModule();
    const result = ensureClaudeCommandsTracked(tmpDir);
    expect(result.action).toBe('skipped');
  });

  it('does not duplicate patterns on re-run', () => {
    const { ensureClaudeCommandsTracked } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n', 'utf-8');

    ensureClaudeCommandsTracked(tmpDir);
    ensureClaudeCommandsTracked(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    const claudeCount = (content.match(/\.claude\/\*/g) || []).length;
    expect(claudeCount).toBe(1);
  });
});

describe('checkBridgeGitignoreWarnings', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects gitignored IDE directories', () => {
    const { checkBridgeGitignoreWarnings } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.cursor/\n', 'utf-8');

    const warnings = checkBridgeGitignoreWarnings(tmpDir, ['claude', 'cursor']);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('.cursor/');
    expect(warnings[0]).toContain('!.cursor/commands/');
  });

  it('returns no warnings when IDE dirs not gitignored', () => {
    const { checkBridgeGitignoreWarnings } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n', 'utf-8');

    const warnings = checkBridgeGitignoreWarnings(tmpDir, ['claude', 'cursor']);
    expect(warnings).toHaveLength(0);
  });
});
