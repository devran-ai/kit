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

module.exports = Object.freeze({
  AGENT_DIR,
  ENGINE_DIR,
  HOOKS_DIR,
  SKILLS_DIR,
  PLUGINS_DIR,
  CURSOR_DIR,
  OPENCODE_DIR,
  CODEX_DIR,
  DOCS_DIR,
});
