/**
 * Antigravity AI Kit — Manifest Verification
 *
 * Validates the integrity of the .agent/ framework by checking
 * manifest ↔ filesystem consistency, JSON validity, and
 * cross-reference integrity.
 *
 * @module lib/verify
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { AGENT_DIR, ENGINE_DIR, HOOKS_DIR } = require('./constants');

/**
 * @typedef {object} CheckResult
 * @property {string} name - Check name
 * @property {'pass' | 'fail' | 'warn'} status - Result status
 * @property {string} message - Human-readable result message
 */

/**
 * @typedef {object} VerificationReport
 * @property {number} passed - Number of passed checks
 * @property {number} failed - Number of failed checks
 * @property {number} warnings - Number of warnings
 * @property {CheckResult[]} results - Individual check results
 */

/**
 * Checks that a JSON file exists and is valid.
 *
 * @param {string} filePath - Absolute path to JSON file
 * @param {string} checkName - Name for the check result
 * @returns {CheckResult}
 */
function checkJsonFile(filePath, checkName) {
  if (!fs.existsSync(filePath)) {
    return { name: checkName, status: 'fail', message: `File not found: ${filePath}` };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(raw);
    return { name: checkName, status: 'pass', message: `Valid JSON: ${path.basename(filePath)}` };
  } catch (parseError) {
    return { name: checkName, status: 'fail', message: `Invalid JSON: ${parseError.message}` };
  }
}

/**
 * Runs all manifest integrity checks.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {VerificationReport}
 */
function runAllChecks(projectRoot) {
  const agentDir = path.join(projectRoot, AGENT_DIR);
  /** @type {CheckResult[]} */
  const results = [];

  // --- Check 1: Manifest exists and is valid JSON ---
  const manifestPath = path.join(agentDir, 'manifest.json');
  results.push(checkJsonFile(manifestPath, 'manifest-exists'));

  if (!fs.existsSync(manifestPath)) {
    return buildReport(results);
  }

  /** @type {object} */
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return buildReport(results);
  }

  // --- Check 2: Schema version is valid ---
  const schemaVersion = manifest.schemaVersion || '';
  const semverPattern = /^\d+\.\d+\.\d+$/;
  results.push({
    name: 'schema-version',
    status: semverPattern.test(schemaVersion) ? 'pass' : 'fail',
    message: semverPattern.test(schemaVersion)
      ? `Schema version valid: ${schemaVersion}`
      : `Invalid schema version: "${schemaVersion}"`,
  });

  // --- Check 3: Agent files exist ---
  const agents = manifest.capabilities?.agents?.items || [];
  for (const agent of agents) {
    const agentPath = path.join(agentDir, agent.file);
    const exists = fs.existsSync(agentPath);
    results.push({
      name: `agent-file:${agent.name}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? `Agent exists: ${agent.name}` : `Missing agent file: ${agent.file}`,
    });
  }

  // --- Check 4: Agent count matches ---
  const agentCountManifest = manifest.capabilities?.agents?.count || 0;
  const agentCountFS = fs.existsSync(path.join(agentDir, 'agents'))
    ? fs.readdirSync(path.join(agentDir, 'agents')).filter((f) => f.endsWith('.md') && f !== 'README.md').length
    : 0;
  results.push({
    name: 'agent-count',
    status: agentCountManifest === agentCountFS ? 'pass' : 'fail',
    message:
      agentCountManifest === agentCountFS
        ? `Agent count matches: ${agentCountFS}`
        : `Agent count mismatch: manifest=${agentCountManifest}, filesystem=${agentCountFS}`,
  });

  // --- Check 5: Skill directories and SKILL.md exist ---
  const skills = manifest.capabilities?.skills?.items || [];
  for (const skill of skills) {
    const skillPath = path.join(agentDir, skill.directory, 'SKILL.md');
    const exists = fs.existsSync(skillPath);
    results.push({
      name: `skill-file:${skill.name}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? `Skill exists: ${skill.name}` : `Missing SKILL.md: ${skill.directory}SKILL.md`,
    });
  }

  // --- Check 6: Skill count matches ---
  const skillCountManifest = manifest.capabilities?.skills?.count || 0;
  const skillCountFS = fs.existsSync(path.join(agentDir, 'skills'))
    ? fs.readdirSync(path.join(agentDir, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).length
    : 0;
  results.push({
    name: 'skill-count',
    status: skillCountManifest === skillCountFS ? 'pass' : 'fail',
    message:
      skillCountManifest === skillCountFS
        ? `Skill count matches: ${skillCountFS}`
        : `Skill count mismatch: manifest=${skillCountManifest}, filesystem=${skillCountFS}`,
  });

  // --- Check 7: Workflow files exist ---
  const workflows = manifest.capabilities?.workflows?.items || [];
  for (const workflow of workflows) {
    const wfPath = path.join(agentDir, workflow.file);
    const exists = fs.existsSync(wfPath);
    results.push({
      name: `workflow-file:${workflow.name}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? `Workflow exists: ${workflow.name}` : `Missing workflow: ${workflow.file}`,
    });
  }

  // --- Check 8: Workflow count matches ---
  const wfCountManifest = manifest.capabilities?.workflows?.count || 0;
  const wfCountFS = fs.existsSync(path.join(agentDir, 'workflows'))
    ? fs.readdirSync(path.join(agentDir, 'workflows')).filter((f) => f.endsWith('.md') && f !== 'README.md').length
    : 0;
  results.push({
    name: 'workflow-count',
    status: wfCountManifest === wfCountFS ? 'pass' : 'fail',
    message:
      wfCountManifest === wfCountFS
        ? `Workflow count matches: ${wfCountFS}`
        : `Workflow count mismatch: manifest=${wfCountManifest}, filesystem=${wfCountFS}`,
  });

  // --- Check 9: Command count matches ---
  const cmdCountManifest = manifest.capabilities?.commands?.count || 0;
  const cmdCountFS = fs.existsSync(path.join(agentDir, 'commands'))
    ? fs.readdirSync(path.join(agentDir, 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').length
    : 0;
  results.push({
    name: 'command-count',
    status: cmdCountManifest === cmdCountFS ? 'pass' : 'fail',
    message:
      cmdCountManifest === cmdCountFS
        ? `Command count matches: ${cmdCountFS}`
        : `Command count mismatch: manifest=${cmdCountManifest}, filesystem=${cmdCountFS}`,
  });

  // --- Check 10: Engine JSON files valid ---
  const engineFiles = ['workflow-state.json', 'loading-rules.json', 'sdlc-map.json', 'reliability-config.json'];
  for (const engineFile of engineFiles) {
    results.push(checkJsonFile(path.join(agentDir, ENGINE_DIR, engineFile), `engine:${engineFile}`));
  }

  // --- Check 11: Hooks file valid ---
  results.push(checkJsonFile(path.join(agentDir, HOOKS_DIR, 'hooks.json'), 'hooks-json'));

  // --- Check 12: Cross-reference — loading-rules agents exist in manifest ---
  const loadingRulesPath = path.join(agentDir, ENGINE_DIR, 'loading-rules.json');
  if (fs.existsSync(loadingRulesPath)) {
    try {
      const loadingRules = JSON.parse(fs.readFileSync(loadingRulesPath, 'utf-8'));
      const manifestAgentNames = new Set(agents.map((agent) => agent.name));
      const domainRules = loadingRules.domainRules || [];

      for (const rule of domainRules) {
        for (const agentName of (rule.loadAgents || [])) {
          const exists = manifestAgentNames.has(agentName);
          results.push({
            name: `xref:loading-rules:${agentName}`,
            status: exists ? 'pass' : 'warn',
            message: exists
              ? `Loading-rules agent "${agentName}" exists in manifest`
              : `Loading-rules references agent "${agentName}" not in manifest`,
          });
        }
      }
    } catch {
      results.push({ name: 'xref:loading-rules', status: 'warn', message: 'Could not parse loading-rules.json for cross-reference check' });
    }
  }

  return buildReport(results);
}

/**
 * Builds a summary report from individual check results.
 *
 * @param {CheckResult[]} results - Array of individual check results
 * @returns {VerificationReport}
 */
function buildReport(results) {
  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.filter((result) => result.status === 'fail').length;
  const warnings = results.filter((result) => result.status === 'warn').length;

  return { passed, failed, warnings, results };
}

module.exports = {
  runAllChecks,
  checkJsonFile,
};
