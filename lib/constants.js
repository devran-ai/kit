/**
 * Devran AI Kit — Shared Constants
 *
 * Central definition of directory names and paths used across
 * all runtime modules. Prevents drift from duplicated strings.
 * Frozen to prevent accidental mutation at runtime.
 *
 * @module lib/constants
 * @since v3.2.0
 */

'use strict';

/** Root agent configuration directory name */
const AGENT_DIR = '.agent';

/** Engine subdirectory within .agent */
const ENGINE_DIR = 'engine';

/** Hooks subdirectory within .agent */
const HOOKS_DIR = 'hooks';

/** Skills subdirectory within .agent */
const SKILLS_DIR = 'skills';

/** Plugins subdirectory within .agent */
const PLUGINS_DIR = 'plugins';

/** Cursor IDE configuration directory */
const CURSOR_DIR = '.cursor';

/** OpenCode IDE configuration directory */
const OPENCODE_DIR = '.opencode';

/** Codex IDE configuration directory */
const CODEX_DIR = '.codex';

/** Default documentation directory name */
const DOCS_DIR = 'docs';

/** Claude Code IDE configuration directory (slash commands) */
const CLAUDE_DIR = '.claude';

/** Claude Code commands subdirectory within .claude */
const CLAUDE_COMMANDS_DIR = 'commands';

/** Cursor commands subdirectory within .cursor */
const CURSOR_COMMANDS_DIR = 'commands';

/** OpenCode commands subdirectory within .opencode */
const OPENCODE_COMMANDS_DIR = 'commands';

/** GitHub prompts directory for VS Code Copilot */
const GITHUB_PROMPTS_DIR = '.github/prompts';

/** Windsurf IDE configuration directory */
const WINDSURF_DIR = '.windsurf';

/** Windsurf workflows subdirectory */
const WINDSURF_WORKFLOWS_DIR = 'workflows';

/** Maximum workflow items to process (DoS prevention) */
const MAX_WORKFLOW_ITEMS = 100;

/** Maximum workflow file size in bytes (64KB read limit) */
const MAX_WORKFLOW_FILE_SIZE = 65536;

/** Allowlist regex for safe command names (prevents path traversal + Windows reserved names) */
const SAFE_COMMAND_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Provenance header for Kit-generated bridge files */
const KIT_BRIDGE_HEADER = '<!-- devran-kit-bridge';

/** Templates subdirectory within .agent */
const TEMPLATES_DIR = 'templates';

/** Staging subdirectory within .agent for in-progress generation */
const STAGING_DIR = 'staging';

/** Onboarding state file name within engine directory */
const ONBOARDING_STATE_FILE = 'onboarding-state.json';

/** Decisions memory file name within engine directory */
const DECISIONS_FILE = 'decisions.json';

/** Windows transient filesystem error codes (file locks from antivirus, indexer, etc.) */
const TRANSIENT_FS_ERRORS = Object.freeze(new Set(['EPERM', 'EACCES', 'EBUSY']));

module.exports = Object.freeze({
  AGENT_DIR,
  ENGINE_DIR,
  HOOKS_DIR,
  SKILLS_DIR,
  PLUGINS_DIR,
  CURSOR_DIR,
  OPENCODE_DIR,
  CODEX_DIR,
  CLAUDE_DIR,
  CLAUDE_COMMANDS_DIR,
  CURSOR_COMMANDS_DIR,
  OPENCODE_COMMANDS_DIR,
  GITHUB_PROMPTS_DIR,
  WINDSURF_DIR,
  WINDSURF_WORKFLOWS_DIR,
  DOCS_DIR,
  TEMPLATES_DIR,
  STAGING_DIR,
  ONBOARDING_STATE_FILE,
  DECISIONS_FILE,
  TRANSIENT_FS_ERRORS,
  MAX_WORKFLOW_ITEMS,
  MAX_WORKFLOW_FILE_SIZE,
  SAFE_COMMAND_NAME,
  KIT_BRIDGE_HEADER,
});
