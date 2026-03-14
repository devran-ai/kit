import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-plugin-test');
const AGENT_DIR = path.join(TMP_PROJECT, '.agent');
const ENGINE_DIR = path.join(AGENT_DIR, 'engine');

// Create a mock plugin directory
const MOCK_PLUGIN = path.join(ROOT, 'tests', '.tmp-mock-plugin');

function setupTestProject() {
  // Create target project structure
  fs.mkdirSync(path.join(AGENT_DIR, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(AGENT_DIR, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(AGENT_DIR, 'workflows'), { recursive: true });
  fs.mkdirSync(path.join(AGENT_DIR, 'hooks'), { recursive: true });
  fs.mkdirSync(ENGINE_DIR, { recursive: true });

  // Create initial hooks.json
  fs.writeFileSync(
    path.join(AGENT_DIR, 'hooks', 'hooks.json'),
    JSON.stringify({ hooks: [{ event: 'session-start', description: 'Session start', actions: [] }] }, null, 2),
    'utf-8'
  );

  // Create mock plugin
  fs.mkdirSync(path.join(MOCK_PLUGIN, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(MOCK_PLUGIN, 'skills', 'test-skill'), { recursive: true });
  fs.mkdirSync(path.join(MOCK_PLUGIN, 'workflows'), { recursive: true });

  fs.writeFileSync(path.join(MOCK_PLUGIN, 'plugin.json'), JSON.stringify({
    name: 'test-plugin',
    version: '1.0.0',
    author: 'Test Author',
    description: 'A test plugin',
    agents: ['test-agent.md'],
    skills: ['test-skill'],
    workflows: ['test-workflow.md'],
    hooks: [{
      event: 'session-start',
      description: 'Plugin hook',
      actions: [{ action: 'Run plugin check', severity: 'low', onFailure: 'log' }],
    }],
  }, null, 2));

  fs.writeFileSync(path.join(MOCK_PLUGIN, 'agents', 'test-agent.md'), '# Test Agent\n\n## Role\nTest role');
  fs.writeFileSync(path.join(MOCK_PLUGIN, 'skills', 'test-skill', 'SKILL.md'), '---\nname: test-skill\n---\n# Test Skill');
  fs.writeFileSync(path.join(MOCK_PLUGIN, 'workflows', 'test-workflow.md'), '---\ndescription: Test workflow\n---\n# Test');
}

function teardownTestProject() {
  for (const dir of [TMP_PROJECT, MOCK_PLUGIN]) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
  }
}

async function loadPluginSystem() {
  const modulePath = path.join(ROOT, 'lib', 'plugin-system.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Plugin System', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should validate a valid plugin', async () => {
    const plugins = await loadPluginSystem();
    const result = plugins.validatePlugin(MOCK_PLUGIN);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.manifest.name).toBe('test-plugin');
  });

  it('should reject plugin with missing plugin.json', async () => {
    const plugins = await loadPluginSystem();
    const result = plugins.validatePlugin('/tmp/nonexistent');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing plugin.json');
  });

  it('should install a plugin', async () => {
    const plugins = await loadPluginSystem();
    const result = plugins.installPlugin(MOCK_PLUGIN, TMP_PROJECT);

    expect(result.success).toBe(true);
    expect(result.installed.agents).toBe(1);
    expect(result.installed.skills).toBe(1);
    expect(result.installed.workflows).toBe(1);
    expect(result.installed.hooks).toBe(1);

    // Verify files were copied
    expect(fs.existsSync(path.join(AGENT_DIR, 'agents', 'test-agent.md'))).toBe(true);
    expect(fs.existsSync(path.join(AGENT_DIR, 'skills', 'test-skill', 'SKILL.md'))).toBe(true);
  });

  it('should prevent duplicate installation', async () => {
    const plugins = await loadPluginSystem();
    plugins.installPlugin(MOCK_PLUGIN, TMP_PROJECT);
    const result = plugins.installPlugin(MOCK_PLUGIN, TMP_PROJECT);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('already installed');
  });

  it('should list installed plugins', async () => {
    const plugins = await loadPluginSystem();
    plugins.installPlugin(MOCK_PLUGIN, TMP_PROJECT);
    const list = plugins.listPlugins(TMP_PROJECT);

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('test-plugin');
    expect(list[0].version).toBe('1.0.0');
  });

  it('should merge hooks with source tagging', async () => {
    const plugins = await loadPluginSystem();
    plugins.installPlugin(MOCK_PLUGIN, TMP_PROJECT);

    const hooksConfig = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'hooks', 'hooks.json'), 'utf-8'));
    const sessionStart = hooksConfig.hooks.find((h) => h.event === 'session-start');

    expect(sessionStart.actions.length).toBe(1);
    expect(sessionStart.actions[0].source).toBe('plugin:test-plugin');
  });

  it('should remove a plugin and clean up assets', async () => {
    const plugins = await loadPluginSystem();
    plugins.installPlugin(MOCK_PLUGIN, TMP_PROJECT);
    const result = plugins.removePlugin('test-plugin', TMP_PROJECT);

    expect(result.success).toBe(true);
    expect(result.removed.agents).toBe(1);

    // Verify files were removed
    expect(fs.existsSync(path.join(AGENT_DIR, 'agents', 'test-agent.md'))).toBe(false);

    // Verify plugin hooks were unmerged
    const hooksConfig = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'hooks', 'hooks.json'), 'utf-8'));
    const sessionStart = hooksConfig.hooks.find((h) => h.event === 'session-start');
    expect(sessionStart).toBeUndefined(); // No actions left, hook removed
  });

  it('should get plugin hooks', async () => {
    const plugins = await loadPluginSystem();
    plugins.installPlugin(MOCK_PLUGIN, TMP_PROJECT);
    const hooks = plugins.getPluginHooks('test-plugin', TMP_PROJECT);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].event).toBe('session-start');
  });

  it('should return empty list when no plugins installed', async () => {
    const plugins = await loadPluginSystem();
    const list = plugins.listPlugins(TMP_PROJECT);
    expect(list).toHaveLength(0);
  });
});
