import { describe, it, expect } from 'vitest';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');

async function loadScanner() {
  const modulePath = path.join(ROOT, 'lib', 'security-scanner.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Enhanced Security Scanner', () => {
  it('should scan for injection patterns without false positives', async () => {
    const scanner = await loadScanner();
    const findings = scanner.scanForInjection(ROOT);

    // Current agents should not contain injection patterns
    const critical = findings.filter((f) => f.severity === 'critical');
    expect(critical).toHaveLength(0);
  });

  it('should scan for secrets without false positives', async () => {
    const scanner = await loadScanner();
    const findings = scanner.scanForSecrets(ROOT);

    // Current project should not expose secrets
    const secrets = findings.filter((f) => f.severity === 'critical');
    expect(secrets).toHaveLength(0);
  });

  it('should scan for file anomalies', async () => {
    const scanner = await loadScanner();
    const findings = scanner.scanForAnomalies(ROOT);

    // Should run without error and return array
    expect(Array.isArray(findings)).toBe(true);
  });

  it('should generate a comprehensive security report', async () => {
    const scanner = await loadScanner();
    const report = scanner.getSecurityReport(ROOT);

    expect(report.filesScanned).toBeGreaterThan(0);
    expect(typeof report.criticalCount).toBe('number');
    expect(typeof report.highCount).toBe('number');
    expect(typeof report.mediumCount).toBe('number');
    expect(typeof report.lowCount).toBe('number');
    expect(Array.isArray(report.findings)).toBe(true);
    expect(typeof report.clean).toBe('boolean');
  });

  it('should report project as clean (no critical/high findings)', async () => {
    const scanner = await loadScanner();
    const report = scanner.getSecurityReport(ROOT);

    // The actual project should have zero critical findings
    expect(report.criticalCount).toBe(0);
  });
});
