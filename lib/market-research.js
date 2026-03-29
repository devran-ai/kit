/**
 * Devran AI Kit — Market Research Module
 *
 * Provides market intelligence capabilities for onboarding workflows:
 * - Competitor analysis with weighted scoring matrices
 * - Tech stack evaluation with evidence-based comparisons
 * - Comparison matrix builder for architectural decisions
 * - Evidence validation using T1-T5 hierarchy
 * - Report generation with structured output
 *
 * Supports dependency injection for `researchProvider` to enable test isolation.
 * Implements stealth mode for confidential projects (generic category queries).
 * Graceful degradation: max 3 retries with exponential backoff per query;
 * after failures, marks `researchDegraded: true` and inserts placeholders.
 *
 * @module lib/market-research
 * @since v5.1.0
 */

'use strict';

const { createLogger } = require('./logger');

const log = createLogger('market-research');

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Evidence tier hierarchy (from research-methodology skill).
 * Lower number = higher trust.
 * @type {Readonly<Record<string, { level: number, label: string, description: string }>>}
 */
const EVIDENCE_TIERS = Object.freeze({
  T1: { level: 1, label: 'Official Documentation', description: 'Vendor docs, official specs, RFCs' },
  T2: { level: 2, label: 'Peer-Reviewed / Authoritative', description: 'Published benchmarks, conference papers, reputable tech blogs' },
  T3: { level: 3, label: 'Community Consensus', description: 'Stack Overflow accepted answers, GitHub discussions with high engagement' },
  T4: { level: 4, label: 'Individual Experience', description: 'Blog posts, tutorials, single-author articles' },
  T5: { level: 5, label: 'AI-Generated / Unverified', description: 'AI content, unverified claims, marketing material' },
});

/**
 * Default scoring weights for competitor comparison matrices.
 * @type {Readonly<Record<string, number>>}
 */
const DEFAULT_SCORING_WEIGHTS = Object.freeze({
  marketPresence:    0.15,
  featureSet:        0.25,
  technicalQuality:  0.20,
  pricing:           0.15,
  communitySupport:  0.10,
  documentation:     0.10,
  scalability:       0.05,
});

/**
 * Maximum retry count for research queries before degradation.
 * @type {number}
 */
const MAX_RETRIES = 3;

/**
 * Base delay (ms) for exponential backoff between retries.
 * @type {number}
 */
const BASE_BACKOFF_MS = 1000;

/**
 * Minimum number of competitors for a valid analysis.
 * @type {number}
 */
const MIN_COMPETITORS = 3;

/**
 * Maximum number of competitors to include in analysis.
 * @type {number}
 */
const MAX_COMPETITORS = 10;

/**
 * Placeholder text for degraded research sections.
 * @type {string}
 */
const DEGRADED_PLACEHOLDER = '[Market research unavailable — manual review needed]';

/**
 * Tech stack categories for evaluation.
 * @type {ReadonlyArray<string>}
 */
const TECH_STACK_CATEGORIES = Object.freeze([
  'frontend',
  'backend',
  'database',
  'hosting',
  'auth',
  'payments',
  'analytics',
  'ci-cd',
  'testing',
  'monitoring',
]);

// ─── Evidence Validation ──────────────────────────────────────────────────────

/**
 * Validates an evidence item against the T1-T5 hierarchy.
 *
 * @param {object} evidence - Evidence item to validate
 * @param {string} evidence.tier - Evidence tier (T1-T5)
 * @param {string} evidence.source - Source URL or reference
 * @param {string} evidence.claim - The claim being supported
 * @param {string} [evidence.date] - Date of the evidence
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateEvidence(evidence) {
  const errors = [];
  const warnings = [];

  if (!evidence || typeof evidence !== 'object') {
    return { valid: false, errors: ['Evidence must be a non-null object'], warnings };
  }

  // Tier validation
  if (!evidence.tier || !EVIDENCE_TIERS[evidence.tier]) {
    errors.push(`Invalid evidence tier: "${evidence.tier}". Valid: ${Object.keys(EVIDENCE_TIERS).join(', ')}`);
  }

  // Source validation
  if (!evidence.source || typeof evidence.source !== 'string' || !evidence.source.trim()) {
    errors.push('Evidence must have a non-empty source');
  }

  // Claim validation
  if (!evidence.claim || typeof evidence.claim !== 'string' || !evidence.claim.trim()) {
    errors.push('Evidence must have a non-empty claim');
  }

  // Date freshness warning (>12 months)
  if (evidence.date) {
    const evidenceDate = new Date(evidence.date);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    if (evidenceDate < twelveMonthsAgo) {
      warnings.push(`Evidence is older than 12 months (${evidence.date}) — may be outdated`);
    }
  }

  // T5 tier warning
  if (evidence.tier === 'T5') {
    warnings.push('T5 evidence (AI-generated/unverified) should be cross-referenced with higher-tier sources');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Calculates confidence score based on evidence tier distribution.
 * Higher-tier evidence contributes more to confidence.
 *
 * @param {Array<{ tier: string }>} evidenceList - List of evidence items
 * @returns {number} Confidence score 0-100
 */
function calculateEvidenceConfidence(evidenceList) {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return 0;
  }

  const tierWeights = { T1: 1.0, T2: 0.8, T3: 0.6, T4: 0.4, T5: 0.2 };
  let totalWeight = 0;
  let validCount = 0;

  for (const item of evidenceList) {
    const weight = tierWeights[item.tier];
    if (weight !== undefined) {
      totalWeight += weight;
      validCount++;
    }
  }

  if (validCount === 0) return 0;

  // Normalize: perfect score = all T1, minimum useful = 3+ items
  const avgWeight = totalWeight / validCount;
  const volumeBonus = Math.min(validCount / 5, 1) * 20; // up to 20 pts for volume
  const qualityScore = avgWeight * 80; // up to 80 pts for quality

  return Math.round(Math.min(qualityScore + volumeBonus, 100));
}

// ─── Competitor Profile ───────────────────────────────────────────────────────

/**
 * Creates a competitor profile structure.
 *
 * @param {object} data - Competitor data
 * @param {string} data.name - Competitor name
 * @param {string} [data.url] - Competitor website URL
 * @param {string} [data.description] - Brief description
 * @param {object} [data.scores] - Scoring dimensions
 * @param {Array<object>} [data.evidence] - Supporting evidence
 * @param {string[]} [data.strengths] - Key strengths
 * @param {string[]} [data.weaknesses] - Key weaknesses
 * @returns {object} Structured competitor profile
 */
function createCompetitorProfile(data) {
  if (!data || !data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Competitor profile requires a non-empty name');
  }

  return {
    name: data.name.trim(),
    url: (data.url && typeof data.url === 'string') ? data.url.trim() : null,
    description: (data.description && typeof data.description === 'string') ? data.description.trim() : '',
    scores: {
      marketPresence:   Number(data.scores?.marketPresence)   || 0,
      featureSet:       Number(data.scores?.featureSet)       || 0,
      technicalQuality: Number(data.scores?.technicalQuality) || 0,
      pricing:          Number(data.scores?.pricing)          || 0,
      communitySupport: Number(data.scores?.communitySupport) || 0,
      documentation:    Number(data.scores?.documentation)    || 0,
      scalability:      Number(data.scores?.scalability)      || 0,
    },
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
  };
}

/**
 * Validates a competitor profile for completeness.
 *
 * @param {object} profile - Competitor profile
 * @returns {{ valid: boolean, errors: string[], completeness: number }}
 */
function validateCompetitorProfile(profile) {
  const errors = [];

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile must be a non-null object'], completeness: 0 };
  }

  if (!profile.name || !profile.name.trim()) {
    errors.push('Missing competitor name');
  }

  // Check scores are within 0-10 range
  if (profile.scores) {
    for (const [dim, score] of Object.entries(profile.scores)) {
      if (typeof score !== 'number' || score < 0 || score > 10) {
        errors.push(`Score "${dim}" must be a number between 0 and 10, got: ${score}`);
      }
    }
  }

  // Calculate completeness
  let filledFields = 0;
  const totalFields = 7; // name, url, description, scores, evidence, strengths, weaknesses

  if (profile.name && profile.name.trim()) filledFields++;
  if (profile.url) filledFields++;
  if (profile.description && profile.description.trim()) filledFields++;
  if (profile.scores && Object.values(profile.scores).some((s) => s > 0)) filledFields++;
  if (profile.evidence && profile.evidence.length > 0) filledFields++;
  if (profile.strengths && profile.strengths.length > 0) filledFields++;
  if (profile.weaknesses && profile.weaknesses.length > 0) filledFields++;

  const completeness = Math.round((filledFields / totalFields) * 100);

  return { valid: errors.length === 0, errors, completeness };
}

// ─── Comparison Matrix ────────────────────────────────────────────────────────

/**
 * Builds a weighted comparison matrix from competitor profiles.
 *
 * @param {object[]} competitors - Array of competitor profiles
 * @param {Record<string, number>} [weights] - Custom scoring weights (must sum to ~1.0)
 * @returns {{ matrix: object[], rankings: object[], weights: Record<string, number> }}
 * @throws {Error} If fewer than MIN_COMPETITORS provided
 */
function buildComparisonMatrix(competitors, weights) {
  if (!Array.isArray(competitors) || competitors.length < MIN_COMPETITORS) {
    throw new Error(
      `Comparison matrix requires at least ${MIN_COMPETITORS} competitors, got: ${competitors?.length || 0}`
    );
  }

  const limited = competitors.length > MAX_COMPETITORS
    ? (log.warn(`Truncating competitors from ${competitors.length} to ${MAX_COMPETITORS}`),
       competitors.slice(0, MAX_COMPETITORS))
    : competitors;

  const effectiveWeights = weights || DEFAULT_SCORING_WEIGHTS;

  // Validate weights sum approximately to 1.0
  const weightSum = Object.values(effectiveWeights).reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(`Scoring weights must sum to ~1.0, got: ${weightSum.toFixed(3)}`);
  }

  const matrix = limited.map((comp) => {
    let weightedScore = 0;

    for (const [dimension, weight] of Object.entries(effectiveWeights)) {
      const score = comp.scores?.[dimension] || 0;
      weightedScore += score * weight;
    }

    return {
      name: comp.name,
      scores: { ...comp.scores },
      weightedScore: Math.round(weightedScore * 100) / 100,
      strengths: comp.strengths || [],
      weaknesses: comp.weaknesses || [],
    };
  });

  // Sort by weighted score descending
  const rankings = [...matrix]
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      weightedScore: entry.weightedScore,
    }));

  return { matrix, rankings, weights: effectiveWeights };
}

// ─── Tech Stack Analyzer ──────────────────────────────────────────────────────

/**
 * Creates a tech stack evaluation entry.
 *
 * @param {object} data - Tech stack option data
 * @param {string} data.category - Category (frontend, backend, etc.)
 * @param {string} data.name - Technology name
 * @param {string} [data.version] - Recommended version
 * @param {number} [data.score] - Overall score 0-10
 * @param {string} [data.rationale] - Why this was recommended
 * @param {Array<object>} [data.evidence] - Supporting evidence
 * @param {string[]} [data.pros] - Advantages
 * @param {string[]} [data.cons] - Disadvantages
 * @param {string[]} [data.alternatives] - Alternative options considered
 * @returns {object} Structured tech stack entry
 */
function createTechStackEntry(data) {
  if (!data || !data.category || !data.name) {
    throw new Error('Tech stack entry requires category and name');
  }

  if (!TECH_STACK_CATEGORIES.includes(data.category)) {
    throw new Error(
      `Invalid tech stack category: "${data.category}". Valid: ${TECH_STACK_CATEGORIES.join(', ')}`
    );
  }

  return {
    category: data.category,
    name: data.name.trim(),
    version: (data.version && typeof data.version === 'string') ? data.version.trim() : null,
    score: (typeof data.score === 'number' && data.score >= 0 && data.score <= 10) ? data.score : null,
    rationale: (data.rationale && typeof data.rationale === 'string') ? data.rationale.trim() : '',
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
    pros: Array.isArray(data.pros) ? data.pros : [],
    cons: Array.isArray(data.cons) ? data.cons : [],
    alternatives: Array.isArray(data.alternatives) ? data.alternatives : [],
  };
}

/**
 * Builds a full tech stack analysis from individual entries.
 * Groups by category and validates completeness.
 *
 * @param {object[]} entries - Array of tech stack entries
 * @returns {{ stack: Record<string, object[]>, coverage: string[], gaps: string[], summary: object }}
 */
function buildTechStackAnalysis(entries) {
  if (!Array.isArray(entries)) {
    return { stack: {}, coverage: [], gaps: [...TECH_STACK_CATEGORIES], summary: { total: 0, avgScore: 0, coverage: 0 } };
  }

  const stack = {};
  const coverageSet = new Set();

  for (const entry of entries) {
    if (!entry.category) continue;
    if (!stack[entry.category]) {
      stack[entry.category] = [];
    }
    stack[entry.category].push(entry);
    coverageSet.add(entry.category);
  }

  const coverage = [...coverageSet];
  const gaps = TECH_STACK_CATEGORIES.filter((cat) => !coverageSet.has(cat));

  // Calculate summary stats
  const scoredEntries = entries.filter((e) => typeof e.score === 'number' && e.score > 0);
  const avgScore = scoredEntries.length > 0
    ? Math.round((scoredEntries.reduce((sum, e) => sum + e.score, 0) / scoredEntries.length) * 10) / 10
    : 0;

  return {
    stack,
    coverage,
    gaps,
    summary: {
      total: entries.length,
      avgScore,
      coverage: Math.round((coverage.length / TECH_STACK_CATEGORIES.length) * 100),
    },
  };
}

// ─── Stealth Mode ─────────────────────────────────────────────────────────────

/**
 * Transforms a project-specific search query into a generic category query
 * for stealth mode (confidential projects).
 *
 * @param {string} query - Original specific query
 * @param {string} category - Project category for generic search
 * @returns {string} Anonymized query
 */
function stealthifyQuery(query, category) {
  if (!query || typeof query !== 'string') return '';
  if (!category || typeof category !== 'string') return query;

  // Replace project-specific terms with generic category
  return `${category} market analysis best practices trends`;
}

/**
 * Generates stealth-safe decision description.
 * For use in decisions.json when stealth mode is active.
 *
 * @param {string} description - Original decision description
 * @param {string} category - Generic project category
 * @returns {string} Anonymized description
 */
function stealthifyDecision(description, category) {
  if (!description || typeof description !== 'string') return '';
  return `[${category || 'Project'}] ${description.replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g, '[REDACTED]')}`;
}

// ─── Research Provider (Injectable) ───────────────────────────────────────────

/**
 * Default (no-op) research provider.
 * Returns empty results — real implementations should call WebSearch/WebFetch.
 * This exists to allow the module to function without external dependencies.
 *
 * @type {ResearchProvider}
 */
const defaultResearchProvider = Object.freeze({
  /**
   * Searches for information on a topic.
   * @param {string} _query - Search query
   * @returns {Promise<{ results: object[], source: string }>}
   */
  search: async (_query) => ({ results: [], source: 'none' }),

  /**
   * Fetches and analyzes content from a URL.
   * @param {string} _url - URL to fetch
   * @param {string} _prompt - Analysis prompt
   * @returns {Promise<{ content: string, source: string }>}
   */
  fetch: async (_url, _prompt) => ({ content: '', source: 'none' }),
});

// ─── Research Execution with Retry ────────────────────────────────────────────

/**
 * Executes a research query with retry logic and exponential backoff.
 *
 * @param {Function} queryFn - Async function to execute
 * @param {object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay in ms
 * @returns {Promise<{ success: boolean, data: *, attempts: number, error: string|null }>}
 */
async function executeWithRetry(queryFn, options = {}) {
  const maxRetries = options.maxRetries || MAX_RETRIES;
  const baseDelay = options.baseDelay || BASE_BACKOFF_MS;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await queryFn();
      return { success: true, data, attempts: attempt, error: null };
    } catch (err) {
      lastError = err;
      log.warn(`Research query failed (attempt ${attempt}/${maxRetries}): ${err.message}`);

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  log.error(`Research query exhausted all ${maxRetries} retries`, { error: lastError?.message });
  return { success: false, data: null, attempts: maxRetries, error: lastError?.message || 'Unknown error' };
}

// ─── Market Research Session ──────────────────────────────────────────────────

/**
 * Creates a market research session bound to a project profile.
 *
 * @param {object} projectProfile - Validated project profile from onboarding-engine
 * @param {object} [options] - Session options
 * @param {object} [options.researchProvider] - Injectable research provider
 * @param {boolean} [options.stealthMode=false] - Use generic queries
 * @param {string} [options.category] - Generic category for stealth mode
 * @returns {MarketResearchSession} Research session object
 */
function createResearchSession(projectProfile, options = {}) {
  if (!projectProfile || typeof projectProfile !== 'object') {
    throw new Error('Market research session requires a valid project profile');
  }

  const provider = options.researchProvider || defaultResearchProvider;
  const stealthMode = Boolean(options.stealthMode);
  const category = options.category || 'software';

  return {
    profile: projectProfile,
    provider,
    stealthMode,
    category,
    competitors: [],
    techStack: [],
    evidence: [],
    degraded: false,
    degradationReasons: [],
    queries: [],
    startedAt: new Date().toISOString(),
  };
}

/**
 * Adds a competitor to the research session.
 *
 * @param {MarketResearchSession} session - Research session
 * @param {object} competitorData - Competitor data
 * @returns {MarketResearchSession} Updated session (new object)
 */
function addCompetitor(session, competitorData) {
  const profile = createCompetitorProfile(competitorData);
  return {
    ...session,
    competitors: [...session.competitors, profile],
  };
}

/**
 * Adds a tech stack entry to the research session.
 *
 * @param {MarketResearchSession} session - Research session
 * @param {object} entryData - Tech stack entry data
 * @returns {MarketResearchSession} Updated session (new object)
 */
function addTechStackEntry(session, entryData) {
  const entry = createTechStackEntry(entryData);
  return {
    ...session,
    techStack: [...session.techStack, entry],
  };
}

/**
 * Records a research query (for audit trail).
 *
 * @param {MarketResearchSession} session - Research session
 * @param {string} query - Query performed
 * @param {boolean} success - Whether query succeeded
 * @returns {MarketResearchSession} Updated session (new object)
 */
function recordQuery(session, query, success) {
  return {
    ...session,
    queries: [
      ...session.queries,
      { query, success, timestamp: new Date().toISOString() },
    ],
  };
}

/**
 * Marks the research session as degraded after failures.
 *
 * @param {MarketResearchSession} session - Research session
 * @param {string} reason - Reason for degradation
 * @returns {MarketResearchSession} Updated session (new object)
 */
function markDegraded(session, reason) {
  return {
    ...session,
    degraded: true,
    degradationReasons: [...session.degradationReasons, reason],
  };
}

// ─── Report Generation ────────────────────────────────────────────────────────

/**
 * Generates a structured market research report from the session data.
 *
 * @param {MarketResearchSession} session - Completed research session
 * @returns {MarketResearchReport} Structured report
 */
function generateReport(session) {
  if (!session || typeof session !== 'object') {
    throw new Error('Cannot generate report from invalid session');
  }

  const competitorAnalysis = session.competitors.length >= MIN_COMPETITORS
    ? buildComparisonMatrix(session.competitors)
    : { matrix: [], rankings: [], weights: DEFAULT_SCORING_WEIGHTS };

  const techStackAnalysis = buildTechStackAnalysis(session.techStack);

  // Validate all evidence
  const evidenceValidation = session.evidence.map((e) => ({
    ...e,
    validation: validateEvidence(e),
  }));

  const validEvidence = evidenceValidation.filter((e) => e.validation.valid);
  const confidence = calculateEvidenceConfidence(validEvidence);

  return {
    schemaVersion: '1.0.0',
    projectName: session.profile.name || 'Unknown Project',
    stealthMode: session.stealthMode,
    degraded: session.degraded,
    degradationReasons: session.degradationReasons,
    generatedAt: new Date().toISOString(),
    competitors: {
      count: session.competitors.length,
      sufficient: session.competitors.length >= MIN_COMPETITORS,
      analysis: competitorAnalysis,
      profiles: session.competitors,
    },
    techStack: techStackAnalysis,
    evidence: {
      total: session.evidence.length,
      valid: validEvidence.length,
      confidence,
      items: evidenceValidation,
    },
    queries: {
      total: session.queries.length,
      successful: session.queries.filter((q) => q.success).length,
      failed: session.queries.filter((q) => !q.success).length,
    },
    summary: {
      competitorCount: session.competitors.length,
      techStackCoverage: techStackAnalysis.summary.coverage,
      evidenceConfidence: confidence,
      researchDegraded: session.degraded,
      placeholder: session.degraded ? DEGRADED_PLACEHOLDER : null,
    },
  };
}

/**
 * Generates degraded report sections with placeholder text.
 * Used when research provider is unavailable.
 *
 * @param {string} sectionName - Name of the report section
 * @returns {string} Placeholder content
 */
function getDegradedSection(sectionName) {
  return `## ${sectionName}\n\n${DEGRADED_PLACEHOLDER}\n\n` +
    `> This section requires market research data that was unavailable during onboarding.\n` +
    `> Run \`/research\` to populate this section with live data.\n`;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
  // Constants
  EVIDENCE_TIERS,
  DEFAULT_SCORING_WEIGHTS,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  MIN_COMPETITORS,
  MAX_COMPETITORS,
  DEGRADED_PLACEHOLDER,
  TECH_STACK_CATEGORIES,

  // Evidence validation
  validateEvidence,
  calculateEvidenceConfidence,

  // Competitor profiles
  createCompetitorProfile,
  validateCompetitorProfile,

  // Comparison matrix
  buildComparisonMatrix,

  // Tech stack analysis
  createTechStackEntry,
  buildTechStackAnalysis,

  // Stealth mode
  stealthifyQuery,
  stealthifyDecision,

  // Research provider
  defaultResearchProvider,

  // Retry logic
  executeWithRetry,

  // Session management
  createResearchSession,
  addCompetitor,
  addTechStackEntry,
  recordQuery,
  markDegraded,

  // Report generation
  generateReport,
  getDegradedSection,
});
