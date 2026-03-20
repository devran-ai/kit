import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Version Synchronization Tests
 *
 * Ensures all version references across the codebase match the
 * canonical version in package.json — the Single Source of Truth.
 *
 * This test file prevents version drift by catching stale references
 * during every test run (`npm test`).
 *
 * @module tests/structural/version-sync
 * @author Emre Dursun
 * @since v3.4.1
 */

const ROOT = path.resolve(import.meta.dirname, '../..');
const AGENT_DIR = path.join(ROOT, '.agent');

/** @returns {string} The canonical version from package.json */
function getCanonicalVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  return packageJson.version;
}

/** @returns {string} File content as UTF-8 string */
function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('Version Synchronization — Single Source of Truth', () => {
  const VERSION = getCanonicalVersion();

  // --- npm Layer ---

  it('should have package-lock.json version matching package.json', () => {
    const lockfile = JSON.parse(readFile('package-lock.json'));
    expect(lockfile.version).toBe(VERSION);
  });

  it('should have package-lock.json root package version matching', () => {
    const lockfile = JSON.parse(readFile('package-lock.json'));
    const rootEntry = lockfile.packages?.[''];
    if (rootEntry) {
      expect(rootEntry.version).toBe(VERSION);
    }
  });

  // --- Manifest Layer ---

  it('should have manifest.json kitVersion matching package.json', () => {
    const manifest = JSON.parse(readFile('.agent/manifest.json'));
    expect(manifest.kitVersion).toBe(VERSION);
  });

  // --- Public Documentation ---

  it('should have README.md version badge matching package.json', () => {
    const readme = readFile('README.md');
    const badgeMatch = readme.match(/badge\/version-([\d.]+)-/);
    expect(badgeMatch, 'README.md missing version badge').not.toBeNull();
    expect(badgeMatch[1]).toBe(VERSION);
  });

  it('should have docs/architecture.md version matching package.json', () => {
    const archDoc = readFile('docs/architecture.md');
    const versionMatch = archDoc.match(/Antigravity AI Kit v([\d.]+)/);
    expect(versionMatch, 'docs/architecture.md missing version reference').not.toBeNull();
    expect(versionMatch[1]).toBe(VERSION);
  });

  // --- Agent Layer ---

  it('should have CheatSheet.md version matching package.json', () => {
    const cheatsheet = readFile('.agent/CheatSheet.md');
    const versionMatch = cheatsheet.match(/\*\*Version\*\*: v([\d.]+)/);
    expect(versionMatch, 'CheatSheet.md missing version reference').not.toBeNull();
    expect(versionMatch[1]).toBe(VERSION);
  });

  it('should have help.md version matching package.json', () => {
    const help = readFile('.agent/commands/help.md');
    const versionMatch = help.match(/Antigravity AI Kit v([\d.]+)/);
    expect(versionMatch, 'help.md missing version reference').not.toBeNull();
    expect(versionMatch[1]).toBe(VERSION);
  });

  // --- Checklist Layer ---
  // NOTE: Checklists are EXCLUDED from version sync.
  // They are STRICTLY PROTECTED per the Preservation Contract
  // (.agent/rules/agent-upgrade-policy.md § 1) and must not be
  // modified during upgrades. No version-sync tests needed.

  // --- Cross-Check ---

  it('should have all versioned files in sync (no drift)', () => {
    const sources = [
      { name: 'package-lock.json', version: JSON.parse(readFile('package-lock.json')).version },
      { name: 'manifest.json', version: JSON.parse(readFile('.agent/manifest.json')).kitVersion },
    ];

    for (const source of sources) {
      expect(source.version, `${source.name} version mismatch`).toBe(VERSION);
    }
  });
});
