import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-conflict-test');
const ENGINE_DIR = path.join(TMP_PROJECT, '.agent', 'engine');

function setupTestProject() {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
}

function teardownTestProject() {
  if (fs.existsSync(TMP_PROJECT)) {
    fs.rmSync(TMP_PROJECT, { recursive: true });
  }
}

async function loadDetector() {
  const modulePath = path.join(ROOT, 'lib', 'conflict-detector.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Agent Conflict Detection', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should claim a file for an agent', async () => {
    const detector = await loadDetector();
    const result = detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');

    expect(result.success).toBe(true);
  });

  it('should detect conflict when two agents claim the same file', async () => {
    const detector = await loadDetector();
    detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');
    const result = detector.claimFile(TMP_PROJECT, 'src/app.js', 'frontend-specialist');

    expect(result.success).toBe(false);
    expect(result.conflict).toBeTruthy();
    expect(result.conflict.agents).toContain('architect');
    expect(result.conflict.agents).toContain('frontend-specialist');
  });

  it('should allow same agent to reclaim its file', async () => {
    const detector = await loadDetector();
    detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');
    const result = detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');

    expect(result.success).toBe(true);
  });

  it('should release a file lock', async () => {
    const detector = await loadDetector();
    detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');
    const release = detector.releaseFile(TMP_PROJECT, 'src/app.js', 'architect');

    expect(release.success).toBe(true);

    // Another agent can now claim
    const claim = detector.claimFile(TMP_PROJECT, 'src/app.js', 'frontend-specialist');
    expect(claim.success).toBe(true);
  });

  it('should report file ownership', async () => {
    const detector = await loadDetector();
    detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');
    detector.claimFile(TMP_PROJECT, 'src/style.css', 'frontend-specialist');

    const ownership = detector.getFileOwnership(TMP_PROJECT);
    expect(ownership).toHaveLength(2);
  });

  it('should detect no conflicts with separate files', async () => {
    const detector = await loadDetector();
    detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');
    detector.claimFile(TMP_PROJECT, 'src/style.css', 'frontend-specialist');

    const conflicts = detector.detectConflicts(TMP_PROJECT);
    expect(conflicts).toHaveLength(0);
  });

  it('should generate conflict report', async () => {
    const detector = await loadDetector();
    detector.claimFile(TMP_PROJECT, 'src/app.js', 'architect');

    const report = detector.reportConflicts(TMP_PROJECT);
    expect(report.activeLocks).toBe(1);
    expect(report.hasBlockingConflict).toBe(false);
  });
});
