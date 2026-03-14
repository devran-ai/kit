import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP_PROJECT = path.join(ROOT, 'tests', '.tmp-identity-test');
const ENGINE_DIR = path.join(TMP_PROJECT, '.agent', 'engine');

function setupTestProject() {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
}

function teardownTestProject() {
  if (fs.existsSync(TMP_PROJECT)) {
    fs.rmSync(TMP_PROJECT, { recursive: true });
  }
}

async function loadIdentity() {
  const modulePath = path.join(ROOT, 'lib', 'identity.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('Developer Identity System', () => {
  beforeEach(() => { setupTestProject(); });
  afterEach(() => { teardownTestProject(); });

  it('should register a new identity', async () => {
    const identity = await loadIdentity();
    const result = identity.registerIdentity(TMP_PROJECT, {
      name: 'Test User',
      email: 'test@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.isNew).toBe(true);
    expect(result.identity.name).toBe('Test User');
    expect(result.identity.email).toBe('test@example.com');
    expect(result.identity.role).toBe('owner'); // First user becomes owner
    expect(result.identity.id).toHaveLength(12);
  });

  it('should generate deterministic IDs from email', async () => {
    const identity = await loadIdentity();
    const id1 = identity.generateDeveloperId('test@example.com');
    const id2 = identity.generateDeveloperId('test@example.com');
    const id3 = identity.generateDeveloperId('other@example.com');

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toHaveLength(12);
  });

  it('should set second developer as contributor', async () => {
    const identity = await loadIdentity();
    identity.registerIdentity(TMP_PROJECT, { name: 'Owner', email: 'owner@test.com' });
    const result = identity.registerIdentity(TMP_PROJECT, { name: 'Dev', email: 'dev@test.com' });

    expect(result.identity.role).toBe('contributor');
  });

  it('should update existing identity on re-register', async () => {
    const identity = await loadIdentity();
    identity.registerIdentity(TMP_PROJECT, { name: 'Old Name', email: 'test@example.com' });
    const result = identity.registerIdentity(TMP_PROJECT, { name: 'New Name', email: 'test@example.com' });

    expect(result.isNew).toBe(false);
    expect(result.identity.name).toBe('New Name');
  });

  it('should validate a registered identity', async () => {
    const identity = await loadIdentity();
    const { identity: dev } = identity.registerIdentity(TMP_PROJECT, {
      name: 'Valid User',
      email: 'valid@test.com',
    });

    const validation = identity.validateIdentity(dev.id, TMP_PROJECT);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject validation of non-existent identity', async () => {
    const identity = await loadIdentity();
    const validation = identity.validateIdentity('nonexistent', TMP_PROJECT);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should list all registered identities', async () => {
    const identity = await loadIdentity();
    identity.registerIdentity(TMP_PROJECT, { name: 'User 1', email: 'u1@test.com' });
    identity.registerIdentity(TMP_PROJECT, { name: 'User 2', email: 'u2@test.com' });

    const { developers } = identity.listIdentities(TMP_PROJECT);
    expect(developers).toHaveLength(2);
  });

  it('should detect identity from git config', async () => {
    const identity = await loadIdentity();
    const gitInfo = identity.detectFromGit();

    // Git config should be available in this repo
    if (gitInfo) {
      expect(gitInfo.name).toBeTruthy();
      expect(gitInfo.email).toBeTruthy();
    }
  });
});
