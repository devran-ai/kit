/**
 * Antigravity AI Kit — Agent Registry
 *
 * Formalizes agent contracts by validating that every agent markdown
 * file exposes required metadata structure.
 *
 * @module lib/agent-registry
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const AGENT_DIR = '.agent';
const AGENTS_SUBDIR = 'agents';
const MANIFEST_FILE = 'manifest.json';

/** Minimum expected file size for a valid agent file (bytes) */
const MIN_AGENT_SIZE = 100;
/** Maximum expected file size for a valid agent file (bytes) */
const MAX_AGENT_SIZE = 50000;

/**
 * @typedef {object} AgentValidation
 * @property {string} name - Agent name
 * @property {boolean} valid - Overall validity
 * @property {string[]} errors - Validation errors
 * @property {string[]} warnings - Validation warnings
 * @property {object} metadata - Extracted metadata
 */

/**
 * @typedef {object} RegistryReport
 * @property {number} total - Total agents checked
 * @property {number} valid - Number of valid agents
 * @property {number} invalid - Number of invalid agents
 * @property {AgentValidation[]} agents - Individual agent results
 */

/**
 * Extracts metadata from an agent markdown file by parsing its structure.
 *
 * @param {string} content - Raw markdown content
 * @returns {object} Extracted metadata
 */
function extractAgentMetadata(content) {
  const lines = content.split('\n');
  const metadata = {
    hasTitle: false,
    title: '',
    hasRoleDescription: false,
    hasCapabilities: false,
    hasOutputFormat: false,
    headingCount: 0,
    lineCount: lines.length,
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for title (# heading)
    if (trimmed.startsWith('# ') && !metadata.hasTitle) {
      metadata.hasTitle = true;
      metadata.title = trimmed.slice(2).trim();
    }

    // Count all headings
    if (trimmed.startsWith('#')) {
      metadata.headingCount += 1;
    }

    // Check for role/responsibility keywords
    const roleLower = trimmed.toLowerCase();
    if (roleLower.includes('role') || roleLower.includes('responsibility') || roleLower.includes('purpose') || roleLower.includes('identity')) {
      metadata.hasRoleDescription = true;
    }

    // Check for capabilities/skills mentions
    if (roleLower.includes('capabilit') || roleLower.includes('skill') || roleLower.includes('tool') || roleLower.includes('expertise')) {
      metadata.hasCapabilities = true;
    }

    // Check for output format
    if (roleLower.includes('output') || roleLower.includes('format') || roleLower.includes('deliver') || roleLower.includes('produce')) {
      metadata.hasOutputFormat = true;
    }
  }

  return metadata;
}

/**
 * Validates a single agent file against contract requirements.
 *
 * @param {string} agentName - Name of the agent
 * @param {string} projectRoot - Root directory of the project
 * @returns {AgentValidation}
 */
function validateAgent(agentName, projectRoot) {
  const agentPath = path.join(projectRoot, AGENT_DIR, AGENTS_SUBDIR, `${agentName}.md`);
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (!fs.existsSync(agentPath)) {
    return { name: agentName, valid: false, errors: [`File not found: ${agentName}.md`], warnings: [], metadata: {} };
  }

  const stats = fs.statSync(agentPath);
  const content = fs.readFileSync(agentPath, 'utf-8');
  const metadata = extractAgentMetadata(content);

  // Size checks
  if (stats.size < MIN_AGENT_SIZE) {
    errors.push(`File too small (${stats.size} bytes) — likely incomplete`);
  }
  if (stats.size > MAX_AGENT_SIZE) {
    warnings.push(`File very large (${stats.size} bytes) — consider splitting`);
  }

  // Contract checks
  if (!metadata.hasTitle) {
    errors.push('Missing title header (# AgentName)');
  }
  if (!metadata.hasRoleDescription) {
    warnings.push('No role/responsibility section detected');
  }
  if (!metadata.hasCapabilities) {
    warnings.push('No capabilities/skills section detected');
  }
  if (metadata.headingCount < 2) {
    warnings.push('Very few headings — agent file may lack structure');
  }

  return {
    name: agentName,
    valid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Validates all agents registered in the manifest.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {RegistryReport}
 */
function validateAllAgents(projectRoot) {
  const manifestPath = path.join(projectRoot, AGENT_DIR, MANIFEST_FILE);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const agents = manifest.capabilities?.agents?.items || [];

  const results = agents.map((agent) => validateAgent(agent.name, projectRoot));
  const validCount = results.filter((r) => r.valid).length;

  return {
    total: results.length,
    valid: validCount,
    invalid: results.length - validCount,
    agents: results,
  };
}

/**
 * Loads the full agent registry from manifest + filesystem.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ agents: object[], totalCount: number }}
 */
function loadRegistry(projectRoot) {
  const manifestPath = path.join(projectRoot, AGENT_DIR, MANIFEST_FILE);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const agents = manifest.capabilities?.agents?.items || [];

  return {
    agents: agents.map((agent) => ({
      name: agent.name,
      file: agent.file,
      domain: agent.domain,
    })),
    totalCount: agents.length,
  };
}

/**
 * Finds agents matching a domain keyword.
 *
 * @param {string} domain - Domain keyword to search for
 * @param {string} projectRoot - Root directory of the project
 * @returns {object[]} Matching agents
 */
function getAgentByDomain(domain, projectRoot) {
  const { agents } = loadRegistry(projectRoot);
  const lowerDomain = domain.toLowerCase();

  return agents.filter((agent) =>
    agent.domain.toLowerCase().includes(lowerDomain) ||
    agent.name.toLowerCase().includes(lowerDomain)
  );
}

module.exports = {
  validateAgent,
  validateAllAgents,
  loadRegistry,
  getAgentByDomain,
  extractAgentMetadata,
};
