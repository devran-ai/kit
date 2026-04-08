/**
 * Devran AI Kit — Worktree Support
 *
 * Generates .worktreeinclude for Claude Code and installs
 * a post-checkout git hook for manual git worktree workflows.
 * Both mechanisms ensure .agent/ and bridge files are available
 * in new worktrees without manual user intervention.
 *
 * @module lib/worktree
 * @since v5.2.3
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { IDE_BRIDGE_DIRS } = require('./constants');

const KIT_MARKER = '# Devran AI Kit';
const HOOK_MARKER = '# devran-kit-worktree-hook';

/**
 * Generates a .worktreeinclude file listing gitignored paths for
 * Claude Code to copy into new worktrees automatically.
 *
 * - Kit-generated file (marker present) → overwrite with updated IDE list
 * - User-created file → append only missing entries (line-by-line)
 * - Already complete → no-op
 *
 * @param {string} projectRoot - Project root directory
 * @param {string[]} detectedIDEs - Array of IDE identifiers
 * @returns {{ created: boolean, reason: string }}
 */
function generateWorktreeInclude(projectRoot, detectedIDEs) {
  const filePath = path.join(projectRoot, '.worktreeinclude');

  // Build entries: always include .agent/ plus detected IDE bridge dirs
  const entries = ['.agent/'];
  for (const ide of detectedIDEs) {
    if (IDE_BRIDGE_DIRS[ide]) {
      entries.push(IDE_BRIDGE_DIRS[ide]);
    }
  }

  const content = [
    '# Devran AI Kit — worktree file sync',
    '# Copied automatically into new Claude Code worktrees.',
    '# Only gitignored files matching these patterns are copied.',
    ...entries,
    '',
  ].join('\n');

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    const existingLines = existing.split('\n').map(l => l.trim());

    if (existing.includes(KIT_MARKER)) {
      // Kit-generated — safe to overwrite with updated IDE list
      fs.writeFileSync(filePath, content, 'utf-8');
      return { created: false, reason: 'updated' };
    }

    // User-created — append only missing entries (line-by-line match)
    const missing = entries.filter(e => !existingLines.includes(e));
    if (missing.length === 0) {
      return { created: false, reason: 'already-present' };
    }
    const append = '\n# Devran AI Kit (local dev tooling)\n' + missing.join('\n') + '\n';
    fs.appendFileSync(filePath, append, 'utf-8');
    return { created: false, reason: 'appended' };
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { created: true, reason: 'created' };
}

/**
 * Installs a post-checkout git hook that copies .agent/ from the main
 * worktree into new worktrees created via `git worktree add`.
 *
 * Copies from the main worktree (not from the Kit package) so user
 * customizations (decisions, identity, session context, custom rules)
 * are preserved.
 *
 * Uses provenance marker — never overwrites user-created hooks.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ installed: boolean, reason: string }}
 */
function installPostCheckoutHook(projectRoot) {
  const gitPath = path.join(projectRoot, '.git');
  if (!fs.existsSync(gitPath)) {
    return { installed: false, reason: 'no-git' };
  }

  // Resolve hooks directory
  let hooksDir;
  const stat = fs.lstatSync(gitPath);
  if (stat.isDirectory()) {
    hooksDir = path.join(gitPath, 'hooks');
  } else {
    // Worktree — .git is a file; hooks live in the common git dir
    try {
      const gitCommonDir = execSync('git rev-parse --git-common-dir', {
        cwd: projectRoot, encoding: 'utf-8',
      }).trim();
      hooksDir = path.join(projectRoot, gitCommonDir, 'hooks');
    } catch {
      return { installed: false, reason: 'git-error' };
    }
  }

  // Respect core.hooksPath override (Husky v9+, lefthook, etc.)
  try {
    const customPath = execSync('git config core.hooksPath', {
      cwd: projectRoot, encoding: 'utf-8',
    }).trim();
    if (customPath) {
      hooksDir = path.resolve(projectRoot, customPath);
    }
  } catch {
    // No custom path configured — use default
  }

  const hookPath = path.join(hooksDir, 'post-checkout');

  const hookScript = [
    '#!/bin/sh',
    HOOK_MARKER,
    '# Auto-installed by Devran AI Kit — copies .agent/ into new worktrees.',
    '# Safe to remove if you manage worktree setup manually.',
    '',
    '# Detect new worktree creation (prev-HEAD is null when worktree is first created)',
    'if [ "$1" = "0000000000000000000000000000000000000000" ]; then',
    '  COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)',
    '  MAIN_ROOT="$COMMON_DIR/.."',
    '  # Copy .agent/ from main worktree (preserves customizations)',
    '  # Uses -RP: no symlink dereferencing (security), recursive copy',
    '  if [ -n "$COMMON_DIR" ] && [ -d "$MAIN_ROOT/.agent" ]; then',
    '    mkdir -p .agent 2>/dev/null',
    '    cp -RP "$MAIN_ROOT/.agent/." .agent/ 2>/dev/null || true',
    '  fi',
    '  # Copy bridge directories from main worktree (skip non-existent)',
    '  for dir in ' + Object.values(IDE_BRIDGE_DIRS).map(d => d.replace(/\/$/, '')).join(' ') + '; do',
    '    if [ -d "$MAIN_ROOT/$dir" ]; then',
    '      mkdir -p "$dir" 2>/dev/null',
    '      cp -RP "$MAIN_ROOT/$dir/." "$dir/" 2>/dev/null || true',
    '    fi',
    '  done',
    'fi',
    '',
  ].join('\n');

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Check hook ownership via provenance marker
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf-8');
    if (existing.includes(HOOK_MARKER)) {
      // Kit-generated — safe to overwrite
      fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
      return { installed: true, reason: 'updated' };
    }
    // User-created hook — do NOT overwrite
    return { installed: false, reason: 'user-hook-exists' };
  }

  fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
  return { installed: true, reason: 'created' };
}

module.exports = Object.freeze({
  generateWorktreeInclude,
  installPostCheckoutHook,
});
