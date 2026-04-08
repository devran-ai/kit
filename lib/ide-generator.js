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
const { CURSOR_DIR, OPENCODE_DIR, CODEX_DIR, TRANSIENT_FS_ERRORS } = require('./constants');

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

  // Extract key protocols by matching the heading format generically
  const protocolRegex = /### [A-Z]\. [\s\S]*?(?=###|$)/g;
  let protocolMatch;
  while ((protocolMatch = protocolRegex.exec(rulesContent)) !== null) {
    const trimmed = protocolMatch[0].trim().split('\n').slice(0, 5).join('\n');
    sections.push(trimmed);
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
        path: `${CURSOR_DIR}/rules/kit-governance.mdc`,
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
        path: `${OPENCODE_DIR}/opencode.json`,
        content: JSON.stringify(config, null, 2) + '\n',
      }),
    ]),
  });
}

/**
 * Serializes a value to TOML format.
 *
 * @param {string|number|boolean|string[]} value - Value to serialize
 * @returns {string} TOML-formatted value
 */
function serializeTomlValue(value) {
  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map(v => serializeTomlValue(v));
    return `[${items.join(', ')}]`;
  }
  return `"${String(value)}"`;
}

/**
 * Minimal TOML serializer for IDE config generation.
 *
 * Intentionally limited to the subset needed by Codex config:
 * strings, numbers, booleans, arrays, and single-level nested objects.
 * Full TOML spec (inline tables, arrays of tables, multi-line strings)
 * is not supported. This is a zero-dependency design decision — we avoid
 * adding @iarna/toml to maintain the zero-dependency guarantee.
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
      // Emit section header once for top-level scalars
      const scalars = Object.entries(sectionValue).filter(
        ([, v]) => v === null || typeof v !== 'object' || Array.isArray(v)
      );
      if (scalars.length > 0) {
        lines.push(`[${sectionKey}]`);
        for (const [subKey, subValue] of scalars) {
          lines.push(`${subKey} = ${serializeTomlValue(subValue)}`);
        }
        lines.push('');
      }
      // Then nested subsections
      for (const [subKey, subValue] of Object.entries(sectionValue)) {
        if (subValue !== null && typeof subValue === 'object' && !Array.isArray(subValue)) {
          lines.push(`[${sectionKey}.${subKey}]`);
          for (const [innerKey, innerValue] of Object.entries(subValue)) {
            lines.push(`${innerKey} = ${serializeTomlValue(innerValue)}`);
          }
          lines.push('');
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
        path: `${CODEX_DIR}/config.toml`,
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
 * Writes a file atomically using temp-file-then-rename pattern.
 * Falls back to direct write on Windows EPERM/EACCES errors.
 *
 * @param {string} absolutePath - Absolute destination path
 * @param {string} content - File content
 */
function atomicWriteFile(absolutePath, content) {
  const dir = path.dirname(absolutePath);
  const tempPath = `${absolutePath}.tmp`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, absolutePath);
  } catch (renameErr) {
    const isTransient = TRANSIENT_FS_ERRORS.has(renameErr.code);
    if (isTransient) {
      fs.writeFileSync(absolutePath, content, 'utf-8');
    } else {
      throw renameErr;
    }
  } finally {
    // Ensure temp file is always cleaned up
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch { /* non-critical */ }
  }
}

/**
 * Rolls back previously written files during transactional failure.
 *
 * @param {string} projectRoot - Absolute project root
 * @param {string[]} writtenPaths - Relative paths of written files
 */
function rollbackWrittenFiles(projectRoot, writtenPaths) {
  for (const writtenPath of writtenPaths) {
    try {
      const abs = path.resolve(projectRoot, writtenPath);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch { /* rollback failure is non-critical */ }
  }
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
      skipped.push(file.path);
      continue;
    }

    try {
      atomicWriteFile(absolutePath, file.content);
      written.push(file.path);
    } catch (err) {
      rollbackWrittenFiles(projectRoot, written);
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

/**
 * Checks if a file at the given path was generated by Devran AI Kit.
 * Reads the first 128 bytes atomically (single open-read-close) to avoid
 * TOCTOU races between existence check and provenance check.
 *
 * @param {string} absolutePath - Absolute path to the file
 * @returns {boolean} True if file exists AND contains the Kit bridge header
 */
function checkKitProvenance(absolutePath) {
  const { KIT_BRIDGE_HEADER } = require('./constants');
  let fd;
  try {
    fd = fs.openSync(absolutePath, 'r');
    const buf = Buffer.alloc(128);
    fs.readSync(fd, buf, 0, 128, 0);
    return buf.toString('utf-8').includes(KIT_BRIDGE_HEADER);
  } catch (err) {
    // ENOENT = file does not exist, return null to distinguish from "exists but not Kit"
    if (err.code === 'ENOENT') return null;
    return false;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* non-critical */ }
    }
  }
}

/**
 * Writes command bridge files with provenance-aware overwrite protection (S4).
 * Only overwrites existing files if they were generated by Kit (contain the
 * provenance header). User-created command files are never overwritten.
 *
 * Uses atomic provenance check (checkKitProvenance) to eliminate the TOCTOU
 * race between fs.existsSync and the header read — a single open call
 * determines both existence and ownership.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {IdeConfig[]} configs - Array of bridge configurations
 * @param {object} [options={}] - Write options
 * @param {boolean} [options.force=false] - Force overwrite of Kit-generated files
 * @returns {{ written: string[], skipped: string[], skippedUserFiles: string[] }}
 */
function writeBridgeConfigs(projectRoot, configs, options = {}) {
  if (typeof projectRoot !== 'string' || !path.isAbsolute(projectRoot)) {
    throw new TypeError('projectRoot must be an absolute path string');
  }
  if (!Array.isArray(configs)) {
    throw new TypeError('configs must be an array');
  }

  const { force = false } = options;
  const allFiles = configs.flatMap((config) => config.files || []);
  const safeFiles = [];
  const skippedFiles = [];
  const skippedUserFiles = [];

  for (const file of allFiles) {
    const absolutePath = validatePath(projectRoot, file.path);

    // Atomic provenance check: single open determines existence + ownership
    // Returns null (not found), true (Kit-generated), or false (user file)
    const provenance = checkKitProvenance(absolutePath);

    if (provenance === null) {
      // File does not exist — safe to create
      safeFiles.push(file);
    } else if (!force) {
      // File exists but no force — skip regardless of ownership
      skippedFiles.push(file.path);
    } else if (provenance === true) {
      // File exists, force enabled, Kit-generated — safe to overwrite
      safeFiles.push(file);
    } else {
      // File exists, force enabled, user-created — never overwrite
      skippedUserFiles.push(file.path);
    }
  }

  const result = writeIdeConfigs(projectRoot, [{ files: safeFiles }], { force: true, skipExisting: false });

  return Object.freeze({
    written: Object.freeze([...result.written]),
    skipped: Object.freeze([...skippedFiles, ...result.skipped]),
    skippedUserFiles: Object.freeze([...skippedUserFiles]),
  });
}

module.exports = Object.freeze({
  generateCursorConfig,
  generateOpenCodeConfig,
  generateCodexConfig,
  generateAllIdeConfigs,
  writeIdeConfigs,
  writeBridgeConfigs,
  serializeToml,
  condenseRules,
});
