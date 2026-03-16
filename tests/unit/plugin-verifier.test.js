import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateChecksum, verifyChecksum, storeChecksum, getStoredChecksum } = require('../../lib/plugin-verifier');

describe('Plugin Verifier', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-plugin-verify-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate deterministic checksums', () => {
    const pluginDir = path.join(tempDir, 'test-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({ name: 'test' }));
    fs.writeFileSync(path.join(pluginDir, 'README.md'), '# Test Plugin');

    const checksum1 = generateChecksum(pluginDir);
    const checksum2 = generateChecksum(pluginDir);

    expect(checksum1.checksum).toBe(checksum2.checksum);
    expect(checksum1.pluginName).toBe('test');
    expect(checksum1.files).toContain('plugin.json');
    expect(checksum1.files).toContain('README.md');
  });

  it('should detect file modification', () => {
    const pluginDir = path.join(tempDir, 'test-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({ name: 'test' }));

    const original = generateChecksum(pluginDir);

    // Modify file content
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({ name: 'modified' }));

    const result = verifyChecksum(pluginDir, original.checksum);
    expect(result.valid).toBe(false);
    expect(result.currentChecksum).not.toBe(result.expectedChecksum);
  });

  it('should verify unchanged plugins as valid', () => {
    const pluginDir = path.join(tempDir, 'test-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({ name: 'test' }));

    const original = generateChecksum(pluginDir);
    const result = verifyChecksum(pluginDir, original.checksum);

    expect(result.valid).toBe(true);
  });

  it('should store and retrieve checksums', () => {
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(projectDir, '.agent', 'engine'), { recursive: true });

    storeChecksum(projectDir, 'my-plugin', 'abc123def456');
    const stored = getStoredChecksum(projectDir, 'my-plugin');

    expect(stored).toBe('abc123def456');
  });

  it('should return null for missing checksum', () => {
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    const stored = getStoredChecksum(projectDir, 'nonexistent');
    expect(stored).toBeNull();
  });

  it('should handle empty plugin directories', () => {
    const pluginDir = path.join(tempDir, 'empty-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });

    const checksum = generateChecksum(pluginDir);
    expect(checksum.pluginName).toBe('unknown');
    expect(checksum.files).toHaveLength(0);
  });
});
