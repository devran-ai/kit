import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');

function loadModule() {
  const modulePath = path.join(ROOT, 'lib', 'io.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

/**
 * Create a fresh git repo in tmpDir with an initial commit so git ls-files
 * and git rm --cached have something to operate on.
 */
function initGitRepo(dir) {
  execSync('git init -q', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
  execSync('git config commit.gpgsign false', { cwd: dir, stdio: 'ignore' });
  // Seed with a real file so the initial commit is valid
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n', 'utf-8');
  execSync('git add README.md', { cwd: dir, stdio: 'ignore' });
  execSync('git commit -q -m "initial"', { cwd: dir, stdio: 'ignore' });
}

function trackFile(dir, relativePath, content = 'kit-artifact\n') {
  const fullPath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  execSync(`git add -f -- "${relativePath.replace(/\\/g, '/')}"`, { cwd: dir, stdio: 'ignore' });
  execSync(`git commit -q -m "add ${relativePath}"`, { cwd: dir, stdio: 'ignore' });
}

function isTracked(dir, relativePath) {
  try {
    const out = execSync(
      `git ls-files -- "${relativePath.replace(/\\/g, '/')}"`,
      { cwd: dir, encoding: 'utf-8' }
    ).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

describe('untrackKitArtifacts', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-untrack-'));
    initGitRepo(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns not-a-git-repo when target is not a git repo', () => {
    const nonGit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-nongit-'));
    try {
      const { untrackKitArtifacts } = loadModule();
      const result = untrackKitArtifacts(nonGit);
      expect(result.reason).toBe('not-a-git-repo');
      expect(result.untracked).toEqual([]);
    } finally {
      fs.rmSync(nonGit, { recursive: true, force: true });
    }
  });

  it('is a no-op when no Kit artifacts are tracked', () => {
    const { untrackKitArtifacts } = loadModule();
    const result = untrackKitArtifacts(tmpDir);
    expect(result.untracked).toEqual([]);
    expect(result.reason).toBe('nothing-to-untrack');
  });

  it('untracks .cursor/commands/ when committed accidentally', () => {
    trackFile(tmpDir, '.cursor/commands/plan.md', '# plan\n');
    trackFile(tmpDir, '.cursor/commands/debug.md', '# debug\n');
    expect(isTracked(tmpDir, '.cursor/commands/plan.md')).toBe(true);

    const { untrackKitArtifacts } = loadModule();
    const result = untrackKitArtifacts(tmpDir);

    expect(result.untracked).toContain('.cursor/commands/');
    expect(isTracked(tmpDir, '.cursor/commands/plan.md')).toBe(false);
    expect(isTracked(tmpDir, '.cursor/commands/debug.md')).toBe(false);

    // Working-tree files must still be present (git rm --cached, not -f)
    expect(fs.existsSync(path.join(tmpDir, '.cursor/commands/plan.md'))).toBe(true);
  });

  it('untracks .agent/ directory recursively', () => {
    trackFile(tmpDir, '.agent/manifest.json', '{}\n');
    trackFile(tmpDir, '.agent/agents/architect.md', '# architect\n');

    const { untrackKitArtifacts } = loadModule();
    const result = untrackKitArtifacts(tmpDir);

    expect(result.untracked).toContain('.agent/');
    expect(isTracked(tmpDir, '.agent/manifest.json')).toBe(false);
    expect(isTracked(tmpDir, '.agent/agents/architect.md')).toBe(false);
    // Working-tree preserved
    expect(fs.existsSync(path.join(tmpDir, '.agent/manifest.json'))).toBe(true);
  });

  it('untracks dev/null/ (Windows literal path artifact)', () => {
    trackFile(tmpDir, 'dev/null/post-checkout', '#!/bin/sh\n');
    trackFile(tmpDir, 'dev/null/pre-push', '#!/bin/sh\n');

    const { untrackKitArtifacts } = loadModule();
    const result = untrackKitArtifacts(tmpDir);

    expect(result.untracked).toContain('dev/null/');
    expect(isTracked(tmpDir, 'dev/null/post-checkout')).toBe(false);
    expect(isTracked(tmpDir, 'dev/null/pre-push')).toBe(false);
  });

  it('untracks all known artifact categories in a single pass', () => {
    trackFile(tmpDir, '.agent/manifest.json', '{}\n');
    trackFile(tmpDir, '.claude/commands/plan.md', '# plan\n');
    trackFile(tmpDir, '.cursor/commands/plan.md', '# plan\n');
    trackFile(tmpDir, '.opencode/commands/plan.md', '# plan\n');
    trackFile(tmpDir, '.cursor/rules/kit-governance.mdc', '# rules\n');
    trackFile(tmpDir, '.opencode/opencode.json', '{}\n');
    trackFile(tmpDir, '.codex/config.toml', '[codex]\n');
    trackFile(tmpDir, '.worktreeinclude', '.agent/\n');
    trackFile(tmpDir, 'dev/null/post-checkout', '#!/bin/sh\n');

    const { untrackKitArtifacts } = loadModule();
    const result = untrackKitArtifacts(tmpDir);

    // All categories should have been removed from the index
    expect(result.untracked.length).toBeGreaterThanOrEqual(7);
    expect(isTracked(tmpDir, '.agent/manifest.json')).toBe(false);
    expect(isTracked(tmpDir, '.claude/commands/plan.md')).toBe(false);
    expect(isTracked(tmpDir, '.cursor/commands/plan.md')).toBe(false);
    expect(isTracked(tmpDir, '.opencode/commands/plan.md')).toBe(false);
    expect(isTracked(tmpDir, '.cursor/rules/kit-governance.mdc')).toBe(false);
    expect(isTracked(tmpDir, '.opencode/opencode.json')).toBe(false);
    expect(isTracked(tmpDir, '.codex/config.toml')).toBe(false);
    expect(isTracked(tmpDir, '.worktreeinclude')).toBe(false);
    expect(isTracked(tmpDir, 'dev/null/post-checkout')).toBe(false);
  });

  it('leaves non-Kit files alone', () => {
    trackFile(tmpDir, 'src/main.js', 'console.log("hello");\n');
    trackFile(tmpDir, 'package.json', '{}\n');

    const { untrackKitArtifacts } = loadModule();
    untrackKitArtifacts(tmpDir);

    expect(isTracked(tmpDir, 'src/main.js')).toBe(true);
    expect(isTracked(tmpDir, 'package.json')).toBe(true);
  });

  it('is idempotent — second run is a no-op', () => {
    trackFile(tmpDir, '.cursor/commands/plan.md', '# plan\n');
    const { untrackKitArtifacts } = loadModule();

    const first = untrackKitArtifacts(tmpDir);
    expect(first.untracked.length).toBeGreaterThan(0);

    const second = untrackKitArtifacts(tmpDir);
    expect(second.untracked).toEqual([]);
    expect(second.reason).toBe('nothing-to-untrack');
  });

  it('rejects non-absolute projectRoot', () => {
    const { untrackKitArtifacts } = loadModule();
    expect(() => untrackKitArtifacts('relative/path')).toThrow(/absolute path/);
  });

  it('KIT_TRACKED_ARTIFACTS export is frozen and includes dev/null/', () => {
    const { KIT_TRACKED_ARTIFACTS } = loadModule();
    expect(Object.isFrozen(KIT_TRACKED_ARTIFACTS)).toBe(true);
    expect(KIT_TRACKED_ARTIFACTS).toContain('dev/null/');
    expect(KIT_TRACKED_ARTIFACTS).toContain('.agent/');
    expect(KIT_TRACKED_ARTIFACTS).toContain('.cursor/commands/');
  });
});
