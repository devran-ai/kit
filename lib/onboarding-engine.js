/**
 * Devran AI Kit — Onboarding Engine
 *
 * Central orchestrator for the /greenfield and /brownfield onboarding workflows.
 * Manages a checkpoint-based state machine (DISCOVERY → RESEARCH → ANALYSIS →
 * GENERATION → CONFIGURATION → COMPLETE), the project profile model, document
 * generation queue, and Kit configuration resolver.
 *
 * Supports 3 interaction modes: Interactive (IDE), Telegram, CI/Headless.
 * Generates docs to a staging directory, validates, then atomically moves.
 *
 * @module lib/onboarding-engine
 * @since v5.1.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const { writeJsonAtomic, readJsonSafe } = require('./io');
const { AGENT_DIR, ENGINE_DIR, STAGING_DIR: STAGING_BASE_DIR, ONBOARDING_STATE_FILE } = require('./constants');
const { REQUIRED_DECISION_FIELDS, VALID_DECISION_STATUSES, validateDecisionEntry } = require('./decision-validator');

const log = createLogger('onboarding-engine');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Onboarding state file name — sourced from constants.js */
const STATE_FILE = ONBOARDING_STATE_FILE;

/** Onboarding subdirectory within staging */
const STAGING_ONBOARDING_DIR = 'onboarding';

/** Maximum days before a stale onboarding session triggers cleanup prompt */
const STALE_TTL_DAYS = 7;

/**
 * Onboarding workflow phases in execution order.
 * Each phase is a checkpoint — progress is persisted and resumable.
 * @type {ReadonlyArray<string>}
 */
const PHASES = Object.freeze([
  'DISCOVERY',
  'RESEARCH',
  'ANALYSIS',
  'GENERATION',
  'CONFIGURATION',
  'COMPLETE',
]);

/**
 * Interaction modes for different environments.
 * @type {ReadonlyArray<string>}
 */
const INTERACTION_MODES = Object.freeze([
  'interactive',  // Full IDE: Socratic Q&A, detailed review
  'telegram',     // Telegram bot: inline keyboards, summaries
  'headless',     // CI/Headless: accept defaults, flag "unreviewed"
]);

/**
 * Valid onboarding workflow types.
 * @type {ReadonlyArray<string>}
 */
const WORKFLOW_TYPES = Object.freeze(['greenfield', 'brownfield']);

/**
 * Onboarding state status values.
 * @type {ReadonlyArray<string>}
 */
const STATUS_VALUES = Object.freeze([
  'idle',
  'in-progress',
  'complete',
  'failed',
]);

// ─── Project Profile Schema ──────────────────────────────────────────────────

/**
 * Required fields in the project profile.
 * Validated after Discovery phase to prevent downstream failures.
 * @type {ReadonlyArray<string>}
 */
const REQUIRED_PROFILE_FIELDS = Object.freeze([
  'name',
  'description',
  'problemStatement',
]);

/**
 * Required array fields in the project profile.
 * @type {ReadonlyArray<string>}
 */
const REQUIRED_PROFILE_ARRAY_FIELDS = Object.freeze([
  'platforms',
]);

/**
 * Valid platform values for project profile.
 * @type {ReadonlyArray<string>}
 */
const VALID_PLATFORMS = Object.freeze([
  'web', 'ios', 'android', 'desktop', 'api', 'cli', 'library',
]);

/**
 * Valid experience levels for team profile.
 * @type {ReadonlyArray<string>}
 */
const VALID_EXPERIENCE_LEVELS = Object.freeze([
  'beginner', 'intermediate', 'expert',
]);

/**
 * Valid team sizes.
 * @type {ReadonlyArray<string>}
 */
const VALID_TEAM_SIZES = Object.freeze([
  'solo', 'small', 'medium', 'large',
]);

// ─── State Management ─────────────────────────────────────────────────────────

/**
 * Creates a fresh onboarding state object.
 *
 * @returns {OnboardingState} Initial state
 */
function createInitialState() {
  return {
    schemaVersion: '1.0.0',
    status: 'idle',
    workflow: null,
    interactionMode: 'interactive',
    stealthMode: false,
    currentStep: 0,
    completedSteps: [],
    artifacts: {},
    canResume: false,
    resumeFrom: null,
    projectProfile: null,
    researchDegraded: false,
    outputDir: 'docs',
    stagingDir: path.join(AGENT_DIR, STAGING_BASE_DIR, STAGING_ONBOARDING_DIR),
    qualityScore: null,
    stepMetrics: [],
    previousProfile: null,
    staleTTLDays: STALE_TTL_DAYS,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Resolves the path to the onboarding state file.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string} Absolute path to onboarding-state.json
 */
function resolveStatePath(projectRoot) {
  return path.join(projectRoot, AGENT_DIR, ENGINE_DIR, STATE_FILE);
}

/**
 * Loads onboarding state from disk. Returns initial state if file missing.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {OnboardingState} Current onboarding state
 */
function loadState(projectRoot) {
  const statePath = resolveStatePath(projectRoot);
  const data = readJsonSafe(statePath);
  if (!data || !data.schemaVersion) {
    log.info('No onboarding state found, returning initial state');
    return createInitialState();
  }
  return data;
}

/**
 * Persists onboarding state to disk atomically.
 *
 * @param {string} projectRoot - Project root directory
 * @param {OnboardingState} state - State to persist
 * @returns {void}
 */
function saveState(projectRoot, state) {
  const statePath = resolveStatePath(projectRoot);
  writeJsonAtomic(statePath, state);
  log.info(`Onboarding state saved: step=${state.currentStep}, status=${state.status}`);
}

// ─── Session Management ───────────────────────────────────────────────────────

/**
 * Creates a new onboarding session.
 * Initializes state machine for the specified workflow mode.
 *
 * @param {string} mode - 'greenfield' or 'brownfield'
 * @param {string} projectRoot - Project root directory
 * @param {object} [options] - Session options
 * @param {string} [options.interactionMode='interactive'] - Interaction mode
 * @param {boolean} [options.stealthMode=false] - Whether to use generic research queries
 * @returns {OnboardingState} New session state
 * @throws {Error} If mode is invalid or session already active
 */
function createSession(mode, projectRoot, options = {}) {
  if (!WORKFLOW_TYPES.includes(mode)) {
    throw new Error(`Invalid onboarding mode: "${mode}". Expected: ${WORKFLOW_TYPES.join(', ')}`);
  }

  const existing = loadState(projectRoot);
  if (existing.status === 'in-progress') {
    throw new Error(
      `Onboarding already in progress (started ${existing.startedAt}). ` +
      'Use resumeSession() to continue or resetSession() to start over.'
    );
  }

  const interactionMode = options.interactionMode || 'interactive';
  if (!INTERACTION_MODES.includes(interactionMode)) {
    throw new Error(`Invalid interaction mode: "${interactionMode}". Expected: ${INTERACTION_MODES.join(', ')}`);
  }

  const state = {
    ...createInitialState(),
    status: 'in-progress',
    workflow: mode,
    interactionMode,
    stealthMode: Boolean(options.stealthMode),
    canResume: true,
    resumeFrom: 0,
    startedAt: new Date().toISOString(),
  };

  // Preserve previousProfile for brownfield refresh mode
  if (mode === 'brownfield' && existing.status === 'complete') {
    state.previousProfile = existing.projectProfile;
  }

  saveState(projectRoot, state);
  log.info(`Onboarding session created: mode=${mode}, interaction=${interactionMode}`);
  return state;
}

/**
 * Checks if there is an active or resumable onboarding session.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ active: boolean, stale: boolean, canResume: boolean, state: OnboardingState }}
 */
function checkSession(projectRoot) {
  const state = loadState(projectRoot);

  if (state.status === 'idle' || state.status === 'complete') {
    return { active: false, stale: false, canResume: false, state };
  }

  const isStale = state.startedAt &&
    (Date.now() - new Date(state.startedAt).getTime()) > (state.staleTTLDays * 24 * 60 * 60 * 1000);

  return {
    active: state.status === 'in-progress',
    stale: isStale,
    canResume: state.canResume && !isStale,
    state,
  };
}

/**
 * Resets an onboarding session, optionally cleaning up staging.
 *
 * @param {string} projectRoot - Project root directory
 * @param {object} [options] - Reset options
 * @param {boolean} [options.cleanStaging=true] - Whether to delete staging directory
 * @returns {OnboardingState} Fresh initial state
 */
function resetSession(projectRoot, options = {}) {
  const cleanStaging = options.cleanStaging !== false;
  const state = loadState(projectRoot);

  if (cleanStaging) {
    const stagingPath = path.join(projectRoot, state.stagingDir || createInitialState().stagingDir);
    if (fs.existsSync(stagingPath)) {
      fs.rmSync(stagingPath, { recursive: true, force: true });
      log.info(`Staging directory cleaned: ${stagingPath}`);
    }
  }

  const freshState = createInitialState();
  saveState(projectRoot, freshState);
  log.info('Onboarding session reset');
  return freshState;
}

// ─── Phase Advancement ────────────────────────────────────────────────────────

/**
 * Advances the onboarding state machine to the next phase.
 * Records step metrics and persists checkpoint.
 *
 * @param {string} projectRoot - Project root directory
 * @param {OnboardingState} state - Current state
 * @param {object} [artifact] - Artifact produced by the completed step
 * @returns {OnboardingState} Updated state with next phase
 * @throws {Error} If transition is invalid
 */
function advancePhase(projectRoot, state, artifact) {
  if (state.status !== 'in-progress') {
    throw new Error(`Cannot advance: onboarding status is "${state.status}"`);
  }

  const currentPhaseIndex = state.currentStep;
  const nextPhaseIndex = currentPhaseIndex + 1;

  if (nextPhaseIndex > PHASES.length) {
    throw new Error(`Cannot advance beyond final phase: ${PHASES[PHASES.length - 1]}`);
  }

  // Record step metric
  const stepMetric = {
    step: currentPhaseIndex,
    phase: PHASES[currentPhaseIndex] || 'SETUP',
    completedAt: new Date().toISOString(),
  };

  // Record artifact if provided
  const artifacts = { ...state.artifacts };
  if (artifact) {
    artifacts[PHASES[currentPhaseIndex] || `step_${currentPhaseIndex}`] = artifact;
  }

  const isComplete = nextPhaseIndex >= PHASES.length;

  const updatedState = {
    ...state,
    currentStep: nextPhaseIndex,
    completedSteps: [...state.completedSteps, currentPhaseIndex],
    artifacts,
    stepMetrics: [...state.stepMetrics, stepMetric],
    canResume: !isComplete,
    resumeFrom: isComplete ? null : nextPhaseIndex,
    status: isComplete ? 'complete' : 'in-progress',
    completedAt: isComplete ? new Date().toISOString() : null,
  };

  saveState(projectRoot, updatedState);
  log.info(`Phase advanced: ${PHASES[currentPhaseIndex] || 'SETUP'} → ${isComplete ? 'COMPLETE' : PHASES[nextPhaseIndex]}`);
  return updatedState;
}

// ─── Project Profile ──────────────────────────────────────────────────────────

/**
 * Validates a project profile against the required schema.
 * Returns validation result with specific error messages.
 *
 * @param {object} profile - Profile to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateProfile(profile) {
  const errors = [];

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile must be a non-null object'] };
  }

  // Required string fields
  for (const field of REQUIRED_PROFILE_FIELDS) {
    if (!profile[field] || typeof profile[field] !== 'string' || !profile[field].trim()) {
      errors.push(`Missing or empty required field: "${field}"`);
    }
  }

  // Required array fields
  for (const field of REQUIRED_PROFILE_ARRAY_FIELDS) {
    if (!Array.isArray(profile[field]) || profile[field].length === 0) {
      errors.push(`Missing or empty required field: "${field}"`);
    }
  }

  // Platforms validation
  if (Array.isArray(profile.platforms)) {
    for (const p of profile.platforms) {
      if (!VALID_PLATFORMS.includes(p)) {
        errors.push(`Invalid platform: "${p}". Valid: ${VALID_PLATFORMS.join(', ')}`);
      }
    }
  }

  // Team experience level validation
  if (profile.team && profile.team.experienceLevel) {
    if (!VALID_EXPERIENCE_LEVELS.includes(profile.team.experienceLevel)) {
      errors.push(`Invalid experience level: "${profile.team.experienceLevel}". Valid: ${VALID_EXPERIENCE_LEVELS.join(', ')}`);
    }
  }

  // Team size validation
  if (profile.team && profile.team.size) {
    if (!VALID_TEAM_SIZES.includes(profile.team.size)) {
      errors.push(`Invalid team size: "${profile.team.size}". Valid: ${VALID_TEAM_SIZES.join(', ')}`);
    }
  }

  // Stealth mode must be boolean
  if (profile.stealthMode !== undefined && typeof profile.stealthMode !== 'boolean') {
    errors.push('"stealthMode" must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolves a project profile from discovery answers.
 * Maps raw Q&A responses to the structured profile schema.
 *
 * @param {object} answers - Raw answers from Socratic discovery
 * @returns {object} Structured project profile
 */
function resolveProfile(answers) {
  return {
    schemaVersion: '1.0.0',
    name: answers.name || '',
    description: answers.description || '',
    problemStatement: answers.problemStatement || '',
    targetUsers: {
      type: answers.userType || 'B2C',
      geoScope: answers.geoScope || 'global',
    },
    platforms: Array.isArray(answers.platforms) ? answers.platforms : [],
    scale: {
      launchUsers: Number(answers.launchUsers) || 0,
      yearOneUsers: Number(answers.yearOneUsers) || 0,
    },
    auth: {
      method: Array.isArray(answers.authMethods) ? answers.authMethods : [],
      roles: Array.isArray(answers.roles) ? answers.roles : [],
      compliance: Array.isArray(answers.compliance) ? answers.compliance : [],
    },
    integrations: Array.isArray(answers.integrations) ? answers.integrations : [],
    team: {
      size: answers.teamSize || 'solo',
      experienceLevel: answers.experienceLevel || 'intermediate',
    },
    timeline: {
      mvpDeadline: answers.mvpDeadline || null,
      fullLaunch: answers.fullLaunch || null,
    },
    existingAssets: {
      designs: Boolean(answers.hasDesigns),
      brand: Boolean(answers.hasBrand),
      apis: Boolean(answers.hasApis),
      prds: Boolean(answers.hasPrds),
    },
    budget: {
      hostingPreference: answers.hostingPreference || null,
      vendorLockInTolerance: answers.vendorLockInTolerance || 'medium',
    },
    stealthMode: Boolean(answers.stealthMode),
  };
}

// ─── Document Queue ───────────────────────────────────────────────────────────

/**
 * Template applicability by project type.
 * Maps each template to an array of applicable platform categories.
 * "always" templates are generated for every project type.
 *
 * @type {Readonly<Record<string, { always?: boolean, platforms?: string[] }>>}
 */
const TEMPLATE_APPLICABILITY = Object.freeze({
  'TECH-STACK-ANALYSIS.md':  { always: true },
  'PRD.md':                  { always: true },
  'ARCHITECTURE.md':         { always: true },
  'ROADMAP.md':              { always: true },
  'SPRINT-PLAN.md':          { always: true },
  'ONBOARDING-GUIDE.md':     { always: true },
  'CLAUDE.md':               { always: true },
  'COMPETITOR-ANALYSIS.md':  { platforms: ['web', 'ios', 'android', 'api'] },
  'DB-SCHEMA.md':            { platforms: ['web', 'ios', 'android', 'api'] },
  'API-SPEC.md':             { platforms: ['web', 'ios', 'android', 'api'] },
  'SECURITY-POLICY.md':      { platforms: ['web', 'ios', 'android', 'api'] },
  'DESIGN-SYSTEM.md':        { platforms: ['web', 'ios', 'android'] },
  'SCREENS-INVENTORY.md':    { platforms: ['web', 'ios', 'android'] },
  'USER-JOURNEY-MAP.md':     { platforms: ['web', 'ios', 'android'] },
  'COMPLIANCE.md':           { platforms: ['web', 'ios', 'android', 'api'] },
});

/**
 * Template generation dependency order.
 * Templates must be generated in this order to satisfy cross-references.
 *
 * @type {ReadonlyArray<string>}
 */
const TEMPLATE_DEPENDENCY_ORDER = Object.freeze([
  'TECH-STACK-ANALYSIS.md',
  'COMPETITOR-ANALYSIS.md',
  'PRD.md',
  'ARCHITECTURE.md',
  'DB-SCHEMA.md',
  'API-SPEC.md',
  'SECURITY-POLICY.md',
  'DESIGN-SYSTEM.md',
  'SCREENS-INVENTORY.md',
  'USER-JOURNEY-MAP.md',
  'ROADMAP.md',
  'SPRINT-PLAN.md',
  'COMPLIANCE.md',
  'ONBOARDING-GUIDE.md',
  'CLAUDE.md',
]);

/**
 * Returns the ordered document generation queue for a project profile.
 * Filters templates based on the project's platforms.
 *
 * @param {object} profile - Validated project profile
 * @param {string} mode - 'greenfield' or 'brownfield'
 * @param {object} [existingDocs] - For brownfield: map of existing doc statuses
 * @returns {string[]} Ordered list of template filenames to generate
 */
function getDocumentQueue(profile, mode, existingDocs) {
  const projectPlatforms = new Set(profile.platforms || []);

  return TEMPLATE_DEPENDENCY_ORDER.filter((template) => {
    const rule = TEMPLATE_APPLICABILITY[template];
    if (!rule) return false;

    // Check platform applicability
    if (!rule.always) {
      const hasMatchingPlatform = rule.platforms &&
        rule.platforms.some((p) => projectPlatforms.has(p));
      if (!hasMatchingPlatform) return false;
    }

    // For brownfield: skip docs that already exist completely
    if (mode === 'brownfield' && existingDocs) {
      const status = existingDocs[template];
      if (status === 'EXISTS_COMPLETE') return false;
    }

    return true;
  });
}

// ─── Kit Configuration Resolver ───────────────────────────────────────────────

/**
 * Platform-to-domain mapping for Kit agent/skill/rule resolution.
 *
 * @type {Readonly<Record<string, string[]>>}
 */
const PLATFORM_DOMAINS = Object.freeze({
  web:     ['frontend', 'backend', 'database', 'testing', 'devops'],
  ios:     ['mobile', 'frontend', 'testing'],
  android: ['mobile', 'frontend', 'testing'],
  desktop: ['frontend', 'testing'],
  api:     ['backend', 'database', 'testing', 'security', 'devops'],
  cli:     ['backend', 'testing'],
  library: ['testing', 'architecture'],
});

/**
 * Resolves the Kit configuration for a project profile.
 * Determines which agents, skills, and rules should be activated.
 *
 * @param {object} profile - Validated project profile
 * @returns {{ domains: string[], suggestedAgents: string[], suggestedSkills: string[], suggestedRules: string[] }}
 */
function resolveKitConfiguration(profile) {
  const domainSet = new Set();

  // Collect domains from platforms
  for (const platform of (profile.platforms || [])) {
    const domains = PLATFORM_DOMAINS[platform];
    if (domains) {
      for (const d of domains) domainSet.add(d);
    }
  }

  // Add security domain if auth or compliance is involved
  if (profile.auth && (profile.auth.method.length > 0 || profile.auth.compliance.length > 0)) {
    domainSet.add('security');
  }

  // Add architecture domain always
  domainSet.add('architecture');

  const domains = [...domainSet];

  return {
    domains,
    suggestedAgents: domains.map((d) => domainToAgent(d)).filter(Boolean),
    suggestedSkills: domains.map((d) => domainToSkill(d)).filter(Boolean),
    suggestedRules: domains.map((d) => domainToRule(d)).filter(Boolean),
  };
}

/**
 * Maps a domain name to its primary agent.
 * @param {string} domain
 * @returns {string|null}
 */
function domainToAgent(domain) {
  const map = {
    frontend: 'frontend-specialist',
    backend: 'backend-specialist',
    mobile: 'mobile-developer',
    database: 'database-architect',
    security: 'security-reviewer',
    devops: 'devops-engineer',
    testing: 'tdd-guide',
    architecture: 'architect',
  };
  return map[domain] || null;
}

/**
 * Maps a domain name to its primary skill.
 * @param {string} domain
 * @returns {string|null}
 */
function domainToSkill(domain) {
  const map = {
    frontend: 'frontend-patterns',
    backend: 'api-patterns',
    mobile: 'mobile-design',
    database: 'database-design',
    security: 'security-practices',
    devops: 'docker-patterns',
    testing: 'testing-patterns',
    architecture: 'architecture',
  };
  return map[domain] || null;
}

/**
 * Maps a domain name to its primary rule.
 * @param {string} domain
 * @returns {string|null}
 */
function domainToRule(domain) {
  const map = {
    security: 'security',
    frontend: 'accessibility',
    database: 'data-privacy',
    devops: 'data-privacy',
  };
  return map[domain] || null;
}

// ─── Refresh Mode (Brownfield) ────────────────────────────────────────────────

/**
 * Compares current and previous project profiles.
 * Returns classified changes for refresh mode decision-making.
 *
 * @param {object} currentProfile - Current project profile
 * @param {object} previousProfile - Previously saved profile
 * @returns {{ unchanged: string[], changed: Array<{field: string, old: *, new: *, severity: string}>, added: string[], removed: string[] }}
 */
function compareProfiles(currentProfile, previousProfile) {
  const result = { unchanged: [], changed: [], added: [], removed: [] };
  if (!previousProfile) return result;

  const majorFields = new Set([
    'platforms', 'auth.method', 'team.experienceLevel',
  ]);

  const allFields = new Set([
    ...Object.keys(currentProfile),
    ...Object.keys(previousProfile),
  ]);

  for (const field of allFields) {
    const oldVal = previousProfile[field];
    const newVal = currentProfile[field];

    if (oldVal === undefined && newVal !== undefined) {
      result.added.push(field);
    } else if (oldVal !== undefined && newVal === undefined) {
      result.removed.push(field);
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      result.changed.push({
        field,
        old: oldVal,
        new: newVal,
        severity: majorFields.has(field) ? 'major' : 'minor',
      });
    } else {
      result.unchanged.push(field);
    }
  }

  return result;
}

/**
 * Determines if a profile comparison indicates a major project pivot.
 * A pivot is detected when 3+ major-severity changes exist.
 *
 * @param {{ changed: Array<{severity: string}> }} comparison - Profile comparison result
 * @returns {boolean}
 */
function isPivotDetected(comparison) {
  const majorChanges = comparison.changed.filter((c) => c.severity === 'major');
  return majorChanges.length >= 3;
}

// ─── Staging Directory ────────────────────────────────────────────────────────

/**
 * Resolves the staging directory path.
 *
 * @param {string} projectRoot - Project root directory
 * @param {OnboardingState} [state] - Current state (for custom staging path)
 * @returns {string} Absolute path to staging directory
 */
function resolveStagingPath(projectRoot, state) {
  const stagingDir = (state && state.stagingDir) || path.join(AGENT_DIR, STAGING_BASE_DIR, STAGING_ONBOARDING_DIR);
  return path.join(projectRoot, stagingDir);
}

/**
 * Ensures the staging directory exists.
 *
 * @param {string} projectRoot - Project root directory
 * @param {OnboardingState} [state] - Current state
 * @returns {string} Staging directory path
 */
function ensureStagingDir(projectRoot, state) {
  const stagingPath = resolveStagingPath(projectRoot, state);
  if (!fs.existsSync(stagingPath)) {
    fs.mkdirSync(stagingPath, { recursive: true });
    log.info(`Staging directory created: ${stagingPath}`);
  }
  return stagingPath;
}

/**
 * Moves validated documents from staging to the output directory atomically.
 *
 * @param {string} projectRoot - Project root directory
 * @param {OnboardingState} state - Current state
 * @returns {{ moved: string[], errors: string[] }}
 */
function moveFromStaging(projectRoot, state) {
  const stagingPath = resolveStagingPath(projectRoot, state);
  const outputDir = path.join(projectRoot, state.outputDir || 'docs');
  const moved = [];
  const errors = [];

  if (!fs.existsSync(stagingPath)) {
    return { moved, errors: ['Staging directory does not exist'] };
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(stagingPath).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    // Defense-in-depth: ensure no path components leak through
    const safeName = path.basename(file);
    const src = path.join(stagingPath, safeName);
    // CLAUDE.md goes to project root, not docs/
    const dest = safeName === 'CLAUDE.md'
      ? path.join(projectRoot, safeName)
      : path.join(outputDir, safeName);

    try {
      // For brownfield: check if destination exists
      if (fs.existsSync(dest) && safeName === 'CLAUDE.md') {
        // CLAUDE.md merge strategy: append Kit-Generated Context section
        log.info(`CLAUDE.md exists at ${dest}, merge required (not overwriting)`);
        errors.push(`CLAUDE.md already exists — manual merge required`);
        continue;
      }

      const content = fs.readFileSync(src, 'utf-8');
      fs.writeFileSync(dest, content, 'utf-8');
      moved.push(safeName);
      log.info(`Moved: ${safeName} → ${dest}`);
    } catch (err) {
      errors.push(`Failed to move ${safeName}: ${err.message}`);
      log.error(`Move failed: ${safeName}`, { error: err.message });
    }
  }

  // Clean up staging after successful move
  if (errors.length === 0) {
    fs.rmSync(stagingPath, { recursive: true, force: true });
    log.info('Staging directory cleaned after successful move');
  }

  return { moved, errors };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
  // Constants
  PHASES,
  INTERACTION_MODES,
  WORKFLOW_TYPES,
  STATUS_VALUES,
  VALID_PLATFORMS,
  VALID_EXPERIENCE_LEVELS,
  VALID_TEAM_SIZES,
  TEMPLATE_APPLICABILITY,
  TEMPLATE_DEPENDENCY_ORDER,
  STALE_TTL_DAYS,

  // State management
  createInitialState,
  loadState,
  saveState,
  resolveStatePath,

  // Session management
  createSession,
  checkSession,
  resetSession,

  // Phase advancement
  advancePhase,

  // Project profile
  validateProfile,
  resolveProfile,

  // Document queue
  getDocumentQueue,

  // Kit configuration
  resolveKitConfiguration,

  // Refresh mode
  compareProfiles,
  isPivotDetected,

  // Decision validation
  REQUIRED_DECISION_FIELDS,
  VALID_DECISION_STATUSES,
  validateDecisionEntry,

  // Staging
  resolveStagingPath,
  ensureStagingDir,
  moveFromStaging,
});
