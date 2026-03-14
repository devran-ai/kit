/**
 * Antigravity AI Kit — Developer Identity System
 *
 * Local identity management for multi-developer scenarios.
 * Auto-detects from git config with manual registration fallback.
 *
 * @module lib/identity
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const AGENT_DIR = '.agent';
const ENGINE_DIR = 'engine';
const IDENTITY_FILE = 'identity.json';

/** @type {readonly string[]} */
const VALID_ROLES = ['owner', 'contributor', 'reviewer'];

/**
 * @typedef {object} Identity
 * @property {string} id - Deterministic developer ID (SHA-256 truncated)
 * @property {string} name - Developer name
 * @property {string} email - Developer email
 * @property {string} role - Developer role
 * @property {string} registeredAt - ISO timestamp
 * @property {string} lastActiveAt - ISO timestamp
 */

/**
 * Resolves the identity file path.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {string} Absolute path to identity.json
 */
function resolveIdentityPath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, IDENTITY_FILE);
}

/**
 * Generates a deterministic developer ID from email.
 *
 * @param {string} email - Developer email
 * @returns {string} 12-char hex ID
 */
function generateDeveloperId(email) {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex')
    .slice(0, 12);
}

/**
 * Loads the identity registry from disk.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ developers: Identity[], activeId: string | null }}
 */
function loadIdentityRegistry(projectRoot) {
  const identityPath = resolveIdentityPath(projectRoot);

  if (!fs.existsSync(identityPath)) {
    return { developers: [], activeId: null };
  }

  try {
    return JSON.parse(fs.readFileSync(identityPath, 'utf-8'));
  } catch {
    return { developers: [], activeId: null };
  }
}

/**
 * Writes the identity registry to disk atomically.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {object} registry - Registry data
 * @returns {void}
 */
function writeIdentityRegistry(projectRoot, registry) {
  const identityPath = resolveIdentityPath(projectRoot);
  const tempPath = `${identityPath}.tmp`;
  const dir = path.dirname(identityPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(tempPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, identityPath);
}

/**
 * Auto-detects developer identity from git config.
 *
 * @returns {{ name: string, email: string } | null}
 */
function detectFromGit() {
  try {
    const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();

    if (name && email) {
      return { name, email };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Registers a new developer identity.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {object} params - Identity parameters
 * @param {string} params.name - Developer name
 * @param {string} params.email - Developer email
 * @param {string} [params.role] - Developer role (default: 'contributor')
 * @returns {{ success: boolean, identity: Identity, isNew: boolean }}
 */
function registerIdentity(projectRoot, { name, email, role }) {
  const registry = loadIdentityRegistry(projectRoot);
  const developerId = generateDeveloperId(email);
  const now = new Date().toISOString();
  const identityRole = role && VALID_ROLES.includes(role) ? role : 'contributor';

  // Check if already registered
  const existingIndex = registry.developers.findIndex((d) => d.id === developerId);

  if (existingIndex !== -1) {
    // Update last active
    registry.developers[existingIndex].lastActiveAt = now;
    registry.developers[existingIndex].name = name;
    registry.activeId = developerId;
    writeIdentityRegistry(projectRoot, registry);
    return { success: true, identity: registry.developers[existingIndex], isNew: false };
  }

  /** @type {Identity} */
  const identity = {
    id: developerId,
    name,
    email: email.toLowerCase().trim(),
    role: identityRole,
    registeredAt: now,
    lastActiveAt: now,
  };

  registry.developers.push(identity);

  // First developer becomes owner automatically
  if (registry.developers.length === 1) {
    identity.role = 'owner';
  }

  registry.activeId = developerId;
  writeIdentityRegistry(projectRoot, registry);

  return { success: true, identity, isNew: true };
}

/**
 * Gets the current active developer identity.
 * Auto-detects and registers from git if no identity exists.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {Identity | null}
 */
function getCurrentIdentity(projectRoot) {
  const registry = loadIdentityRegistry(projectRoot);

  if (registry.activeId) {
    const identity = registry.developers.find((d) => d.id === registry.activeId);
    if (identity) {
      return identity;
    }
  }

  // Auto-detect from git
  const gitInfo = detectFromGit();
  if (gitInfo) {
    const result = registerIdentity(projectRoot, { name: gitInfo.name, email: gitInfo.email });
    return result.identity;
  }

  return null;
}

/**
 * Validates an identity exists and is properly formed.
 *
 * @param {string} developerId - Developer ID to validate
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateIdentity(developerId, projectRoot) {
  const registry = loadIdentityRegistry(projectRoot);
  /** @type {string[]} */
  const errors = [];

  const identity = registry.developers.find((d) => d.id === developerId);

  if (!identity) {
    return { valid: false, errors: [`Identity not found: ${developerId}`] };
  }

  if (!identity.name || identity.name.trim().length === 0) {
    errors.push('Identity missing name');
  }
  if (!identity.email || !identity.email.includes('@')) {
    errors.push('Identity missing valid email');
  }
  if (!VALID_ROLES.includes(identity.role)) {
    errors.push(`Invalid role: ${identity.role}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Lists all registered developer identities.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ developers: Identity[], activeId: string | null }}
 */
function listIdentities(projectRoot) {
  return loadIdentityRegistry(projectRoot);
}

module.exports = {
  registerIdentity,
  getCurrentIdentity,
  validateIdentity,
  listIdentities,
  generateDeveloperId,
  detectFromGit,
};
