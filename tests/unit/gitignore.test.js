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

  it('creates .gitignore with all entries for detected IDEs', () => {
    const { addToGitignore } = loadModule();
    const result = addToGitignore(tmpDir, ['claude', 'cursor']);

    expect(result.added).toBe(true);
    expect(result.reason).toBe('added');
    expect(fs.existsSync(path.join(tmpDir, '.gitignore'))).toBe(true);

    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.agent/');
    expect(content).toContain('.claude/commands/');
    expect(content).toContain('.cursor/commands/');
    expect(content).toContain('.cursor/rules/');
    expect(content).toContain('.worktreeinclude');
    expect(content).toContain('# Devran AI Kit');
  });

  it('appends to existing .gitignore', () => {
    const { addToGitignore } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n', 'utf-8');

    const result = addToGitignore(tmpDir, ['claude']);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.agent/');
    expect(content).toContain('.claude/commands/');
    expect(content).toContain('.worktreeinclude');
  });

  it('skips entries already covered by parent dir pattern (non-Claude IDEs)', () => {
    const { addToGitignore } = loadModule();
    // .cursor/ covers .cursor/commands/ and .cursor/rules/; .opencode/ covers .opencode/commands/
    fs.writeFileSync(path.join(tmpDir, '.gitignore'),
      '.agent/\n.claude/commands/\n.cursor/\n.opencode/\n.codex/\n.worktreeinclude\n', 'utf-8');

    const result = addToGitignore(tmpDir, ['claude']);

    expect(result.added).toBe(false);
  });

  it('does NOT treat .claude/ as covering .claude/commands/ (CLI discovery)', () => {
    const { addToGitignore } = loadModule();
    // Blanket .claude/ breaks CLI discovery — addToGitignore must still add .claude/commands/
    fs.writeFileSync(path.join(tmpDir, '.gitignore'),
      '.agent/\n.claude/\n.cursor/\n.opencode/\n.codex/\n.worktreeinclude\n', 'utf-8');

    const result = addToGitignore(tmpDir, ['claude']);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
  });

  it('does NOT treat specific file patterns as parent dir coverage', () => {
    const { addToGitignore } = loadModule();
    // .cursor/rules/kit-governance.mdc is a specific file — does NOT cover .cursor/commands/
    fs.writeFileSync(path.join(tmpDir, '.gitignore'),
      '.agent/\n.cursor/rules/kit-governance.mdc\n.worktreeinclude\n', 'utf-8');

    const result = addToGitignore(tmpDir, ['cursor']);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.cursor/commands/');
  });

  it('adds only missing bridge dirs when .agent/ already present', () => {
    const { addToGitignore } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.agent/\n', 'utf-8');

    const result = addToGitignore(tmpDir, ['claude', 'cursor']);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).toContain('.cursor/commands/');
    expect(content).toContain('.worktreeinclude');
    // .agent/ should NOT be duplicated
    expect(content.match(/\.agent\//g)).toHaveLength(1);
  });

  it('skips if all entries already present (idempotent)', () => {
    const { addToGitignore } = loadModule();
    fs.writeFileSync(path.join(tmpDir, '.gitignore'),
      '# Devran AI Kit\n.agent/\n.claude/commands/\n.cursor/rules/\n.opencode/opencode.json\n.codex/\n.worktreeinclude\n', 'utf-8');

    const result = addToGitignore(tmpDir, ['claude']);

    expect(result.added).toBe(false);
    expect(result.reason).toBe('already-present');
  });

  it('returns already-ignored when covered by user patterns without Kit marker', () => {
    const { addToGitignore } = loadModule();
    // All entries present but without the Kit marker comment
    fs.writeFileSync(path.join(tmpDir, '.gitignore'),
      '.agent/\n.claude/commands/\n.cursor/rules/\n.opencode/opencode.json\n.codex/\n.worktreeinclude\n', 'utf-8');

    const result = addToGitignore(tmpDir, ['claude']);

    expect(result.added).toBe(false);
    expect(result.reason).toBe('already-ignored');
  });

  it('includes all IDE config paths even without detectedIDEs', () => {
    const { addToGitignore } = loadModule();
    const result = addToGitignore(tmpDir);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.codex/');
    expect(content).toContain('.cursor/rules/');
    expect(content).toContain('.opencode/opencode.json');
  });

  it('works with no detectedIDEs argument (backward compat)', () => {
    const { addToGitignore } = loadModule();
    const result = addToGitignore(tmpDir);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.agent/');
    expect(content).toContain('.worktreeinclude');
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

  it('narrows .claude/* to .claude/commands/ and removes !.claude/commands/', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\n.claude/*\n!.claude/commands/\n',
      'utf-8'
    );

    const result = cleanupLegacyClaudeTracking(tmpDir);

    expect(result).toEqual({ cleaned: true, reason: 'legacy-patterns-removed' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
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
    expect(content).toContain('.claude/commands/');
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
    expect(content).toContain('.claude/commands/ # IDE state');
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

describe('narrowBlanketClaudeIgnore', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('replaces .claude/ with .claude/commands/', () => {
    const { narrowBlanketClaudeIgnore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\n.claude/\n.cursor/\n',
      'utf-8'
    );

    const result = narrowBlanketClaudeIgnore(tmpDir);

    expect(result).toEqual({ narrowed: true, reason: 'blanket-narrowed' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).not.toMatch(/^\.claude\/$/m);
    expect(content).toContain('node_modules/');
    expect(content).toContain('.cursor/');
  });

  it('is idempotent when .claude/commands/ already exists', () => {
    const { narrowBlanketClaudeIgnore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.claude/commands/\nnode_modules/\n',
      'utf-8'
    );

    const result = narrowBlanketClaudeIgnore(tmpDir);

    expect(result).toEqual({ narrowed: false, reason: 'no-blanket-pattern' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toBe('.claude/commands/\nnode_modules/\n');
  });

  it('preserves trailing comments', () => {
    const { narrowBlanketClaudeIgnore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.claude/ # IDE state\n',
      'utf-8'
    );

    narrowBlanketClaudeIgnore(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/ # IDE state');
  });

  it('does not touch .claude/* (handled by cleanupLegacyClaudeTracking)', () => {
    const { narrowBlanketClaudeIgnore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.claude/*\n!.claude/commands/\n',
      'utf-8'
    );

    const result = narrowBlanketClaudeIgnore(tmpDir);

    expect(result).toEqual({ narrowed: false, reason: 'no-blanket-pattern' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/*');
  });

  it('returns no-gitignore when no file exists', () => {
    const { narrowBlanketClaudeIgnore } = loadModule();
    const result = narrowBlanketClaudeIgnore(tmpDir);
    expect(result).toEqual({ narrowed: false, reason: 'no-gitignore' });
  });

  it('is idempotent when run twice', () => {
    const { narrowBlanketClaudeIgnore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.claude/\nnode_modules/\n',
      'utf-8'
    );

    narrowBlanketClaudeIgnore(tmpDir);
    const result = narrowBlanketClaudeIgnore(tmpDir);

    expect(result).toEqual({ narrowed: false, reason: 'no-blanket-pattern' });
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).not.toMatch(/^\.claude\/$/m);
  });
});

describe('pipeline integration (narrow → cleanup → add)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces correct gitignore from blanket .claude/ pattern', () => {
    const { narrowBlanketClaudeIgnore, cleanupLegacyClaudeTracking, addToGitignore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\n.claude/\n.cursor/\n',
      'utf-8'
    );

    narrowBlanketClaudeIgnore(tmpDir);
    cleanupLegacyClaudeTracking(tmpDir);
    const result = addToGitignore(tmpDir, ['claude', 'cursor']);

    expect(result.added).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).toContain('.agent/');
    expect(content).not.toMatch(/^\.claude\/$/m);
    // .claude/commands/ should appear exactly once (not duplicated by addToGitignore)
    expect(content.match(/\.claude\/commands\//g)).toHaveLength(1);
  });

  it('produces correct gitignore from legacy .claude/* pattern', () => {
    const { narrowBlanketClaudeIgnore, cleanupLegacyClaudeTracking, addToGitignore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\n.claude/*\n!.claude/commands/\n',
      'utf-8'
    );

    narrowBlanketClaudeIgnore(tmpDir);
    cleanupLegacyClaudeTracking(tmpDir);
    const result = addToGitignore(tmpDir, ['claude']);

    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).not.toContain('.claude/*');
    expect(content).not.toContain('!.claude/commands/');
    expect(content).toContain('.agent/');
  });

  it('produces correct gitignore from already-correct .claude/commands/ pattern', () => {
    const { narrowBlanketClaudeIgnore, cleanupLegacyClaudeTracking, addToGitignore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.agent/\n.claude/commands/\n.cursor/rules/\n.opencode/opencode.json\n.codex/\n.worktreeinclude\n',
      'utf-8'
    );

    narrowBlanketClaudeIgnore(tmpDir);
    cleanupLegacyClaudeTracking(tmpDir);
    const result = addToGitignore(tmpDir, ['claude']);

    expect(result.added).toBe(false);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content.match(/\.claude\/commands\//g)).toHaveLength(1);
  });
});

describe('CRLF line ending support', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('narrowBlanketClaudeIgnore handles CRLF line endings', () => {
    const { narrowBlanketClaudeIgnore } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\r\n.claude/\r\n.cursor/\r\n',
      'utf-8'
    );

    const result = narrowBlanketClaudeIgnore(tmpDir);

    expect(result.narrowed).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).not.toMatch(/^\.claude\/\r?$/m);
  });

  it('cleanupLegacyClaudeTracking handles CRLF line endings', () => {
    const { cleanupLegacyClaudeTracking } = loadModule();
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.claude/*\r\n!.claude/commands/\r\n',
      'utf-8'
    );

    const result = cleanupLegacyClaudeTracking(tmpDir);

    expect(result.cleaned).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).not.toContain('.claude/*');
  });
});
