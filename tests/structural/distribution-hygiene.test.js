import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Distribution Hygiene Tests
 *
 * Ensures the npm package never ships project-specific data,
 * personal information, or branded content. Catches contamination
 * before publish — runs on every `npm test`.
 *
 * Modeled after version-sync.test.js as a structural guard.
 *
 * Note: identity.json is checked via `git show` because the runtime
 * identity system auto-populates the file from git config. The test
 * verifies the committed template is clean, not the working copy.
 *
 * @module tests/structural/distribution-hygiene
 * @since v3.5.1
 */

const ROOT = path.resolve(import.meta.dirname, '../..');
const AGENT_DIR = path.join(ROOT, '.agent');

/** @returns {string} File content as UTF-8 string */
function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

/**
 * Reads the git-committed (HEAD) version of a file.
 * Falls back to disk content if git is unavailable.
 * @param {string} relativePath - Path relative to project root
 * @returns {string} File content
 */
function readCommittedFile(relativePath) {
  try {
    const content = execSync(`git show HEAD:${relativePath}`, { cwd: ROOT, encoding: 'utf-8' });
    // Strip UTF-8 BOM if present (Windows PowerShell adds it)
    return content.replace(/^\uFEFF/, '');
  } catch {
    // Fallback to disk if git is unavailable (e.g., CI without full clone)
    return readFile(relativePath);
  }
}

/** @returns {string[]} All SKILL.md files under .agent/skills/ */
function getAllSkillFiles() {
  const skillsDir = path.join(AGENT_DIR, 'skills');
  const skills = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        skills.push({ name: entry.name, path: skillFile });
      }
    }
  }
  return skills;
}

describe('Distribution Hygiene — No PII or Project-Specific Data', () => {

  // --- F1: identity.json committed template must be empty ---

  it('should have identity.json template with empty developers array', () => {
    const content = readCommittedFile('.agent/engine/identity.json');
    const identity = JSON.parse(content);
    expect(identity.developers).toEqual([]);
    expect(identity.activeId).toBeNull();
  });

  // --- F2: session-context.md must not contain project-specific data ---

  it('should have session-context.md without commit SHAs', () => {
    const content = readFile('.agent/session-context.md');
    const commitShaPattern = /\b[a-f0-9]{7,40}\b/;
    // Filter out template placeholder lines (e.g. "| — | — | — |")
    const dataLines = content.split('\n').filter(
      (line) => !line.includes('—') && !line.includes('```') && line.trim().length > 0
    );
    for (const line of dataLines) {
      // Skip lines that are just markdown structure
      if (line.startsWith('#') || line.startsWith('>') || line.startsWith('|')) {
        continue;
      }
      expect(line, `Possible commit SHA found: "${line.trim()}"`).not.toMatch(commitShaPattern);
    }
  });

  it('should have session-context.md without hardcoded Windows paths', () => {
    const content = readFile('.agent/session-context.md');
    const windowsPathPattern = /[A-Z]:\\/;
    expect(content).not.toMatch(windowsPathPattern);
  });

  it('should have session-context.md without personal npm scope', () => {
    const content = readFile('.agent/session-context.md');
    expect(content).not.toContain('@emredursun');
  });

  // --- F3: manifest.json lastAuditedAt must be null ---

  it('should have manifest.json lastAuditedAt set to null', () => {
    const manifest = JSON.parse(readFile('.agent/manifest.json'));
    expect(manifest.lastAuditedAt).toBeNull();
  });

  // --- No personal email in any .agent file ---

  it('should not contain personal email addresses in shipped templates', () => {
    // identity.json checked via git (runtime auto-populates from git config)
    const identityContent = readCommittedFile('.agent/engine/identity.json');
    expect(identityContent, 'Personal email found in identity.json').not.toMatch(/info\.emredursun@gmail\.com/);
    expect(identityContent, 'Personal username found in identity.json').not.toMatch(/"emredursun"/);

    // Other template files checked from disk
    const diskFiles = ['.agent/session-context.md', '.agent/session-state.json'];
    for (const file of diskFiles) {
      const content = readFile(file);
      expect(content, `Personal email found in ${file}`).not.toMatch(/info\.emredursun@gmail\.com/);
      expect(content, `Personal username found in ${file}`).not.toMatch(/"emredursun"/);
    }
  });

  // --- F4-F7: No BeSync-branded section headers in skills ---

  it('should not have BeSync-branded section headers in any SKILL.md', () => {
    const skills = getAllSkillFiles();
    expect(skills.length).toBeGreaterThan(0);

    for (const skill of skills) {
      const content = fs.readFileSync(skill.path, 'utf-8');
      const brandedHeaderPattern = /^##\s+.*BeSync/m;
      expect(
        content,
        `BeSync-branded header found in ${skill.name}/SKILL.md`
      ).not.toMatch(brandedHeaderPattern);
    }
  });

  it('should not reference BeSync as a preferred/primary option in skills', () => {
    const skills = getAllSkillFiles();
    for (const skill of skills) {
      const content = fs.readFileSync(skill.path, 'utf-8');
      expect(
        content,
        `BeSync preference found in ${skill.name}/SKILL.md`
      ).not.toMatch(/preferred for BeSync|BeSync Primary/i);
    }
  });
});
