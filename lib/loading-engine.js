/**
 * Antigravity AI Kit — Loading Rules Engine
 *
 * Runtime implementation of loading-rules.json keyword matching
 * and context budget enforcement.
 *
 * @module lib/loading-engine
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { AGENT_DIR, ENGINE_DIR } = require('./constants');
const LOADING_RULES_FILE = 'loading-rules.json';

/**
 * @typedef {object} LoadPlan
 * @property {string[]} agents - Agents to load
 * @property {string[]} skills - Skills to load
 * @property {string[]} warnings - Budget or resolution warnings
 * @property {object} budgetUsage - Context budget usage stats
 * @property {number} budgetUsage.agentsUsed - Number of agents selected
 * @property {number} budgetUsage.agentsMax - Maximum allowed
 * @property {number} budgetUsage.skillsUsed - Number of skills selected
 * @property {number} budgetUsage.skillsMax - Maximum allowed
 * @property {string[]} matchedDomains - Which domains matched
 */

/**
 * Loads and parses loading-rules.json.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {object} Parsed loading rules
 */
function loadRules(projectRoot) {
  const rulesPath = path.join(projectRoot, AGENT_DIR, ENGINE_DIR, LOADING_RULES_FILE);

  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Loading rules not found: ${rulesPath}`);
  }

  return JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
}

/**
 * Matches a task description against domain keywords.
 *
 * @param {string} taskDescription - Human-readable task text
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ matchedDomains: string[], agents: string[], skills: string[] }}
 */
function resolveForTask(taskDescription, projectRoot) {
  const rules = loadRules(projectRoot);
  const domainRules = rules.domainRules || [];
  const lowerTask = taskDescription.toLowerCase();

  /** @type {Set<string>} */
  const agents = new Set();
  /** @type {Set<string>} */
  const skills = new Set();
  /** @type {string[]} */
  const matchedDomains = [];

  for (const rule of domainRules) {
    const hasMatch = (rule.keywords || []).some((keyword) => lowerTask.includes(keyword.toLowerCase()));

    if (hasMatch) {
      matchedDomains.push(rule.domain);

      for (const agent of (rule.loadAgents || [])) {
        agents.add(agent);
      }
      for (const skill of (rule.loadSkills || [])) {
        skills.add(skill);
      }
    }
  }

  return {
    matchedDomains,
    agents: [...agents],
    skills: [...skills],
  };
}

/**
 * Resolves agents and skills for a named workflow using workflow bindings.
 *
 * @param {string} workflowName - Name of the workflow
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ agents: string[], skills: string[], bindingType: string }}
 */
function resolveForWorkflow(workflowName, projectRoot) {
  const rules = loadRules(projectRoot);
  const bindings = rules.workflowBindings || [];
  const match = bindings.find((b) => b.workflow === workflowName);

  if (!match) {
    return { agents: [], skills: [], bindingType: 'none' };
  }

  return {
    agents: match.loadAgents || [],
    skills: match.loadSkills || [],
    bindingType: match.bindingType || 'inferred',
  };
}

/**
 * Enforces context budget limits by trimming agents and skills.
 *
 * @param {string[]} agents - Candidate agents
 * @param {string[]} skills - Candidate skills
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ agents: string[], skills: string[], trimmed: boolean, warnings: string[] }}
 */
function enforceContextBudget(agents, skills, projectRoot) {
  const rules = loadRules(projectRoot);
  const budget = rules.contextBudget || {};
  const maxAgents = budget.maxAgentsPerSession || 4;
  const maxSkills = budget.maxSkillsPerSession || 6;
  const warningThreshold = (budget.warningThresholdPercent || 80) / 100;

  /** @type {string[]} */
  const warnings = [];
  let trimmed = false;

  let finalAgents = [...agents];
  let finalSkills = [...skills];

  if (finalAgents.length > maxAgents) {
    warnings.push(`Agent budget exceeded: ${finalAgents.length}/${maxAgents} — trimmed to ${maxAgents}`);
    finalAgents = finalAgents.slice(0, maxAgents);
    trimmed = true;
  } else if (finalAgents.length >= maxAgents * warningThreshold) {
    warnings.push(`Agent budget near limit: ${finalAgents.length}/${maxAgents} (${Math.round(finalAgents.length / maxAgents * 100)}%)`);
  }

  if (finalSkills.length > maxSkills) {
    warnings.push(`Skill budget exceeded: ${finalSkills.length}/${maxSkills} — trimmed to ${maxSkills}`);
    finalSkills = finalSkills.slice(0, maxSkills);
    trimmed = true;
  } else if (finalSkills.length >= maxSkills * warningThreshold) {
    warnings.push(`Skill budget near limit: ${finalSkills.length}/${maxSkills} (${Math.round(finalSkills.length / maxSkills * 100)}%)`);
  }

  return { agents: finalAgents, skills: finalSkills, trimmed, warnings };
}

/**
 * Full resolution: combines domain matching, workflow binding, and budget enforcement.
 *
 * @param {string} taskDescription - Task text for domain matching
 * @param {string} [workflowName] - Optional workflow name for binding resolution
 * @param {string} projectRoot - Root directory of the project
 * @returns {LoadPlan}
 */
function getLoadPlan(taskDescription, workflowName, projectRoot) {
  const rules = loadRules(projectRoot);
  const budget = rules.contextBudget || {};

  // Step 1: Domain keyword matching
  const taskResolution = resolveForTask(taskDescription, projectRoot);

  // Step 2: Workflow bindings (if workflow specified)
  /** @type {Set<string>} */
  const allAgents = new Set(taskResolution.agents);
  /** @type {Set<string>} */
  const allSkills = new Set(taskResolution.skills);

  if (workflowName) {
    const wfResolution = resolveForWorkflow(workflowName, projectRoot);
    for (const agent of wfResolution.agents) {
      allAgents.add(agent);
    }
    for (const skill of wfResolution.skills) {
      allSkills.add(skill);
    }
  }

  // Step 3: Budget enforcement
  const budgetResult = enforceContextBudget([...allAgents], [...allSkills], projectRoot);

  return {
    agents: budgetResult.agents,
    skills: budgetResult.skills,
    warnings: budgetResult.warnings,
    budgetUsage: {
      agentsUsed: budgetResult.agents.length,
      agentsMax: budget.maxAgentsPerSession || 4,
      skillsUsed: budgetResult.skills.length,
      skillsMax: budget.maxSkillsPerSession || 6,
    },
    matchedDomains: taskResolution.matchedDomains,
  };
}

module.exports = {
  resolveForTask,
  resolveForWorkflow,
  enforceContextBudget,
  getLoadPlan,
};
