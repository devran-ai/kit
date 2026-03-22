import { describe, it, expect } from 'vitest';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');

async function loadVerify() {
  const modulePath = path.join(ROOT, 'lib', 'verify.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Manifest Verification — kit verify', () => {
  it('should pass all checks on the actual .agent/ directory', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);

    expect(report.failed).toBe(0);
    expect(report.passed).toBeGreaterThan(0);
  });

  it('should verify agent count matches', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);
    const agentCount = report.results.find((r) => r.name === 'agent-count');

    expect(agentCount).toBeTruthy();
    expect(agentCount.status).toBe('pass');
  });

  it('should verify skill count matches', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);
    const skillCount = report.results.find((r) => r.name === 'skill-count');

    expect(skillCount).toBeTruthy();
    expect(skillCount.status).toBe('pass');
  });

  it('should verify workflow count matches', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);
    const wfCount = report.results.find((r) => r.name === 'workflow-count');

    expect(wfCount).toBeTruthy();
    expect(wfCount.status).toBe('pass');
  });

  it('should verify command count matches', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);
    const cmdCount = report.results.find((r) => r.name === 'command-count');

    expect(cmdCount).toBeTruthy();
    expect(cmdCount.status).toBe('pass');
  });

  it('should verify all 4 engine JSON files are valid', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);
    const engineChecks = report.results.filter((r) => r.name.startsWith('engine:'));

    expect(engineChecks).toHaveLength(4);
    for (const check of engineChecks) {
      expect(check.status).toBe('pass');
    }
  });

  it('should verify hooks.json is valid', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);
    const hooksCheck = report.results.find((r) => r.name === 'hooks-json');

    expect(hooksCheck).toBeTruthy();
    expect(hooksCheck.status).toBe('pass');
  });

  it('should verify cross-references between loading-rules and manifest', async () => {
    const verify = await loadVerify();
    const report = verify.runAllChecks(ROOT);
    const xrefChecks = report.results.filter((r) => r.name.startsWith('xref:'));

    expect(xrefChecks.length).toBeGreaterThan(0);
    // All should be pass (agents in loading-rules exist in manifest)
    for (const check of xrefChecks) {
      expect(check.status).toBe('pass');
    }
  });

  it('should detect invalid JSON file', async () => {
    const verify = await loadVerify();
    const result = verify.checkJsonFile('/nonexistent/path/file.json', 'test-check');

    expect(result.status).toBe('fail');
    expect(result.message).toContain('not found');
  });
});
