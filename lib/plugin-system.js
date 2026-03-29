/**
 * Devran AI Kit — Plugin System
 *
 * Full plugin lifecycle: install, remove, validate, and manage
 * plugins that can contribute agents, skills, workflows, hooks,
 * and engine configurations.
 *
 * @module lib/plugin-system
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { AGENT_DIR, ENGINE_DIR, PLUGINS_DIR, HOOKS_DIR } = require('./constants');
const { writeJsonAtomic, safeCopyDirSync } = require('./io');
const { createLogger } = require('./logger');
const log = createLogger('plugin-system');
const PLUGINS_REGISTRY = 'plugins-registry.json';
const HOOKS_FILE = 'hooks.json';

/** Required fields in plugin.json */
const REQUIRED_PLUGIN_FIELDS = ['name', 'version', 'author', 'description'];

/**
 * @typedef {object} PluginManifest
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} author - Plugin author
 * @property {string} description - Plugin description
 * @property {string[]} [agents] - Agent .md file names
 * @property {string[]} [skills] - Skill directory names
 * @property {string[]} [workflows] - Workflow .md file names
 * @property {object[]} [hooks] - Lifecycle hook definitions
 * @property {object} [engineConfigs] - Engine config patches
 */

/**
 * @typedef {object} PluginRegistryEntry
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} author - Plugin author
 * @property {string} installedAt - ISO timestamp
 * @property {string} sourcePath - Original install source
 * @property {object} installed - Installed asset counts
 */

/**
 * Resolves the plugins directory path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string}
 */
function resolvePluginsDir(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, PLUGINS_DIR);
}

/**
 * Resolves the plugins registry path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string}
 */
function resolveRegistryPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, PLUGINS_REGISTRY);
}

/**
 * Loads the plugin registry.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ plugins: PluginRegistryEntry[] }}
 */
function loadRegistry(projectRoot) {
  const registryPath = resolveRegistryPath(projectRoot);

  if (!fs.existsSync(registryPath)) {
    return { plugins: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch (err) {
    log.warn('Corrupted plugin registry — resetting to empty', { file: registryPath, error: err.message });
    return { plugins: [] };
  }
}

/**
 * Writes the plugin registry atomically.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {object} registry - Registry data
 * @returns {void}
 */
function writeRegistry(projectRoot, registry) {
  const registryPath = resolveRegistryPath(projectRoot);
  writeJsonAtomic(registryPath, registry);
}

/**
 * Validates a plugin manifest (plugin.json).
 *
 * @param {string} pluginPath - Path to the plugin directory
 * @returns {{ valid: boolean, errors: string[], manifest?: PluginManifest }}
 */
function validatePlugin(pluginPath) {
  const manifestPath = path.join(pluginPath, 'plugin.json');
  /** @type {string[]} */
  const errors = [];

  if (!fs.existsSync(manifestPath)) {
    return { valid: false, errors: ['Missing plugin.json'] };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return { valid: false, errors: ['Invalid JSON in plugin.json'] };
  }

  // Check required fields
  for (const field of REQUIRED_PLUGIN_FIELDS) {
    if (!manifest[field] || typeof manifest[field] !== 'string' || manifest[field].trim().length === 0) {
      errors.push(`Missing or empty required field: ${field}`);
    }
  }

  // Validate name format (lowercase, hyphens allowed)
  if (manifest.name && !/^[a-z0-9][a-z0-9-]*$/.test(manifest.name)) {
    errors.push('Plugin name must be lowercase alphanumeric with hyphens');
  }

  // Validate referenced files exist
  for (const agentFile of (manifest.agents || [])) {
    if (!fs.existsSync(path.join(pluginPath, 'agents', agentFile))) {
      errors.push(`Referenced agent file not found: agents/${agentFile}`);
    }
  }

  for (const skillDir of (manifest.skills || [])) {
    const skillPath = path.join(pluginPath, 'skills', skillDir);
    if (!fs.existsSync(skillPath)) {
      errors.push(`Referenced skill directory not found: skills/${skillDir}`);
    } else {
      const skillMd = path.join(skillPath, 'SKILL.md');
      if (!fs.existsSync(skillMd)) {
        errors.push(`Skill "${skillDir}" missing required SKILL.md`);
      }
    }
  }

  for (const workflowFile of (manifest.workflows || [])) {
    if (!fs.existsSync(path.join(pluginPath, 'workflows', workflowFile))) {
      errors.push(`Referenced workflow file not found: workflows/${workflowFile}`);
    }
  }

  // Validate hook event names
  const validEvents = ['session-start', 'session-end', 'pre-commit', 'secret-detection', 'phase-transition', 'sprint-checkpoint', 'plan-complete', 'task-complete', 'onboarding-complete'];
  for (const hook of (manifest.hooks || [])) {
    if (!hook.event || !validEvents.includes(hook.event)) {
      errors.push(`Invalid hook event: ${hook.event || 'undefined'}. Valid: ${validEvents.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors, manifest };
}

/**
 * Checks for naming collisions with existing assets.
 *
 * @param {PluginManifest} manifest - Plugin manifest
 * @param {string} projectRoot - Root directory of the project
 * @returns {string[]} Collision warnings
 */
function checkCollisions(manifest, projectRoot) {
  /** @type {string[]} */
  const collisions = [];

  for (const agentFile of (manifest.agents || [])) {
    const destPath = path.join(projectRoot, AGENT_DIR, 'agents', agentFile);
    if (fs.existsSync(destPath)) {
      collisions.push(`Agent collision: ${agentFile} already exists`);
    }
  }

  for (const skillDir of (manifest.skills || [])) {
    const destPath = path.join(projectRoot, AGENT_DIR, 'skills', skillDir);
    if (fs.existsSync(destPath)) {
      collisions.push(`Skill collision: ${skillDir} already exists`);
    }
  }

  for (const workflowFile of (manifest.workflows || [])) {
    const destPath = path.join(projectRoot, AGENT_DIR, 'workflows', workflowFile);
    if (fs.existsSync(destPath)) {
      collisions.push(`Workflow collision: ${workflowFile} already exists`);
    }
  }

  return collisions;
}

/**
 * Validates file paths in a plugin manifest for path traversal (E-2).
 * Defense-in-depth: prevents malicious plugins from escaping .agent/ sandbox.
 *
 * @param {PluginManifest} manifest - Plugin manifest
 * @returns {string[]} Violations found (empty = safe)
 */
function validateFilePaths(manifest) {
  /** @type {string[]} */
  const violations = [];
  const pathFields = [
    ...(manifest.agents || []),
    ...(manifest.skills || []),
    ...(manifest.workflows || []),
  ];

  for (const filePath of pathFields) {
    if (typeof filePath !== 'string') {
      violations.push(`Invalid path type: ${typeof filePath}`);
      continue;
    }
    if (path.isAbsolute(filePath)) {
      violations.push(`Security: Absolute path not allowed: ${filePath}`);
    }
    if (filePath.includes('..')) {
      violations.push(`Security: Path traversal not allowed: ${filePath}`);
    }
    const normalized = path.normalize(filePath);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      violations.push(`Security: Path escapes sandbox: ${filePath}`);
    }
  }

  return violations;
}

/**
 * Installs a plugin from a local directory.
 *
 * @param {string} pluginPath - Path to the plugin source directory
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ success: boolean, errors: string[], installed: object }}
 */
function installPlugin(pluginPath, projectRoot) {
  // Validate plugin
  const validation = validatePlugin(pluginPath);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, installed: {} };
  }

  const manifest = validation.manifest;

  // Path traversal defense-in-depth (E-2)
  const pathViolations = validateFilePaths(manifest);
  if (pathViolations.length > 0) {
    return { success: false, errors: pathViolations, installed: {} };
  }

  // Check if already installed (before collision check)
  const registry = loadRegistry(projectRoot);
  if (registry.plugins.find((p) => p.name === manifest.name)) {
    return { success: false, errors: [`Plugin "${manifest.name}" is already installed`], installed: {} };
  }

  // Check for collisions
  const collisions = checkCollisions(manifest, projectRoot);
  if (collisions.length > 0) {
    return { success: false, errors: collisions, installed: {} };
  }

  const installed = { agents: 0, skills: 0, workflows: 0, hooks: 0, configs: 0 };

  // Install agents
  for (const agentFile of (manifest.agents || [])) {
    const src = path.join(pluginPath, 'agents', agentFile);
    const dest = path.join(projectRoot, AGENT_DIR, 'agents', agentFile);
    copyFileSync(src, dest);
    installed.agents++;
  }

  // Install skills
  for (const skillDir of (manifest.skills || [])) {
    const src = path.join(pluginPath, 'skills', skillDir);
    const dest = path.join(projectRoot, AGENT_DIR, 'skills', skillDir);
    safeCopyDirSync(src, dest);
    installed.skills++;
  }

  // Install workflows
  for (const workflowFile of (manifest.workflows || [])) {
    const src = path.join(pluginPath, 'workflows', workflowFile);
    const dest = path.join(projectRoot, AGENT_DIR, 'workflows', workflowFile);
    copyFileSync(src, dest);
    installed.workflows++;
  }

  // Merge hooks
  if (manifest.hooks && manifest.hooks.length > 0) {
    mergeHooks(manifest.hooks, manifest.name, projectRoot);
    installed.hooks = manifest.hooks.length;
  }

  // Apply engine configs
  if (manifest.engineConfigs && Object.keys(manifest.engineConfigs).length > 0) {
    applyEngineConfigs(manifest.engineConfigs, manifest.name, projectRoot);
    installed.configs = Object.keys(manifest.engineConfigs).length;
  }

  // Store plugin copy in plugins dir for uninstall reference
  const pluginStoreDir = path.join(resolvePluginsDir(projectRoot), manifest.name);
  if (!fs.existsSync(pluginStoreDir)) {
    fs.mkdirSync(pluginStoreDir, { recursive: true });
  }
  copyFileSync(
    path.join(pluginPath, 'plugin.json'),
    path.join(pluginStoreDir, 'plugin.json')
  );

  // Update registry (immutable)
  const updatedRegistry = {
    ...registry,
    plugins: [
      ...registry.plugins,
      {
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        installedAt: new Date().toISOString(),
        sourcePath: pluginPath,
        installed,
      },
    ],
  };

  writeRegistry(projectRoot, updatedRegistry);

  return { success: true, errors: [], installed };
}

/**
 * Removes an installed plugin.
 *
 * @param {string} pluginName - Name of the plugin to remove
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ success: boolean, error?: string, removed: object }}
 */
function removePlugin(pluginName, projectRoot) {
  const registry = loadRegistry(projectRoot);
  const pluginIndex = registry.plugins.findIndex((p) => p.name === pluginName);

  if (pluginIndex === -1) {
    return { success: false, error: `Plugin "${pluginName}" is not installed`, removed: {} };
  }

  // Load plugin manifest from stored copy
  const pluginStoreDir = path.join(resolvePluginsDir(projectRoot), pluginName);
  const manifestPath = path.join(pluginStoreDir, 'plugin.json');

  if (!fs.existsSync(manifestPath)) {
    // If stored copy is missing, still remove from registry (immutable)
    const cleanedRegistry = { ...registry, plugins: registry.plugins.filter((p) => p.name !== pluginName) };
    writeRegistry(projectRoot, cleanedRegistry);
    return { success: true, removed: { note: 'Manifest not found — registry cleaned only' } };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const removed = { agents: 0, skills: 0, workflows: 0, hooks: 0 };

  // Remove agents
  for (const agentFile of (manifest.agents || [])) {
    const dest = path.join(projectRoot, AGENT_DIR, 'agents', agentFile);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      removed.agents++;
    }
  }

  // Remove skills
  for (const skillDir of (manifest.skills || [])) {
    const dest = path.join(projectRoot, AGENT_DIR, 'skills', skillDir);
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true });
      removed.skills++;
    }
  }

  // Remove workflows
  for (const workflowFile of (manifest.workflows || [])) {
    const dest = path.join(projectRoot, AGENT_DIR, 'workflows', workflowFile);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      removed.workflows++;
    }
  }

  // Unmerge hooks
  if (manifest.hooks && manifest.hooks.length > 0) {
    unmergeHooks(pluginName, projectRoot);
    removed.hooks = manifest.hooks.length;
  }

  // Clean up stored plugin copy
  if (fs.existsSync(pluginStoreDir)) {
    fs.rmSync(pluginStoreDir, { recursive: true });
  }

  // Update registry (immutable)
  const updatedRegistry = { ...registry, plugins: registry.plugins.filter((p) => p.name !== pluginName) };
  writeRegistry(projectRoot, updatedRegistry);

  return { success: true, removed };
}

/**
 * Lists all installed plugins.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {PluginRegistryEntry[]}
 */
function listPlugins(projectRoot) {
  return loadRegistry(projectRoot).plugins;
}

/**
 * Gets hook definitions from a plugin's stored manifest.
 *
 * @param {string} pluginName - Plugin name
 * @param {string} projectRoot - Root directory of the project
 * @returns {object[]}
 */
function getPluginHooks(pluginName, projectRoot) {
  const manifestPath = path.join(resolvePluginsDir(projectRoot), pluginName, 'plugin.json');

  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return manifest.hooks || [];
}

/**
 * Merges plugin hooks into the project's hooks.json.
 *
 * @param {object[]} pluginHooks - Hook definitions from plugin
 * @param {string} pluginName - Plugin name for source tagging
 * @param {string} projectRoot - Root directory
 * @returns {void}
 */
function mergeHooks(pluginHooks, pluginName, projectRoot) {
  const hooksPath = path.join(projectRoot, AGENT_DIR, HOOKS_DIR, HOOKS_FILE);
  let hooksConfig = { hooks: [] };

  if (fs.existsSync(hooksPath)) {
    hooksConfig = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
  }

  // Build updated hooks array immutably
  let updatedHooks = [...hooksConfig.hooks];

  for (const pluginHook of pluginHooks) {
    const existingHookIndex = updatedHooks.findIndex((h) => h.event === pluginHook.event);

    const taggedActions = (pluginHook.actions || []).map((action) => ({
      ...action,
      source: `plugin:${pluginName}`,
    }));

    if (existingHookIndex !== -1) {
      // Append to existing event (immutable)
      updatedHooks = updatedHooks.map((hook, i) =>
        i === existingHookIndex
          ? { ...hook, actions: [...hook.actions, ...taggedActions] }
          : hook
      );
    } else {
      // Create new event entry
      updatedHooks = [
        ...updatedHooks,
        {
          event: pluginHook.event,
          description: pluginHook.description || `Added by plugin: ${pluginName}`,
          actions: taggedActions,
        },
      ];
    }
  }

  writeJsonAtomic(hooksPath, { ...hooksConfig, hooks: updatedHooks });
}

/**
 * Removes plugin-contributed hooks from hooks.json.
 *
 * @param {string} pluginName - Plugin name to filter out
 * @param {string} projectRoot - Root directory
 * @returns {void}
 */
function unmergeHooks(pluginName, projectRoot) {
  const hooksPath = path.join(projectRoot, AGENT_DIR, HOOKS_DIR, HOOKS_FILE);

  if (!fs.existsSync(hooksPath)) {
    return;
  }

  const hooksConfig = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
  const sourceTag = `plugin:${pluginName}`;

  // Filter out plugin actions immutably, then remove empty hooks
  const updatedHooks = hooksConfig.hooks
    .map((hook) => ({
      ...hook,
      actions: (hook.actions || []).filter((a) => a.source !== sourceTag),
    }))
    .filter((hook) => hook.actions.length > 0);

  writeJsonAtomic(hooksPath, { ...hooksConfig, hooks: updatedHooks });
}

/**
 * Recursively sanitizes a value by stripping prototype-polluting keys
 * at all nesting levels. Returns a clean copy without mutating the input.
 *
 * @param {*} val - Value to sanitize
 * @returns {*} Sanitized copy
 */
function sanitizeValue(val) {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  const clean = {};
  for (const [k, v] of Object.entries(val)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      continue;
    }
    clean[k] = sanitizeValue(v);
  }
  return clean;
}

/**
 * Applies engine config patches from a plugin.
 *
 * @param {object} configs - Key-value config patches
 * @param {string} pluginName - Plugin name for tracking
 * @param {string} projectRoot - Root directory
 * @returns {void}
 */
function applyEngineConfigs(configs, pluginName, projectRoot) {
  for (const [configFile, patches] of Object.entries(configs)) {
    // Reject path traversal in config file names
    if (configFile.includes('/') || configFile.includes('\\') || configFile.includes('..')) {
      continue;
    }

    const configPath = path.join(projectRoot, AGENT_DIR, ENGINE_DIR, configFile);

    if (!fs.existsSync(configPath)) {
      continue;
    }

    let config;
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (err) {
      log.warn('Failed to parse engine config — skipping', { file: configPath, error: err.message });
      continue;
    }

    // Deep merge patches immutably with prototype pollution guard (H-5)
    const sanitizedPatches = Object.entries(patches)
      .filter(([key]) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: sanitizeValue(value) }), {});

    const updatedConfig = {
      ...config,
      ...sanitizedPatches,
      _pluginPatches: {
        ...(config._pluginPatches || {}),
        [pluginName]: Object.keys(patches),
      },
    };

    writeJsonAtomic(configPath, updatedConfig);
  }
}

/**
 * Copies a file with directory creation.
 *
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 * @returns {void}
 */
function copyFileSync(src, dest) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}



module.exports = {
  validatePlugin,
  installPlugin,
  removePlugin,
  listPlugins,
  getPluginHooks,
};
