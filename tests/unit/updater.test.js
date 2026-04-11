import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_SOURCE = path.join(ROOT, 'tests', '.tmp-update-source');
const TMP_TARGET = path.join(ROOT, 'tests', '.tmp-update-target');

function createFile(dir, relativePath, content) {
  const fullPath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

function setupTestDirs() {
  fs.mkdirSync(TMP_SOURCE, { recursive: true });
  fs.mkdirSync(TMP_TARGET, { recursive: true });

  // Source .agent/ with some files
  createFile(TMP_SOURCE, '.agent/manifest.json', '{"version": "2.2.0"}');
  createFile(TMP_SOURCE, '.agent/agents/architect.md', '# Architect v2');
  createFile(TMP_SOURCE, '.agent/session-context.md', '# New session context');
  createFile(TMP_SOURCE, '.agent/session-state.json', '{}');
  createFile(TMP_SOURCE, '.agent/decisions/adr-001.md', '# ADR 001 new');
  createFile(TMP_SOURCE, '.agent/skills/new-skill/SKILL.md', '# Brand new skill');
  createFile(TMP_SOURCE, '.agent/checklists/pre-commit.md', '# Pre-Commit v2');
  createFile(TMP_SOURCE, '.agent/rules/security.md', '# Security v2');

  // Target .agent/ with older versions
  createFile(TMP_TARGET, '.agent/manifest.json', '{"version": "2.1.0"}');
  createFile(TMP_TARGET, '.agent/agents/architect.md', '# Architect v1');
  createFile(TMP_TARGET, '.agent/session-context.md', '# My custom session context');
  createFile(TMP_TARGET, '.agent/session-state.json', '{"my": "custom-state"}');
  createFile(TMP_TARGET, '.agent/decisions/adr-001.md', '# My ADR customizations');
  createFile(TMP_TARGET, '.agent/checklists/pre-commit.md', '# My custom pre-commit');
  createFile(TMP_TARGET, '.agent/rules/security.md', '# My custom security rules');
}

function teardownTestDirs() {
  for (const dir of [TMP_SOURCE, TMP_TARGET]) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
  }
}

async function loadUpdater() {
  const modulePath = path.join(ROOT, 'lib', 'updater.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('CLI Updater — Non-Destructive Merge', () => {
  beforeEach(() => { setupTestDirs(); });
  afterEach(() => { teardownTestDirs(); });

  it('should detect new files that need to be added', async () => {
    const updater = await loadUpdater();
    const report = updater.generateDiff(TMP_SOURCE, TMP_TARGET);

    expect(report.added).toContain('skills/new-skill/SKILL.md');
  });

  it('should detect modified files (hash mismatch)', async () => {
    const updater = await loadUpdater();
    const report = updater.generateDiff(TMP_SOURCE, TMP_TARGET);

    expect(report.updated).toContain('manifest.json');
    expect(report.updated).toContain('agents/architect.md');
  });

  it('should preserve user files (session-context.md, session-state.json)', async () => {
    const updater = await loadUpdater();
    const report = updater.generateDiff(TMP_SOURCE, TMP_TARGET);

    expect(report.skipped).toContain('session-context.md');
    expect(report.skipped).toContain('session-state.json');
  });

  it('should preserve files in decisions/ directory', async () => {
    const updater = await loadUpdater();
    const report = updater.generateDiff(TMP_SOURCE, TMP_TARGET);

    expect(report.skipped).toContain('decisions/adr-001.md');
  });

  it('should preserve files in checklists/ directory (Preservation Contract)', async () => {
    const updater = await loadUpdater();
    const report = updater.generateDiff(TMP_SOURCE, TMP_TARGET);

    expect(report.skipped).toContain('checklists/pre-commit.md');
  });

  it('should preserve files in rules/ directory (Preservation Contract)', async () => {
    const updater = await loadUpdater();
    const report = updater.generateDiff(TMP_SOURCE, TMP_TARGET);

    expect(report.skipped).toContain('rules/security.md');
  });

  it('should correctly identify preserved files', async () => {
    const updater = await loadUpdater();

    expect(updater.isPreservedFile('session-context.md')).toBe(true);
    expect(updater.isPreservedFile('session-state.json')).toBe(true);
    expect(updater.isPreservedFile('decisions/adr-001.md')).toBe(true);
    expect(updater.isPreservedFile('checklists/pre-commit.md')).toBe(true);
    expect(updater.isPreservedFile('checklists/session-start.md')).toBe(true);
    expect(updater.isPreservedFile('rules/security.md')).toBe(true);
    expect(updater.isPreservedFile('rules/coding-style.md')).toBe(true);
    expect(updater.isPreservedFile('agents/architect.md')).toBe(false);
    expect(updater.isPreservedFile('skills/pr-toolkit/SKILL.md')).toBe(false);
  });

  it('should apply updates when not in dry-run mode', async () => {
    const updater = await loadUpdater();
    const report = updater.applyUpdate(TMP_SOURCE, TMP_TARGET);

    // New file should exist
    const newSkillPath = path.join(TMP_TARGET, '.agent', 'skills', 'new-skill', 'SKILL.md');
    expect(fs.existsSync(newSkillPath)).toBe(true);

    // Preserved file should keep old content
    const sessionContent = fs.readFileSync(path.join(TMP_TARGET, '.agent', 'session-context.md'), 'utf-8');
    expect(sessionContent).toContain('My custom');

    // Preserved checklists should keep user content
    const checklistContent = fs.readFileSync(path.join(TMP_TARGET, '.agent', 'checklists', 'pre-commit.md'), 'utf-8');
    expect(checklistContent).toContain('My custom pre-commit');

    // Preserved rules should keep user content
    const rulesContent = fs.readFileSync(path.join(TMP_TARGET, '.agent', 'rules', 'security.md'), 'utf-8');
    expect(rulesContent).toContain('My custom security rules');

    expect(report.added.length).toBeGreaterThan(0);
    expect(report.updated.length).toBeGreaterThan(0);
    expect(report.skipped.length).toBeGreaterThan(0);
  });

  it('should not modify files in dry-run mode', async () => {
    const updater = await loadUpdater();
    const report = updater.applyUpdate(TMP_SOURCE, TMP_TARGET, true);

    // New file should NOT exist
    const newSkillPath = path.join(TMP_TARGET, '.agent', 'skills', 'new-skill', 'SKILL.md');
    expect(fs.existsSync(newSkillPath)).toBe(false);

    // Report should still show what would change
    expect(report.added.length).toBeGreaterThan(0);
  });
});

describe('CLI Updater — Gitignore Pipeline', () => {
  beforeEach(() => { setupTestDirs(); });
  afterEach(() => { teardownTestDirs(); });

  it('should add missing .cursor/commands/ to gitignore during update', async () => {
    // Simulate a project that has .gitignore with only .claude/ blanket ignore
    const gitignorePath = path.join(TMP_TARGET, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules/\n.claude/\n', 'utf-8');

    // Create .cursor directory to trigger IDE detection
    fs.mkdirSync(path.join(TMP_TARGET, '.cursor'), { recursive: true });

    const updater = await loadUpdater();
    updater.applyUpdate(TMP_SOURCE, TMP_TARGET);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    // narrowBlanketClaudeIgnore should have narrowed .claude/ to .claude/commands/
    expect(content).toContain('.claude/commands/');
    // addToGitignore should have added .cursor/commands/ since cursor was detected
    expect(content).toContain('.cursor/commands/');
    expect(content).toContain('.agent/');
  });

  it('should narrow blanket .claude/ to .claude/commands/ during update', async () => {
    const gitignorePath = path.join(TMP_TARGET, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules/\n.claude/\n.agent/\n', 'utf-8');

    const updater = await loadUpdater();
    updater.applyUpdate(TMP_SOURCE, TMP_TARGET);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    // Should have narrowed blanket .claude/ to .claude/commands/
    expect(content).toContain('.claude/commands/');
    // Should not have the blanket pattern anymore
    const lines = content.split('\n').map(l => l.trim());
    expect(lines).not.toContain('.claude/');
  });

  it('should add gitignore entries even when no .gitignore exists', async () => {
    const gitignorePath = path.join(TMP_TARGET, '.gitignore');
    // Ensure no .gitignore exists
    if (fs.existsSync(gitignorePath)) fs.unlinkSync(gitignorePath);

    const updater = await loadUpdater();
    updater.applyUpdate(TMP_SOURCE, TMP_TARGET);

    // addToGitignore creates .gitignore if missing
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.agent/');
    expect(content).toContain('.claude/commands/');
  });
});

describe('CLI Updater — Shared Mode', () => {
  beforeEach(() => { setupTestDirs(); });
  afterEach(() => { teardownTestDirs(); });

  it('skips the entire gitignore pipeline when .agent/ is tracked and not ignored', async () => {
    // Simulate `kit init --shared`: a real git repo where .agent/ is
    // intentionally tracked and NOT listed in .gitignore.
    const { execSync } = require('child_process');
    execSync('git init -q', { cwd: TMP_TARGET, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: TMP_TARGET, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: TMP_TARGET, stdio: 'ignore' });
    execSync('git config commit.gpgsign false', { cwd: TMP_TARGET, stdio: 'ignore' });

    // Gitignore that does NOT list .agent/ — shared mode.
    const gitignorePath = path.join(TMP_TARGET, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules/\n', 'utf-8');

    // Track .agent/ contents (shared-mode workflow)
    execSync('git add -A', { cwd: TMP_TARGET, stdio: 'ignore' });
    execSync('git commit -q -m "initial"', { cwd: TMP_TARGET, stdio: 'ignore' });

    const updater = await loadUpdater();
    const report = updater.applyUpdate(TMP_SOURCE, TMP_TARGET);

    // Shared mode should be detected and recorded in the report
    expect(report.sharedMode).toBe(true);

    // .gitignore must NOT have been mutated — .agent/ must still be absent
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).not.toMatch(/^\.agent\/?$/m);

    // .agent/ files must still be tracked after the update
    const tracked = execSync('git ls-files -- .agent/', {
      cwd: TMP_TARGET, encoding: 'utf-8',
    });
    expect(tracked.trim().length).toBeGreaterThan(0);
  });
});
