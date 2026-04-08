import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT = path.resolve(import.meta.dirname, '../..');

function loadModule() {
  const modulePath = path.join(ROOT, 'lib', 'command-bridge.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

const SAMPLE_MANIFEST = {
  schemaVersion: '1.0.0',
  kitVersion: '5.2.0',
  capabilities: {
    workflows: {
      count: 3,
      items: [
        { name: 'plan', file: 'workflows/plan.md' },
        { name: 'create', file: 'workflows/create.md' },
        { name: 'debug', file: 'workflows/debug.md' },
      ],
    },
  },
};

const PLAN_WORKFLOW = `---
description: Create implementation plan. Invokes planner agent for structured task breakdown.
args: feature or task description
version: 2.2.0
sdlc-phase: plan
---

# /plan — Implementation Planning
`;

const CREATE_WORKFLOW = `---
description: Create new features, components, or modules from scratch.
---

# /create
`;

const DEBUG_WORKFLOW = `---
description: Systematic debugging workflow. Activates DEBUG mode.
---

# /debug
`;

function setupTmpAgentDir(tmpDir) {
  const agentDir = path.join(tmpDir, '.agent');
  const workflowsDir = path.join(agentDir, 'workflows');
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.writeFileSync(path.join(workflowsDir, 'plan.md'), PLAN_WORKFLOW, 'utf-8');
  fs.writeFileSync(path.join(workflowsDir, 'create.md'), CREATE_WORKFLOW, 'utf-8');
  fs.writeFileSync(path.join(workflowsDir, 'debug.md'), DEBUG_WORKFLOW, 'utf-8');
  return agentDir;
}

describe('Command Bridge Generator', () => {
  let tmpDir;
  let agentDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-bridge-'));
    agentDir = setupTmpAgentDir(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Happy Path: Each IDE adapter ---

  it('generateClaudeCommands produces correct file count', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateClaudeCommands(workflows);
    expect(result.files).toHaveLength(3);
  });

  it('generateCursorCommands produces correct file count', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateCursorCommands(workflows);
    expect(result.files).toHaveLength(3);
  });

  it('generateOpenCodeCommands produces correct file count', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateOpenCodeCommands(workflows);
    expect(result.files).toHaveLength(3);
  });

  it('generateVSCodePrompts produces correct file count', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateVSCodePrompts(workflows);
    expect(result.files).toHaveLength(3);
  });

  it('generateWindsurfWorkflows produces correct file count', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateWindsurfWorkflows(workflows);
    expect(result.files).toHaveLength(3);
  });

  // --- Format Validation ---

  it('Claude bridge has YAML frontmatter with quoted description', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateClaudeCommands(workflows);
    const content = result.files[0].content;
    expect(content).toContain('---');
    expect(content).toMatch(/description: ".*"/);
    expect(result.files[0].path).toBe('.claude/commands/plan.md');
  });

  it('Cursor bridge has plain markdown (no YAML frontmatter)', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateCursorCommands(workflows);
    const content = result.files[0].content;
    expect(content).toContain('# /plan');
    expect(content).not.toMatch(/^---\n/);
    expect(result.files[0].path).toBe('.cursor/commands/plan.md');
  });

  it('OpenCode bridge has $ARGUMENTS variable', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateOpenCodeCommands(workflows);
    expect(result.files[0].content).toContain('$ARGUMENTS');
    expect(result.files[0].path).toBe('.opencode/commands/plan.md');
  });

  it('VS Code bridge has .prompt.md extension and mode: "agent"', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateVSCodePrompts(workflows);
    expect(result.files[0].path).toBe('.github/prompts/plan.prompt.md');
    expect(result.files[0].content).toContain('mode: "agent"');
  });

  it('Windsurf bridge has numbered steps format', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const result = mod.generateWindsurfWorkflows(workflows);
    expect(result.files[0].content).toContain('## Steps');
    expect(result.files[0].content).toContain('1. Read and follow');
    expect(result.files[0].path).toBe('.windsurf/workflows/plan.md');
  });

  it('all bridges include provenance header', () => {
    const mod = loadModule();
    const { workflows } = mod.resolveWorkflows(agentDir, SAMPLE_MANIFEST);
    const adapters = [
      mod.generateClaudeCommands,
      mod.generateCursorCommands,
      mod.generateOpenCodeCommands,
      mod.generateWindsurfWorkflows,
    ];
    for (const adapter of adapters) {
      const result = adapter(workflows);
      expect(result.files[0].content).toContain('<!-- devran-kit-bridge');
    }
    // VS Code has header after frontmatter
    const vscode = mod.generateVSCodePrompts(workflows);
    expect(vscode.files[0].content).toContain('<!-- devran-kit-bridge');
  });

  // --- Edge Cases ---

  it('uses fallback description when workflow file missing', () => {
    const mod = loadModule();
    const manifest = {
      capabilities: {
        workflows: {
          count: 1,
          items: [{ name: 'missing', file: 'workflows/nonexistent.md' }],
        },
      },
    };
    const { workflows, warnings } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows).toHaveLength(1);
    expect(workflows[0].description).toBe('Execute the missing workflow');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('uses fallback when no frontmatter in file', () => {
    const mod = loadModule();
    const noFmDir = path.join(agentDir, 'workflows');
    fs.writeFileSync(path.join(noFmDir, 'bare.md'), '# No frontmatter here\n', 'utf-8');
    const manifest = {
      capabilities: {
        workflows: { count: 1, items: [{ name: 'bare', file: 'workflows/bare.md' }] },
      },
    };
    const { workflows } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows[0].description).toBe('Execute the bare workflow');
  });

  it('uses fallback when frontmatter has no description field', () => {
    const mod = loadModule();
    fs.writeFileSync(
      path.join(agentDir, 'workflows', 'nodesc.md'),
      '---\nversion: 1.0.0\n---\n# No desc\n',
      'utf-8'
    );
    const manifest = {
      capabilities: {
        workflows: { count: 1, items: [{ name: 'nodesc', file: 'workflows/nodesc.md' }] },
      },
    };
    const { workflows } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows[0].description).toBe('Execute the nodesc workflow');
  });

  // --- Security Tests ---

  it('sanitizeForYaml strips newlines, escapes backslashes and quotes (S2)', () => {
    const mod = loadModule();
    expect(mod.sanitizeForYaml('line1\nline2\nline3')).toBe('line1');
    expect(mod.sanitizeForYaml('has "quotes" inside')).toBe('has \\"quotes\\" inside');
    expect(mod.sanitizeForYaml('path\\to\\file')).toBe('path\\\\to\\\\file');
    expect(mod.sanitizeForYaml('mixed \\"escape')).toBe('mixed \\\\\\"escape');
    expect(mod.sanitizeForYaml('a'.repeat(300)).length).toBeLessThanOrEqual(200);
  });

  it('sanitizeForMarkdown strips markdown links (S3)', () => {
    const mod = loadModule();
    expect(mod.sanitizeForMarkdown('[click](http://evil.com)')).toBe('click');
    expect(mod.sanitizeForMarkdown('Visit https://evil.com now')).toBe('Visit now');
  });

  it('sanitizeForMarkdown strips bare URLs (S3)', () => {
    const mod = loadModule();
    const result = mod.sanitizeForMarkdown('Check http://example.com/path for info');
    expect(result).not.toContain('http://');
  });

  it('skips workflow names with path traversal with warning (S1)', () => {
    const mod = loadModule();
    const manifest = {
      capabilities: {
        workflows: {
          count: 2,
          items: [
            { name: '../../etc/passwd', file: 'workflows/evil.md' },
            { name: 'valid-name', file: 'workflows/plan.md' },
          ],
        },
      },
    };
    const { workflows, warnings } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows).toHaveLength(1);
    expect(workflows[0].name).toBe('valid-name');
    expect(warnings.some(w => w.includes('invalid'))).toBe(true);
  });

  it('skips uppercase names via SAFE_COMMAND_NAME regex (S1)', () => {
    const mod = loadModule();
    const manifest = {
      capabilities: {
        workflows: {
          count: 1,
          items: [{ name: 'CON', file: 'workflows/con.md' }],
        },
      },
    };
    const { workflows, warnings } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('skips names with special characters (S1)', () => {
    const mod = loadModule();
    const manifest = {
      capabilities: {
        workflows: {
          count: 3,
          items: [
            { name: 'has spaces', file: 'workflows/bad.md' },
            { name: 'has.dots', file: 'workflows/bad.md' },
            { name: 'valid-name', file: 'workflows/plan.md' },
          ],
        },
      },
    };
    const { workflows } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows).toHaveLength(1);
    expect(workflows[0].name).toBe('valid-name');
  });

  it('blocks workflow file path traversal (S5)', () => {
    const mod = loadModule();
    const manifest = {
      capabilities: {
        workflows: {
          count: 1,
          items: [{ name: 'traversal', file: '../../etc/hosts' }],
        },
      },
    };
    const { workflows, warnings } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows[0].description).toBe('Execute the traversal workflow');
    expect(warnings.some(w => w.includes('Invalid workflow file path'))).toBe(true);
  });

  it('caps items at MAX_WORKFLOW_ITEMS (S6)', () => {
    const mod = loadModule();
    const items = Array.from({ length: 150 }, (_, i) => ({
      name: `wf-${String(i).padStart(3, '0')}`,
      file: `workflows/wf-${i}.md`,
    }));
    const manifest = { capabilities: { workflows: { count: 150, items } } };
    const { workflows } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows.length).toBeLessThanOrEqual(100);
  });

  it('uses fallback for large workflow files (S8)', () => {
    const mod = loadModule();
    const largePath = path.join(agentDir, 'workflows', 'large.md');
    fs.writeFileSync(largePath, '---\ndescription: Large file\n---\n' + 'x'.repeat(70000), 'utf-8');
    const manifest = {
      capabilities: {
        workflows: { count: 1, items: [{ name: 'large', file: 'workflows/large.md' }] },
      },
    };
    const { workflows, warnings } = mod.resolveWorkflows(agentDir, manifest);
    expect(workflows[0].description).toBe('Execute the large workflow');
    expect(warnings.some(w => w.includes('too large'))).toBe(true);
  });

  // --- Provenance ---

  it('isKitGeneratedFile returns true for Kit bridges', () => {
    const mod = loadModule();
    const testFile = path.join(tmpDir, 'test-bridge.md');
    fs.writeFileSync(testFile, '<!-- devran-kit-bridge v5.2.0 -->\n---\ndescription: "test"\n---\n', 'utf-8');
    expect(mod.isKitGeneratedFile(testFile)).toBe(true);
  });

  it('isKitGeneratedFile returns false for user files', () => {
    const mod = loadModule();
    const testFile = path.join(tmpDir, 'user-command.md');
    fs.writeFileSync(testFile, '# My custom command\n\nDo something cool\n', 'utf-8');
    expect(mod.isKitGeneratedFile(testFile)).toBe(false);
  });

  it('isKitGeneratedFile returns false for non-existent files', () => {
    const mod = loadModule();
    expect(mod.isKitGeneratedFile(path.join(tmpDir, 'nope.md'))).toBe(false);
  });

  // --- Auto-detection ---

  it('detectIDEs always includes claude', () => {
    const mod = loadModule();
    const ides = mod.detectIDEs(tmpDir);
    expect(ides).toContain('claude');
  });

  it('detectIDEs adds cursor when .cursor/ exists', () => {
    const mod = loadModule();
    fs.mkdirSync(path.join(tmpDir, '.cursor'), { recursive: true });
    const ides = mod.detectIDEs(tmpDir);
    expect(ides).toContain('cursor');
  });

  it('VS Code not detected without explicit opt-in', () => {
    const mod = loadModule();
    fs.mkdirSync(path.join(tmpDir, '.vscode'), { recursive: true });
    const ides = mod.detectIDEs(tmpDir);
    expect(ides).not.toContain('vscode');
  });

  // --- Reliability ---

  it('idempotent — two calls produce identical content', () => {
    const mod = loadModule();
    const result1 = mod.generateCommandBridges(agentDir, SAMPLE_MANIFEST, { ide: 'claude', projectRoot: tmpDir });
    const result2 = mod.generateCommandBridges(agentDir, SAMPLE_MANIFEST, { ide: 'claude', projectRoot: tmpDir });
    expect(result1.claude.files.map(f => f.content)).toEqual(result2.claude.files.map(f => f.content));
  });

  it('no secrets in any generated output', () => {
    const mod = loadModule();
    const bridges = mod.generateCommandBridges(agentDir, SAMPLE_MANIFEST, { ide: 'all', projectRoot: tmpDir });
    for (const ide of Object.keys(mod.IDE_ADAPTERS)) {
      if (!bridges[ide]) continue;
      for (const file of bridges[ide].files) {
        expect(file.content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
        expect(file.content).not.toMatch(/password\s*[:=]\s*['"]/i);
        expect(file.content).not.toMatch(/secret\s*[:=]\s*['"]/i);
      }
    }
  });

  // --- Orchestrator ---

  it('generateCommandBridges returns all 5 IDE results with --ide all', () => {
    const mod = loadModule();
    const result = mod.generateCommandBridges(agentDir, SAMPLE_MANIFEST, { ide: 'all', projectRoot: tmpDir });
    expect(result.claude).toBeDefined();
    expect(result.cursor).toBeDefined();
    expect(result.opencode).toBeDefined();
    expect(result.vscode).toBeDefined();
    expect(result.windsurf).toBeDefined();
    expect(result.detectedIDEs).toEqual(['claude', 'cursor', 'opencode', 'vscode', 'windsurf']);
  });

  // --- extractFrontmatterField ---

  it('extractFrontmatterField handles standard frontmatter', () => {
    const mod = loadModule();
    const content = '---\ndescription: Test description\nversion: 1.0\n---\n# Body';
    expect(mod.extractFrontmatterField(content, 'description')).toBe('Test description');
    expect(mod.extractFrontmatterField(content, 'version')).toBe('1.0');
  });

  it('extractFrontmatterField returns null for missing field', () => {
    const mod = loadModule();
    const content = '---\nversion: 1.0\n---\n# Body';
    expect(mod.extractFrontmatterField(content, 'description')).toBe(null);
  });

  it('extractFrontmatterField returns null for no frontmatter', () => {
    const mod = loadModule();
    expect(mod.extractFrontmatterField('# Just a heading\n', 'description')).toBe(null);
  });
});
