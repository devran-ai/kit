/**
 * Devran AI Kit — Skill Sandboxing
 *
 * Enforces allowed-tools declarations from skill SKILL.md frontmatter.
 * Validates that skills only reference tools within their permission set.
 *
 * @module lib/skill-sandbox
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { AGENT_DIR } = require('./constants');
const SKILLS_DIR = 'skills';

/** Valid permission levels (ordered from least to most privileged) */
const PERMISSION_LEVELS = ['read-only', 'read-write', 'execute', 'network'];

/** Tool patterns that indicate permission level requirements */
const TOOL_PERMISSION_MAP = {
  'network': [
    /\bfetch\b/i, /\bhttp\b/i, /\bapi\b/i, /\bcurl\b/i, /\brequest\b/i,
    /\bwebhook\b/i, /\bsocket\b/i, /\bdownload\b/i, /\bupload\b/i,
  ],
  'execute': [
    /\bexec\b/i, /\bspawn\b/i, /\bchild_process\b/i, /\bshell\b/i,
    /\brun_command\b/i, /\bterminal\b/i, /\bscript\b/i,
  ],
  'read-write': [
    /\bwrite\b/i, /\bcreate\b/i, /\bdelete\b/i, /\bmodify\b/i,
    /\bedit\b/i, /\bsave\b/i, /\bremove\b/i, /\bupdate\b/i,
  ],
};

/**
 * @typedef {object} SkillPermissions
 * @property {string} skillName - Name of the skill
 * @property {string[]} allowedTools - Declared allowed tools
 * @property {string} permissionLevel - Highest permission level
 * @property {boolean} hasFrontmatter - Whether frontmatter was found
 */

/**
 * @typedef {object} SandboxViolation
 * @property {string} skillName - Skill that violated
 * @property {string} violation - Description of violation
 * @property {'critical' | 'high' | 'medium' | 'low'} severity - Violation severity
 * @property {string} file - File where violation was found
 * @property {number} [line] - Line number (if applicable)
 */

/**
 * Extracts permissions from a SKILL.md frontmatter.
 *
 * @param {string} content - Raw SKILL.md content
 * @returns {{ allowedTools: string[], permissionLevel: string }}
 */
function extractPermissionsFromFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return { allowedTools: [], permissionLevel: 'read-only' };
  }

  const frontmatter = frontmatterMatch[1];
  /** @type {string[]} */
  const allowedTools = [];
  let permissionLevel = 'read-only';

  // Parse allowed-tools from frontmatter
  const toolsMatch = frontmatter.match(/allowed-tools:\s*\[(.*?)\]/);
  if (toolsMatch) {
    const toolsList = toolsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, '')).filter(Boolean);
    allowedTools.push(...toolsList);
  }

  // Parse permission-level from frontmatter
  const permMatch = frontmatter.match(/permission-level:\s*(\S+)/);
  if (permMatch && PERMISSION_LEVELS.includes(permMatch[1])) {
    permissionLevel = permMatch[1];
  }

  return { allowedTools, permissionLevel };
}

/**
 * Gets the permissions declared by a specific skill.
 *
 * @param {string} skillName - Name of the skill
 * @param {string} projectRoot - Root directory of the project
 * @returns {SkillPermissions}
 */
function getSkillPermissions(skillName, projectRoot) {
  if (!skillName || typeof skillName !== 'string') {
    return { skillName: String(skillName), allowedTools: [], permissionLevel: 'read-only', hasFrontmatter: false };
  }
  // Defense-in-depth: reject path traversal in skill names
  if (skillName.includes('..') || skillName.includes('/') || skillName.includes('\\') || skillName.includes('\0')) {
    return { skillName, allowedTools: [], permissionLevel: 'read-only', hasFrontmatter: false };
  }

  const skillPath = path.join(projectRoot, AGENT_DIR, SKILLS_DIR, skillName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    return {
      skillName,
      allowedTools: [],
      permissionLevel: 'read-only',
      hasFrontmatter: false,
    };
  }

  const content = fs.readFileSync(skillPath, 'utf-8');
  const { allowedTools, permissionLevel } = extractPermissionsFromFrontmatter(content);
  const hasFrontmatter = content.startsWith('---');

  return { skillName, allowedTools, permissionLevel, hasFrontmatter };
}

/**
 * Scans a skill's content for tool usage that exceeds its declared permissions.
 *
 * @param {string} skillName - Name of the skill
 * @param {string} projectRoot - Root directory of the project
 * @returns {SandboxViolation[]}
 */
function validateSkillPermissions(skillName, projectRoot) {
  const permissions = getSkillPermissions(skillName, projectRoot);
  const skillDir = path.join(projectRoot, AGENT_DIR, SKILLS_DIR, skillName);
  /** @type {SandboxViolation[]} */
  const violations = [];

  if (!fs.existsSync(skillDir)) {
    violations.push({
      skillName,
      violation: `Skill directory not found: ${skillName}`,
      severity: 'critical',
      file: skillDir,
    });
    return violations;
  }

  // Get the permission level index for comparison
  const declaredLevelIndex = PERMISSION_LEVELS.indexOf(permissions.permissionLevel);

  // Scan all files in the skill directory
  const files = scanSkillFiles(skillDir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Check each permission level higher than declared
      for (const [level, patterns] of Object.entries(TOOL_PERMISSION_MAP)) {
        const levelIndex = PERMISSION_LEVELS.indexOf(level);

        if (levelIndex > declaredLevelIndex) {
          for (const pattern of patterns) {
            if (pattern.test(line)) {
              violations.push({
                skillName,
                violation: `Uses ${level}-level tool pattern "${pattern.source}" but declared permission is "${permissions.permissionLevel}"`,
                severity: levelIndex - declaredLevelIndex >= 2 ? 'critical' : 'high',
                file: path.relative(projectRoot, file),
                line: lineIndex + 1,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Recursively scans a skill directory for readable files.
 *
 * @param {string} dirPath - Directory to scan
 * @returns {string[]} Array of file paths
 */
function scanSkillFiles(dirPath) {
  /** @type {string[]} */
  const files = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...scanSkillFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.js'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Enforces allowed-tools compliance across all skills.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ total: number, compliant: number, violations: SandboxViolation[] }}
 */
function enforceAllowedTools(projectRoot) {
  const skillsDir = path.join(projectRoot, AGENT_DIR, SKILLS_DIR);

  if (!fs.existsSync(skillsDir)) {
    return { total: 0, compliant: 0, violations: [] };
  }

  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  /** @type {SandboxViolation[]} */
  const allViolations = [];

  for (const skillName of skillDirs) {
    const violations = validateSkillPermissions(skillName, projectRoot);
    allViolations.push(...violations);
  }

  const violatedSkills = new Set(allViolations.map((v) => v.skillName));

  return {
    total: skillDirs.length,
    compliant: skillDirs.length - violatedSkills.size,
    violations: allViolations,
  };
}

module.exports = {
  getSkillPermissions,
  validateSkillPermissions,
  enforceAllowedTools,
  extractPermissionsFromFrontmatter,
};
