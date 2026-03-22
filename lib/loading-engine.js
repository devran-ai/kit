/**
 * Devran AI Kit — Loading Rules Engine
 *
 * Runtime implementation of loading-rules.json keyword matching
 * and context budget enforcement. Includes enhanced planning
 * resolution with mandatory cross-cutting concerns, implicit
 * domain triggers, and protected budget items.
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

/** Default maximum agents per session */
const DEFAULT_MAX_AGENTS = 4;
/** Default maximum skills per session */
const DEFAULT_MAX_SKILLS = 8;
/** Default warning threshold percentage */
const DEFAULT_WARNING_THRESHOLD_PERCENT = 80;

/**
 * @typedef {object} ProtectedItems
 * @property {string[]} [agents] - Agents exempt from budget trimming
 * @property {string[]} [skills] - Skills exempt from budget trimming
 */

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
 * @property {string[]} [mandatoryRules] - Rule files that must be consulted (planning only)
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
 * Trims an array of items respecting a protected set.
 * Protected items survive trimming; non-protected items are dropped from end.
 *
 * @param {string[]} items - Items to potentially trim
 * @param {Set<string>} protectedSet - Items exempt from trimming
 * @param {number} max - Maximum allowed count
 * @returns {{ result: string[], trimmed: boolean, warnings: string[] }}
 */
function trimWithProtection(items, protectedSet, max, label) {
  if (items.length <= max) {
    return { result: items, trimmed: false, warnings: [] };
  }

  const protectedArr = items.filter((i) => protectedSet.has(i));
  const nonProtected = items.filter((i) => !protectedSet.has(i));
  const slotsForNonProtected = Math.max(0, max - protectedArr.length);
  const result = [...protectedArr, ...nonProtected.slice(0, slotsForNonProtected)];

  const warnings = [
    `${label} budget exceeded: ${items.length}/${max} — trimmed to ${result.length}`,
  ];

  if (protectedArr.length > max) {
    warnings.push(`Protected ${label.toLowerCase()} (${protectedArr.length}) exceed budget (${max}) — budget override in effect`);
  }

  return { result, trimmed: true, warnings };
}

/**
 * Builds a pre-compiled word-boundary regex from an array of trigger strings.
 * Combines all triggers into a single alternation pattern for efficient matching.
 *
 * @param {string[]} triggers - Trigger strings to compile
 * @returns {RegExp | null} Compiled regex, or null if no triggers
 */
function buildImplicitTriggerRegex(triggers) {
  if (!triggers || triggers.length === 0) {
    return null;
  }

  const pattern = triggers
    .map((t) => t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  return new RegExp(`\\b(?:${pattern})\\b`);
}

/**
 * Matches a task description against domain keywords.
 *
 * @param {string} taskDescription - Human-readable task text
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ matchedDomains: string[], agents: string[], skills: string[] }}
 */
function resolveForTask(taskDescription, projectRoot) {
  if (typeof taskDescription !== 'string') {
    return { matchedDomains: [], agents: [], skills: [] };
  }

  const rules = loadRules(projectRoot);
  return resolveForTaskWithRules(taskDescription, rules);
}

/**
 * Internal: Matches a task description against domain keywords using pre-loaded rules.
 *
 * @param {string} taskDescription - Human-readable task text
 * @param {object} rules - Pre-loaded rules object
 * @returns {{ matchedDomains: string[], agents: string[], skills: string[] }}
 */
function resolveForTaskWithRules(taskDescription, rules) {
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
 * Enhanced task resolution for planning workflows.
 * Extends standard keyword matching with implicit trigger detection
 * and mandatory planning resources from planningMandates config.
 *
 * @param {string} taskDescription - Human-readable task text
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ matchedDomains: string[], agents: string[], skills: string[], mandatoryRules: string[] }}
 */
function resolveForPlanning(taskDescription, projectRoot) {
  if (typeof taskDescription !== 'string') {
    return { matchedDomains: [], agents: [], skills: [], mandatoryRules: [] };
  }

  const rules = loadRules(projectRoot);
  return resolveForPlanningWithRules(taskDescription, rules);
}

/**
 * Internal: Enhanced planning resolution using pre-loaded rules.
 *
 * @param {string} taskDescription - Human-readable task text
 * @param {object} rules - Pre-loaded rules object
 * @returns {{ matchedDomains: string[], agents: string[], skills: string[], mandatoryRules: string[] }}
 */
function resolveForPlanningWithRules(taskDescription, rules) {
  const domainRules = rules.domainRules || [];
  const planningMandates = rules.planningMandates || {};
  const lowerTask = taskDescription.toLowerCase();

  /** @type {Set<string>} */
  const agents = new Set();
  /** @type {Set<string>} */
  const skills = new Set();
  /** @type {string[]} */
  const matchedDomains = [];

  // Step 1: Standard keyword matching + implicit trigger detection
  for (const rule of domainRules) {
    const hasKeywordMatch = (rule.keywords || []).some(
      (keyword) => lowerTask.includes(keyword.toLowerCase())
    );

    // Pre-compile a single regex for all implicit triggers per domain rule
    const triggerRegex = buildImplicitTriggerRegex(rule.implicitTriggers);
    const hasImplicitMatch = triggerRegex !== null && triggerRegex.test(lowerTask);

    if (hasKeywordMatch || hasImplicitMatch) {
      matchedDomains.push(rule.domain);

      for (const agent of (rule.loadAgents || [])) {
        agents.add(agent);
      }
      for (const skill of (rule.loadSkills || [])) {
        skills.add(skill);
      }
    }
  }

  // Step 2: Merge mandatory planning skills
  for (const skill of (planningMandates.alwaysLoadSkills || [])) {
    skills.add(skill);
  }

  // Step 3: Build mandatory rules list (file paths for planner to reference)
  const mandatoryRules = (planningMandates.alwaysLoadRules || []).map(
    (ruleName) => path.join(AGENT_DIR, 'rules', `${ruleName}.md`)
  );

  return {
    matchedDomains,
    agents: [...agents],
    skills: [...skills],
    mandatoryRules,
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
  return resolveForWorkflowWithRules(workflowName, rules);
}

/**
 * Internal: Resolves workflow bindings using pre-loaded rules.
 *
 * @param {string} workflowName - Name of the workflow
 * @param {object} rules - Pre-loaded rules object
 * @returns {{ agents: string[], skills: string[], bindingType: string }}
 */
function resolveForWorkflowWithRules(workflowName, rules) {
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
 * Protected items (from planning mandates) are exempt from trimming.
 *
 * @param {string[]} agents - Candidate agents
 * @param {string[]} skills - Candidate skills
 * @param {string} projectRoot - Root directory of the project
 * @param {ProtectedItems} [protectedItems] - Items exempt from budget trimming
 * @returns {{ agents: string[], skills: string[], trimmed: boolean, warnings: string[] }}
 */
function enforceContextBudget(agents, skills, projectRoot, protectedItems) {
  const rules = loadRules(projectRoot);
  return enforceContextBudgetWithRules(agents, skills, rules, protectedItems);
}

/**
 * Internal: Enforces context budget using pre-loaded rules.
 *
 * @param {string[]} agents - Candidate agents
 * @param {string[]} skills - Candidate skills
 * @param {object} rules - Pre-loaded rules object
 * @param {ProtectedItems} [protectedItems] - Items exempt from budget trimming
 * @returns {{ agents: string[], skills: string[], trimmed: boolean, warnings: string[] }}
 */
function enforceContextBudgetWithRules(agents, skills, rules, protectedItems) {
  const budget = rules.contextBudget || {};
  const maxAgents = budget.maxAgentsPerSession || DEFAULT_MAX_AGENTS;
  const maxSkills = budget.maxSkillsPerSession || DEFAULT_MAX_SKILLS;
  const warningThreshold = (budget.warningThresholdPercent || DEFAULT_WARNING_THRESHOLD_PERCENT) / 100;

  const protectedAgentSet = new Set((protectedItems && protectedItems.agents) || []);
  const protectedSkillSet = new Set((protectedItems && protectedItems.skills) || []);

  const agentTrim = trimWithProtection([...agents], protectedAgentSet, maxAgents, 'Agent');
  const skillTrim = trimWithProtection([...skills], protectedSkillSet, maxSkills, 'Skill');

  const warnings = [...agentTrim.warnings, ...skillTrim.warnings];

  // Add near-limit warnings for non-trimmed cases
  if (!agentTrim.trimmed && agentTrim.result.length >= maxAgents * warningThreshold) {
    warnings.push(`Agent budget near limit: ${agentTrim.result.length}/${maxAgents} (${Math.round(agentTrim.result.length / maxAgents * 100)}%)`);
  }
  if (!skillTrim.trimmed && skillTrim.result.length >= maxSkills * warningThreshold) {
    warnings.push(`Skill budget near limit: ${skillTrim.result.length}/${maxSkills} (${Math.round(skillTrim.result.length / maxSkills * 100)}%)`);
  }

  return {
    agents: agentTrim.result,
    skills: skillTrim.result,
    trimmed: agentTrim.trimmed || skillTrim.trimmed,
    warnings,
  };
}

/**
 * Full resolution: combines domain matching, workflow binding, and budget enforcement.
 * Uses enhanced planning resolution when workflow is 'plan'.
 * Loads rules once and passes through to all internal functions.
 *
 * @param {string} taskDescription - Task text for domain matching
 * @param {string} [workflowName] - Optional workflow name for binding resolution
 * @param {string} projectRoot - Root directory of the project
 * @returns {LoadPlan}
 */
function getLoadPlan(taskDescription, workflowName, projectRoot) {
  if (typeof taskDescription !== 'string') {
    return {
      agents: [],
      skills: [],
      warnings: ['Invalid task description'],
      budgetUsage: { agentsUsed: 0, agentsMax: DEFAULT_MAX_AGENTS, skillsUsed: 0, skillsMax: DEFAULT_MAX_SKILLS },
      matchedDomains: [],
    };
  }

  // Load rules ONCE and pass through to all helpers (H-1 fix)
  const rules = loadRules(projectRoot);
  const budget = rules.contextBudget || {};
  const planningMandates = rules.planningMandates || {};
  const isPlanWorkflow = workflowName === 'plan';
  const maxAgents = budget.maxAgentsPerSession || DEFAULT_MAX_AGENTS;
  const maxSkills = budget.maxSkillsPerSession || DEFAULT_MAX_SKILLS;

  // Step 1: Domain matching (enhanced for planning workflows)
  const taskResolution = isPlanWorkflow
    ? resolveForPlanningWithRules(taskDescription, rules)
    : resolveForTaskWithRules(taskDescription, rules);

  // Step 2: Workflow bindings (if workflow specified)
  /** @type {Set<string>} */
  const allAgents = new Set(taskResolution.agents);
  /** @type {Set<string>} */
  const allSkills = new Set(taskResolution.skills);

  if (workflowName) {
    const wfResolution = resolveForWorkflowWithRules(workflowName, rules);
    for (const agent of wfResolution.agents) {
      allAgents.add(agent);
    }
    for (const skill of wfResolution.skills) {
      allSkills.add(skill);
    }
  }

  // Step 3: Budget enforcement (with protected items for planning)
  const protectedItems = isPlanWorkflow
    ? { agents: [], skills: planningMandates.alwaysLoadSkills || [] }
    : undefined;

  const budgetResult = enforceContextBudgetWithRules(
    [...allAgents],
    [...allSkills],
    rules,
    protectedItems
  );

  // Construct complete object in one expression (H-3 immutability fix)
  return {
    agents: budgetResult.agents,
    skills: budgetResult.skills,
    warnings: budgetResult.warnings,
    budgetUsage: {
      agentsUsed: budgetResult.agents.length,
      agentsMax: maxAgents,
      skillsUsed: budgetResult.skills.length,
      skillsMax: maxSkills,
    },
    matchedDomains: taskResolution.matchedDomains,
    ...(isPlanWorkflow && taskResolution.mandatoryRules
      ? { mandatoryRules: taskResolution.mandatoryRules }
      : {}),
  };
}

module.exports = {
  resolveForTask,
  resolveForPlanning,
  resolveForWorkflow,
  enforceContextBudget,
  getLoadPlan,
};
