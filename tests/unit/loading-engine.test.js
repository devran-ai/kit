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

    expect(result.skills.length).toBeLessThanOrEqual(6);
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
});
