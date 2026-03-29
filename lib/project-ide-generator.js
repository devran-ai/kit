/**
 * Devran AI Kit — Project-Specific IDE Configuration Generator
 *
 * Generates project-specific IDE configuration files from the onboarding
 * project profile and generated CLAUDE.md content. Produces:
 *   - .cursorrules (project rules for Cursor IDE)
 *   - .opencode/instructions.md (project instructions for OpenCode)
 *   - .codex/instructions.md (project instructions for Codex)
 *
 * SEPARATION OF CONCERNS:
 *   ide-generator.js       → Kit governance configs (from manifest + rules.md)
 *   project-ide-generator.js → Project-specific configs (from profile + CLAUDE.md)
 *
 * @module lib/project-ide-generator
 * @since v5.1.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const { CURSOR_DIR, OPENCODE_DIR, CODEX_DIR, TRANSIENT_FS_ERRORS } = require('./constants');

const log = createLogger('project-ide-generator');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum character length for .cursorrules content */
const CURSORRULES_MAX_CHARS = 6000;

/** Maximum character length for IDE instruction files */
const INSTRUCTIONS_MAX_CHARS = 8000;

/**
 * IDE target identifiers.
 * @type {ReadonlyArray<string>}
 */
const IDE_TARGETS = Object.freeze(['cursor', 'opencode', 'codex']);

/**
 * File paths for each IDE target (relative to project root).
 * @type {Readonly<Record<string, string>>}
 */
const IDE_FILE_PATHS = Object.freeze({
  cursor: '.cursorrules',
  opencode: path.join(OPENCODE_DIR, 'instructions.md'),
  codex: path.join(CODEX_DIR, 'instructions.md'),
});

// ─── Profile to IDE Context ───────────────────────────────────────────────────

/**
 * Extracts IDE-relevant context from a project profile.
 *
 * @param {object} profile - Validated project profile
 * @returns {object} IDE context with project identity, stack, rules
 */
function extractIdeContext(profile) {
  if (!profile || typeof profile !== 'object') {
    return { name: 'Project', description: '', platforms: [], stack: '', conventions: '' };
  }

  const platforms = Array.isArray(profile.platforms) ? profile.platforms : [];
  const teamLevel = profile.team?.experienceLevel || 'intermediate';
  const teamSize = profile.team?.size || 'solo';

  // Determine stack summary from platforms
  const stackParts = [];
  if (platforms.includes('web')) stackParts.push('Web (Frontend + Backend)');
  if (platforms.includes('ios')) stackParts.push('iOS');
  if (platforms.includes('android')) stackParts.push('Android');
  if (platforms.includes('desktop')) stackParts.push('Desktop');
  if (platforms.includes('api')) stackParts.push('API');
  if (platforms.includes('cli')) stackParts.push('CLI');
  if (platforms.includes('library')) stackParts.push('Library');

  // Determine conventions based on team level
  const conventions = buildConventions(teamLevel, platforms);

  return {
    name: profile.name || 'Project',
    description: profile.description || '',
    problemStatement: profile.problemStatement || '',
    platforms,
    stack: stackParts.join(', ') || 'General',
    teamLevel,
    teamSize,
    conventions,
    auth: profile.auth || { method: [], roles: [], compliance: [] },
    integrations: Array.isArray(profile.integrations) ? profile.integrations : [],
    timeline: profile.timeline || {},
    budget: profile.budget || {},
  };
}

/**
 * Builds coding conventions string based on team experience level.
 *
 * @param {string} level - Experience level (beginner, intermediate, expert)
 * @param {string[]} platforms - Target platforms
 * @returns {string} Formatted conventions
 */
function buildConventions(level, platforms) {
  const rules = [];

  // Universal rules
  rules.push('- Follow immutable data patterns — never mutate objects');
  rules.push('- Handle all errors with descriptive messages');
  rules.push('- Validate user input at system boundaries');

  // Level-specific guidance
  if (level === 'beginner') {
    rules.push('- Add explanatory comments for non-obvious logic');
    rules.push('- Prefer explicit over implicit patterns');
    rules.push('- Keep functions under 30 lines');
    rules.push('- Use descriptive variable names (avoid abbreviations)');
  } else if (level === 'expert') {
    rules.push('- Minimize comments — code should be self-documenting');
    rules.push('- Use advanced patterns where they improve clarity');
    rules.push('- Optimize for performance where measurable');
  } else {
    // intermediate — balanced
    rules.push('- Comment "why" not "what"');
    rules.push('- Keep functions under 50 lines');
  }

  // Platform-specific
  if (platforms.includes('web') || platforms.includes('ios') || platforms.includes('android')) {
    rules.push('- Ensure accessibility (WCAG 2.1 AA minimum)');
  }

  if (platforms.includes('api')) {
    rules.push('- Use parameterized queries for all database operations');
    rules.push('- Rate-limit all public endpoints');
  }

  return rules.join('\n');
}

// ─── Cursor Config Generation ─────────────────────────────────────────────────

/**
 * Generates .cursorrules content from project context and CLAUDE.md.
 *
 * @param {object} context - IDE context from extractIdeContext
 * @param {string} [claudeMdContent] - Generated CLAUDE.md content
 * @returns {string} .cursorrules file content
 */
function generateCursorrules(context, claudeMdContent) {
  const sections = [];

  sections.push(`# ${context.name} — Project Rules`);
  sections.push('');

  if (context.description) {
    sections.push(`## Project Identity`);
    sections.push(`- **Name:** ${context.name}`);
    sections.push(`- **Stack:** ${context.stack}`);
    sections.push(`- **Description:** ${context.description}`);
    sections.push('');
  }

  sections.push('## Coding Conventions');
  sections.push(context.conventions);
  sections.push('');

  if (context.auth.method.length > 0) {
    sections.push('## Security');
    sections.push(`- Auth: ${context.auth.method.join(', ')}`);
    if (context.auth.compliance.length > 0) {
      sections.push(`- Compliance: ${context.auth.compliance.join(', ')}`);
    }
    sections.push('- Never hardcode secrets or tokens');
    sections.push('- Sanitize all user input');
    sections.push('');
  }

  if (context.integrations.length > 0) {
    sections.push('## Integrations');
    sections.push(`External services: ${context.integrations.join(', ')}`);
    sections.push('- Use environment variables for API keys');
    sections.push('- Implement retry logic for external calls');
    sections.push('');
  }

  // Append condensed CLAUDE.md if provided
  if (claudeMdContent && typeof claudeMdContent === 'string') {
    const condensed = condenseClaude(claudeMdContent, CURSORRULES_MAX_CHARS - sections.join('\n').length - 100);
    if (condensed) {
      sections.push('## Kit-Generated Context');
      sections.push(condensed);
      sections.push('');
    }
  }

  let result = sections.join('\n');

  // Enforce character limit
  if (result.length > CURSORRULES_MAX_CHARS) {
    result = result.slice(0, CURSORRULES_MAX_CHARS - 3) + '...';
  }

  return result;
}

// ─── OpenCode Config Generation ───────────────────────────────────────────────

/**
 * Generates .opencode/instructions.md content from project context.
 *
 * @param {object} context - IDE context from extractIdeContext
 * @param {string} [claudeMdContent] - Generated CLAUDE.md content
 * @returns {string} instructions.md content
 */
function generateOpenCodeInstructions(context, claudeMdContent) {
  const sections = [];

  sections.push(`# ${context.name} — Development Instructions`);
  sections.push('');
  sections.push(`> ${context.description || 'Project managed by Devran AI Kit'}`);
  sections.push('');

  sections.push('## Project Overview');
  sections.push(`- **Platforms:** ${context.stack}`);
  sections.push(`- **Team:** ${context.teamSize} (${context.teamLevel})`);
  if (context.timeline.mvpDeadline) {
    sections.push(`- **MVP Deadline:** ${context.timeline.mvpDeadline}`);
  }
  sections.push('');

  sections.push('## Conventions');
  sections.push(context.conventions);
  sections.push('');

  if (context.auth.method.length > 0) {
    sections.push('## Security Requirements');
    sections.push(`- Authentication: ${context.auth.method.join(', ')}`);
    sections.push(`- Roles: ${context.auth.roles.join(', ') || 'none defined'}`);
    if (context.auth.compliance.length > 0) {
      sections.push(`- Compliance: ${context.auth.compliance.join(', ')}`);
    }
    sections.push('');
  }

  if (claudeMdContent && typeof claudeMdContent === 'string') {
    const condensed = condenseClaude(claudeMdContent, INSTRUCTIONS_MAX_CHARS - sections.join('\n').length - 100);
    if (condensed) {
      sections.push('## Kit-Generated Context');
      sections.push(condensed);
      sections.push('');
    }
  }

  let result = sections.join('\n');
  if (result.length > INSTRUCTIONS_MAX_CHARS) {
    result = result.slice(0, INSTRUCTIONS_MAX_CHARS - 3) + '...';
  }

  return result;
}

// ─── Codex Config Generation ──────────────────────────────────────────────────

/**
 * Generates .codex/instructions.md content from project context.
 *
 * @param {object} context - IDE context from extractIdeContext
 * @param {string} [claudeMdContent] - Generated CLAUDE.md content
 * @returns {string} instructions.md content
 */
function generateCodexInstructions(context, claudeMdContent) {
  const sections = [];

  sections.push(`# ${context.name} — Codex Instructions`);
  sections.push('');
  sections.push(`${context.description || 'Project managed by Devran AI Kit'}`);
  sections.push('');

  sections.push('## Stack');
  sections.push(`Platforms: ${context.stack}`);
  sections.push('');

  sections.push('## Rules');
  sections.push(context.conventions);
  sections.push('');

  if (context.auth.method.length > 0) {
    sections.push('## Auth & Security');
    sections.push(`Methods: ${context.auth.method.join(', ')}`);
    sections.push('Never expose secrets in code or logs.');
    sections.push('');
  }

  if (claudeMdContent && typeof claudeMdContent === 'string') {
    const condensed = condenseClaude(claudeMdContent, INSTRUCTIONS_MAX_CHARS - sections.join('\n').length - 100);
    if (condensed) {
      sections.push('## Kit Context');
      sections.push(condensed);
      sections.push('');
    }
  }

  let result = sections.join('\n');
  if (result.length > INSTRUCTIONS_MAX_CHARS) {
    result = result.slice(0, INSTRUCTIONS_MAX_CHARS - 3) + '...';
  }

  return result;
}

// ─── CLAUDE.md Condensation ───────────────────────────────────────────────────

/**
 * Condenses CLAUDE.md content to fit within a character budget.
 * Extracts key sections: Architecture Rules, File Rules, Testing Rules.
 *
 * @param {string} claudeContent - Full CLAUDE.md content
 * @param {number} budget - Maximum characters to use
 * @returns {string} Condensed content
 */
function condenseClaude(claudeContent, budget) {
  if (!claudeContent || budget <= 0) return '';

  // Extract sections of interest
  const sectionPattern = /^##\s+(.+)$/gm;
  const sections = [];
  let match;
  const allMatches = [];

  while ((match = sectionPattern.exec(claudeContent)) !== null) {
    allMatches.push({ title: match[1], index: match.index });
  }

  for (let i = 0; i < allMatches.length; i++) {
    const start = allMatches[i].index;
    const end = i + 1 < allMatches.length ? allMatches[i + 1].index : claudeContent.length;
    const content = claudeContent.slice(start, end).trim();
    sections.push({ title: allMatches[i].title, content });
  }

  // Prioritize: Architecture > File Rules > Testing > Coding > others
  const priority = ['Architecture', 'File', 'Testing', 'Coding', 'Critical', 'Session'];
  const sorted = sections.sort((a, b) => {
    const aIdx = priority.findIndex((p) => a.title.includes(p));
    const bIdx = priority.findIndex((p) => b.title.includes(p));
    const aPri = aIdx === -1 ? 99 : aIdx;
    const bPri = bIdx === -1 ? 99 : bIdx;
    return aPri - bPri;
  });

  let result = '';
  for (const section of sorted) {
    if (result.length + section.content.length + 2 > budget) {
      // Add truncated version if we have room
      const remaining = budget - result.length - 5;
      if (remaining > 50) {
        result += section.content.slice(0, remaining) + '...\n';
      }
      break;
    }
    result += section.content + '\n\n';
  }

  return result.trim();
}

// ─── Unified Generation ───────────────────────────────────────────────────────

/**
 * Generates all project-specific IDE configuration files.
 *
 * @param {object} profile - Validated project profile
 * @param {string} [claudeMdContent] - Generated CLAUDE.md content
 * @param {object} [options] - Generation options
 * @param {string[]} [options.targets] - IDE targets to generate (default: all)
 * @returns {{ files: Array<{ target: string, path: string, content: string }>, errors: string[] }}
 */
function generateAll(profile, claudeMdContent, options = {}) {
  const targets = options.targets || IDE_TARGETS;
  const context = extractIdeContext(profile);
  const files = [];
  const errors = [];

  for (const target of targets) {
    if (!IDE_TARGETS.includes(target)) {
      errors.push(`Unknown IDE target: "${target}"`);
      continue;
    }

    try {
      let content;
      switch (target) {
        case 'cursor':
          content = generateCursorrules(context, claudeMdContent);
          break;
        case 'opencode':
          content = generateOpenCodeInstructions(context, claudeMdContent);
          break;
        case 'codex':
          content = generateCodexInstructions(context, claudeMdContent);
          break;
      }

      files.push({
        target,
        path: IDE_FILE_PATHS[target],
        content,
      });
    } catch (err) {
      errors.push(`Failed to generate ${target} config: ${err.message}`);
      log.error(`IDE config generation failed: ${target}`, { error: err.message });
    }
  }

  return { files, errors };
}

/**
 * Writes generated IDE configs to the project directory.
 * Does NOT overwrite existing files unless force is true.
 *
 * @param {string} projectRoot - Project root directory
 * @param {Array<{ target: string, path: string, content: string }>} files - Files to write
 * @param {object} [options] - Write options
 * @param {boolean} [options.force=false] - Overwrite existing files
 * @returns {{ written: string[], skipped: string[], errors: string[] }}
 */
function writeIdeConfigs(projectRoot, files, options = {}) {
  const force = Boolean(options.force);
  const written = [];
  const skipped = [];
  const errors = [];

  for (const file of files) {
    const fullPath = path.join(projectRoot, file.path);
    const dir = path.dirname(fullPath);

    // Check if file already exists
    if (!force && fs.existsSync(fullPath)) {
      skipped.push(file.path);
      log.info(`Skipped (already exists): ${file.path}`);
      continue;
    }

    try {
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, file.content, 'utf-8');
      written.push(file.path);
      log.info(`Written: ${file.path}`);
    } catch (err) {
      // Retry on transient Windows FS errors
      if (TRANSIENT_FS_ERRORS.has(err.code)) {
        try {
          fs.writeFileSync(fullPath, file.content, 'utf-8');
          written.push(file.path);
          log.info(`Written (retry): ${file.path}`);
          continue;
        } catch (retryErr) {
          // Fall through to error
        }
      }

      errors.push(`Failed to write ${file.path}: ${err.message}`);
      log.error(`Write failed: ${file.path}`, { error: err.message });
    }
  }

  return { written, skipped, errors };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
  // Constants
  IDE_TARGETS,
  IDE_FILE_PATHS,
  CURSORRULES_MAX_CHARS,
  INSTRUCTIONS_MAX_CHARS,

  // Context extraction
  extractIdeContext,
  buildConventions,

  // Individual generators
  generateCursorrules,
  generateOpenCodeInstructions,
  generateCodexInstructions,

  // CLAUDE.md condensation
  condenseClaude,

  // Unified
  generateAll,
  writeIdeConfigs,
});
