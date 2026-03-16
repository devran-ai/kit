import { describe, it, expect } from 'vitest';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');

async function loadEngine() {
  const modulePath = path.join(ROOT, 'lib', 'loading-engine.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Loading Rules Engine', () => {
  it('should resolve agents for a security-related task', async () => {
    const engine = await loadEngine();
    const result = engine.resolveForTask('Fix the security vulnerability in authentication', ROOT);

    expect(result.matchedDomains).toContain('security');
    expect(result.agents).toContain('security-reviewer');
  });

  it('should resolve agents for a testing-related task', async () => {
    const engine = await loadEngine();
    const result = engine.resolveForTask('Write unit tests for the user service', ROOT);

    expect(result.matchedDomains).toContain('testing');
    expect(result.agents).toContain('tdd-guide');
  });

  it('should resolve agents for a frontend task', async () => {
    const engine = await loadEngine();
    const result = engine.resolveForTask('Implement the login page with React components and CSS styling', ROOT);

    expect(result.matchedDomains).toContain('frontend');
    expect(result.agents).toContain('frontend-specialist');
  });

  it('should match multiple domains from a complex task', async () => {
    const engine = await loadEngine();
    const result = engine.resolveForTask('Add authentication API endpoint with security review and tests', ROOT);

    expect(result.matchedDomains.length).toBeGreaterThanOrEqual(2);
    expect(result.agents.length).toBeGreaterThan(1);
  });

  it('should return empty results for unmatched task', async () => {
    const engine = await loadEngine();
    const result = engine.resolveForTask('zzz quantum entanglement analysis zzz', ROOT);

    expect(result.matchedDomains).toEqual([]);
    expect(result.agents).toEqual([]);
    expect(result.skills).toEqual([]);
  });

  it('should enforce context budget by trimming excess agents', async () => {
    const engine = await loadEngine();
    const manyAgents = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const result = engine.enforceContextBudget(manyAgents, [], ROOT);

    expect(result.agents.length).toBeLessThanOrEqual(4);
    expect(result.trimmed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should enforce context budget by trimming excess skills', async () => {
    const engine = await loadEngine();
    const manySkills = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const result = engine.enforceContextBudget([], manySkills, ROOT);

    expect(result.skills.length).toBeLessThanOrEqual(8);
    expect(result.trimmed).toBe(true);
  });

  it('should generate a full load plan', async () => {
    const engine = await loadEngine();
    const plan = engine.getLoadPlan('Fix the security issue in the API', null, ROOT);

    expect(plan).toHaveProperty('agents');
    expect(plan).toHaveProperty('skills');
    expect(plan).toHaveProperty('warnings');
    expect(plan).toHaveProperty('budgetUsage');
    expect(plan).toHaveProperty('matchedDomains');
    expect(plan.budgetUsage).toHaveProperty('agentsUsed');
    expect(plan.budgetUsage).toHaveProperty('agentsMax');
  });

  // --- Planning-specific tests ---

  describe('resolveForPlanning', () => {
    it('should merge mandatory planning skills from planningMandates', async () => {
      const engine = await loadEngine();
      const result = engine.resolveForPlanning('Build a new dashboard widget', ROOT);

      // Mandatory skills should always be present regardless of keyword match
      expect(result.skills).toContain('security-practices');
      expect(result.skills).toContain('testing-patterns');
    });

    it('should detect implicit security triggers during planning', async () => {
      const engine = await loadEngine();
      // "login form" contains "login" which is an implicit trigger for security domain
      const result = engine.resolveForPlanning('Build a login form for users', ROOT);

      expect(result.matchedDomains).toContain('security');
      expect(result.agents).toContain('security-reviewer');
      expect(result.skills).toContain('security-practices');
    });

    it('should detect implicit triggers for payment-related tasks', async () => {
      const engine = await loadEngine();
      const result = engine.resolveForPlanning('Add a checkout page with payment processing', ROOT);

      expect(result.matchedDomains).toContain('security');
    });

    it('should return mandatory rules paths for planner reference', async () => {
      const engine = await loadEngine();
      const result = engine.resolveForPlanning('Refactor the user service', ROOT);

      expect(result.mandatoryRules).toBeDefined();
      expect(result.mandatoryRules.length).toBeGreaterThan(0);
      expect(result.mandatoryRules.some((r) => r.includes('security.md'))).toBe(true);
      expect(result.mandatoryRules.some((r) => r.includes('testing.md'))).toBe(true);
    });

    it('should not match implicit triggers for standard resolveForTask', async () => {
      const engine = await loadEngine();
      // "login" is an implicit trigger, not a keyword — resolveForTask should NOT match it
      const result = engine.resolveForTask('Build a login form for users', ROOT);

      // Only frontend should match (via "form" if it exists, but "login" is not a security keyword)
      expect(result.matchedDomains).not.toContain('security');
    });

    it('should use word-boundary matching for implicit triggers (no false positives)', async () => {
      const engine = await loadEngine();
      // "form" is an implicit trigger but should NOT match inside "transform" or "performance"
      const result = engine.resolveForPlanning('Transform the data and improve performance', ROOT);

      // Security should NOT match — "form" appears inside other words, not as standalone
      expect(result.matchedDomains).not.toContain('security');
      // Mandatory skills should still be present (they are always injected)
      expect(result.skills).toContain('security-practices');
    });
  });

  describe('enforceContextBudget with protected items', () => {
    it('should preserve protected skills during trimming', async () => {
      const engine = await loadEngine();
      const manySkills = ['security-practices', 'testing-patterns', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
      const protectedItems = { agents: [], skills: ['security-practices', 'testing-patterns'] };
      const result = engine.enforceContextBudget([], manySkills, ROOT, protectedItems);

      expect(result.skills).toContain('security-practices');
      expect(result.skills).toContain('testing-patterns');
      expect(result.trimmed).toBe(true);
    });

    it('should trim non-protected items when over budget', async () => {
      const engine = await loadEngine();
      const manySkills = ['protected-a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
      const protectedItems = { agents: [], skills: ['protected-a'] };
      const result = engine.enforceContextBudget([], manySkills, ROOT, protectedItems);

      expect(result.skills).toContain('protected-a');
      expect(result.skills.length).toBeLessThanOrEqual(8);
    });
  });

  describe('getLoadPlan with plan workflow', () => {
    it('should use resolveForPlanning when workflow is plan', async () => {
      const engine = await loadEngine();
      const plan = engine.getLoadPlan('Build a login form', 'plan', ROOT);

      // Should detect security via implicit triggers
      expect(plan.matchedDomains).toContain('security');
      // Should include mandatory rules
      expect(plan.mandatoryRules).toBeDefined();
      expect(plan.mandatoryRules.length).toBeGreaterThan(0);
    });

    it('should not include mandatoryRules for non-plan workflows', async () => {
      const engine = await loadEngine();
      const plan = engine.getLoadPlan('Build a login form', 'create', ROOT);

      expect(plan.mandatoryRules).toBeUndefined();
    });

    it('should include plan-validation skill via workflow binding', async () => {
      const engine = await loadEngine();
      const plan = engine.getLoadPlan('Implement user authentication', 'plan', ROOT);

      expect(plan.skills).toContain('plan-validation');
    });
  });
});
