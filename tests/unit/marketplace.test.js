/**
 * Tests for Skill Marketplace
 * @module tests/unit/marketplace.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_ROOT = path.join(os.tmpdir(), `ag-marketplace-test-${Date.now()}`);
const ENGINE_DIR = path.join(TEST_ROOT, '.agent', 'engine');

let marketplace;

const SAMPLE_INDEX = {
  entries: [
    {
      name: 'ag-skill-docker-compose',
      description: 'Docker Compose orchestration for multi-container deployments',
      repository: 'https://github.com/example/ag-skill-docker-compose',
      version: '1.0.0',
      tags: ['docker', 'compose', 'containers'],
      author: 'community',
    },
    {
      name: 'ag-skill-graphql-designer',
      description: 'GraphQL schema design and query generation',
      repository: 'https://github.com/example/ag-skill-graphql-designer',
      version: '0.9.0',
      tags: ['graphql', 'api', 'schema'],
      author: 'community',
    },
    {
      name: 'ag-skill-accessibility-audit',
      description: 'WCAG compliance auditing and remediation',
      repository: 'https://github.com/example/ag-skill-accessibility-audit',
      version: '1.1.0',
      tags: ['accessibility', 'wcag', 'a11y'],
      author: 'community',
    },
  ],
  lastUpdated: new Date().toISOString(),
};

beforeEach(() => {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ENGINE_DIR, 'marketplace-index.json'),
    JSON.stringify(SAMPLE_INDEX, null, 2),
    'utf-8'
  );
  marketplace = require('../../lib/marketplace');
});

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  delete require.cache[require.resolve('../../lib/marketplace')];
});

describe('searchMarket', () => {
  it('finds plugins by name', () => {
    const results = marketplace.searchMarket(TEST_ROOT, 'docker');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('ag-skill-docker-compose');
  });

  it('finds plugins by description', () => {
    const results = marketplace.searchMarket(TEST_ROOT, 'WCAG');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('ag-skill-accessibility-audit');
  });

  it('finds plugins by tag', () => {
    const results = marketplace.searchMarket(TEST_ROOT, 'api');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('ag-skill-graphql-designer');
  });

  it('returns empty for no match', () => {
    const results = marketplace.searchMarket(TEST_ROOT, 'blockchain');
    expect(results).toHaveLength(0);
  });

  it('case-insensitive search', () => {
    const results = marketplace.searchMarket(TEST_ROOT, 'DOCKER');
    expect(results).toHaveLength(1);
  });
});

describe('getMarketInfo', () => {
  it('returns info for existing plugin', () => {
    const info = marketplace.getMarketInfo(TEST_ROOT, 'ag-skill-docker-compose');
    expect(info).not.toBeNull();
    expect(info.version).toBe('1.0.0');
    expect(info.author).toBe('community');
  });

  it('returns null for non-existent plugin', () => {
    const info = marketplace.getMarketInfo(TEST_ROOT, 'non-existent');
    expect(info).toBeNull();
  });
});

describe('installFromMarket', () => {
  it('rejects non-existent plugin', () => {
    const result = marketplace.installFromMarket(TEST_ROOT, 'fake-plugin');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('rejects invalid repository URL', () => {
    // Add an entry with a bad URL
    const index = JSON.parse(fs.readFileSync(path.join(ENGINE_DIR, 'marketplace-index.json'), 'utf-8'));
    index.entries.push({
      name: 'bad-url-plugin',
      description: 'test',
      repository: 'ftp://evil.com/repo',
      version: '1.0.0',
      tags: [],
      author: 'evil',
    });
    fs.writeFileSync(path.join(ENGINE_DIR, 'marketplace-index.json'), JSON.stringify(index, null, 2), 'utf-8');

    const result = marketplace.installFromMarket(TEST_ROOT, 'bad-url-plugin');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid repository URL');
  });
});

describe('validateManifestPaths (D-6 + E-2)', () => {
  it('accepts valid relative paths', () => {
    const result = marketplace.validateManifestPaths({
      files: ['agents/my-agent.md', 'skills/my-skill/SKILL.md'],
    });
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('rejects absolute paths', () => {
    const result = marketplace.validateManifestPaths({
      files: ['/etc/passwd'],
    });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('Absolute path'))).toBe(true);
  });

  it('rejects path traversal with ..', () => {
    const result = marketplace.validateManifestPaths({
      files: ['../../etc/passwd'],
    });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('traversal'))).toBe(true);
  });

  it('rejects sandbox escape', () => {
    const result = marketplace.validateManifestPaths({
      file: '../../../secrets.json',
    });
    expect(result.valid).toBe(false);
  });
});

describe('updateRegistryIndex', () => {
  it('updates stale index', () => {
    // Set lastUpdated to 2 days ago
    const index = JSON.parse(fs.readFileSync(path.join(ENGINE_DIR, 'marketplace-index.json'), 'utf-8'));
    index.lastUpdated = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(path.join(ENGINE_DIR, 'marketplace-index.json'), JSON.stringify(index, null, 2), 'utf-8');

    const result = marketplace.updateRegistryIndex(TEST_ROOT);
    expect(result.updated).toBe(true);
    expect(result.entryCount).toBe(3);
  });

  it('skips fresh index', () => {
    // Index was just created in beforeEach with current timestamp
    const result = marketplace.updateRegistryIndex(TEST_ROOT);
    expect(result.updated).toBe(false);
  });

  it('force updates regardless of TTL', () => {
    const result = marketplace.updateRegistryIndex(TEST_ROOT, { force: true });
    expect(result.updated).toBe(true);
  });
});

describe('isIndexStale', () => {
  it('returns true for null timestamp', () => {
    expect(marketplace.isIndexStale(null)).toBe(true);
  });

  it('returns true for old timestamp', () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    expect(marketplace.isIndexStale(old)).toBe(true);
  });

  it('returns false for recent timestamp', () => {
    const recent = new Date().toISOString();
    expect(marketplace.isIndexStale(recent)).toBe(false);
  });
});
