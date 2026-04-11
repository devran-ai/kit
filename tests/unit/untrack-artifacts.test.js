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
 *
 * Writes a Kit-aware .gitignore by default, because untrackKitArtifacts
 * now requires artifacts to be explicitly gitignored before it will touch
 * them (this protects shared-mode and user-authored configs).
 */
function initGitRepo(dir, { gitignore = true } = {}) {
  execSync('git init -q', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
  execSync('git config commit.gpgsign false', { cwd: dir, stdio: 'ignore' });
  if (gitignore) {
    writeKitGitignore(dir);
  }
  // Seed with a real file so the initial commit is valid
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n', 'utf-8');
  execSync('git add -A', { cwd: dir, stdio: 'ignore' });
  execSync('git commit -q -m "initial"', { cwd: dir, stdio: 'ignore' });
}

/**
 * Writes a .gitignore listing every entry in KIT_TRACKED_ARTIFACTS so that
 * `git check-ignore` reports them as ignored (the gate untrackKitArtifacts
 * applies before removing anything from the index).
 */
function writeKitGitignore(dir) {
  const lines = [
    '.agent/',
    '.claude/commands/',
    '.cursor/commands/',
    '.opencode/commands/',
    '.windsurf/workflows/',
    '.github/prompts/',
    '.cursor/rules/kit-governance.mdc',
    '.opencode/opencode.json',
    '.codex/instructions.md',
    '.worktreeinclude',
    'dev/null/',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), lines, 'utf-8');
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
    trackFile(tmpDir, '.codex/instructions.md', '# codex\n');
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
    expect(isTracked(tmpDir, '.codex/instructions.md')).toBe(false);
    expect(isTracked(tmpDir, '.worktreeinclude')).toBe(false);
    expect(isTracked(tmpDir, 'dev/null/post-checkout')).toBe(false);
  });

  it('leaves user-authored files under .cursor/rules/ alone (specific-path gate)', () => {
    // User has their own non-Kit rules file in .cursor/rules/
    trackFile(tmpDir, '.cursor/rules/my-custom-rule.mdc', '# custom\n');
    // Kit-owned file is also tracked (bug scenario)
    trackFile(tmpDir, '.cursor/rules/kit-governance.mdc', '# kit\n');

    const { untrackKitArtifacts } = loadModule();
    untrackKitArtifacts(tmpDir);

    // Only the specific Kit file should be untracked; user's file stays.
    expect(isTracked(tmpDir, '.cursor/rules/kit-governance.mdc')).toBe(false);
    expect(isTracked(tmpDir, '.cursor/rules/my-custom-rule.mdc')).toBe(true);
  });

  it('skips artifacts that are NOT listed in .gitignore (check-ignore gate)', () => {
    // Create a repo WITHOUT the Kit gitignore — nothing is ignored.
    const nonIgnoredDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-noignore-'));
    try {
      initGitRepo(nonIgnoredDir, { gitignore: false });
      // Pretend the user is intentionally tracking .agent/ (shared-mode-like)
      trackFile(nonIgnoredDir, '.agent/manifest.json', '{}\n');
      expect(isTracked(nonIgnoredDir, '.agent/manifest.json')).toBe(true);

      const { untrackKitArtifacts } = loadModule();
      const result = untrackKitArtifacts(nonIgnoredDir);

      // Nothing should be untracked because nothing is gitignored.
      expect(result.untracked).toEqual([]);
      expect(result.reason).toBe('nothing-to-untrack');
      expect(isTracked(nonIgnoredDir, '.agent/manifest.json')).toBe(true);
    } finally {
      fs.rmSync(nonIgnoredDir, { recursive: true, force: true });
    }
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

  it('KIT_TRACKED_ARTIFACTS does NOT list parent dirs that hold user content', () => {
    // These dirs frequently contain user-authored configs; listing them at
    // directory level is too aggressive. Kit only untracks the specific
    // files it writes (e.g. .cursor/rules/kit-governance.mdc).
    const { KIT_TRACKED_ARTIFACTS } = loadModule();
    expect(KIT_TRACKED_ARTIFACTS).not.toContain('.cursor/rules/');
    expect(KIT_TRACKED_ARTIFACTS).not.toContain('.opencode/');
    expect(KIT_TRACKED_ARTIFACTS).not.toContain('.codex/');
    // Specific Kit-written paths must still be covered
    expect(KIT_TRACKED_ARTIFACTS).toContain('.cursor/rules/kit-governance.mdc');
    expect(KIT_TRACKED_ARTIFACTS).toContain('.opencode/opencode.json');
    expect(KIT_TRACKED_ARTIFACTS).toContain('.codex/instructions.md');
  });
});

describe('isSharedMode', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-shared-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false for a non-git directory', () => {
    const { isSharedMode } = loadModule();
    expect(isSharedMode(tmpDir)).toBe(false);
  });

  it('returns false when .agent/ is not tracked', () => {
    initGitRepo(tmpDir);
    const { isSharedMode } = loadModule();
    expect(isSharedMode(tmpDir)).toBe(false);
  });

  it('returns false when .agent/ is tracked AND gitignored (bug scenario)', () => {
    // Default initGitRepo writes a Kit gitignore — .agent/ IS in there.
    initGitRepo(tmpDir);
    // Force-add .agent/ bypassing .gitignore (the accidental-commit bug)
    trackFile(tmpDir, '.agent/manifest.json', '{}\n');

    const { isSharedMode } = loadModule();
    // .agent/ is tracked, but it's also gitignored → bug scenario,
    // NOT shared mode. Should return false so the untrack pipeline runs.
    expect(isSharedMode(tmpDir)).toBe(false);
  });

  it('returns true when .agent/ is tracked and NOT gitignored (shared mode)', () => {
    // Init without the Kit gitignore — simulates `kit init --shared`.
    initGitRepo(tmpDir, { gitignore: false });
    trackFile(tmpDir, '.agent/manifest.json', '{}\n');

    const { isSharedMode } = loadModule();
    expect(isSharedMode(tmpDir)).toBe(true);
  });

  it('returns false for non-absolute projectRoot', () => {
    const { isSharedMode } = loadModule();
    expect(isSharedMode('relative/path')).toBe(false);
  });
});
