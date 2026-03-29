import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const engine = require('../../lib/onboarding-engine');
const docGen = require('../../lib/doc-generator');
const ideGen = require('../../lib/project-ide-generator');
const { calculateQualityScore } = require('../../lib/quality-score');
const sampleProfile = require('../fixtures/sample-project-profile.json');

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-flow-'));
  fs.mkdirSync(path.join(dir, '.agent', 'engine'), { recursive: true });
  return dir;
}

function setupTemplates(tmpDir) {
  const srcDir = path.resolve(import.meta.dirname, '../../.agent/templates/onboarding');
  const destDir = path.join(tmpDir, '.agent', 'templates', 'onboarding');
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
}

describe('Integration — Greenfield Zero Flow', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = makeTmpDir();
    setupTemplates(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should complete full greenfield flow: session → profile → queue → batch → staging → validate → move → config → quality', () => {
    // Step 1: Create session
    const session = engine.createSession('greenfield', tmpDir);
    expect(session.status).toBe('in-progress');

    // Step 2: Validate profile
    const validation = engine.validateProfile(sampleProfile);
    expect(validation.valid).toBe(true);

    // Step 3: Get document queue
    const queue = engine.getDocumentQueue(sampleProfile, 'greenfield');
    expect(queue.length).toBeGreaterThan(7);
    expect(queue).toContain('ARCHITECTURE.md');
    expect(queue).toContain('CLAUDE.md');

    // Step 4: Batch generate to staging
    const batch = docGen.generateBatch(tmpDir, sampleProfile, queue);
    expect(batch.documents.length).toBeGreaterThan(0);
    expect(batch.errors).toHaveLength(0);

    // Step 5: Write to staging
    const stagingDir = engine.ensureStagingDir(tmpDir);
    const writeResult = docGen.writeToStaging(stagingDir, batch.documents);
    expect(writeResult.written.length).toBe(batch.documents.length);
    expect(writeResult.errors).toHaveLength(0);

    // Step 6: Validate document set
    expect(batch.validation).toBeDefined();

    // Step 7: Calculate quality score
    const score = calculateQualityScore(batch.documents, queue, batch.validation);
    expect(score.total).toBeGreaterThan(0);
    expect(score.completeness).toBeGreaterThan(0);

    // Step 8: Move from staging
    const state = { ...session, outputDir: 'docs', stagingDir: path.relative(tmpDir, stagingDir) };
    const moveResult = engine.moveFromStaging(tmpDir, state);
    expect(moveResult.moved.length).toBeGreaterThan(0);

    // Step 9: Verify docs exist in output dir
    const docsDir = path.join(tmpDir, 'docs');
    expect(fs.existsSync(docsDir)).toBe(true);
    const movedFiles = fs.readdirSync(docsDir);
    expect(movedFiles.length).toBeGreaterThan(0);

    // Step 10: Generate IDE configs
    const ideResult = ideGen.generateAll(sampleProfile, null);
    expect(ideResult.files).toHaveLength(3);
    expect(ideResult.errors).toHaveLength(0);

    // Step 11: Kit configuration
    const kitConfig = engine.resolveKitConfiguration(sampleProfile);
    expect(kitConfig.domains.length).toBeGreaterThan(0);
    expect(kitConfig.suggestedAgents.length).toBeGreaterThan(0);
  });

  it('should handle CLI-only project with fewer documents', () => {
    const cliProfile = { ...sampleProfile, platforms: ['cli'], name: 'MyCLI', auth: { method: [], roles: [], compliance: [] }, integrations: [] };
    const queue = engine.getDocumentQueue(cliProfile, 'greenfield');
    expect(queue.length).toBeLessThan(10);
    expect(queue).toContain('TECH-STACK-ANALYSIS.md');
    expect(queue).not.toContain('DESIGN-SYSTEM.md');
  });
});
