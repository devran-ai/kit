import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  // Constants
  EVIDENCE_TIERS,
  DEFAULT_SCORING_WEIGHTS,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  MIN_COMPETITORS,
  MAX_COMPETITORS,
  DEGRADED_PLACEHOLDER,
  TECH_STACK_CATEGORIES,

  // Evidence
  validateEvidence,
  calculateEvidenceConfidence,

  // Competitors
  createCompetitorProfile,
  validateCompetitorProfile,
  buildComparisonMatrix,

  // Tech stack
  createTechStackEntry,
  buildTechStackAnalysis,

  // Stealth
  stealthifyQuery,
  stealthifyDecision,

  // Provider
  defaultResearchProvider,

  // Retry
  executeWithRetry,

  // Session
  createResearchSession,
  addCompetitor,
  addTechStackEntry,
  recordQuery,
  markDegraded,

  // Report
  generateReport,
  getDegradedSection,
} = require('../../lib/market-research');

// ─── Helper Factories ─────────────────────────────────────────────────────────

function makeEvidence(overrides = {}) {
  return {
    tier: 'T1',
    source: 'https://docs.example.com/api',
    claim: 'Supports 10k concurrent connections',
    date: new Date().toISOString(),
    ...overrides,
  };
}

function makeCompetitor(overrides = {}) {
  return {
    name: 'Competitor A',
    url: 'https://competitor-a.com',
    description: 'A leading platform',
    scores: {
      marketPresence: 8,
      featureSet: 7,
      technicalQuality: 9,
      pricing: 6,
      communitySupport: 7,
      documentation: 8,
      scalability: 9,
    },
    evidence: [makeEvidence()],
    strengths: ['Fast', 'Well-documented'],
    weaknesses: ['Expensive'],
    ...overrides,
  };
}

function makeProfile(overrides = {}) {
  return {
    name: 'TestApp',
    description: 'A test application',
    problemStatement: 'Testing market research',
    platforms: ['web'],
    team: { size: 'small', experienceLevel: 'intermediate' },
    ...overrides,
  };
}

function makeResearchProvider(overrides = {}) {
  return {
    search: vi.fn().mockResolvedValue({ results: [{ title: 'Result 1' }], source: 'mock' }),
    fetch: vi.fn().mockResolvedValue({ content: 'Mock content', source: 'mock' }),
    ...overrides,
  };
}

// ─── Constants Tests ──────────────────────────────────────────────────────────

describe('Market Research — Constants', () => {
  it('should export frozen EVIDENCE_TIERS with T1-T5', () => {
    expect(Object.isFrozen(EVIDENCE_TIERS)).toBe(true);
    expect(Object.keys(EVIDENCE_TIERS)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
    expect(EVIDENCE_TIERS.T1.level).toBe(1);
    expect(EVIDENCE_TIERS.T5.level).toBe(5);
  });

  it('should export DEFAULT_SCORING_WEIGHTS that sum to 1.0', () => {
    expect(Object.isFrozen(DEFAULT_SCORING_WEIGHTS)).toBe(true);
    const sum = Object.values(DEFAULT_SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
  });

  it('should export retry constants', () => {
    expect(MAX_RETRIES).toBe(3);
    expect(BASE_BACKOFF_MS).toBe(1000);
  });

  it('should export competitor count limits', () => {
    expect(MIN_COMPETITORS).toBe(3);
    expect(MAX_COMPETITORS).toBe(10);
  });

  it('should export DEGRADED_PLACEHOLDER', () => {
    expect(DEGRADED_PLACEHOLDER).toContain('manual review needed');
  });

  it('should export frozen TECH_STACK_CATEGORIES', () => {
    expect(Object.isFrozen(TECH_STACK_CATEGORIES)).toBe(true);
    expect(TECH_STACK_CATEGORIES).toContain('frontend');
    expect(TECH_STACK_CATEGORIES).toContain('backend');
    expect(TECH_STACK_CATEGORIES).toContain('database');
  });
});

// ─── Evidence Validation Tests ────────────────────────────────────────────────

describe('Market Research — Evidence Validation', () => {
  it('should validate a complete T1 evidence item', () => {
    const result = validateEvidence(makeEvidence());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null evidence', () => {
    const result = validateEvidence(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('non-null object');
  });

  it('should reject invalid tier', () => {
    const result = validateEvidence(makeEvidence({ tier: 'T99' }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid evidence tier');
  });

  it('should reject empty source', () => {
    const result = validateEvidence(makeEvidence({ source: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('non-empty source'),
    ]));
  });

  it('should reject empty claim', () => {
    const result = validateEvidence(makeEvidence({ claim: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('non-empty claim'),
    ]));
  });

  it('should warn about evidence older than 12 months', () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 14);
    const result = validateEvidence(makeEvidence({ date: oldDate.toISOString() }));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('older than 12 months'),
    ]));
  });

  it('should warn about T5 evidence', () => {
    const result = validateEvidence(makeEvidence({ tier: 'T5' }));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('cross-referenced'),
    ]));
  });

  it('should not warn about fresh evidence', () => {
    const result = validateEvidence(makeEvidence({ date: new Date().toISOString() }));
    expect(result.warnings).toHaveLength(0);
  });
});

describe('Market Research — Evidence Confidence', () => {
  it('should return 0 for empty list', () => {
    expect(calculateEvidenceConfidence([])).toBe(0);
  });

  it('should return 0 for null input', () => {
    expect(calculateEvidenceConfidence(null)).toBe(0);
  });

  it('should give highest confidence for many T1 sources', () => {
    const evidence = Array(5).fill({ tier: 'T1' });
    const confidence = calculateEvidenceConfidence(evidence);
    expect(confidence).toBe(100);
  });

  it('should give lower confidence for T5-only sources', () => {
    const evidence = Array(3).fill({ tier: 'T5' });
    const confidence = calculateEvidenceConfidence(evidence);
    expect(confidence).toBeLessThan(50);
  });

  it('should give medium confidence for mixed tiers', () => {
    const evidence = [{ tier: 'T1' }, { tier: 'T3' }, { tier: 'T5' }];
    const confidence = calculateEvidenceConfidence(evidence);
    expect(confidence).toBeGreaterThan(30);
    expect(confidence).toBeLessThan(80);
  });

  it('should give volume bonus for more items', () => {
    const small = calculateEvidenceConfidence([{ tier: 'T2' }]);
    const large = calculateEvidenceConfidence(Array(5).fill({ tier: 'T2' }));
    expect(large).toBeGreaterThan(small);
  });
});

// ─── Competitor Profile Tests ─────────────────────────────────────────────────

describe('Market Research — Competitor Profile', () => {
  it('should create a valid competitor profile', () => {
    const profile = createCompetitorProfile(makeCompetitor());
    expect(profile.name).toBe('Competitor A');
    expect(profile.url).toBe('https://competitor-a.com');
    expect(profile.scores.marketPresence).toBe(8);
    expect(profile.evidence).toHaveLength(1);
    expect(profile.strengths).toContain('Fast');
  });

  it('should throw on missing name', () => {
    expect(() => createCompetitorProfile({ name: '' })).toThrow('non-empty name');
    expect(() => createCompetitorProfile(null)).toThrow('non-empty name');
  });

  it('should handle minimal data with defaults', () => {
    const profile = createCompetitorProfile({ name: 'MinimalCorp' });
    expect(profile.name).toBe('MinimalCorp');
    expect(profile.url).toBeNull();
    expect(profile.description).toBe('');
    expect(profile.scores.marketPresence).toBe(0);
    expect(profile.evidence).toEqual([]);
    expect(profile.strengths).toEqual([]);
    expect(profile.weaknesses).toEqual([]);
  });

  it('should trim whitespace from name and url', () => {
    const profile = createCompetitorProfile({ name: '  SpaceCorp  ', url: '  https://space.com  ' });
    expect(profile.name).toBe('SpaceCorp');
    expect(profile.url).toBe('https://space.com');
  });
});

describe('Market Research — Competitor Validation', () => {
  it('should validate a complete profile', () => {
    const profile = createCompetitorProfile(makeCompetitor());
    const result = validateCompetitorProfile(profile);
    expect(result.valid).toBe(true);
    expect(result.completeness).toBe(100);
  });

  it('should reject null profile', () => {
    const result = validateCompetitorProfile(null);
    expect(result.valid).toBe(false);
    expect(result.completeness).toBe(0);
  });

  it('should reject out-of-range scores', () => {
    const profile = createCompetitorProfile(makeCompetitor());
    profile.scores.marketPresence = 15;
    const result = validateCompetitorProfile(profile);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('between 0 and 10');
  });

  it('should calculate partial completeness', () => {
    const profile = { name: 'Only Name', scores: {}, evidence: [], strengths: [], weaknesses: [] };
    const result = validateCompetitorProfile(profile);
    expect(result.completeness).toBeLessThan(100);
    expect(result.completeness).toBeGreaterThan(0);
  });
});

// ─── Comparison Matrix Tests ──────────────────────────────────────────────────

describe('Market Research — Comparison Matrix', () => {
  it('should build matrix from 3+ competitors', () => {
    const competitors = [
      createCompetitorProfile(makeCompetitor({ name: 'A' })),
      createCompetitorProfile(makeCompetitor({ name: 'B' })),
      createCompetitorProfile(makeCompetitor({ name: 'C' })),
    ];
    const result = buildComparisonMatrix(competitors);
    expect(result.matrix).toHaveLength(3);
    expect(result.rankings).toHaveLength(3);
    expect(result.rankings[0].rank).toBe(1);
  });

  it('should throw on fewer than MIN_COMPETITORS', () => {
    const competitors = [
      createCompetitorProfile(makeCompetitor({ name: 'A' })),
    ];
    expect(() => buildComparisonMatrix(competitors)).toThrow(`at least ${MIN_COMPETITORS}`);
  });

  it('should throw on null input', () => {
    expect(() => buildComparisonMatrix(null)).toThrow();
  });

  it('should rank by weighted score descending', () => {
    const competitors = [
      createCompetitorProfile(makeCompetitor({ name: 'Low', scores: { marketPresence: 1, featureSet: 1, technicalQuality: 1, pricing: 1, communitySupport: 1, documentation: 1, scalability: 1 } })),
      createCompetitorProfile(makeCompetitor({ name: 'High', scores: { marketPresence: 10, featureSet: 10, technicalQuality: 10, pricing: 10, communitySupport: 10, documentation: 10, scalability: 10 } })),
      createCompetitorProfile(makeCompetitor({ name: 'Mid', scores: { marketPresence: 5, featureSet: 5, technicalQuality: 5, pricing: 5, communitySupport: 5, documentation: 5, scalability: 5 } })),
    ];
    const result = buildComparisonMatrix(competitors);
    expect(result.rankings[0].name).toBe('High');
    expect(result.rankings[1].name).toBe('Mid');
    expect(result.rankings[2].name).toBe('Low');
  });

  it('should accept custom weights', () => {
    const competitors = [
      createCompetitorProfile(makeCompetitor({ name: 'A' })),
      createCompetitorProfile(makeCompetitor({ name: 'B' })),
      createCompetitorProfile(makeCompetitor({ name: 'C' })),
    ];
    const customWeights = {
      marketPresence: 0.5,
      featureSet: 0.1,
      technicalQuality: 0.1,
      pricing: 0.1,
      communitySupport: 0.1,
      documentation: 0.05,
      scalability: 0.05,
    };
    const result = buildComparisonMatrix(competitors, customWeights);
    expect(result.weights).toEqual(customWeights);
  });

  it('should reject weights that do not sum to ~1.0', () => {
    const competitors = Array(3).fill(createCompetitorProfile(makeCompetitor()));
    const badWeights = { marketPresence: 0.5, featureSet: 0.5, technicalQuality: 0.5 };
    expect(() => buildComparisonMatrix(competitors, badWeights)).toThrow('sum to ~1.0');
  });

  it('should truncate competitors exceeding MAX_COMPETITORS', () => {
    const competitors = Array(15).fill(null).map((_, i) =>
      createCompetitorProfile(makeCompetitor({ name: `Comp${i}` }))
    );
    const result = buildComparisonMatrix(competitors);
    expect(result.matrix.length).toBeLessThanOrEqual(MAX_COMPETITORS);
  });
});

// ─── Tech Stack Tests ─────────────────────────────────────────────────────────

describe('Market Research — Tech Stack', () => {
  it('should create a valid tech stack entry', () => {
    const entry = createTechStackEntry({
      category: 'frontend',
      name: 'React',
      version: '19.0',
      score: 9,
      rationale: 'Most popular',
      pros: ['Large ecosystem'],
      cons: ['Learning curve'],
      alternatives: ['Vue', 'Svelte'],
    });
    expect(entry.category).toBe('frontend');
    expect(entry.name).toBe('React');
    expect(entry.score).toBe(9);
    expect(entry.pros).toContain('Large ecosystem');
  });

  it('should throw on invalid category', () => {
    expect(() => createTechStackEntry({ category: 'magic', name: 'Wand' })).toThrow('Invalid tech stack category');
  });

  it('should throw on missing name', () => {
    expect(() => createTechStackEntry({ category: 'frontend' })).toThrow('requires category and name');
  });

  it('should handle null score gracefully', () => {
    const entry = createTechStackEntry({ category: 'backend', name: 'Express' });
    expect(entry.score).toBeNull();
  });

  it('should reject out-of-range scores', () => {
    const entry = createTechStackEntry({ category: 'backend', name: 'Express', score: 15 });
    expect(entry.score).toBeNull();
  });
});

describe('Market Research — Tech Stack Analysis', () => {
  it('should build analysis from entries', () => {
    const entries = [
      createTechStackEntry({ category: 'frontend', name: 'React', score: 9 }),
      createTechStackEntry({ category: 'backend', name: 'Express', score: 8 }),
    ];
    const result = buildTechStackAnalysis(entries);
    expect(result.coverage).toContain('frontend');
    expect(result.coverage).toContain('backend');
    expect(result.gaps).toContain('database');
    expect(result.summary.total).toBe(2);
    expect(result.summary.avgScore).toBeGreaterThan(0);
  });

  it('should handle null input', () => {
    const result = buildTechStackAnalysis(null);
    expect(result.stack).toEqual({});
    expect(result.gaps).toEqual([...TECH_STACK_CATEGORIES]);
    expect(result.summary.total).toBe(0);
  });

  it('should handle empty array', () => {
    const result = buildTechStackAnalysis([]);
    expect(result.coverage).toEqual([]);
    expect(result.gaps).toEqual([...TECH_STACK_CATEGORIES]);
  });

  it('should group entries by category', () => {
    const entries = [
      createTechStackEntry({ category: 'frontend', name: 'React' }),
      createTechStackEntry({ category: 'frontend', name: 'Vue' }),
      createTechStackEntry({ category: 'backend', name: 'Express' }),
    ];
    const result = buildTechStackAnalysis(entries);
    expect(result.stack.frontend).toHaveLength(2);
    expect(result.stack.backend).toHaveLength(1);
  });

  it('should calculate coverage percentage', () => {
    const allCategories = TECH_STACK_CATEGORIES.map((cat) =>
      createTechStackEntry({ category: cat, name: `${cat}-tool` })
    );
    const result = buildTechStackAnalysis(allCategories);
    expect(result.summary.coverage).toBe(100);
    expect(result.gaps).toHaveLength(0);
  });
});

// ─── Stealth Mode Tests ───────────────────────────────────────────────────────

describe('Market Research — Stealth Mode', () => {
  it('should anonymize query for stealth mode', () => {
    const result = stealthifyQuery('MatchMaker dating app competitors', 'dating');
    expect(result).toContain('dating');
    expect(result).toContain('market analysis');
    expect(result).not.toContain('MatchMaker');
  });

  it('should return empty string for null query', () => {
    expect(stealthifyQuery(null, 'dating')).toBe('');
  });

  it('should return original query if no category', () => {
    const query = 'some query';
    expect(stealthifyQuery(query, null)).toBe(query);
  });

  it('should anonymize decision descriptions', () => {
    const result = stealthifyDecision('Chose React Native for MatchMaker App', 'dating');
    expect(result).toContain('[dating]');
    expect(result).not.toContain('MatchMaker App');
  });

  it('should return empty string for null description', () => {
    expect(stealthifyDecision(null, 'dating')).toBe('');
  });
});

// ─── Default Research Provider Tests ──────────────────────────────────────────

describe('Market Research — Default Research Provider', () => {
  it('should return empty results for search', async () => {
    const result = await defaultResearchProvider.search('test');
    expect(result.results).toEqual([]);
    expect(result.source).toBe('none');
  });

  it('should return empty content for fetch', async () => {
    const result = await defaultResearchProvider.fetch('https://example.com', 'analyze');
    expect(result.content).toBe('');
    expect(result.source).toBe('none');
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(defaultResearchProvider)).toBe(true);
  });
});

// ─── Retry Logic Tests ────────────────────────────────────────────────────────

describe('Market Research — Retry Logic', () => {
  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await executeWithRetry(fn, { baseDelay: 1 });
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('success');
    const result = await executeWithRetry(fn, { baseDelay: 1 });
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should return failure after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));
    const result = await executeWithRetry(fn, { maxRetries: 3, baseDelay: 1 });
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.attempts).toBe(3);
    expect(result.error).toBe('persistent failure');
  });

  it('should use exponential backoff', async () => {
    const startTime = Date.now();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    await executeWithRetry(fn, { maxRetries: 3, baseDelay: 10 });
    const elapsed = Date.now() - startTime;
    // First retry at 10ms (baseDelay * 2^0), should take at least ~10ms
    expect(elapsed).toBeGreaterThanOrEqual(5);
  });

  it('should respect custom maxRetries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await executeWithRetry(fn, { maxRetries: 1, baseDelay: 1 });
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─── Session Management Tests ─────────────────────────────────────────────────

describe('Market Research — Session Management', () => {
  it('should create a research session', () => {
    const session = createResearchSession(makeProfile());
    expect(session.profile.name).toBe('TestApp');
    expect(session.competitors).toEqual([]);
    expect(session.techStack).toEqual([]);
    expect(session.degraded).toBe(false);
    expect(session.startedAt).toBeDefined();
  });

  it('should throw on invalid profile', () => {
    expect(() => createResearchSession(null)).toThrow('valid project profile');
  });

  it('should accept custom research provider', () => {
    const provider = makeResearchProvider();
    const session = createResearchSession(makeProfile(), { researchProvider: provider });
    expect(session.provider).toBe(provider);
  });

  it('should enable stealth mode', () => {
    const session = createResearchSession(makeProfile(), { stealthMode: true, category: 'dating' });
    expect(session.stealthMode).toBe(true);
    expect(session.category).toBe('dating');
  });

  it('should add competitor immutably', () => {
    const session = createResearchSession(makeProfile());
    const updated = addCompetitor(session, makeCompetitor({ name: 'NewComp' }));
    expect(updated.competitors).toHaveLength(1);
    expect(updated.competitors[0].name).toBe('NewComp');
    // Original unchanged
    expect(session.competitors).toHaveLength(0);
  });

  it('should add tech stack entry immutably', () => {
    const session = createResearchSession(makeProfile());
    const updated = addTechStackEntry(session, { category: 'frontend', name: 'React' });
    expect(updated.techStack).toHaveLength(1);
    expect(session.techStack).toHaveLength(0);
  });

  it('should record queries immutably', () => {
    const session = createResearchSession(makeProfile());
    const updated = recordQuery(session, 'dating app competitors', true);
    expect(updated.queries).toHaveLength(1);
    expect(updated.queries[0].success).toBe(true);
    expect(updated.queries[0].timestamp).toBeDefined();
    expect(session.queries).toHaveLength(0);
  });

  it('should mark degraded immutably', () => {
    const session = createResearchSession(makeProfile());
    const updated = markDegraded(session, 'Network timeout');
    expect(updated.degraded).toBe(true);
    expect(updated.degradationReasons).toContain('Network timeout');
    expect(session.degraded).toBe(false);
  });

  it('should accumulate multiple degradation reasons', () => {
    let session = createResearchSession(makeProfile());
    session = markDegraded(session, 'Timeout 1');
    session = markDegraded(session, 'Timeout 2');
    expect(session.degradationReasons).toHaveLength(2);
  });
});

// ─── Report Generation Tests ──────────────────────────────────────────────────

describe('Market Research — Report Generation', () => {
  function buildFullSession() {
    let session = createResearchSession(makeProfile());

    // Add 3+ competitors for valid matrix
    session = addCompetitor(session, makeCompetitor({ name: 'Comp A' }));
    session = addCompetitor(session, makeCompetitor({ name: 'Comp B' }));
    session = addCompetitor(session, makeCompetitor({ name: 'Comp C' }));

    // Add tech stack
    session = addTechStackEntry(session, { category: 'frontend', name: 'React', score: 9 });
    session = addTechStackEntry(session, { category: 'backend', name: 'Express', score: 8 });

    // Add evidence
    session = {
      ...session,
      evidence: [
        makeEvidence({ tier: 'T1' }),
        makeEvidence({ tier: 'T2' }),
      ],
    };

    // Record queries
    session = recordQuery(session, 'competitors', true);
    session = recordQuery(session, 'tech stack', false);

    return session;
  }

  it('should generate a complete report', () => {
    const session = buildFullSession();
    const report = generateReport(session);

    expect(report.schemaVersion).toBe('1.0.0');
    expect(report.projectName).toBe('TestApp');
    expect(report.degraded).toBe(false);
    expect(report.competitors.count).toBe(3);
    expect(report.competitors.sufficient).toBe(true);
    expect(report.competitors.analysis.rankings).toHaveLength(3);
    expect(report.techStack.coverage).toContain('frontend');
    expect(report.evidence.total).toBe(2);
    expect(report.evidence.confidence).toBeGreaterThan(0);
    expect(report.queries.total).toBe(2);
    expect(report.queries.successful).toBe(1);
    expect(report.queries.failed).toBe(1);
    expect(report.summary.competitorCount).toBe(3);
    expect(report.summary.researchDegraded).toBe(false);
    expect(report.summary.placeholder).toBeNull();
  });

  it('should handle degraded session', () => {
    let session = buildFullSession();
    session = markDegraded(session, 'API down');
    const report = generateReport(session);

    expect(report.degraded).toBe(true);
    expect(report.degradationReasons).toContain('API down');
    expect(report.summary.researchDegraded).toBe(true);
    expect(report.summary.placeholder).toBe(DEGRADED_PLACEHOLDER);
  });

  it('should handle session with insufficient competitors', () => {
    let session = createResearchSession(makeProfile());
    session = addCompetitor(session, makeCompetitor({ name: 'Only One' }));
    const report = generateReport(session);

    expect(report.competitors.sufficient).toBe(false);
    expect(report.competitors.analysis.matrix).toEqual([]);
  });

  it('should throw on invalid session', () => {
    expect(() => generateReport(null)).toThrow('invalid session');
  });

  it('should include stealth mode flag', () => {
    const session = createResearchSession(makeProfile(), { stealthMode: true });
    const report = generateReport(session);
    expect(report.stealthMode).toBe(true);
  });

  it('should include generatedAt timestamp', () => {
    const session = createResearchSession(makeProfile());
    const report = generateReport(session);
    expect(report.generatedAt).toBeDefined();
    expect(new Date(report.generatedAt).getTime()).toBeGreaterThan(0);
  });
});

describe('Market Research — Degraded Sections', () => {
  it('should generate placeholder section with correct name', () => {
    const section = getDegradedSection('Competitor Analysis');
    expect(section).toContain('## Competitor Analysis');
    expect(section).toContain(DEGRADED_PLACEHOLDER);
    expect(section).toContain('/research');
  });
});

// ─── Mock Research Provider Integration ───────────────────────────────────────

describe('Market Research — Mock Provider Integration', () => {
  it('should use injected provider for search', async () => {
    const provider = makeResearchProvider();
    const session = createResearchSession(makeProfile(), { researchProvider: provider });
    const result = await session.provider.search('dating app competitors');
    expect(provider.search).toHaveBeenCalledWith('dating app competitors');
    expect(result.results).toHaveLength(1);
  });

  it('should use injected provider for fetch', async () => {
    const provider = makeResearchProvider();
    const session = createResearchSession(makeProfile(), { researchProvider: provider });
    const result = await session.provider.fetch('https://example.com', 'analyze');
    expect(provider.fetch).toHaveBeenCalledWith('https://example.com', 'analyze');
    expect(result.content).toBe('Mock content');
  });

  it('should handle provider search failure gracefully via retry', async () => {
    const provider = makeResearchProvider({
      search: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    const result = await executeWithRetry(
      () => provider.search('test'),
      { maxRetries: 2, baseDelay: 1 }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(provider.search).toHaveBeenCalledTimes(2);
  });

  it('should degrade session after provider failures', async () => {
    let session = createResearchSession(makeProfile());
    const provider = makeResearchProvider({
      search: vi.fn().mockRejectedValue(new Error('Timeout')),
    });

    const result = await executeWithRetry(
      () => provider.search('competitors'),
      { maxRetries: 3, baseDelay: 1 }
    );

    if (!result.success) {
      session = markDegraded(session, `Search failed: ${result.error}`);
      session = recordQuery(session, 'competitors', false);
    }

    expect(session.degraded).toBe(true);
    expect(session.queries[0].success).toBe(false);
  });
});

// ─── Module Freeze Tests ──────────────────────────────────────────────────────

describe('Market Research — Module Exports', () => {
  it('should export all expected functions', () => {
    const expectedFunctions = [
      'validateEvidence',
      'calculateEvidenceConfidence',
      'createCompetitorProfile',
      'validateCompetitorProfile',
      'buildComparisonMatrix',
      'createTechStackEntry',
      'buildTechStackAnalysis',
      'stealthifyQuery',
      'stealthifyDecision',
      'executeWithRetry',
      'createResearchSession',
      'addCompetitor',
      'addTechStackEntry',
      'recordQuery',
      'markDegraded',
      'generateReport',
      'getDegradedSection',
    ];

    for (const fn of expectedFunctions) {
      expect(typeof require('../../lib/market-research')[fn]).toBe('function');
    }
  });

  it('should export all expected constants', () => {
    const mod = require('../../lib/market-research');
    expect(mod.EVIDENCE_TIERS).toBeDefined();
    expect(mod.DEFAULT_SCORING_WEIGHTS).toBeDefined();
    expect(mod.MAX_RETRIES).toBeDefined();
    expect(mod.BASE_BACKOFF_MS).toBeDefined();
    expect(mod.MIN_COMPETITORS).toBeDefined();
    expect(mod.MAX_COMPETITORS).toBeDefined();
    expect(mod.DEGRADED_PLACEHOLDER).toBeDefined();
    expect(mod.TECH_STACK_CATEGORIES).toBeDefined();
    expect(mod.defaultResearchProvider).toBeDefined();
  });
});
