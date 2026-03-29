import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const {
  // Constants
  IDE_TARGETS,
  IDE_FILE_PATHS,
  CURSORRULES_MAX_CHARS,
  INSTRUCTIONS_MAX_CHARS,

  // Context
  extractIdeContext,
  buildConventions,

  // Generators
  generateCursorrules,
  generateOpenCodeInstructions,
  generateCodexInstructions,

  // Condensation
  condenseClaude,

  // Unified
  generateAll,
  writeIdeConfigs,
} = require('../../lib/project-ide-generator');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kit-projide-'));
}

function makeProfile(overrides = {}) {
  return {
    name: 'TestApp',
    description: 'A test application',
    problemStatement: 'Testing IDE generation',
    platforms: ['web', 'api'],
    auth: { method: ['jwt'], roles: ['admin', 'user'], compliance: ['GDPR'] },
    integrations: ['Stripe', 'SendGrid'],
    team: { size: 'small', experienceLevel: 'intermediate' },
    timeline: { mvpDeadline: '2026-06-01', fullLaunch: '2026-12-01' },
    existingAssets: { designs: false, brand: true, apis: false, prds: false },
    budget: { hostingPreference: 'cloud', vendorLockInTolerance: 'medium' },
    stealthMode: false,
    ...overrides,
  };
}

const SAMPLE_CLAUDE_MD = `# TestApp — Development Rules

## Project Identity
- Name: TestApp
- Stack: React + Express + PostgreSQL

## Architecture Rules
- Follow layered architecture
- No circular dependencies
- Use dependency injection

## File Rules
- Max 400 lines per file
- Use kebab-case for filenames

## Testing Rules
- Minimum 80% coverage
- Write tests first (TDD)

## Coding Conventions
- Use TypeScript strict mode
- Prefer const over let
`;

// ─── Constants Tests ──────────────────────────────────────────────────────────

describe('Project IDE Generator — Constants', () => {
  it('should export frozen IDE_TARGETS', () => {
    expect(Object.isFrozen(IDE_TARGETS)).toBe(true);
    expect(IDE_TARGETS).toEqual(['cursor', 'opencode', 'codex']);
  });

  it('should export IDE_FILE_PATHS for all targets', () => {
    expect(IDE_FILE_PATHS.cursor).toBe('.cursorrules');
    expect(IDE_FILE_PATHS.opencode).toContain('instructions.md');
    expect(IDE_FILE_PATHS.codex).toContain('instructions.md');
  });

  it('should export character limits', () => {
    expect(CURSORRULES_MAX_CHARS).toBe(6000);
    expect(INSTRUCTIONS_MAX_CHARS).toBe(8000);
  });
});

// ─── Context Extraction Tests ─────────────────────────────────────────────────

describe('Project IDE Generator — Context Extraction', () => {
  it('should extract context from full profile', () => {
    const ctx = extractIdeContext(makeProfile());
    expect(ctx.name).toBe('TestApp');
    expect(ctx.description).toBe('A test application');
    expect(ctx.platforms).toEqual(['web', 'api']);
    expect(ctx.stack).toContain('Web');
    expect(ctx.stack).toContain('API');
    expect(ctx.teamLevel).toBe('intermediate');
    expect(ctx.teamSize).toBe('small');
    expect(ctx.auth.method).toContain('jwt');
    expect(ctx.integrations).toContain('Stripe');
  });

  it('should handle null profile gracefully', () => {
    const ctx = extractIdeContext(null);
    expect(ctx.name).toBe('Project');
    expect(ctx.platforms).toEqual([]);
  });

  it('should handle empty profile', () => {
    const ctx = extractIdeContext({});
    expect(ctx.name).toBe('Project');
    expect(ctx.stack).toBe('General');
  });

  it('should detect mobile platforms', () => {
    const ctx = extractIdeContext(makeProfile({ platforms: ['ios', 'android'] }));
    expect(ctx.stack).toContain('iOS');
    expect(ctx.stack).toContain('Android');
  });

  it('should detect CLI platform', () => {
    const ctx = extractIdeContext(makeProfile({ platforms: ['cli'] }));
    expect(ctx.stack).toContain('CLI');
  });

  it('should detect library platform', () => {
    const ctx = extractIdeContext(makeProfile({ platforms: ['library'] }));
    expect(ctx.stack).toContain('Library');
  });
});

// ─── Conventions Tests ────────────────────────────────────────────────────────

describe('Project IDE Generator — Conventions', () => {
  it('should include universal rules for all levels', () => {
    const result = buildConventions('intermediate', ['web']);
    expect(result).toContain('immutable');
    expect(result).toContain('errors');
    expect(result).toContain('Validate');
  });

  it('should add beginner-specific guidance', () => {
    const result = buildConventions('beginner', ['web']);
    expect(result).toContain('explanatory comments');
    expect(result).toContain('30 lines');
    expect(result).toContain('descriptive variable names');
  });

  it('should add expert-specific guidance', () => {
    const result = buildConventions('expert', ['web']);
    expect(result).toContain('self-documenting');
    expect(result).toContain('performance');
  });

  it('should add intermediate guidance by default', () => {
    const result = buildConventions('intermediate', ['web']);
    expect(result).toContain('"why" not "what"');
    expect(result).toContain('50 lines');
  });

  it('should add accessibility for UI platforms', () => {
    const result = buildConventions('intermediate', ['web']);
    expect(result).toContain('WCAG');
  });

  it('should add API-specific rules for api platform', () => {
    const result = buildConventions('intermediate', ['api']);
    expect(result).toContain('parameterized queries');
    expect(result).toContain('Rate-limit');
  });

  it('should not add web rules for CLI-only projects', () => {
    const result = buildConventions('intermediate', ['cli']);
    expect(result).not.toContain('WCAG');
    expect(result).not.toContain('Rate-limit');
  });
});

// ─── Cursorrules Generation Tests ─────────────────────────────────────────────

describe('Project IDE Generator — Cursorrules', () => {
  it('should generate .cursorrules with project identity', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateCursorrules(ctx);
    expect(result).toContain('# TestApp');
    expect(result).toContain('Project Identity');
    expect(result).toContain('Web');
    expect(result).toContain('API');
  });

  it('should include security section when auth exists', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateCursorrules(ctx);
    expect(result).toContain('Security');
    expect(result).toContain('jwt');
    expect(result).toContain('GDPR');
    expect(result).toContain('Never hardcode');
  });

  it('should include integrations section', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateCursorrules(ctx);
    expect(result).toContain('Integrations');
    expect(result).toContain('Stripe');
    expect(result).toContain('environment variables');
  });

  it('should include condensed CLAUDE.md when provided', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateCursorrules(ctx, SAMPLE_CLAUDE_MD);
    expect(result).toContain('Kit-Generated Context');
    expect(result).toContain('Architecture');
  });

  it('should respect CURSORRULES_MAX_CHARS limit', () => {
    const ctx = extractIdeContext(makeProfile());
    const longClaude = '#'.repeat(10000);
    const result = generateCursorrules(ctx, longClaude);
    expect(result.length).toBeLessThanOrEqual(CURSORRULES_MAX_CHARS);
  });

  it('should omit security section when no auth', () => {
    const ctx = extractIdeContext(makeProfile({ auth: { method: [], roles: [], compliance: [] } }));
    const result = generateCursorrules(ctx);
    expect(result).not.toContain('## Security');
  });

  it('should omit integrations section when empty', () => {
    const ctx = extractIdeContext(makeProfile({ integrations: [] }));
    const result = generateCursorrules(ctx);
    expect(result).not.toContain('## Integrations');
  });
});

// ─── OpenCode Generation Tests ────────────────────────────────────────────────

describe('Project IDE Generator — OpenCode', () => {
  it('should generate instructions with project overview', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateOpenCodeInstructions(ctx);
    expect(result).toContain('# TestApp');
    expect(result).toContain('Project Overview');
    expect(result).toContain('small');
    expect(result).toContain('intermediate');
  });

  it('should include MVP deadline when set', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateOpenCodeInstructions(ctx);
    expect(result).toContain('2026-06-01');
  });

  it('should include security requirements', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateOpenCodeInstructions(ctx);
    expect(result).toContain('Security Requirements');
    expect(result).toContain('jwt');
    expect(result).toContain('admin');
  });

  it('should include condensed CLAUDE.md', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateOpenCodeInstructions(ctx, SAMPLE_CLAUDE_MD);
    expect(result).toContain('Kit-Generated Context');
  });

  it('should respect INSTRUCTIONS_MAX_CHARS limit', () => {
    const ctx = extractIdeContext(makeProfile());
    const longClaude = '#'.repeat(15000);
    const result = generateOpenCodeInstructions(ctx, longClaude);
    expect(result.length).toBeLessThanOrEqual(INSTRUCTIONS_MAX_CHARS);
  });
});

// ─── Codex Generation Tests ──────────────────────────────────────────────────

describe('Project IDE Generator — Codex', () => {
  it('should generate instructions with stack info', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateCodexInstructions(ctx);
    expect(result).toContain('# TestApp');
    expect(result).toContain('Stack');
    expect(result).toContain('Web');
  });

  it('should include auth & security when present', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateCodexInstructions(ctx);
    expect(result).toContain('Auth & Security');
    expect(result).toContain('jwt');
    expect(result).toContain('Never expose secrets');
  });

  it('should omit auth section when no methods', () => {
    const ctx = extractIdeContext(makeProfile({ auth: { method: [], roles: [], compliance: [] } }));
    const result = generateCodexInstructions(ctx);
    expect(result).not.toContain('Auth & Security');
  });

  it('should include condensed CLAUDE.md', () => {
    const ctx = extractIdeContext(makeProfile());
    const result = generateCodexInstructions(ctx, SAMPLE_CLAUDE_MD);
    expect(result).toContain('Kit Context');
  });

  it('should respect INSTRUCTIONS_MAX_CHARS limit', () => {
    const ctx = extractIdeContext(makeProfile());
    const longClaude = '#'.repeat(15000);
    const result = generateCodexInstructions(ctx, longClaude);
    expect(result.length).toBeLessThanOrEqual(INSTRUCTIONS_MAX_CHARS);
  });
});

// ─── CLAUDE.md Condensation Tests ─────────────────────────────────────────────

describe('Project IDE Generator — CLAUDE.md Condensation', () => {
  it('should extract and prioritize Architecture sections', () => {
    const result = condenseClaude(SAMPLE_CLAUDE_MD, 2000);
    expect(result).toContain('Architecture');
  });

  it('should respect budget limit', () => {
    const result = condenseClaude(SAMPLE_CLAUDE_MD, 100);
    expect(result.length).toBeLessThanOrEqual(110); // small buffer for truncation
  });

  it('should return empty string for null content', () => {
    expect(condenseClaude(null, 1000)).toBe('');
  });

  it('should return empty string for zero budget', () => {
    expect(condenseClaude(SAMPLE_CLAUDE_MD, 0)).toBe('');
  });

  it('should include File Rules when budget allows', () => {
    const result = condenseClaude(SAMPLE_CLAUDE_MD, 5000);
    expect(result).toContain('File Rules');
  });

  it('should include Testing Rules when budget allows', () => {
    const result = condenseClaude(SAMPLE_CLAUDE_MD, 5000);
    expect(result).toContain('Testing Rules');
  });
});

// ─── Unified Generation Tests ─────────────────────────────────────────────────

describe('Project IDE Generator — generateAll', () => {
  it('should generate configs for all IDE targets', () => {
    const result = generateAll(makeProfile(), SAMPLE_CLAUDE_MD);
    expect(result.files).toHaveLength(3);
    expect(result.errors).toHaveLength(0);

    const targets = result.files.map((f) => f.target);
    expect(targets).toContain('cursor');
    expect(targets).toContain('opencode');
    expect(targets).toContain('codex');
  });

  it('should generate only specified targets', () => {
    const result = generateAll(makeProfile(), null, { targets: ['cursor'] });
    expect(result.files).toHaveLength(1);
    expect(result.files[0].target).toBe('cursor');
  });

  it('should report error for unknown target', () => {
    const result = generateAll(makeProfile(), null, { targets: ['vim'] });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Unknown IDE target');
  });

  it('should set correct file paths', () => {
    const result = generateAll(makeProfile());
    const cursorFile = result.files.find((f) => f.target === 'cursor');
    expect(cursorFile.path).toBe('.cursorrules');

    const opencodeFile = result.files.find((f) => f.target === 'opencode');
    expect(opencodeFile.path).toContain('instructions.md');
  });

  it('should handle null CLAUDE.md gracefully', () => {
    const result = generateAll(makeProfile(), null);
    expect(result.files).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Write Tests ──────────────────────────────────────────────────────────────

describe('Project IDE Generator — writeIdeConfigs', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should write all files to project root', () => {
    const files = [
      { target: 'cursor', path: '.cursorrules', content: '# Rules' },
      { target: 'opencode', path: '.opencode/instructions.md', content: '# Instructions' },
    ];
    const result = writeIdeConfigs(tmpDir, files);
    expect(result.written).toEqual(['.cursorrules', '.opencode/instructions.md']);
    expect(result.skipped).toHaveLength(0);
    expect(result.errors).toHaveLength(0);

    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.opencode', 'instructions.md'))).toBe(true);
  });

  it('should create nested directories', () => {
    const files = [
      { target: 'codex', path: '.codex/instructions.md', content: '# Codex' },
    ];
    writeIdeConfigs(tmpDir, files);
    expect(fs.existsSync(path.join(tmpDir, '.codex', 'instructions.md'))).toBe(true);
  });

  it('should skip existing files without force', () => {
    const filePath = path.join(tmpDir, '.cursorrules');
    fs.writeFileSync(filePath, 'existing content');

    const files = [{ target: 'cursor', path: '.cursorrules', content: 'new content' }];
    const result = writeIdeConfigs(tmpDir, files);

    expect(result.skipped).toEqual(['.cursorrules']);
    expect(result.written).toHaveLength(0);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('existing content');
  });

  it('should overwrite existing files with force', () => {
    const filePath = path.join(tmpDir, '.cursorrules');
    fs.writeFileSync(filePath, 'existing content');

    const files = [{ target: 'cursor', path: '.cursorrules', content: 'new content' }];
    const result = writeIdeConfigs(tmpDir, files, { force: true });

    expect(result.written).toEqual(['.cursorrules']);
    expect(result.skipped).toHaveLength(0);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
  });

  it('should handle empty file list', () => {
    const result = writeIdeConfigs(tmpDir, []);
    expect(result.written).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});

// ─── Module Exports Tests ─────────────────────────────────────────────────────

describe('Project IDE Generator — Module Exports', () => {
  it('should export all expected functions', () => {
    const mod = require('../../lib/project-ide-generator');
    const expectedFunctions = [
      'extractIdeContext', 'buildConventions',
      'generateCursorrules', 'generateOpenCodeInstructions', 'generateCodexInstructions',
      'condenseClaude',
      'generateAll', 'writeIdeConfigs',
    ];

    for (const fn of expectedFunctions) {
      expect(typeof mod[fn]).toBe('function');
    }
  });

  it('should export all expected constants', () => {
    const mod = require('../../lib/project-ide-generator');
    expect(mod.IDE_TARGETS).toBeDefined();
    expect(mod.IDE_FILE_PATHS).toBeDefined();
    expect(mod.CURSORRULES_MAX_CHARS).toBeDefined();
    expect(mod.INSTRUCTIONS_MAX_CHARS).toBeDefined();
  });
});
