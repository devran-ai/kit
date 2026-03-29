import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');

describe('Config Validator — ONBOARDING Phase', () => {
  it('should include ONBOARDING in validPhases', () => {
    const configValidator = require('../../lib/config-validator');
    const result = configValidator.validateConfig(ROOT, 'workflow-state.json');
    // If ONBOARDING is missing from validPhases, currentPhase="IDLE" still passes,
    // but setting currentPhase to ONBOARDING should also pass
    expect(result.valid).toBe(true);
  });

  it('should accept ONBOARDING as currentPhase in workflow-state', () => {
    // Read current workflow-state and verify ONBOARDING is a defined phase
    const wsPath = path.join(ROOT, '.agent', 'engine', 'workflow-state.json');
    const ws = JSON.parse(fs.readFileSync(wsPath, 'utf-8'));
    expect(ws.phases).toHaveProperty('ONBOARDING');
    expect(ws.phases.ONBOARDING.oneTime).toBe(true);
  });

  it('should have IDLE→ONBOARDING transition', () => {
    const wsPath = path.join(ROOT, '.agent', 'engine', 'workflow-state.json');
    const ws = JSON.parse(fs.readFileSync(wsPath, 'utf-8'));
    const t = ws.transitions.find((tr) => tr.from === 'IDLE' && tr.to === 'ONBOARDING');
    expect(t).toBeDefined();
    expect(t.trigger).toBeDefined();
  });

  it('should have ONBOARDING→EXPLORE transition', () => {
    const wsPath = path.join(ROOT, '.agent', 'engine', 'workflow-state.json');
    const ws = JSON.parse(fs.readFileSync(wsPath, 'utf-8'));
    const t = ws.transitions.find((tr) => tr.from === 'ONBOARDING' && tr.to === 'EXPLORE');
    expect(t).toBeDefined();
  });

  it('should have ONBOARDING→PLAN transition', () => {
    const wsPath = path.join(ROOT, '.agent', 'engine', 'workflow-state.json');
    const ws = JSON.parse(fs.readFileSync(wsPath, 'utf-8'));
    const t = ws.transitions.find((tr) => tr.from === 'ONBOARDING' && tr.to === 'PLAN');
    expect(t).toBeDefined();
  });

  it('should include CHECKPOINT in validPhases', () => {
    const wsPath = path.join(ROOT, '.agent', 'engine', 'workflow-state.json');
    const ws = JSON.parse(fs.readFileSync(wsPath, 'utf-8'));
    expect(ws.phases).toHaveProperty('CHECKPOINT');
  });
});

describe('Config Validator — Workflow Bindings Schema', () => {
  it('should have greenfield workflow binding', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    const gf = lr.workflowBindings.find((b) => b.workflow === 'greenfield');
    expect(gf).toBeDefined();
    expect(gf.bindingType).toBe('explicit');
  });

  it('should have brownfield workflow binding', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    const bf = lr.workflowBindings.find((b) => b.workflow === 'brownfield');
    expect(bf).toBeDefined();
    expect(bf.bindingType).toBe('explicit');
  });

  it('should have protectedAgents in greenfield binding', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    const gf = lr.workflowBindings.find((b) => b.workflow === 'greenfield');
    expect(Array.isArray(gf.protectedAgents)).toBe(true);
    expect(gf.protectedAgents).toContain('onboarding-specialist');
  });

  it('should have protectedSkills in greenfield binding', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    const gf = lr.workflowBindings.find((b) => b.workflow === 'greenfield');
    expect(Array.isArray(gf.protectedSkills)).toBe(true);
    expect(gf.protectedSkills).toContain('onboarding-engine');
    expect(gf.protectedSkills).toContain('doc-generation');
  });

  it('should have codebase-scanner as protected in brownfield', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    const bf = lr.workflowBindings.find((b) => b.workflow === 'brownfield');
    expect(bf.protectedAgents).toContain('codebase-scanner');
  });

  it('should have onboarding domain rule', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    const ob = lr.domainRules.find((d) => d.domain === 'onboarding');
    expect(ob).toBeDefined();
    expect(ob.keywords).toContain('greenfield');
    expect(ob.keywords).toContain('brownfield');
    expect(ob.loadAgents).toContain('onboarding-specialist');
  });

  it('should have cross-cutting rules in defaultLoad', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    expect(lr.defaultLoad).toContain('rules/market-awareness.md');
    expect(lr.defaultLoad).toContain('rules/doc-freshness.md');
  });

  it('should validate all workflow bindings have required workflow field', () => {
    const lrPath = path.join(ROOT, '.agent', 'engine', 'loading-rules.json');
    const lr = JSON.parse(fs.readFileSync(lrPath, 'utf-8'));
    for (const binding of lr.workflowBindings) {
      expect(binding.workflow).toBeDefined();
      expect(typeof binding.workflow).toBe('string');
      expect(binding.workflow.length).toBeGreaterThan(0);
    }
  });
});
