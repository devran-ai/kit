/**
 * Devran AI Kit — IDE Configuration Generator
 *
 * Generates IDE-specific configuration files from manifest.json
 * for Cursor, OpenCode, and Codex. Single source of truth ensures
 * all IDE configs stay in sync with the agent manifest.
 *
 * @module lib/ide-generator
 * @since v4.1.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @typedef {object} IdeFile
 * @property {string} path - Relative path from project root
 * @property {string} content - File content to write
 */

/**
 * @typedef {object} IdeConfig
 * @property {IdeFile[]} files - Array of files to generate
 */

/**
 * @typedef {object} WriteResult
 * @property {string[]} written - Files that were written
 * @property {string[]} skipped - Files that were skipped (already exist)
 */

/**
 * Condenses rules.md content to fit under 4K characters.
 * Extracts operating constraints, coding style, and security requirements.
 *
 * @param {string} rulesContent - Full rules.md content
 * @returns {string} Condensed rules content
 */
function condenseRules(rulesContent) {
  const sections = [];

  sections.push('# Devran AI Kit Governance\n');

  // Extract operating constraints table
  const constraintsMatch = rulesContent.match(
    /### Operating Constraints[\s\S]*?\n\n/
  );
  if (constraintsMatch) {
    sections.push(constraintsMatch[0].trim());
  }

  // Extract key protocols
  const protocols = [
    'Chain of Thought Requirement',
    'Review Mode',
    'Preservation Rule',
    'Cascade Update Protocol',
    'Verification Before Completion',
  ];

  for (const protocol of protocols) {
    const regex = new RegExp(`### [A-Z]\\. ${protocol}[\\s\\S]*?(?=###|$)`);
    const match = rulesContent.match(regex);
    if (match) {
      const trimmed = match[0].trim().split('\n').slice(0, 5).join('\n');
      sections.push(trimmed);
    }
  }

  // Extract technical standards
  const techMatch = rulesContent.match(
    /## .* TECHNICAL STANDARDS[\s\S]*?(?=## |$)/
  );
  if (techMatch) {
    sections.push(techMatch[0].trim().split('\n').slice(0, 12).join('\n'));
  }

  const result = sections.join('\n\n');
  // Enforce 4K limit
  return result.length > 4000 ? result.slice(0, 3997) + '...' : result;
}

/**
 * Generates Cursor IDE configuration with governance rules.
 *
 * @param {object} _manifest - Parsed manifest.json
 * @param {string} rulesContent - Raw rules.md content
 * @returns {IdeConfig}
 */
function generateCursorConfig(_manifest, rulesContent) {
  const condensed = condenseRules(rulesContent);
  const mdcContent = [
    '---',
    'description: "Devran AI Kit - Trust-Grade AI governance and coding standards"',
    'alwaysApply: true',
    '---',
    '',
    condensed,
    '',
  ].join('\n');

  return Object.freeze({
    files: Object.freeze([
      Object.freeze({
        path: '.cursor/rules/kit-governance.mdc',
        content: mdcContent,
      }),
    ]),
  });
}

/**
 * Extracts agent descriptions from manifest for IDE config.
 *
 * @param {object} manifest - Parsed manifest.json
 * @returns {{ planner: string, reviewer: string }}
 */
function extractAgentDescriptions(manifest) {
  const agents = manifest?.capabilities?.agents?.items || [];
  const plannerAgent = agents.find((a) => a.name === 'planner');
  const reviewerAgent = agents.find((a) => a.name === 'code-reviewer');

  return {
    planner: plannerAgent?.domain || 'Implementation planning specialist',
    reviewer: reviewerAgent?.domain || 'Code review and security analysis',
  };
}

/**
 * Generates OpenCode IDE configuration.
 *
 * @param {object} manifest - Parsed manifest.json
 * @returns {IdeConfig}
 */
function generateOpenCodeConfig(manifest) {
  const descriptions = extractAgentDescriptions(manifest);

  const config = {
    $schema: 'https://opencode.ai/config.json',
    model: 'anthropic/claude-sonnet-4-5',
    small_model: 'anthropic/claude-haiku-4-5',
    instructions: ['.agent/rules.md'],
    agent: {
      build: {
        description: 'Primary development agent with Devran AI Kit governance',
        model: 'anthropic/claude-sonnet-4-5',
      },
      planner: {
        description: descriptions.planner,
        model: 'anthropic/claude-sonnet-4-5',
      },
      reviewer: {
        description: descriptions.reviewer,
        model: 'anthropic/claude-sonnet-4-5',
      },
    },
  };

  return Object.freeze({
    files: Object.freeze([
      Object.freeze({
        path: '.opencode/opencode.json',
        content: JSON.stringify(config, null, 2) + '\n',
      }),
    ]),
  });
}

/**
 * Serializes a value to TOML format.
 *
 * @param {string|number|boolean} value - Value to serialize
 * @returns {string} TOML-formatted value
 */
function serializeTomlValue(value) {
  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  return `"${String(value)}"`;
}

/**
 * Serializes a flat or single-level nested object to TOML format.
 * Handles strings (quoted), numbers and booleans (unquoted),
 * and nested objects as [section] headers.
 *
 * @param {object} obj - Object to serialize
 * @returns {string} TOML-formatted string
 */
function serializeToml(obj) {
  const lines = [];
  const sections = [];

  // First pass: top-level scalars
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sections.push([key, value]);
    } else {
      lines.push(`${key} = ${serializeTomlValue(value)}`);
    }
  }

  // Second pass: nested sections
  for (const [sectionKey, sectionValue] of sections) {
    lines.push('');

    // Check if section contains further nested objects
    const hasNestedObjects = Object.values(sectionValue).some(
      (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
    );

    if (hasNestedObjects) {
      for (const [subKey, subValue] of Object.entries(sectionValue)) {
        if (subValue !== null && typeof subValue === 'object' && !Array.isArray(subValue)) {
          lines.push(`[${sectionKey}.${subKey}]`);
          for (const [innerKey, innerValue] of Object.entries(subValue)) {
            lines.push(`${innerKey} = ${serializeTomlValue(innerValue)}`);
          }
          lines.push('');
        } else {
          // Scalar under the section
          lines.push(`[${sectionKey}]`);
          lines.push(`${subKey} = ${serializeTomlValue(subValue)}`);
        }
      }
    } else {
      lines.push(`[${sectionKey}]`);
      for (const [innerKey, innerValue] of Object.entries(sectionValue)) {
        lines.push(`${innerKey} = ${serializeTomlValue(innerValue)}`);
      }
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Generates Codex IDE configuration.
 *
 * @param {object} manifest - Parsed manifest.json
 * @returns {IdeConfig}
 */
function generateCodexConfig(manifest) {
  const descriptions = extractAgentDescriptions(manifest);

  const config = {
    approval_policy: 'suggest',
    sandbox_mode: 'workspace-write',
    model: {
      default: 'anthropic/claude-sonnet-4-5',
    },
    agents: {
      planner: {
        description: descriptions.planner,
        model: 'anthropic/claude-sonnet-4-5',
      },
      reviewer: {
        description: descriptions.reviewer,
        model: 'anthropic/claude-sonnet-4-5',
      },
    },
  };

  const tomlHeader = [
    '# Devran AI Kit — Codex Configuration',
    '# Generated by kit init — do not edit manually',
    '',
    '',
  ].join('\n');

  return Object.freeze({
    files: Object.freeze([
      Object.freeze({
        path: '.codex/config.toml',
        content: tomlHeader + serializeToml(config),
      }),
    ]),
  });
}

/**
 * Validates that a file path resolves under the project root.
 * Prevents path traversal attacks.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} filePath - Relative file path to validate
 * @returns {string} Resolved absolute path
 * @throws {Error} If path resolves outside project root
 */
function validatePath(projectRoot, filePath) {
  if (typeof filePath !== 'string' || filePath.includes('\0')) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  const resolved = path.resolve(projectRoot, filePath);
  const normalizedRoot = path.resolve(projectRoot) + path.sep;

  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  return resolved;
}

/**
 * Writes IDE configuration files to the project directory.
 * Uses atomic write pattern (write to .tmp, then rename).
 * Transactional: rolls back all written files if any write fails.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {IdeConfig[]} configs - Array of IDE configurations
 * @param {object} [options={}] - Write options
 * @param {boolean} [options.force=false] - Overwrite existing files
 * @param {boolean} [options.skipExisting=false] - Silently skip existing
 * @returns {WriteResult}
 */
function writeIdeConfigs(projectRoot, configs, options = {}) {
  if (typeof projectRoot !== 'string' || !path.isAbsolute(projectRoot)) {
    throw new TypeError('projectRoot must be an absolute path string');
  }
  if (!Array.isArray(configs)) {
    throw new TypeError('configs must be an array');
  }

  const { force = false, skipExisting = false } = options;
  const written = [];
  const skipped = [];

  // Collect all files from all configs
  const allFiles = configs.flatMap((config) => config.files || []);

  for (const file of allFiles) {
    const absolutePath = validatePath(projectRoot, file.path);

    if (fs.existsSync(absolutePath) && !force) {
      if (skipExisting) {
        skipped.push(file.path);
        continue;
      }
      skipped.push(file.path);
      continue;
    }

    const dir = path.dirname(absolutePath);
    const tempPath = `${absolutePath}.tmp`;

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(tempPath, file.content, 'utf-8');

      // Atomic rename with Windows retry
      let renamed = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          fs.renameSync(tempPath, absolutePath);
          renamed = true;
          break;
        } catch (renameErr) {
          const isTransient = renameErr.code === 'EPERM' || renameErr.code === 'EACCES';
          if (!isTransient || attempt === 2) {
            fs.writeFileSync(absolutePath, file.content, 'utf-8');
            renamed = true;
            break;
          }
          const start = Date.now();
          while (Date.now() - start < (attempt === 0 ? 1 : 5)) { /* spin wait */ }
        }
      }

      // Clean up temp if fallback was used
      if (renamed) {
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch {
          // Cleanup failure is non-critical
        }
      }

      written.push(file.path);
    } catch (err) {
      // Transactional rollback: remove all previously written files
      for (const writtenPath of written) {
        try {
          const absWritten = path.resolve(projectRoot, writtenPath);
          if (fs.existsSync(absWritten)) {
            fs.unlinkSync(absWritten);
          }
        } catch {
          // Rollback cleanup failure is non-critical
        }
      }
      // Clean up temp file
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        // Non-critical
      }
      throw new Error(`Failed to write ${file.path}: ${err.message}`);
    }
  }

  return Object.freeze({ written: Object.freeze([...written]), skipped: Object.freeze([...skipped]) });
}

/**
 * Generates all IDE configurations from manifest and rules.
 *
 * @param {object} manifest - Parsed manifest.json
 * @param {string} rulesContent - Raw rules.md content
 * @returns {IdeConfig[]}
 */
function generateAllIdeConfigs(manifest, rulesContent) {
  return [
    generateCursorConfig(manifest, rulesContent),
    generateOpenCodeConfig(manifest),
    generateCodexConfig(manifest),
  ];
}

module.exports = {
  generateCursorConfig,
  generateOpenCodeConfig,
  generateCodexConfig,
  generateAllIdeConfigs,
  writeIdeConfigs,
  serializeToml,
  condenseRules,
};
