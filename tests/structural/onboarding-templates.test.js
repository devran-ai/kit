import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TEMPLATES_DIR = path.join(ROOT, '.agent', 'templates', 'onboarding');
const MANIFEST_PATH = path.join(TEMPLATES_DIR, 'manifest.json');

const EXPECTED_TEMPLATES = [
  'TECH-STACK-ANALYSIS.md', 'COMPETITOR-ANALYSIS.md', 'PRD.md',
  'ARCHITECTURE.md', 'DB-SCHEMA.md', 'API-SPEC.md', 'SECURITY-POLICY.md',
  'DESIGN-SYSTEM.md', 'SCREENS-INVENTORY.md', 'USER-JOURNEY-MAP.md',
  'ROADMAP.md', 'SPRINT-PLAN.md', 'COMPLIANCE.md', 'ONBOARDING-GUIDE.md', 'CLAUDE.md',
];

describe('Structural — Onboarding Templates', () => {
  it('should have all 15 template files on disk', () => {
    for (const tmpl of EXPECTED_TEMPLATES) {
      const exists = fs.existsSync(path.join(TEMPLATES_DIR, tmpl));
      expect(exists, `Missing template: ${tmpl}`).toBe(true);
    }
  });

  it('should have exactly 15 .md template files', () => {
    const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.md'));
    expect(files.length).toBe(15);
  });

  it('should have a valid manifest.json', () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(Array.isArray(manifest.templates)).toBe(true);
    expect(manifest.templates.length).toBe(15);
  });

  it('should have manifest entries for every template on disk', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const manifestFiles = manifest.templates.map((t) => t.file);
    for (const tmpl of EXPECTED_TEMPLATES) {
      expect(manifestFiles, `Missing manifest entry: ${tmpl}`).toContain(tmpl);
    }
  });

  it('should have no duplicate files in manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const files = manifest.templates.map((t) => t.file);
    const unique = new Set(files);
    expect(unique.size).toBe(files.length);
  });

  it('should have valid audience tags in all entries', () => {
    const validAudiences = ['all', 'developer', 'designer', 'pm', 'stakeholder'];
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    for (const tmpl of manifest.templates) {
      expect(Array.isArray(tmpl.audience), `${tmpl.file}: audience must be array`).toBe(true);
      for (const aud of tmpl.audience) {
        expect(validAudiences, `${tmpl.file}: invalid audience "${aud}"`).toContain(aud);
      }
    }
  });

  it('should have valid requires arrays', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    for (const tmpl of manifest.templates) {
      expect(Array.isArray(tmpl.requires), `${tmpl.file}: requires must be array`).toBe(true);
    }
  });

  it('should have no circular dependencies', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const { topologicalSort } = require('../../lib/doc-generator');
    const result = topologicalSort(manifest.templates);
    expect(result.error).toBeNull();
    expect(result.ordered.length).toBe(manifest.templates.length);
  });

  it('should have all dependency references resolvable', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const fileSet = new Set(manifest.templates.map((t) => t.file));
    const stemSet = new Set(manifest.templates.map((t) => t.file.replace(/\.md$/, '')));

    for (const tmpl of manifest.templates) {
      for (const dep of tmpl.requires) {
        const resolved = fileSet.has(dep) || fileSet.has(`${dep}.md`) || stemSet.has(dep);
        expect(resolved, `${tmpl.file}: unresolvable dependency "${dep}"`).toBe(true);
      }
    }
  });

  it('should have applicability object in all entries', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    for (const tmpl of manifest.templates) {
      expect(tmpl.applicability, `${tmpl.file}: missing applicability`).toBeDefined();
      expect(typeof tmpl.applicability).toBe('object');
    }
  });

  it('should have {{name}} in the H1 title of each template', () => {
    for (const tmpl of EXPECTED_TEMPLATES) {
      const content = fs.readFileSync(path.join(TEMPLATES_DIR, tmpl), 'utf-8');
      const h1 = content.match(/^#\s+(.+)$/m);
      expect(h1, `${tmpl}: missing H1 title`).not.toBeNull();
      expect(h1[1], `${tmpl}: H1 should contain {{name}}`).toContain('{{name}}');
    }
  });

  it('should have "Next Steps" section in templates that use it', () => {
    const templatesWithNextSteps = [
      'TECH-STACK-ANALYSIS.md', 'COMPETITOR-ANALYSIS.md', 'PRD.md', 'ARCHITECTURE.md',
      'DB-SCHEMA.md', 'API-SPEC.md', 'SECURITY-POLICY.md', 'DESIGN-SYSTEM.md',
      'SCREENS-INVENTORY.md', 'USER-JOURNEY-MAP.md', 'ROADMAP.md', 'SPRINT-PLAN.md',
      'COMPLIANCE.md', 'ONBOARDING-GUIDE.md',
    ];
    for (const tmpl of templatesWithNextSteps) {
      const content = fs.readFileSync(path.join(TEMPLATES_DIR, tmpl), 'utf-8');
      expect(content.toLowerCase(), `${tmpl}: missing "Next Steps"`).toContain('next step');
    }
  });
});
