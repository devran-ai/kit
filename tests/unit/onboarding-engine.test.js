import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const engine = require('../../lib/onboarding-engine');

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-engine-'));
  fs.mkdirSync(path.join(dir, '.agent', 'engine'), { recursive: true });
  return dir;
}

function makeProfile(overrides = {}) {
  return {
    name: 'TestApp',
    description: 'Test application',
    problemStatement: 'Testing onboarding engine',
    platforms: ['web', 'api'],
    team: { size: 'small', experienceLevel: 'intermediate' },
    ...overrides,
  };
}

describe('Onboarding Engine — Constants', () => {
  it('should export PHASES in correct order', () => {
    expect(engine.PHASES).toEqual(['DISCOVERY', 'RESEARCH', 'ANALYSIS', 'GENERATION', 'CONFIGURATION', 'COMPLETE']);
  });

  it('should export INTERACTION_MODES', () => {
    expect(engine.INTERACTION_MODES).toEqual(['interactive', 'telegram', 'headless']);
  });

  it('should export WORKFLOW_TYPES', () => {
    expect(engine.WORKFLOW_TYPES).toEqual(['greenfield', 'brownfield']);
  });

  it('should export STATUS_VALUES', () => {
    expect(engine.STATUS_VALUES).toContain('idle');
    expect(engine.STATUS_VALUES).toContain('in-progress');
    expect(engine.STATUS_VALUES).toContain('complete');
    expect(engine.STATUS_VALUES).toContain('failed');
  });

  it('should export VALID_PLATFORMS', () => {
    expect(engine.VALID_PLATFORMS).toContain('web');
    expect(engine.VALID_PLATFORMS).toContain('ios');
    expect(engine.VALID_PLATFORMS).toContain('cli');
    expect(engine.VALID_PLATFORMS).toContain('library');
  });

  it('should export frozen arrays', () => {
    expect(Object.isFrozen(engine.PHASES)).toBe(true);
    expect(Object.isFrozen(engine.INTERACTION_MODES)).toBe(true);
    expect(Object.isFrozen(engine.WORKFLOW_TYPES)).toBe(true);
  });
});

describe('Onboarding Engine — Profile Validation', () => {
  it('should validate a complete profile', () => {
    const result = engine.validateProfile(makeProfile());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null profile', () => {
    const result = engine.validateProfile(null);
    expect(result.valid).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = engine.validateProfile({ name: 'Test' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid platform', () => {
    const result = engine.validateProfile(makeProfile({ platforms: ['quantum'] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid platform'))).toBe(true);
  });

  it('should reject empty platforms array', () => {
    const result = engine.validateProfile(makeProfile({ platforms: [] }));
    expect(result.valid).toBe(false);
  });

  it('should reject invalid experience level', () => {
    const result = engine.validateProfile(makeProfile({ team: { experienceLevel: 'god' } }));
    expect(result.valid).toBe(false);
  });

  it('should reject invalid team size', () => {
    const result = engine.validateProfile(makeProfile({ team: { size: 'massive' } }));
    expect(result.valid).toBe(false);
  });

  it('should reject non-boolean stealthMode', () => {
    const result = engine.validateProfile(makeProfile({ stealthMode: 'yes' }));
    expect(result.valid).toBe(false);
  });

  it('should accept valid stealthMode boolean', () => {
    const result = engine.validateProfile(makeProfile({ stealthMode: true }));
    expect(result.valid).toBe(true);
  });
});

describe('Onboarding Engine — Profile Resolution', () => {
  it('should resolve profile from answers', () => {
    const profile = engine.resolveProfile({
      name: 'MyApp',
      description: 'My app',
      problemStatement: 'Problem',
      platforms: ['web'],
      teamSize: 'solo',
      experienceLevel: 'beginner',
      stealthMode: true,
    });
    expect(profile.name).toBe('MyApp');
    expect(profile.team.size).toBe('solo');
    expect(profile.stealthMode).toBe(true);
  });

  it('should handle missing answer fields with defaults', () => {
    const profile = engine.resolveProfile({});
    expect(profile.name).toBe('');
    expect(profile.team.size).toBe('solo');
    expect(profile.team.experienceLevel).toBe('intermediate');
    expect(profile.platforms).toEqual([]);
  });
});

describe('Onboarding Engine — Document Queue', () => {
  it('should return all "always" templates for web platform', () => {
    const queue = engine.getDocumentQueue(makeProfile({ platforms: ['web'] }), 'greenfield');
    expect(queue).toContain('TECH-STACK-ANALYSIS.md');
    expect(queue).toContain('PRD.md');
    expect(queue).toContain('ARCHITECTURE.md');
    expect(queue).toContain('CLAUDE.md');
    expect(queue).toContain('DESIGN-SYSTEM.md');
  });

  it('should exclude UI-only templates for CLI projects', () => {
    const queue = engine.getDocumentQueue(makeProfile({ platforms: ['cli'] }), 'greenfield');
    expect(queue).not.toContain('DESIGN-SYSTEM.md');
    expect(queue).not.toContain('SCREENS-INVENTORY.md');
    expect(queue).not.toContain('COMPETITOR-ANALYSIS.md');
    expect(queue).toContain('TECH-STACK-ANALYSIS.md');
    expect(queue).toContain('CLAUDE.md');
  });

  it('should skip complete docs in brownfield mode', () => {
    const existingDocs = { 'ARCHITECTURE.md': 'EXISTS_COMPLETE' };
    const queue = engine.getDocumentQueue(makeProfile(), 'brownfield', existingDocs);
    expect(queue).not.toContain('ARCHITECTURE.md');
    expect(queue).toContain('PRD.md');
  });

  it('should keep partial docs in brownfield mode', () => {
    const existingDocs = { 'ARCHITECTURE.md': 'EXISTS_PARTIAL' };
    const queue = engine.getDocumentQueue(makeProfile(), 'brownfield', existingDocs);
    expect(queue).toContain('ARCHITECTURE.md');
  });
});

describe('Onboarding Engine — Kit Configuration', () => {
  it('should resolve domains from web platform', () => {
    const config = engine.resolveKitConfiguration(makeProfile({ platforms: ['web'] }));
    expect(config.domains).toContain('frontend');
    expect(config.domains).toContain('backend');
    expect(config.domains).toContain('database');
    expect(config.domains).toContain('architecture');
  });

  it('should add security domain when auth methods present', () => {
    const config = engine.resolveKitConfiguration(makeProfile({
      auth: { method: ['jwt'], roles: [], compliance: [] },
    }));
    expect(config.domains).toContain('security');
  });

  it('should map domains to agents', () => {
    const config = engine.resolveKitConfiguration(makeProfile({ platforms: ['web'] }));
    expect(config.suggestedAgents).toContain('frontend-specialist');
    expect(config.suggestedAgents).toContain('backend-specialist');
  });

  it('should map domains to skills', () => {
    const config = engine.resolveKitConfiguration(makeProfile({ platforms: ['api'] }));
    expect(config.suggestedSkills).toContain('api-patterns');
    expect(config.suggestedSkills).toContain('testing-patterns');
  });

  it('should always include architecture domain', () => {
    const config = engine.resolveKitConfiguration(makeProfile({ platforms: ['cli'] }));
    expect(config.domains).toContain('architecture');
    expect(config.suggestedAgents).toContain('architect');
  });
});

describe('Onboarding Engine — Session Management', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should create initial state', () => {
    const state = engine.createInitialState();
    expect(state.status).toBe('idle');
    expect(state.workflow).toBeNull();
    expect(state.currentStep).toBe(0);
    expect(state.canResume).toBe(false);
  });

  it('should load initial state when no file exists', () => {
    const state = engine.loadState(tmpDir);
    expect(state.status).toBe('idle');
  });

  it('should save and load state', () => {
    const state = { ...engine.createInitialState(), status: 'in-progress', workflow: 'greenfield' };
    engine.saveState(tmpDir, state);
    const loaded = engine.loadState(tmpDir);
    expect(loaded.status).toBe('in-progress');
    expect(loaded.workflow).toBe('greenfield');
  });

  it('should create a greenfield session', () => {
    const state = engine.createSession('greenfield', tmpDir);
    expect(state.status).toBe('in-progress');
    expect(state.workflow).toBe('greenfield');
    expect(state.canResume).toBe(true);
    expect(state.startedAt).toBeDefined();
  });

  it('should create a brownfield session', () => {
    const state = engine.createSession('brownfield', tmpDir);
    expect(state.workflow).toBe('brownfield');
  });

  it('should reject invalid mode', () => {
    expect(() => engine.createSession('invalid', tmpDir)).toThrow('Invalid onboarding mode');
  });

  it('should reject session when one is already active', () => {
    engine.createSession('greenfield', tmpDir);
    expect(() => engine.createSession('brownfield', tmpDir)).toThrow('already in progress');
  });

  it('should accept interaction mode option', () => {
    const state = engine.createSession('greenfield', tmpDir, { interactionMode: 'telegram' });
    expect(state.interactionMode).toBe('telegram');
  });

  it('should reject invalid interaction mode', () => {
    expect(() => engine.createSession('greenfield', tmpDir, { interactionMode: 'smoke-signal' }))
      .toThrow('Invalid interaction mode');
  });

  it('should check session status', () => {
    const check = engine.checkSession(tmpDir);
    expect(check.active).toBe(false);
    expect(check.canResume).toBe(false);
  });

  it('should detect active session', () => {
    engine.createSession('greenfield', tmpDir);
    const check = engine.checkSession(tmpDir);
    expect(check.active).toBe(true);
    expect(check.canResume).toBe(true);
  });

  it('should reset session', () => {
    engine.createSession('greenfield', tmpDir);
    const fresh = engine.resetSession(tmpDir);
    expect(fresh.status).toBe('idle');
    expect(fresh.workflow).toBeNull();
  });
});

describe('Onboarding Engine — Phase Advancement', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should advance from step 0 to step 1', () => {
    const state = engine.createSession('greenfield', tmpDir);
    const next = engine.advancePhase(tmpDir, state, { data: 'discovery-result' });
    expect(next.currentStep).toBe(1);
    expect(next.completedSteps).toContain(0);
    expect(next.artifacts.DISCOVERY).toEqual({ data: 'discovery-result' });
  });

  it('should reach COMPLETE status after all phases', () => {
    let state = engine.createSession('greenfield', tmpDir);
    for (let i = 0; i < engine.PHASES.length; i++) {
      state = engine.advancePhase(tmpDir, state);
    }
    expect(state.status).toBe('complete');
    expect(state.completedAt).toBeDefined();
    expect(state.canResume).toBe(false);
  });

  it('should reject advancement when not in-progress', () => {
    const state = engine.createInitialState();
    expect(() => engine.advancePhase(tmpDir, state)).toThrow('Cannot advance');
  });

  it('should record step metrics', () => {
    const state = engine.createSession('greenfield', tmpDir);
    const next = engine.advancePhase(tmpDir, state);
    expect(next.stepMetrics).toHaveLength(1);
    expect(next.stepMetrics[0].phase).toBe('DISCOVERY');
    expect(next.stepMetrics[0].completedAt).toBeDefined();
  });
});

describe('Onboarding Engine — Refresh Mode', () => {
  it('should compare profiles and detect changes', () => {
    const prev = { name: 'App', platforms: ['web'], auth: { method: ['jwt'] } };
    const curr = { name: 'App', platforms: ['web', 'ios'], auth: { method: ['oauth'] } };
    const diff = engine.compareProfiles(curr, prev);
    expect(diff.changed.length).toBeGreaterThan(0);
    expect(diff.unchanged).toContain('name');
  });

  it('should detect pivot when 3+ major changes', () => {
    const comparison = {
      changed: [
        { severity: 'major' }, { severity: 'major' }, { severity: 'major' },
      ],
    };
    expect(engine.isPivotDetected(comparison)).toBe(true);
  });

  it('should not detect pivot with fewer than 3 major changes', () => {
    const comparison = {
      changed: [{ severity: 'major' }, { severity: 'minor' }],
    };
    expect(engine.isPivotDetected(comparison)).toBe(false);
  });

  it('should handle null previousProfile', () => {
    const diff = engine.compareProfiles({ name: 'App' }, null);
    expect(diff.unchanged).toEqual([]);
  });
});

describe('Onboarding Engine — Staging', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should resolve staging path', () => {
    const p = engine.resolveStagingPath(tmpDir);
    expect(p).toContain('.agent');
    expect(p).toContain('staging');
  });

  it('should create staging directory', () => {
    const p = engine.ensureStagingDir(tmpDir);
    expect(fs.existsSync(p)).toBe(true);
  });

  it('should move files from staging to output', () => {
    const state = { ...engine.createInitialState(), outputDir: 'docs', stagingDir: '.agent/staging/onboarding' };
    const stagingPath = path.join(tmpDir, state.stagingDir);
    fs.mkdirSync(stagingPath, { recursive: true });
    fs.writeFileSync(path.join(stagingPath, 'TEST.md'), '# Test');

    const result = engine.moveFromStaging(tmpDir, state);
    expect(result.moved).toContain('TEST.md');
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'TEST.md'))).toBe(true);
  });

  it('should place CLAUDE.md at project root', () => {
    const state = { ...engine.createInitialState(), outputDir: 'docs', stagingDir: '.agent/staging/onboarding' };
    const stagingPath = path.join(tmpDir, state.stagingDir);
    fs.mkdirSync(stagingPath, { recursive: true });
    fs.writeFileSync(path.join(stagingPath, 'CLAUDE.md'), '# Claude');

    const result = engine.moveFromStaging(tmpDir, state);
    expect(result.moved).toContain('CLAUDE.md');
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
  });

  it('should not overwrite existing CLAUDE.md', () => {
    const state = { ...engine.createInitialState(), outputDir: 'docs', stagingDir: '.agent/staging/onboarding' };
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Existing');
    const stagingPath = path.join(tmpDir, state.stagingDir);
    fs.mkdirSync(stagingPath, { recursive: true });
    fs.writeFileSync(path.join(stagingPath, 'CLAUDE.md'), '# New');

    const result = engine.moveFromStaging(tmpDir, state);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('manual merge')]));
    expect(fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8')).toBe('# Existing');
  });
});
