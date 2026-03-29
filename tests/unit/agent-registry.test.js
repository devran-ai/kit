import { describe, it, expect } from 'vitest';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');

async function loadRegistry() {
  const modulePath = path.join(ROOT, 'lib', 'agent-registry.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Agent Registry', () => {
  it('should validate all agents against manifest', async () => {
    const registry = await loadRegistry();
    const report = registry.validateAllAgents(ROOT);

    expect(report.total).toBe(26);
    expect(report.valid).toBe(26);
    expect(report.invalid).toBe(0);
  });

  it('should validate a single agent successfully', async () => {
    const registry = await loadRegistry();
    const result = registry.validateAgent('architect', ROOT);

    expect(result.valid).toBe(true);
    expect(result.name).toBe('architect');
    expect(result.errors).toHaveLength(0);
    expect(result.metadata.hasTitle).toBe(true);
  });

  it('should fail validation for non-existent agent', async () => {
    const registry = await loadRegistry();
    const result = registry.validateAgent('nonexistent-agent', ROOT);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should extract metadata from agent markdown', async () => {
    const registry = await loadRegistry();
    const content = '# Test Agent\n\n## Role\nYou are a test agent.\n\n## Capabilities\n- Testing\n\n## Output Format\nMarkdown';
    const metadata = registry.extractAgentMetadata(content);

    expect(metadata.hasTitle).toBe(true);
    expect(metadata.title).toBe('Test Agent');
    expect(metadata.hasRoleDescription).toBe(true);
    expect(metadata.hasCapabilities).toBe(true);
    expect(metadata.hasOutputFormat).toBe(true);
  });

  it('should load registry from manifest', async () => {
    const registry = await loadRegistry();
    const { agents, totalCount } = registry.loadRegistry(ROOT);

    expect(totalCount).toBe(26);
    expect(agents.length).toBe(26);
    expect(agents[0]).toHaveProperty('name');
    expect(agents[0]).toHaveProperty('file');
    expect(agents[0]).toHaveProperty('domain');
  });

  it('should find agents by domain', async () => {
    const registry = await loadRegistry();
    const results = registry.getAgentByDomain('security', ROOT);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((a) => a.name === 'security-reviewer')).toBe(true);
  });

  it('should return empty array for unknown domain', async () => {
    const registry = await loadRegistry();
    const results = registry.getAgentByDomain('quantum-computing', ROOT);

    expect(results).toEqual([]);
  });
});
