import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const AGENT_DIR = path.resolve(import.meta.dirname, '../../.agent');

describe('Schema Validation', () => {
  describe('manifest.json', () => {
    /** @type {object} */
    let manifest;

    it('should be valid JSON', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'manifest.json'), 'utf-8');
      manifest = JSON.parse(raw);
      expect(manifest).toBeDefined();
    });

    it('should have required top-level fields', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'manifest.json'), 'utf-8');
      manifest = JSON.parse(raw);
      expect(manifest.schemaVersion).toBeDefined();
      expect(manifest.kitVersion).toBeDefined();
      expect(manifest.capabilities).toBeDefined();
    });

    it('should have agents, commands, skills, workflows in capabilities', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'manifest.json'), 'utf-8');
      manifest = JSON.parse(raw);
      expect(manifest.capabilities.agents).toBeDefined();
      expect(manifest.capabilities.commands).toBeDefined();
      expect(manifest.capabilities.skills).toBeDefined();
      expect(manifest.capabilities.workflows).toBeDefined();
    });

    it('should have count and items for agents', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'manifest.json'), 'utf-8');
      manifest = JSON.parse(raw);
      expect(typeof manifest.capabilities.agents.count).toBe('number');
      expect(Array.isArray(manifest.capabilities.agents.items)).toBe(true);
      expect(manifest.capabilities.agents.items.length).toBe(manifest.capabilities.agents.count);
    });
  });

  describe('hooks.json', () => {
    it('should be valid JSON', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'hooks', 'hooks.json'), 'utf-8');
      const hooks = JSON.parse(raw);
      expect(hooks).toBeDefined();
    });

    it('should have schemaVersion and hooks array', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'hooks', 'hooks.json'), 'utf-8');
      const hooks = JSON.parse(raw);
      expect(hooks.schemaVersion).toBeDefined();
      expect(Array.isArray(hooks.hooks)).toBe(true);
    });

    it('should have required fields for each hook', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'hooks', 'hooks.json'), 'utf-8');
      const hooks = JSON.parse(raw);
      for (const hook of hooks.hooks) {
        expect(hook.event, 'Hook missing event').toBeDefined();
        expect(hook.description, `Hook ${hook.event} missing description`).toBeDefined();
        expect(hook.enforcement, `Hook ${hook.event} missing enforcement`).toBeDefined();
      }
    });
  });

  describe('workflow-state.json', () => {
    it('should be valid JSON', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'workflow-state.json'), 'utf-8');
      const state = JSON.parse(raw);
      expect(state).toBeDefined();
    });

    it('should have required lifecycle phases', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'workflow-state.json'), 'utf-8');
      const state = JSON.parse(raw);
      const requiredPhases = ['EXPLORE', 'PLAN', 'IMPLEMENT', 'VERIFY', 'REVIEW', 'DEPLOY'];
      for (const phase of requiredPhases) {
        expect(state.phases[phase], `Missing phase: ${phase}`).toBeDefined();
      }
    });

    it('should have transitions array', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'workflow-state.json'), 'utf-8');
      const state = JSON.parse(raw);
      expect(Array.isArray(state.transitions)).toBe(true);
      expect(state.transitions.length).toBeGreaterThan(0);
    });

    it('should have valid transition references', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'workflow-state.json'), 'utf-8');
      const state = JSON.parse(raw);
      const validPhases = ['IDLE', ...Object.keys(state.phases)];
      for (const transition of state.transitions) {
        expect(validPhases, `Invalid 'from': ${transition.from}`).toContain(transition.from);
        expect(validPhases, `Invalid 'to': ${transition.to}`).toContain(transition.to);
      }
    });
  });

  describe('loading-rules.json', () => {
    it('should be valid JSON', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'loading-rules.json'), 'utf-8');
      const rules = JSON.parse(raw);
      expect(rules).toBeDefined();
    });

    it('should have domainRules array', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'loading-rules.json'), 'utf-8');
      const rules = JSON.parse(raw);
      expect(Array.isArray(rules.domainRules)).toBe(true);
      expect(rules.domainRules.length).toBeGreaterThan(0);
    });

    it('should have required fields for each domain rule', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'loading-rules.json'), 'utf-8');
      const rules = JSON.parse(raw);
      for (const rule of rules.domainRules) {
        expect(rule.domain, 'Rule missing domain').toBeDefined();
        expect(Array.isArray(rule.keywords), `Domain ${rule.domain} missing keywords`).toBe(true);
        expect(Array.isArray(rule.loadAgents), `Domain ${rule.domain} missing loadAgents`).toBe(true);
        expect(Array.isArray(rule.loadSkills), `Domain ${rule.domain} missing loadSkills`).toBe(true);
      }
    });

    it('should have contextBudget limits', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'engine', 'loading-rules.json'), 'utf-8');
      const rules = JSON.parse(raw);
      expect(rules.contextBudget).toBeDefined();
      expect(rules.contextBudget.maxAgentsPerSession).toBeGreaterThan(0);
      expect(rules.contextBudget.maxSkillsPerSession).toBeGreaterThan(0);
    });
  });

  describe('session-state.json', () => {
    it('should be valid JSON', () => {
      const raw = fs.readFileSync(path.join(AGENT_DIR, 'session-state.json'), 'utf-8');
      const state = JSON.parse(raw);
      expect(state).toBeDefined();
    });
  });

  describe('SKILL.md frontmatter', () => {
    it('should have YAML frontmatter with name and description in all skills', () => {
      const skillsDir = path.join(AGENT_DIR, 'skills');
      const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const dir of skillDirs) {
        const skillPath = path.join(skillsDir, dir.name, 'SKILL.md');
        if (!fs.existsSync(skillPath)) continue;

        const content = fs.readFileSync(skillPath, 'utf-8');
        const trimmed = content.replace(/^\uFEFF/, '').trim();
        const frontmatterMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        
        // Skills should have frontmatter OR a clear header
        const hasHeader = trimmed.startsWith('#') || frontmatterMatch !== null;
        expect(hasHeader, `Skill ${dir.name}/SKILL.md has no header or frontmatter`).toBeTruthy();
      }
    });
  });
});
