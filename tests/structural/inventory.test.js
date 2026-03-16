import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const AGENT_DIR = path.resolve(import.meta.dirname, '../../.agent');
const MANIFEST_PATH = path.join(AGENT_DIR, 'manifest.json');

/** @returns {object} */
function loadManifest() {
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(content);
}

describe('Structural Integrity — Inventory', () => {
  const manifest = loadManifest();

  // --- Agent Verification ---

  it('should have manifest.json file', () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
  });

  it('should match agent count between manifest and filesystem', () => {
    const agentFiles = fs.readdirSync(path.join(AGENT_DIR, 'agents'))
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    expect(agentFiles.length).toBe(manifest.capabilities.agents.count);
  });

  it('should have a file for every declared agent', () => {
    for (const agent of manifest.capabilities.agents.items) {
      const agentPath = path.join(AGENT_DIR, agent.file);
      expect(fs.existsSync(agentPath), `Missing agent: ${agent.file}`).toBe(true);
    }
  });

  it('should not have undeclared agent files', () => {
    const agentFiles = fs.readdirSync(path.join(AGENT_DIR, 'agents'))
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    const declaredNames = manifest.capabilities.agents.items.map(a => path.basename(a.file));
    
    for (const file of agentFiles) {
      expect(declaredNames, `Undeclared agent file: ${file}`).toContain(file);
    }
  });

  // --- Skill Verification ---

  it('should match skill count between manifest and filesystem', () => {
    const skillDirs = fs.readdirSync(path.join(AGENT_DIR, 'skills'), { withFileTypes: true })
      .filter(d => d.isDirectory());
    expect(skillDirs.length).toBe(manifest.capabilities.skills.count);
  });

  it('should have a SKILL.md for every declared skill', () => {
    for (const skill of manifest.capabilities.skills.items) {
      const skillPath = path.join(AGENT_DIR, skill.directory, 'SKILL.md');
      expect(fs.existsSync(skillPath), `Missing skill: ${skill.directory}SKILL.md`).toBe(true);
    }
  });

  // --- Workflow Verification ---

  it('should match workflow count between manifest and filesystem', () => {
    const wfFiles = fs.readdirSync(path.join(AGENT_DIR, 'workflows'))
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    expect(wfFiles.length).toBe(manifest.capabilities.workflows.count);
  });

  it('should have a file for every declared workflow', () => {
    for (const wf of manifest.capabilities.workflows.items) {
      const wfPath = path.join(AGENT_DIR, wf.file);
      expect(fs.existsSync(wfPath), `Missing workflow: ${wf.file}`).toBe(true);
    }
  });

  // --- Command Verification ---

  it('should match command count between manifest and filesystem', () => {
    const cmdFiles = fs.readdirSync(path.join(AGENT_DIR, 'commands'))
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    expect(cmdFiles.length).toBe(manifest.capabilities.commands.count);
  });

  // --- Cross-Source Consistency ---

  it('should have README.md counts matching manifest', () => {
    const readme = fs.readFileSync(path.join(AGENT_DIR, '..', 'README.md'), 'utf-8');

    // Check that README contains the correct agent count (M-6: assert badge exists)
    const agentBadge = readme.match(/AI%20Agents-(\d+)/);
    expect(agentBadge, 'README missing AI Agents badge').not.toBeNull();
    expect(Number(agentBadge[1])).toBe(manifest.capabilities.agents.count);

    const skillBadge = readme.match(/Skills-(\d+)/);
    expect(skillBadge, 'README missing Skills badge').not.toBeNull();
    expect(Number(skillBadge[1])).toBe(manifest.capabilities.skills.count);
  });

  // --- Rules Verification ---

  it('should match rule count between manifest and filesystem', () => {
    const ruleFiles = fs.readdirSync(path.join(AGENT_DIR, 'rules'))
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    expect(ruleFiles.length).toBe(manifest.capabilities.rules.count);
  });

  it('should have a file for every declared rule', () => {
    for (const rule of manifest.capabilities.rules.items) {
      const rulePath = path.join(AGENT_DIR, rule.file);
      expect(fs.existsSync(rulePath), `Missing rule: ${rule.file}`).toBe(true);
    }
  });

  it('should not have undeclared rule files', () => {
    const ruleFiles = fs.readdirSync(path.join(AGENT_DIR, 'rules'))
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    const declaredNames = manifest.capabilities.rules.items.map(r => path.basename(r.file));

    for (const file of ruleFiles) {
      expect(declaredNames, `Undeclared rule file: ${file}`).toContain(file);
    }
  });
});
