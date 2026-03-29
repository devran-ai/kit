import { describe, it, expect } from 'vitest';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const { getLoadPlan } = require('../../lib/loading-engine');

describe('Integration — Onboarding Budget Protection', () => {
  it('should load onboarding-specialist for greenfield workflow', () => {
    const plan = getLoadPlan('set up new project', 'greenfield', ROOT);
    expect(plan.agents).toContain('onboarding-specialist');
  });

  it('should load market-researcher for greenfield workflow', () => {
    const plan = getLoadPlan('initialize project', 'greenfield', ROOT);
    expect(plan.agents).toContain('market-researcher');
  });

  it('should load codebase-scanner for brownfield workflow', () => {
    const plan = getLoadPlan('analyze existing project', 'brownfield', ROOT);
    expect(plan.agents).toContain('codebase-scanner');
  });

  it('should protect onboarding-specialist from budget trimming in greenfield', () => {
    // Even with a description that triggers many domains, onboarding-specialist should survive
    const plan = getLoadPlan(
      'set up new project with react frontend, node backend, database, security, testing, devops',
      'greenfield',
      ROOT
    );
    expect(plan.agents).toContain('onboarding-specialist');
  });

  it('should protect onboarding-engine skill from budget trimming in greenfield', () => {
    const plan = getLoadPlan(
      'new project react node database security testing devops performance',
      'greenfield',
      ROOT
    );
    expect(plan.skills).toContain('onboarding-engine');
  });

  it('should protect doc-generation skill from budget trimming in greenfield', () => {
    const plan = getLoadPlan(
      'new project react node database security testing devops',
      'greenfield',
      ROOT
    );
    expect(plan.skills).toContain('doc-generation');
  });

  it('should protect codebase-scanner from budget trimming in brownfield', () => {
    const plan = getLoadPlan(
      'analyze existing project react node database security testing',
      'brownfield',
      ROOT
    );
    expect(plan.agents).toContain('codebase-scanner');
  });

  it('should match onboarding domain for relevant keywords', () => {
    const keywords = ['new project', 'greenfield', 'brownfield', 'initialize', 'scaffold'];
    for (const kw of keywords) {
      const plan = getLoadPlan(kw, undefined, ROOT);
      expect(plan.agents, `Keyword "${kw}" should trigger onboarding-specialist`).toContain('onboarding-specialist');
    }
  });

  it('should not crash budget with onboarding domain + other domains', () => {
    const plan = getLoadPlan(
      'onboard new project with react authentication database deployment',
      'greenfield',
      ROOT
    );
    expect(plan.agents.length).toBeGreaterThan(0);
    expect(plan.skills.length).toBeGreaterThan(0);
    expect(plan.budgetUsage.agentsUsed).toBeLessThanOrEqual(plan.budgetUsage.agentsMax);
    expect(plan.budgetUsage.skillsUsed).toBeLessThanOrEqual(plan.budgetUsage.skillsMax);
  });

  it('should report budget usage within limits', () => {
    const plan = getLoadPlan('set up new project', 'greenfield', ROOT);
    expect(plan.budgetUsage.agentsUsed).toBeLessThanOrEqual(plan.budgetUsage.agentsMax);
    expect(plan.budgetUsage.skillsUsed).toBeLessThanOrEqual(plan.budgetUsage.skillsMax);
  });
});
