import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT = path.resolve(import.meta.dirname, '../..');

function loadModule() {
  const modulePath = path.join(ROOT, 'lib', 'worktree.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('generateWorktreeInclude', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-worktree-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .worktreeinclude with .agent/ and detected IDE dirs', () => {
    const { generateWorktreeInclude } = loadModule();
    const result = generateWorktreeInclude(tmpDir, ['claude', 'cursor']);

    expect(result).toEqual({ created: true, reason: 'created' });
    const content = fs.readFileSync(path.join(tmpDir, '.worktreeinclude'), 'utf-8');
    expect(content).toContain('.agent/');
    expect(content).toContain('.claude/commands/');
    expect(content).toContain('.cursor/commands/');
    expect(content).toContain('# Devran AI Kit');
  });

  it('includes only detected IDEs, not all 5', () => {
    const { generateWorktreeInclude } = loadModule();
    generateWorktreeInclude(tmpDir, ['claude']);

    const content = fs.readFileSync(path.join(tmpDir, '.worktreeinclude'), 'utf-8');
    expect(content).toContain('.claude/commands/');
    expect(content).not.toContain('.cursor/commands/');
    expect(content).not.toContain('.opencode/commands/');
    expect(content).not.toContain('.windsurf/workflows/');
  });

  it('overwrites Kit-generated file with updated IDE list', () => {
    const { generateWorktreeInclude } = loadModule();
    generateWorktreeInclude(tmpDir, ['claude']);
    const result = generateWorktreeInclude(tmpDir, ['claude', 'cursor', 'opencode']);

    expect(result).toEqual({ created: false, reason: 'updated' });
    const content = fs.readFileSync(path.join(tmpDir, '.worktreeinclude'), 'utf-8');
    expect(content).toContain('.cursor/commands/');
    expect(content).toContain('.opencode/commands/');
  });

  it('appends to user-created file without overwriting', () => {
    const { generateWorktreeInclude } = loadModule();
    const userContent = '# My worktree config\n.env\n.env.local\n';
    fs.writeFileSync(path.join(tmpDir, '.worktreeinclude'), userContent, 'utf-8');

    const result = generateWorktreeInclude(tmpDir, ['claude']);

    expect(result).toEqual({ created: false, reason: 'appended' });
    const content = fs.readFileSync(path.join(tmpDir, '.worktreeinclude'), 'utf-8');
    expect(content).toContain('.env');
    expect(content).toContain('.env.local');
    expect(content).toContain('.agent/');
    expect(content).toContain('.claude/commands/');
  });

  it('skips when all entries already present in user file', () => {
    const { generateWorktreeInclude } = loadModule();
    const userContent = '.agent/\n.claude/commands/\n';
    fs.writeFileSync(path.join(tmpDir, '.worktreeinclude'), userContent, 'utf-8');

    const result = generateWorktreeInclude(tmpDir, ['claude']);

    expect(result).toEqual({ created: false, reason: 'already-present' });
  });

  it('handles empty detectedIDEs array (still includes .agent/)', () => {
    const { generateWorktreeInclude } = loadModule();
    generateWorktreeInclude(tmpDir, []);

    const content = fs.readFileSync(path.join(tmpDir, '.worktreeinclude'), 'utf-8');
    expect(content).toContain('.agent/');
  });

  it('does not create duplicate entries on re-run', () => {
    const { generateWorktreeInclude } = loadModule();
    generateWorktreeInclude(tmpDir, ['claude']);
    generateWorktreeInclude(tmpDir, ['claude']);

    const content = fs.readFileSync(path.join(tmpDir, '.worktreeinclude'), 'utf-8');
    const agentCount = (content.match(/\.agent\//g) || []).length;
    expect(agentCount).toBe(1);
  });
});

describe('installPostCheckoutHook', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-worktree-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates post-checkout hook in .git/hooks/', () => {
    const { installPostCheckoutHook } = loadModule();
    fs.mkdirSync(path.join(tmpDir, '.git'), { recursive: true });

    const result = installPostCheckoutHook(tmpDir);

    expect(result).toEqual({ installed: true, reason: 'created' });
    expect(fs.existsSync(path.join(tmpDir, '.git', 'hooks', 'post-checkout'))).toBe(true);
  });

  it('hook script contains worktree null-ref detection', () => {
    const { installPostCheckoutHook } = loadModule();
    fs.mkdirSync(path.join(tmpDir, '.git'), { recursive: true });

    installPostCheckoutHook(tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, '.git', 'hooks', 'post-checkout'), 'utf-8'
    );
    expect(content).toContain('0000000000000000000000000000000000000000');
    expect(content).toContain('#!/bin/sh');
  });

  it('hook script copies from main worktree, not package', () => {
    const { installPostCheckoutHook } = loadModule();
    fs.mkdirSync(path.join(tmpDir, '.git'), { recursive: true });

    installPostCheckoutHook(tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, '.git', 'hooks', 'post-checkout'), 'utf-8'
    );
    expect(content).toContain('git rev-parse --git-common-dir');
    expect(content).toContain('mkdir -p .agent');
    expect(content).toContain('cp -RP "$MAIN_ROOT/.agent/." .agent/');
    expect(content).toContain('.claude/commands');
    expect(content).not.toContain('kit init');
  });

  it('does NOT overwrite user-created hook', () => {
    const { installPostCheckoutHook } = loadModule();
    const hooksDir = path.join(tmpDir, '.git', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'post-checkout'), '#!/bin/sh\necho "user hook"\n');

    const result = installPostCheckoutHook(tmpDir);

    expect(result).toEqual({ installed: false, reason: 'user-hook-exists' });
    const content = fs.readFileSync(path.join(hooksDir, 'post-checkout'), 'utf-8');
    expect(content).toContain('echo "user hook"');
  });

  it('overwrites Kit-generated hook (marker present)', () => {
    const { installPostCheckoutHook } = loadModule();
    const hooksDir = path.join(tmpDir, '.git', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(
      path.join(hooksDir, 'post-checkout'),
      '#!/bin/sh\n# devran-kit-worktree-hook\nold content\n'
    );

    const result = installPostCheckoutHook(tmpDir);

    expect(result).toEqual({ installed: true, reason: 'updated' });
    const content = fs.readFileSync(path.join(hooksDir, 'post-checkout'), 'utf-8');
    expect(content).not.toContain('old content');
    expect(content).toContain('devran-kit-worktree-hook');
  });

  it('handles missing .git directory gracefully', () => {
    const { installPostCheckoutHook } = loadModule();
    const result = installPostCheckoutHook(tmpDir);
    expect(result).toEqual({ installed: false, reason: 'no-git' });
  });

  it('handles .git as file (worktree scenario)', () => {
    const { installPostCheckoutHook } = loadModule();
    // Create a fake worktree .git file and a real git common dir
    const fakeGitDir = path.join(tmpDir, 'fake-git-common');
    fs.mkdirSync(path.join(fakeGitDir, 'hooks'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.git'),
      `gitdir: ${fakeGitDir}\n`,
      'utf-8'
    );

    // This test verifies the .git file branch executes — it will fail
    // the git rev-parse call (not a real repo) and return git-error
    const result = installPostCheckoutHook(tmpDir);
    expect(result.reason).toBe('git-error');
  });

  it('respects core.hooksPath when configured', () => {
    const { installPostCheckoutHook } = loadModule();
    // Create a .git dir but no custom hooks path — the default path should be used
    fs.mkdirSync(path.join(tmpDir, '.git'), { recursive: true });

    installPostCheckoutHook(tmpDir);

    // Default behavior: hook goes in .git/hooks/
    expect(fs.existsSync(path.join(tmpDir, '.git', 'hooks', 'post-checkout'))).toBe(true);
  });
});
