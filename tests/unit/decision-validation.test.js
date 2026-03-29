import { describe, it, expect } from 'vitest';

const {
  REQUIRED_DECISION_FIELDS,
  VALID_DECISION_STATUSES,
  validateDecisionEntry,
} = require('../../lib/onboarding-engine');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDecision(overrides = {}) {
  return {
    id: 'ADR-001',
    title: 'Frontend framework selection',
    domain: 'frontend',
    date: '2026-03-29',
    status: 'proposed',
    keywords: ['frontend', 'react'],
    kitRecommendation: 'React 19',
    developerChoice: null,
    rationale: 'Largest ecosystem',
    file: 'TECH-STACK-ANALYSIS.md',
    ...overrides,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('Decision Validation — Constants', () => {
  it('should export frozen REQUIRED_DECISION_FIELDS', () => {
    expect(Object.isFrozen(REQUIRED_DECISION_FIELDS)).toBe(true);
    expect(REQUIRED_DECISION_FIELDS).toContain('id');
    expect(REQUIRED_DECISION_FIELDS).toContain('title');
    expect(REQUIRED_DECISION_FIELDS).toContain('domain');
    expect(REQUIRED_DECISION_FIELDS).toContain('date');
    expect(REQUIRED_DECISION_FIELDS).toContain('status');
  });

  it('should export frozen VALID_DECISION_STATUSES', () => {
    expect(Object.isFrozen(VALID_DECISION_STATUSES)).toBe(true);
    expect(VALID_DECISION_STATUSES).toEqual(['proposed', 'accepted', 'superseded', 'stale']);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('Decision Validation — validateDecisionEntry', () => {
  it('should validate a complete decision entry', () => {
    const result = validateDecisionEntry(makeDecision());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null entry', () => {
    const result = validateDecisionEntry(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('non-null object');
  });

  it('should reject missing id', () => {
    const result = validateDecisionEntry(makeDecision({ id: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('"id"'),
    ]));
  });

  it('should reject missing title', () => {
    const result = validateDecisionEntry(makeDecision({ title: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('"title"'),
    ]));
  });

  it('should reject missing domain', () => {
    const result = validateDecisionEntry(makeDecision({ domain: '' }));
    expect(result.valid).toBe(false);
  });

  it('should reject missing date', () => {
    const result = validateDecisionEntry(makeDecision({ date: '' }));
    expect(result.valid).toBe(false);
  });

  it('should reject missing status', () => {
    const result = validateDecisionEntry(makeDecision({ status: '' }));
    expect(result.valid).toBe(false);
  });

  it('should reject invalid status value', () => {
    const result = validateDecisionEntry(makeDecision({ status: 'invalid' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Invalid decision status'),
    ]));
  });

  it('should accept all valid status values', () => {
    for (const status of VALID_DECISION_STATUSES) {
      const result = validateDecisionEntry(makeDecision({ status }));
      expect(result.valid).toBe(true);
    }
  });

  it('should reject non-array keywords', () => {
    const result = validateDecisionEntry(makeDecision({ keywords: 'not-array' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('"keywords" must be an array'),
    ]));
  });

  it('should accept entry without optional keywords', () => {
    const entry = makeDecision();
    delete entry.keywords;
    const result = validateDecisionEntry(entry);
    expect(result.valid).toBe(true);
  });

  it('should accept entry with extra optional fields', () => {
    const result = validateDecisionEntry(makeDecision({
      kitRecommendation: 'React 19',
      developerChoice: 'Vue 3',
      rationale: 'Team preference',
      file: 'TECH-STACK-ANALYSIS.md',
    }));
    expect(result.valid).toBe(true);
  });

  it('should collect multiple errors', () => {
    const result = validateDecisionEntry({ status: 'bogus', keywords: 'bad' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(2);
  });
});
