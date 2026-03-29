import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const {
  // Constants
  MANIFEST_SCHEMA_VERSION,
  VALID_AUDIENCES,
  SEVERITY,

  // Template engine
  resolveValue,
  resolveCondition,
  processTemplate,

  // Manifest
  loadManifest,
  validateManifest,
  loadPluginManifests,
  resolveTemplateRegistry,
  topologicalSort,

  // Validation
  validateDocument,
  validateDocumentSet,

  // Mermaid
  generateC4Diagram,
  generateDataFlowDiagram,
  generateDeploymentDiagram,
  generateMermaidDiagrams,

  // Batch
  readTemplate,
  generateDocument,
  generateBatch,
  writeToStaging,

  // Quality
  calculateQualityScore,
} = require('../../lib/doc-generator');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kit-docgen-'));
}

function makeProfile(overrides = {}) {
  return {
    name: 'TestApp',
    description: 'A test application for unit testing',
    problemStatement: 'Testing the doc generator',
    platforms: ['web', 'api'],
    auth: { method: ['jwt'], roles: ['admin', 'user'], compliance: [] },
    integrations: ['Stripe', 'SendGrid'],
    team: { size: 'small', experienceLevel: 'intermediate' },
    timeline: { mvpDeadline: '2026-06-01', fullLaunch: '2026-12-01' },
    existingAssets: { designs: false, brand: true, apis: false, prds: false },
    budget: { hostingPreference: 'cloud', vendorLockInTolerance: 'medium' },
    stealthMode: false,
    ...overrides,
  };
}

function makeManifest(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    templates: [
      { file: 'TECH-STACK-ANALYSIS.md', requires: [], audience: ['all'], applicability: { always: true } },
      { file: 'ARCHITECTURE.md', requires: ['TECH-STACK-ANALYSIS'], audience: ['all'], applicability: { always: true } },
      { file: 'PRD.md', requires: ['TECH-STACK-ANALYSIS'], audience: ['all', 'pm'], applicability: { always: true } },
    ],
    ...overrides,
  };
}

function setupManifest(tmpDir, manifest) {
  const dir = path.join(tmpDir, '.agent', 'templates', 'onboarding');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  return dir;
}

function setupTemplate(tmpDir, fileName, content) {
  const dir = path.join(tmpDir, '.agent', 'templates', 'onboarding');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), content);
}

// ─── Constants Tests ──────────────────────────────────────────────────────────

describe('Doc Generator — Constants', () => {
  it('should export MANIFEST_SCHEMA_VERSION', () => {
    expect(MANIFEST_SCHEMA_VERSION).toBe('1.0.0');
  });

  it('should export frozen VALID_AUDIENCES', () => {
    expect(Object.isFrozen(VALID_AUDIENCES)).toBe(true);
    expect(VALID_AUDIENCES).toContain('all');
    expect(VALID_AUDIENCES).toContain('developer');
    expect(VALID_AUDIENCES).toContain('pm');
  });

  it('should export SEVERITY constants', () => {
    expect(SEVERITY.ERROR).toBe('error');
    expect(SEVERITY.WARNING).toBe('warning');
  });
});

// ─── Value Resolution Tests ───────────────────────────────────────────────────

describe('Doc Generator — Value Resolution', () => {
  it('should resolve simple key', () => {
    expect(resolveValue({ name: 'TestApp' }, 'name')).toBe('TestApp');
  });

  it('should resolve nested dot path', () => {
    expect(resolveValue({ a: { b: { c: 'deep' } } }, 'a.b.c')).toBe('deep');
  });

  it('should return empty string for missing key', () => {
    expect(resolveValue({ name: 'Test' }, 'missing')).toBe('');
  });

  it('should return empty string for null data', () => {
    expect(resolveValue(null, 'key')).toBe('');
  });

  it('should join arrays with comma', () => {
    expect(resolveValue({ items: ['a', 'b', 'c'] }, 'items')).toBe('a, b, c');
  });

  it('should convert numbers to string', () => {
    expect(resolveValue({ count: 42 }, 'count')).toBe('42');
  });

  it('should handle null intermediate values', () => {
    expect(resolveValue({ a: null }, 'a.b')).toBe('');
  });

  it('should handle undefined values', () => {
    expect(resolveValue({ a: undefined }, 'a')).toBe('');
  });
});

describe('Doc Generator — Condition Resolution', () => {
  it('should resolve direct boolean true', () => {
    expect(resolveCondition({ hasMobile: true }, 'hasMobile')).toBe(true);
  });

  it('should resolve direct boolean false', () => {
    expect(resolveCondition({ hasMobile: false }, 'hasMobile')).toBe(false);
  });

  it('should resolve string "true" as true', () => {
    expect(resolveCondition({ flag: 'true' }, 'flag')).toBe(true);
  });

  it('should resolve string "false" as false', () => {
    expect(resolveCondition({ flag: 'false' }, 'flag')).toBe(false);
  });

  it('should resolve empty string as false', () => {
    expect(resolveCondition({ flag: '' }, 'flag')).toBe(false);
  });

  it('should resolve non-empty string as true', () => {
    expect(resolveCondition({ flag: 'something' }, 'flag')).toBe(true);
  });

  it('should return false for null data', () => {
    expect(resolveCondition(null, 'flag')).toBe(false);
  });

  it('should return false for missing flag', () => {
    expect(resolveCondition({}, 'missing')).toBe(false);
  });
});

// ─── Template Engine Tests ────────────────────────────────────────────────────

describe('Doc Generator — Template Engine', () => {
  it('should substitute simple variables', () => {
    const result = processTemplate('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should substitute nested variables', () => {
    const result = processTemplate('Team: {{team.size}}', { team: { size: 'small' } });
    expect(result).toBe('Team: small');
  });

  it('should include conditional blocks when condition is true', () => {
    const template = '<!-- IF:hasMobile -->\n## Mobile\nMobile content\n<!-- ENDIF:hasMobile -->';
    const result = processTemplate(template, {}, { hasMobile: true });
    expect(result).toContain('## Mobile');
    expect(result).toContain('Mobile content');
  });

  it('should exclude conditional blocks when condition is false', () => {
    const template = 'Before\n<!-- IF:hasMobile -->\n## Mobile\n<!-- ENDIF:hasMobile -->\nAfter';
    const result = processTemplate(template, {}, { hasMobile: false });
    expect(result).not.toContain('## Mobile');
    expect(result).toContain('Before');
    expect(result).toContain('After');
  });

  it('should handle multiple conditionals', () => {
    const template = [
      '<!-- IF:hasWeb -->Web section<!-- ENDIF:hasWeb -->',
      '<!-- IF:hasMobile -->Mobile section<!-- ENDIF:hasMobile -->',
    ].join('\n');
    const result = processTemplate(template, {}, { hasWeb: true, hasMobile: false });
    expect(result).toContain('Web section');
    expect(result).not.toContain('Mobile section');
  });

  it('should handle variables inside conditionals', () => {
    const template = '<!-- IF:hasAuth -->\nAuth: {{auth.method}}\n<!-- ENDIF:hasAuth -->';
    const result = processTemplate(template, { auth: { method: 'jwt' } }, { hasAuth: true });
    expect(result).toContain('Auth: jwt');
  });

  it('should return empty string for null template', () => {
    expect(processTemplate(null, {})).toBe('');
  });

  it('should handle template with no variables', () => {
    expect(processTemplate('Plain text', {})).toBe('Plain text');
  });

  it('should replace unresolved variables with empty string', () => {
    const result = processTemplate('{{missing}} stays empty', {});
    expect(result).toBe(' stays empty');
  });

  it('should collapse excessive blank lines from removed conditionals', () => {
    const template = 'A\n\n\n\n\n\nB';
    const result = processTemplate(template, {});
    // Should have at most 3 consecutive newlines
    expect(result).not.toMatch(/\n{4,}/);
  });
});

// ─── Manifest Validation Tests ────────────────────────────────────────────────

describe('Doc Generator — Manifest Validation', () => {
  it('should validate a correct manifest', () => {
    const errors = validateManifest(makeManifest());
    expect(errors).toHaveLength(0);
  });

  it('should reject null manifest', () => {
    const errors = validateManifest(null);
    expect(errors[0]).toContain('non-null object');
  });

  it('should reject wrong schemaVersion', () => {
    const errors = validateManifest(makeManifest({ schemaVersion: '99.0.0' }));
    expect(errors[0]).toContain('schemaVersion');
  });

  it('should reject missing templates array', () => {
    const errors = validateManifest({ schemaVersion: '1.0.0' });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('"templates" array'),
    ]));
  });

  it('should reject template without file field', () => {
    const manifest = makeManifest({
      templates: [{ requires: [], audience: ['all'], applicability: { always: true } }],
    });
    const errors = validateManifest(manifest);
    expect(errors[0]).toContain('"file"');
  });

  it('should reject duplicate template files', () => {
    const manifest = makeManifest({
      templates: [
        { file: 'A.md', requires: [], audience: ['all'], applicability: { always: true } },
        { file: 'A.md', requires: [], audience: ['all'], applicability: { always: true } },
      ],
    });
    const errors = validateManifest(manifest);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicate'),
    ]));
  });

  it('should reject invalid audience value', () => {
    const manifest = makeManifest({
      templates: [
        { file: 'A.md', requires: [], audience: ['alien'], applicability: { always: true } },
      ],
    });
    const errors = validateManifest(manifest);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('invalid audience'),
    ]));
  });

  it('should reject template with non-array requires', () => {
    const manifest = makeManifest({
      templates: [
        { file: 'A.md', requires: 'string', audience: ['all'], applicability: { always: true } },
      ],
    });
    const errors = validateManifest(manifest);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('"requires" must be an array'),
    ]));
  });

  it('should reject missing applicability', () => {
    const manifest = makeManifest({
      templates: [
        { file: 'A.md', requires: [], audience: ['all'] },
      ],
    });
    const errors = validateManifest(manifest);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('"applicability"'),
    ]));
  });

  it('should detect unresolvable dependencies', () => {
    const manifest = makeManifest({
      templates: [
        { file: 'B.md', requires: ['NONEXISTENT'], audience: ['all'], applicability: { always: true } },
      ],
    });
    const errors = validateManifest(manifest);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('dependency "NONEXISTENT" not found'),
    ]));
  });
});

// ─── Manifest Loading Tests ──────────────────────────────────────────────────

describe('Doc Generator — Manifest Loading', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should load a valid manifest from disk', () => {
    setupManifest(tmpDir, makeManifest());
    const result = loadManifest(tmpDir);
    expect(result.valid).toBe(true);
    expect(result.manifest.schemaVersion).toBe('1.0.0');
    expect(result.errors).toHaveLength(0);
  });

  it('should return error when manifest not found', () => {
    const result = loadManifest(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });

  it('should return errors for invalid manifest', () => {
    setupManifest(tmpDir, { schemaVersion: '99.0.0', templates: [] });
    const result = loadManifest(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Plugin Manifest Tests ───────────────────────────────────────────────────

describe('Doc Generator — Plugin Manifests', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should return empty array when no plugins dir', () => {
    const result = loadPluginManifests(tmpDir);
    expect(result).toEqual([]);
  });

  it('should load plugin manifests', () => {
    const pluginDir = path.join(tmpDir, '.agent', 'templates', 'plugins', 'my-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(makeManifest()));

    const result = loadPluginManifests(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].plugin).toBe('my-plugin');
    expect(result[0].manifest.schemaVersion).toBe('1.0.0');
  });
});

// ─── Topological Sort Tests ──────────────────────────────────────────────────

describe('Doc Generator — Topological Sort', () => {
  it('should sort by dependencies', () => {
    const templates = [
      { file: 'C.md', requires: ['A', 'B'] },
      { file: 'A.md', requires: [] },
      { file: 'B.md', requires: ['A'] },
    ];
    const result = topologicalSort(templates);
    expect(result.error).toBeNull();

    const names = result.ordered.map((t) => t.file);
    expect(names.indexOf('A.md')).toBeLessThan(names.indexOf('B.md'));
    expect(names.indexOf('B.md')).toBeLessThan(names.indexOf('C.md'));
  });

  it('should detect circular dependencies', () => {
    const templates = [
      { file: 'A.md', requires: ['B'] },
      { file: 'B.md', requires: ['A'] },
    ];
    const result = topologicalSort(templates);
    expect(result.error).toContain('Circular dependency');
  });

  it('should handle no dependencies', () => {
    const templates = [
      { file: 'A.md', requires: [] },
      { file: 'B.md', requires: [] },
    ];
    const result = topologicalSort(templates);
    expect(result.error).toBeNull();
    expect(result.ordered).toHaveLength(2);
  });

  it('should handle empty array', () => {
    const result = topologicalSort([]);
    expect(result.error).toBeNull();
    expect(result.ordered).toEqual([]);
  });
});

// ─── Template Registry Tests ─────────────────────────────────────────────────

describe('Doc Generator — Template Registry', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should resolve registry in dependency order', () => {
    setupManifest(tmpDir, makeManifest());
    const result = resolveTemplateRegistry(tmpDir);
    expect(result.errors).toHaveLength(0);
    const names = result.templates.map((t) => t.file);
    expect(names.indexOf('TECH-STACK-ANALYSIS.md')).toBeLessThan(names.indexOf('ARCHITECTURE.md'));
    expect(names.indexOf('TECH-STACK-ANALYSIS.md')).toBeLessThan(names.indexOf('PRD.md'));
  });

  it('should return errors when no manifest found', () => {
    const result = resolveTemplateRegistry(tmpDir);
    expect(result.templates).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Document Validation Tests ────────────────────────────────────────────────

describe('Doc Generator — Document Validation', () => {
  it('should pass valid document', () => {
    const content = '# TestApp — Architecture\n\nThis is a valid document.\n';
    const result = validateDocument(content, 'ARCHITECTURE.md', 'TestApp', new Set());
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('should detect unresolved tokens (check 1)', () => {
    const content = '# TestApp\n\nStack: {{techStack.frontend}}\n';
    const result = validateDocument(content, 'test.md', 'TestApp', new Set());
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.check === 1)).toBe(true);
  });

  it('should warn about empty sections (check 2)', () => {
    const content = '# TestApp\n\n## Overview\n\n## Empty Section\n\n## Has Content\n\nSome content here.\n';
    const result = validateDocument(content, 'test.md', 'TestApp', new Set());
    const emptyWarnings = result.issues.filter((i) => i.check === 2);
    expect(emptyWarnings.length).toBeGreaterThan(0);
    expect(emptyWarnings[0].severity).toBe('warning');
  });

  it('should detect broken cross-references (check 3)', () => {
    const content = '# TestApp\n\nSee MISSING-DOC.md for details.\n';
    const generatedFiles = new Set(['ARCHITECTURE.md']);
    const result = validateDocument(content, 'test.md', 'TestApp', generatedFiles);
    expect(result.issues.some((i) => i.check === 3)).toBe(true);
  });

  it('should not flag valid cross-references', () => {
    const content = '# TestApp\n\nSee ARCHITECTURE.md for details.\n';
    const generatedFiles = new Set(['ARCHITECTURE.md']);
    const result = validateDocument(content, 'test.md', 'TestApp', generatedFiles);
    expect(result.issues.filter((i) => i.check === 3)).toHaveLength(0);
  });

  it('should detect project name mismatch (check 4)', () => {
    const content = '# WrongName — Architecture\n\nContent here.\n';
    const result = validateDocument(content, 'test.md', 'TestApp', new Set());
    expect(result.issues.some((i) => i.check === 4)).toBe(true);
  });

  it('should accept matching project name in title', () => {
    const content = '# TestApp — Architecture\n\nContent here.\n';
    const result = validateDocument(content, 'test.md', 'TestApp', new Set());
    expect(result.issues.filter((i) => i.check === 4)).toHaveLength(0);
  });

  it('should error on empty content', () => {
    const result = validateDocument('', 'test.md', 'TestApp', new Set());
    expect(result.valid).toBe(false);
  });

  it('should error on null content', () => {
    const result = validateDocument(null, 'test.md', 'TestApp', new Set());
    expect(result.valid).toBe(false);
  });
});

describe('Doc Generator — Document Set Validation', () => {
  it('should validate a consistent document set', () => {
    const docs = [
      { fileName: 'A.md', content: '# TestApp — A\n\nContent A.\nSee B.md for details.\n' },
      { fileName: 'B.md', content: '# TestApp — B\n\nContent B.\n' },
    ];
    const result = validateDocumentSet(docs, 'TestApp');
    expect(result.valid).toBe(true);
  });

  it('should detect cross-set issues', () => {
    const docs = [
      { fileName: 'A.md', content: '# TestApp — A\n\nSee NONEXISTENT.md for details.\n' },
    ];
    const result = validateDocumentSet(docs, 'TestApp');
    expect(result.issues.some((i) => i.check === 3)).toBe(true);
  });
});

// ─── Mermaid Diagram Tests ────────────────────────────────────────────────────

describe('Doc Generator — Mermaid Diagrams', () => {
  const profile = makeProfile();

  it('should generate C4 context diagram', () => {
    const diagram = generateC4Diagram(profile);
    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('C4Context');
    expect(diagram).toContain('TestApp');
    expect(diagram).toContain('Person(user');
    expect(diagram).toContain('System(system');
    expect(diagram).toContain('```');
  });

  it('should include integrations in C4 diagram', () => {
    const diagram = generateC4Diagram(profile);
    expect(diagram).toContain('stripe');
    expect(diagram).toContain('sendgrid');
    expect(diagram).toContain('System_Ext');
  });

  it('should generate data flow diagram', () => {
    const diagram = generateDataFlowDiagram(profile);
    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('flowchart LR');
    expect(diagram).toContain('Frontend');
    expect(diagram).toContain('Backend');
    expect(diagram).toContain('Database');
  });

  it('should include auth in data flow when present', () => {
    const diagram = generateDataFlowDiagram(profile);
    expect(diagram).toContain('Auth');
  });

  it('should include external APIs in data flow when integrations exist', () => {
    const diagram = generateDataFlowDiagram(profile);
    expect(diagram).toContain('External APIs');
  });

  it('should generate CLI-specific data flow', () => {
    const cliProfile = makeProfile({ platforms: ['cli'], auth: { method: [], roles: [], compliance: [] }, integrations: [] });
    const diagram = generateDataFlowDiagram(cliProfile);
    expect(diagram).toContain('CLI');
    expect(diagram).toContain('Core Logic');
  });

  it('should generate deployment diagram', () => {
    const diagram = generateDeploymentDiagram(profile);
    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('flowchart TB');
    expect(diagram).toContain('Deployment');
    expect(diagram).toContain('API Server');
    expect(diagram).toContain('Database');
  });

  it('should include mobile in deployment when platform present', () => {
    const mobileProfile = makeProfile({ platforms: ['web', 'ios'] });
    const diagram = generateDeploymentDiagram(mobileProfile);
    expect(diagram).toContain('Mobile App');
  });

  it('should generate all diagrams at once', () => {
    const diagrams = generateMermaidDiagrams(profile);
    expect(diagrams.c4).toContain('C4Context');
    expect(diagrams.dataFlow).toContain('flowchart LR');
    expect(diagrams.deployment).toContain('flowchart TB');
  });
});

// ─── Template Reading and Generation Tests ────────────────────────────────────

describe('Doc Generator — Template Reading', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should read existing template', () => {
    setupTemplate(tmpDir, 'TEST.md', '# {{projectName}}\n\nContent here.');
    const content = readTemplate(tmpDir, 'TEST.md');
    expect(content).toContain('{{projectName}}');
  });

  it('should return null for missing template', () => {
    const content = readTemplate(tmpDir, 'NONEXISTENT.md');
    expect(content).toBeNull();
  });
});

describe('Doc Generator — Single Document Generation', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should generate document from template', () => {
    setupTemplate(tmpDir, 'TEST.md', '# {{name}}\n\n{{description}}\n\n<!-- IF:hasWeb -->\n## Web\nWeb content\n<!-- ENDIF:hasWeb -->');
    const result = generateDocument(tmpDir, 'TEST.md', { name: 'MyApp', description: 'Cool app' }, { hasWeb: true });
    expect(result.error).toBeNull();
    expect(result.content).toContain('# MyApp');
    expect(result.content).toContain('Cool app');
    expect(result.content).toContain('## Web');
  });

  it('should return error for missing template', () => {
    const result = generateDocument(tmpDir, 'MISSING.md', {});
    expect(result.error).toContain('not found');
    expect(result.content).toBeNull();
  });
});

// ─── Batch Generation Tests ──────────────────────────────────────────────────

describe('Doc Generator — Batch Generation', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should generate batch of documents', () => {
    setupTemplate(tmpDir, 'A.md', '# {{name}} — A\n\nContent A.\n');
    setupTemplate(tmpDir, 'B.md', '# {{name}} — B\n\nContent B.\n');

    const profile = makeProfile();
    const result = generateBatch(tmpDir, profile, ['A.md', 'B.md']);

    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].content).toContain('TestApp — A');
    expect(result.documents[1].content).toContain('TestApp — B');
    expect(result.errors).toHaveLength(0);
  });

  it('should auto-populate condition flags from profile', () => {
    setupTemplate(tmpDir, 'A.md', '# {{name}}\n\n<!-- IF:hasWeb -->\nWeb section\n<!-- ENDIF:hasWeb -->\n<!-- IF:hasMobile -->\nMobile section\n<!-- ENDIF:hasMobile -->');

    const profile = makeProfile({ platforms: ['web'] });
    const result = generateBatch(tmpDir, profile, ['A.md']);

    expect(result.documents[0].content).toContain('Web section');
    expect(result.documents[0].content).not.toContain('Mobile section');
  });

  it('should inject Mermaid diagrams into data context', () => {
    setupTemplate(tmpDir, 'ARCH.md', '# {{name}} — Architecture\n\n{{c4Diagram}}\n');

    const profile = makeProfile();
    const result = generateBatch(tmpDir, profile, ['ARCH.md']);

    expect(result.documents[0].content).toContain('```mermaid');
    expect(result.documents[0].content).toContain('C4Context');
  });

  it('should record errors for missing templates', () => {
    const profile = makeProfile();
    const result = generateBatch(tmpDir, profile, ['NONEXISTENT.md']);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.documents).toHaveLength(0);
  });

  it('should include validation results', () => {
    setupTemplate(tmpDir, 'A.md', '# {{name}} — A\n\nContent.\n');
    const profile = makeProfile();
    const result = generateBatch(tmpDir, profile, ['A.md']);
    expect(result.validation).toBeDefined();
    expect(result.validation.valid).toBe(true);
  });

  it('should set hasAuth condition from profile', () => {
    setupTemplate(tmpDir, 'A.md', '# {{name}}\n\n<!-- IF:hasAuth -->\nAuth section\n<!-- ENDIF:hasAuth -->');
    const profile = makeProfile({ auth: { method: ['jwt'], roles: [], compliance: [] } });
    const result = generateBatch(tmpDir, profile, ['A.md']);
    expect(result.documents[0].content).toContain('Auth section');
  });

  it('should set isSolo condition for solo team', () => {
    setupTemplate(tmpDir, 'A.md', '# {{name}}\n\n<!-- IF:isSolo -->\nSolo guidance\n<!-- ENDIF:isSolo -->');
    const profile = makeProfile({ team: { size: 'solo', experienceLevel: 'beginner' } });
    const result = generateBatch(tmpDir, profile, ['A.md']);
    expect(result.documents[0].content).toContain('Solo guidance');
  });
});

// ─── Staging Write Tests ──────────────────────────────────────────────────────

describe('Doc Generator — Staging Write', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should write documents to staging directory', () => {
    const stagingDir = path.join(tmpDir, 'staging');
    const docs = [
      { fileName: 'A.md', content: '# A\n\nContent A.\n' },
      { fileName: 'B.md', content: '# B\n\nContent B.\n' },
    ];
    const result = writeToStaging(stagingDir, docs);
    expect(result.written).toEqual(['A.md', 'B.md']);
    expect(result.errors).toHaveLength(0);
    expect(fs.existsSync(path.join(stagingDir, 'A.md'))).toBe(true);
    expect(fs.existsSync(path.join(stagingDir, 'B.md'))).toBe(true);
  });

  it('should create staging directory if missing', () => {
    const stagingDir = path.join(tmpDir, 'nested', 'staging');
    writeToStaging(stagingDir, [{ fileName: 'A.md', content: 'content' }]);
    expect(fs.existsSync(stagingDir)).toBe(true);
  });

  it('should handle empty document list', () => {
    const stagingDir = path.join(tmpDir, 'staging');
    const result = writeToStaging(stagingDir, []);
    expect(result.written).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});

// ─── Quality Score Tests ──────────────────────────────────────────────────────

describe('Doc Generator — Quality Score', () => {
  it('should calculate score for perfect set', () => {
    const docs = [
      { fileName: 'A.md', content: '# TestApp — A\n\nThis is detailed content about the architecture.\n\n```mermaid\ngraph LR\n  A-->B\n```\n\n## Next Steps\n\nAction items and success criteria defined.\n\nEstimation: 5 story points per sprint.\n' },
      { fileName: 'B.md', content: '# TestApp — B\n\nDetailed product requirements document.\n\n## Acceptance Criteria\n\nSuccess criteria for each feature.\n' },
    ];
    const validation = { issues: [] };
    const score = calculateQualityScore(docs, ['A.md', 'B.md'], validation);

    expect(score.total).toBeGreaterThan(0);
    expect(score.completeness).toBe(25);
    expect(score.consistency).toBe(25);
    expect(score.depth).toBeGreaterThan(0);
    expect(score.actionability).toBeGreaterThan(0);
    expect(score.details.generatedCount).toBe(2);
    expect(score.details.expectedCount).toBe(2);
  });

  it('should deduct for unresolved tokens', () => {
    const validation = {
      issues: [
        { check: 1, severity: 'error', message: 'unresolved {{token}}' },
      ],
    };
    const score = calculateQualityScore(
      [{ fileName: 'A.md', content: '# TestApp\n\n{{token}}\n' }],
      ['A.md'],
      validation
    );
    expect(score.completeness).toBeLessThan(25);
  });

  it('should deduct for name inconsistencies', () => {
    const validation = {
      issues: [
        { check: 4, severity: 'error', message: 'name mismatch' },
      ],
    };
    const score = calculateQualityScore(
      [{ fileName: 'A.md', content: '# WrongName\n\nContent.\n' }],
      ['A.md'],
      validation
    );
    expect(score.consistency).toBeLessThan(25);
  });

  it('should deduct for broken cross-references', () => {
    const validation = {
      issues: [
        { check: 3, severity: 'error', message: 'broken ref' },
      ],
    };
    const score = calculateQualityScore(
      [{ fileName: 'A.md', content: '# TestApp\n\nContent.\n' }],
      ['A.md'],
      validation
    );
    expect(score.consistency).toBeLessThan(25);
  });

  it('should give Mermaid bonus for depth', () => {
    const docsWithMermaid = [
      { fileName: 'A.md', content: '# TestApp\n\nLong content here.\n\n```mermaid\ngraph LR\nA-->B\n```\n' },
    ];
    const docsWithout = [
      { fileName: 'A.md', content: '# TestApp\n\nLong content here.\n' },
    ];
    const validation = { issues: [] };

    const withMermaid = calculateQualityScore(docsWithMermaid, ['A.md'], validation);
    const withoutMermaid = calculateQualityScore(docsWithout, ['A.md'], validation);

    expect(withMermaid.depth).toBeGreaterThan(withoutMermaid.depth);
  });

  it('should cap total at 100', () => {
    const docs = Array(20).fill(null).map((_, i) => ({
      fileName: `doc${i}.md`,
      content: '# TestApp\n\nDetailed content with next steps and action items.\nSuccess criteria defined.\nEstimation: 3 story points per sprint.\n\n```mermaid\ngraph LR\nA-->B\n```\n',
    }));
    const queue = docs.map((d) => d.fileName);
    const validation = { issues: [] };
    const score = calculateQualityScore(docs, queue, validation);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('should handle empty document set', () => {
    const score = calculateQualityScore([], ['A.md'], { issues: [] });
    expect(score.completeness).toBe(0);
    expect(score.depth).toBe(0);
    expect(score.actionability).toBe(0);
  });
});

// ─── Module Exports Tests ─────────────────────────────────────────────────────

describe('Doc Generator — Module Exports', () => {
  it('should export all expected functions', () => {
    const mod = require('../../lib/doc-generator');
    const expectedFunctions = [
      'resolveValue', 'resolveCondition', 'processTemplate',
      'loadManifest', 'validateManifest', 'loadPluginManifests',
      'resolveTemplateRegistry', 'topologicalSort',
      'validateDocument', 'validateDocumentSet',
      'generateC4Diagram', 'generateDataFlowDiagram', 'generateDeploymentDiagram', 'generateMermaidDiagrams',
      'readTemplate', 'generateDocument', 'generateBatch', 'writeToStaging',
      'calculateQualityScore',
    ];

    for (const fn of expectedFunctions) {
      expect(typeof mod[fn]).toBe('function');
    }
  });

  it('should export all expected constants', () => {
    const mod = require('../../lib/doc-generator');
    expect(mod.MANIFEST_SCHEMA_VERSION).toBeDefined();
    expect(mod.VALID_AUDIENCES).toBeDefined();
    expect(mod.SEVERITY).toBeDefined();
    expect(mod.TEMPLATES_ONBOARDING_DIR).toBeDefined();
    expect(mod.TEMPLATES_PLUGINS_DIR).toBeDefined();
  });
});
