import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_DIR = path.join(ROOT, 'tests', '.tmp-ide-generator');

const SAMPLE_MANIFEST = {
  schemaVersion: '1.0.0',
  kitVersion: '4.0.0',
  capabilities: {
    agents: {
      count: 3,
      items: [
        { name: 'planner', file: 'agents/planner.md', domain: 'Task breakdown, Socratic analysis' },
        { name: 'code-reviewer', file: 'agents/code-reviewer.md', domain: 'Quality + security review' },
        { name: 'architect', file: 'agents/architect.md', domain: 'System design, DDD, Hexagonal' },
      ],
    },
    commands: { count: 5 },
    skills: { count: 10, items: [] },
    workflows: { count: 5, items: [] },
  },
};

const SAMPLE_RULES = `# SYSTEM ROLE

## Operating Constraints

### Operating Constraints (IMMUTABLE)

| Priority | Constraint | Meaning |
| --- | --- | --- |
| **Absolute** | Trust > Optimization | User trust is never sacrificed |

### A. Chain of Thought Requirement

Before writing code, you MUST pause and plan.

### B. Review Mode (Self-Critique)

After generating code, enter Self-Correction Mode.

## TECHNICAL STANDARDS

### Code Quality

- **Type Safety**: Strict mode is MANDATORY.
- **Error Handling**: Never fail silently.
`;

function loadModule() {
  const modulePath = path.join(ROOT, 'lib', 'ide-generator.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function createTmpDir() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function removeTmpDir() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true });
  }
}

describe('IDE Generator', () => {
  beforeEach(() => {
    createTmpDir();
  });

  afterEach(() => {
    removeTmpDir();
  });

  // --- Cursor Config ---

  it('generateCursorConfig produces valid YAML frontmatter', () => {
    const { generateCursorConfig } = loadModule();
    const config = generateCursorConfig(SAMPLE_MANIFEST, SAMPLE_RULES);

    expect(config.files).toHaveLength(1);
    const content = config.files[0].content;
    expect(content).toMatch(/^---\n/);
    expect(content).toMatch(/\n---\n/);
    expect(config.files[0].path).toBe('.cursor/rules/kit-governance.mdc');
  });

  it('generateCursorConfig includes alwaysApply: true', () => {
    const { generateCursorConfig } = loadModule();
    const config = generateCursorConfig(SAMPLE_MANIFEST, SAMPLE_RULES);
    const content = config.files[0].content;

    expect(content).toContain('alwaysApply: true');
  });

  // --- OpenCode Config ---

  it('generateOpenCodeConfig produces valid JSON', () => {
    const { generateOpenCodeConfig } = loadModule();
    const config = generateOpenCodeConfig(SAMPLE_MANIFEST);

    expect(config.files).toHaveLength(1);
    const parsed = JSON.parse(config.files[0].content);
    expect(parsed).toBeDefined();
    expect(config.files[0].path).toBe('.opencode/opencode.json');
  });

  it('generateOpenCodeConfig includes model and instructions', () => {
    const { generateOpenCodeConfig } = loadModule();
    const config = generateOpenCodeConfig(SAMPLE_MANIFEST);
    const parsed = JSON.parse(config.files[0].content);

    expect(parsed.model).toBe('anthropic/claude-sonnet-4-5');
    expect(parsed.instructions).toContain('.agent/rules.md');
    expect(parsed.agent).toBeDefined();
    expect(parsed.agent.build).toBeDefined();
    expect(parsed.agent.planner).toBeDefined();
    expect(parsed.agent.reviewer).toBeDefined();
  });

  // --- Codex Config ---

  it('generateCodexConfig produces valid TOML', () => {
    const { generateCodexConfig } = loadModule();
    const config = generateCodexConfig(SAMPLE_MANIFEST);

    expect(config.files).toHaveLength(1);
    const content = config.files[0].content;
    expect(content).toContain('approval_policy');
    expect(content).toContain('[model]');
    expect(config.files[0].path).toBe('.codex/config.toml');
  });

  it('generateCodexConfig includes approval_policy', () => {
    const { generateCodexConfig } = loadModule();
    const config = generateCodexConfig(SAMPLE_MANIFEST);
    const content = config.files[0].content;

    expect(content).toContain('approval_policy = "suggest"');
    expect(content).toContain('sandbox_mode = "workspace-write"');
  });

  // --- writeIdeConfigs ---

  it('creates all 3 IDE directories', () => {
    const { generateAllIdeConfigs, writeIdeConfigs } = loadModule();
    const configs = generateAllIdeConfigs(SAMPLE_MANIFEST, SAMPLE_RULES);
    const result = writeIdeConfigs(TMP_DIR, configs);

    expect(fs.existsSync(path.join(TMP_DIR, '.cursor'))).toBe(true);
    expect(fs.existsSync(path.join(TMP_DIR, '.opencode'))).toBe(true);
    expect(fs.existsSync(path.join(TMP_DIR, '.codex'))).toBe(true);
    expect(result.written).toHaveLength(3);
  });

  it('skips existing dirs without force', () => {
    const { generateAllIdeConfigs, writeIdeConfigs } = loadModule();
    const configs = generateAllIdeConfigs(SAMPLE_MANIFEST, SAMPLE_RULES);

    // First write
    writeIdeConfigs(TMP_DIR, configs);

    // Second write without force
    const result = writeIdeConfigs(TMP_DIR, configs, { skipExisting: true });

    expect(result.written).toHaveLength(0);
    expect(result.skipped).toHaveLength(3);
  });

  it('overwrites with force flag', () => {
    const { generateAllIdeConfigs, writeIdeConfigs } = loadModule();
    const configs = generateAllIdeConfigs(SAMPLE_MANIFEST, SAMPLE_RULES);

    // First write
    writeIdeConfigs(TMP_DIR, configs);

    // Second write with force
    const result = writeIdeConfigs(TMP_DIR, configs, { force: true });

    expect(result.written).toHaveLength(3);
    expect(result.skipped).toHaveLength(0);
  });

  it('uses atomic write pattern', () => {
    const { generateAllIdeConfigs, writeIdeConfigs } = loadModule();
    const configs = generateAllIdeConfigs(SAMPLE_MANIFEST, SAMPLE_RULES);
    writeIdeConfigs(TMP_DIR, configs);

    // Verify no .tmp files remain
    const cursorDir = path.join(TMP_DIR, '.cursor', 'rules');
    const files = fs.readdirSync(cursorDir);
    const tmpFiles = files.filter((f) => f.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });

  it('rejects path traversal attempts', () => {
    const { writeIdeConfigs } = loadModule();
    const maliciousConfig = [{
      files: [{ path: '../../../etc/passwd', content: 'evil' }],
    }];

    expect(() => {
      writeIdeConfigs(TMP_DIR, maliciousConfig);
    }).toThrow(/Path traversal detected/);
  });

  it('contains no hardcoded secrets', () => {
    const { generateAllIdeConfigs } = loadModule();
    const configs = generateAllIdeConfigs(SAMPLE_MANIFEST, SAMPLE_RULES);

    for (const config of configs) {
      for (const file of config.files) {
        expect(file.content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
        expect(file.content).not.toMatch(/password\s*[:=]\s*['"]/i);
        expect(file.content).not.toMatch(/secret\s*[:=]\s*['"]/i);
      }
    }
  });

  it('is idempotent', () => {
    const { generateAllIdeConfigs, writeIdeConfigs } = loadModule();
    const configs = generateAllIdeConfigs(SAMPLE_MANIFEST, SAMPLE_RULES);

    writeIdeConfigs(TMP_DIR, configs);
    const firstContent = fs.readFileSync(
      path.join(TMP_DIR, '.opencode', 'opencode.json'),
      'utf-8'
    );

    writeIdeConfigs(TMP_DIR, configs, { force: true });
    const secondContent = fs.readFileSync(
      path.join(TMP_DIR, '.opencode', 'opencode.json'),
      'utf-8'
    );

    expect(firstContent).toBe(secondContent);
  });

  it('respects --ide filter for single IDE', () => {
    const { generateCursorConfig, writeIdeConfigs } = loadModule();
    const config = generateCursorConfig(SAMPLE_MANIFEST, SAMPLE_RULES);
    const result = writeIdeConfigs(TMP_DIR, [config]);

    expect(result.written).toHaveLength(1);
    expect(result.written[0]).toContain('.cursor');
    expect(fs.existsSync(path.join(TMP_DIR, '.opencode'))).toBe(false);
    expect(fs.existsSync(path.join(TMP_DIR, '.codex'))).toBe(false);
  });

  it('respects --skip-ide flag', () => {
    // --skip-ide is handled in bin/kit.js, not in the generator
    // Verify generateAllIdeConfigs returns all 3 when called
    const { generateAllIdeConfigs } = loadModule();
    const configs = generateAllIdeConfigs(SAMPLE_MANIFEST, SAMPLE_RULES);

    expect(configs).toHaveLength(3);
  });

  // --- TOML Serializer ---

  it('serializes string values with quotes', () => {
    const { serializeToml } = loadModule();
    const result = serializeToml({ key: 'value' });

    expect(result).toContain('key = "value"');
  });

  it('serializes boolean and integer values', () => {
    const { serializeToml } = loadModule();
    const result = serializeToml({ enabled: true, count: 42 });

    expect(result).toContain('enabled = true');
    expect(result).toContain('count = 42');
  });

  // --- Integration ---

  it('generated configs reference correct agent names', () => {
    const { generateOpenCodeConfig, generateCodexConfig } = loadModule();

    const openCodeConfig = generateOpenCodeConfig(SAMPLE_MANIFEST);
    const openCodeParsed = JSON.parse(openCodeConfig.files[0].content);
    expect(openCodeParsed.agent.planner.description).toBe('Task breakdown, Socratic analysis');
    expect(openCodeParsed.agent.reviewer.description).toBe('Quality + security review');

    const codexConfig = generateCodexConfig(SAMPLE_MANIFEST);
    const codexContent = codexConfig.files[0].content;
    expect(codexContent).toContain('Task breakdown, Socratic analysis');
    expect(codexContent).toContain('Quality + security review');
  });
});
