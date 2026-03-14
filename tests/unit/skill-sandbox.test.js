import { describe, it, expect } from 'vitest';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');

async function loadSandbox() {
  const modulePath = path.join(ROOT, 'lib', 'skill-sandbox.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Skill Sandboxing', () => {
  it('should extract permissions from frontmatter', async () => {
    const sandbox = await loadSandbox();
    const content = `---
name: test-skill
description: Test
allowed-tools: [read_file, view_file]
permission-level: read-only
---

# Test Skill`;

    const result = sandbox.extractPermissionsFromFrontmatter(content);
    expect(result.allowedTools).toContain('read_file');
    expect(result.allowedTools).toContain('view_file');
    expect(result.permissionLevel).toBe('read-only');
  });

  it('should return defaults when no frontmatter', async () => {
    const sandbox = await loadSandbox();
    const result = sandbox.extractPermissionsFromFrontmatter('# No frontmatter');

    expect(result.allowedTools).toEqual([]);
    expect(result.permissionLevel).toBe('read-only');
  });

  it('should get permissions for an existing skill', async () => {
    const sandbox = await loadSandbox();
    const permissions = sandbox.getSkillPermissions('clean-code', ROOT);

    expect(permissions.skillName).toBe('clean-code');
    expect(permissions.hasFrontmatter).toBe(true);
  });

  it('should handle non-existent skill gracefully', async () => {
    const sandbox = await loadSandbox();
    const permissions = sandbox.getSkillPermissions('nonexistent-skill', ROOT);

    expect(permissions.hasFrontmatter).toBe(false);
    expect(permissions.allowedTools).toEqual([]);
  });

  it('should enforce across all skills without crashing', async () => {
    const sandbox = await loadSandbox();
    const result = sandbox.enforceAllowedTools(ROOT);

    expect(result.total).toBeGreaterThan(0);
    expect(typeof result.compliant).toBe('number');
    expect(Array.isArray(result.violations)).toBe(true);
  });
});
