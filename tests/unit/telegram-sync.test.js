import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import path from 'path';
import fs from 'fs';

const {
  extractFrontmatter,
  formatCommand,
  getPriority,
  buildCommandList,
  readBotToken,
  scanDirectory,
  validateBotToken,
  pushToTelegram,
  syncBotCommands,
  MAX_COMMANDS,
  MAX_COMMAND_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} = require('../../lib/telegram-sync');

// ---------------------------------------------------------------------------
// extractFrontmatter
// ---------------------------------------------------------------------------

describe('extractFrontmatter', () => {
  const tmpDir = path.join(__dirname, '__tmp_tg_test__');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts description from YAML frontmatter', () => {
    const file = path.join(tmpDir, 'review.md');
    fs.writeFileSync(file, '---\ndescription: Code review pipeline\n---\n# Review');
    const result = extractFrontmatter(file);
    expect(result).toEqual({ name: 'review', description: 'Code review pipeline' });
  });

  it('extracts quoted description', () => {
    const file = path.join(tmpDir, 'plan.md');
    fs.writeFileSync(file, '---\ndescription: "Create implementation plan"\n---\n# Plan');
    const result = extractFrontmatter(file);
    expect(result).toEqual({ name: 'plan', description: 'Create implementation plan' });
  });

  it('returns null for README.md', () => {
    const file = path.join(tmpDir, 'README.md');
    fs.writeFileSync(file, '# README\nSome content');
    expect(extractFrontmatter(file)).toBeNull();
  });

  it('falls back to first content line when no frontmatter', () => {
    const file = path.join(tmpDir, 'debug.md');
    fs.writeFileSync(file, '# Debug\nSystematic debugging workflow');
    const result = extractFrontmatter(file);
    expect(result).toEqual({ name: 'debug', description: 'Systematic debugging workflow' });
  });

  it('generates default description for empty-ish files', () => {
    const file = path.join(tmpDir, 'empty.md');
    fs.writeFileSync(file, '# Empty\n');
    const result = extractFrontmatter(file);
    expect(result).toEqual({ name: 'empty', description: 'Run /empty workflow' });
  });

  it('returns null for non-existent files', () => {
    expect(extractFrontmatter('/nonexistent/file.md')).toBeNull();
  });

  it('handles empty description gracefully', () => {
    const file = path.join(tmpDir, 'nodesc.md');
    fs.writeFileSync(file, '---\ndescription:\nversion: 1.0\n---\n# No Desc');
    const result = extractFrontmatter(file);
    // Empty description falls through to fallback
    expect(result).not.toBeNull();
    expect(result.name).toBe('nodesc');
  });
});

// ---------------------------------------------------------------------------
// formatCommand
// ---------------------------------------------------------------------------

describe('formatCommand', () => {
  it('converts hyphens to underscores', () => {
    expect(formatCommand('pr-review')).toBe('pr_review');
  });

  it('converts to lowercase', () => {
    expect(formatCommand('PR-Review')).toBe('pr_review');
  });

  it('removes special characters', () => {
    expect(formatCommand('ui-ux-pro-max!')).toBe('ui_ux_pro_max');
  });

  it('truncates to MAX_COMMAND_LENGTH', () => {
    const long = 'a'.repeat(50);
    expect(formatCommand(long).length).toBeLessThanOrEqual(MAX_COMMAND_LENGTH);
  });

  it('handles simple names', () => {
    expect(formatCommand('status')).toBe('status');
  });

  it('returns null for names with only special chars', () => {
    expect(formatCommand('!@#$%')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPriority
// ---------------------------------------------------------------------------

describe('getPriority', () => {
  it('returns 3 for critical workflows', () => {
    expect(getPriority('status')).toBe(3);
    expect(getPriority('review')).toBe(3);
    expect(getPriority('plan')).toBe(3);
  });

  it('returns 2 for high-priority workflows', () => {
    expect(getPriority('create')).toBe(2);
    expect(getPriority('deploy')).toBe(2);
    expect(getPriority('pr-review')).toBe(2);
  });

  it('returns 1 for medium-priority workflows', () => {
    expect(getPriority('brainstorm')).toBe(1);
    expect(getPriority('orchestrate')).toBe(1);
  });

  it('returns 0 for unknown workflows', () => {
    expect(getPriority('custom-workflow')).toBe(0);
    expect(getPriority('my-thing')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildCommandList
// ---------------------------------------------------------------------------

describe('buildCommandList', () => {
  const tmpDir = path.join(__dirname, '__tmp_tg_build__');
  const workflowDir = path.join(tmpDir, '.agent', 'workflows');

  beforeEach(() => {
    fs.mkdirSync(workflowDir, { recursive: true });
    // Create test workflows
    fs.writeFileSync(path.join(workflowDir, 'status.md'), '---\ndescription: Project status overview\n---\n');
    fs.writeFileSync(path.join(workflowDir, 'review.md'), '---\ndescription: Code review pipeline\n---\n');
    fs.writeFileSync(path.join(workflowDir, 'brainstorm.md'), '---\ndescription: Structured brainstorming\n---\n');
    fs.writeFileSync(path.join(workflowDir, 'custom.md'), '---\ndescription: Custom workflow\n---\n');
    fs.writeFileSync(path.join(workflowDir, 'README.md'), '# Workflows README');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('scans workflows and returns formatted commands', () => {
    const commands = buildCommandList(tmpDir);
    expect(commands.length).toBe(4); // 4 workflows (README excluded)
  });

  it('sorts by priority (critical first)', () => {
    const commands = buildCommandList(tmpDir);
    // status (3) and review (3) should come before brainstorm (1) and custom (0)
    const names = commands.map(c => c.command);
    const reviewIdx = names.indexOf('review');
    const statusIdx = names.indexOf('status');
    const brainstormIdx = names.indexOf('brainstorm');
    expect(reviewIdx).toBeLessThan(brainstormIdx);
    expect(statusIdx).toBeLessThan(brainstormIdx);
  });

  it('respects limit option', () => {
    const commands = buildCommandList(tmpDir, { limit: 2 });
    expect(commands.length).toBe(2);
  });

  it('excludes README.md', () => {
    const commands = buildCommandList(tmpDir);
    const names = commands.map(c => c.command);
    expect(names).not.toContain('readme');
  });

  it('formats commands with underscores', () => {
    fs.writeFileSync(path.join(workflowDir, 'pr-review.md'), '---\ndescription: PR review\n---\n');
    const commands = buildCommandList(tmpDir);
    const names = commands.map(c => c.command);
    expect(names).toContain('pr_review');
  });

  it('truncates descriptions to MAX_DESCRIPTION_LENGTH', () => {
    const longDesc = 'A'.repeat(300);
    fs.writeFileSync(path.join(workflowDir, 'long.md'), `---\ndescription: ${longDesc}\n---\n`);
    const commands = buildCommandList(tmpDir);
    const longCmd = commands.find(c => c.command === 'long');
    expect(longCmd.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
  });

  it('filters out workflows with invalid command names', () => {
    fs.writeFileSync(path.join(workflowDir, '!!!.md'), '---\ndescription: Bad name\n---\n');
    const commands = buildCommandList(tmpDir);
    const names = commands.map(c => c.command);
    expect(names).not.toContain('');
    expect(names).not.toContain(null);
  });

  it('clamps limit to valid range', () => {
    const cmds0 = buildCommandList(tmpDir, { limit: 0 });
    expect(cmds0.length).toBe(1); // clamp to min 1

    const cmds200 = buildCommandList(tmpDir, { limit: 200 });
    expect(cmds200.length).toBeLessThanOrEqual(MAX_COMMANDS);
  });

  it('validates source option fallback', () => {
    const commands = buildCommandList(tmpDir, { source: 'invalid' });
    // Falls back to 'workflows'
    expect(commands.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// scanDirectory
// ---------------------------------------------------------------------------

describe('scanDirectory', () => {
  it('returns empty array for non-existent directory', () => {
    expect(scanDirectory('/nonexistent/path')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// readBotToken
// ---------------------------------------------------------------------------

describe('readBotToken', () => {
  const tmpDir = path.join(__dirname, '__tmp_tg_token__');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it('reads from TELEGRAM_BOT_TOKEN env var', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token-123';
    expect(readBotToken()).toBe('test-token-123');
  });

  it('reads from .env file', () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'TELEGRAM_BOT_TOKEN=file-token-456');
    expect(readBotToken(envFile)).toBe('file-token-456');
  });

  it('trims whitespace from env var', () => {
    process.env.TELEGRAM_BOT_TOKEN = '  test-token-trimmed  ';
    expect(readBotToken()).toBe('test-token-trimmed');
  });

  it('ignores inline comments in .env', () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'TELEGRAM_BOT_TOKEN=token123 # this is a comment');
    expect(readBotToken(envFile)).toBe('token123');
  });

  it('returns null when env var unset and file missing', () => {
    const origHome = process.env.HOME;
    const origUserProfile = process.env.USERPROFILE;
    process.env.HOME = '/nonexistent';
    process.env.USERPROFILE = '/nonexistent';
    try {
      expect(readBotToken('/nonexistent/.env')).toBeNull();
    } finally {
      process.env.HOME = origHome;
      process.env.USERPROFILE = origUserProfile;
    }
  });
});

// ---------------------------------------------------------------------------
// validateBotToken
// ---------------------------------------------------------------------------

describe('validateBotToken', () => {
  it('accepts valid token format', () => {
    expect(validateBotToken('123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345')).toEqual({ valid: true });
  });

  it('rejects null/undefined', () => {
    expect(validateBotToken(null).valid).toBe(false);
    expect(validateBotToken(undefined).valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateBotToken('').valid).toBe(false);
  });

  it('rejects token without colon', () => {
    expect(validateBotToken('invalid-token').valid).toBe(false);
  });

  it('rejects short token', () => {
    expect(validateBotToken('1:ab').valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pushToTelegram (mocked fetch)
// ---------------------------------------------------------------------------

describe('pushToTelegram', () => {
  const validToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345';
  const commands = [{ command: 'test', description: 'Test command' }];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid token without calling API', async () => {
    const result = await pushToTelegram('bad', commands);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid token');
  });

  it('returns success on ok: true response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    }));
    const result = await pushToTelegram(validToken, commands);
    expect(result.success).toBe(true);
    expect(result.commandCount).toBe(1);
  });

  it('returns error on ok: false response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      json: () => Promise.resolve({ ok: false, error_code: 401, description: 'Unauthorized' }),
    }));
    const result = await pushToTelegram(validToken, commands);
    expect(result.success).toBe(false);
    expect(result.message).toContain('401');
  });

  it('handles network errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await pushToTelegram(validToken, commands);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Network error');
  });

  it('handles invalid JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    }));
    const result = await pushToTelegram(validToken, commands);
    expect(result.success).toBe(false);
    expect(result.message).toContain('invalid JSON');
  });
});

// ---------------------------------------------------------------------------
// syncBotCommands
// ---------------------------------------------------------------------------

describe('syncBotCommands', () => {
  const tmpDir = path.join(__dirname, '__tmp_tg_sync__');
  const workflowDir = path.join(tmpDir, '.agent', 'workflows');

  beforeEach(() => {
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(path.join(workflowDir, 'status.md'), '---\ndescription: Project status\n---\n');
    fs.writeFileSync(path.join(workflowDir, 'review.md'), '---\ndescription: Code review\n---\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns commands in dry-run mode without calling API', async () => {
    const result = await syncBotCommands(tmpDir, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.commands.length).toBe(2);
    expect(result.message).toContain('Dry run');
  });

  it('returns error when no workflows found', async () => {
    const emptyDir = path.join(tmpDir, 'empty');
    fs.mkdirSync(path.join(emptyDir, '.agent', 'workflows'), { recursive: true });
    const result = await syncBotCommands(emptyDir);
    expect(result.success).toBe(false);
    expect(result.message).toContain('No workflows');
  });

  it('returns error when no token available', async () => {
    const origHome = process.env.HOME;
    const origUserProfile = process.env.USERPROFILE;
    delete process.env.TELEGRAM_BOT_TOKEN;
    process.env.HOME = '/nonexistent';
    process.env.USERPROFILE = '/nonexistent';
    try {
      const result = await syncBotCommands(tmpDir);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No bot token');
    } finally {
      process.env.HOME = origHome;
      process.env.USERPROFILE = origUserProfile;
    }
  });

  it('calls API with provided token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    }));
    const result = await syncBotCommands(tmpDir, {
      token: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345',
    });
    expect(result.success).toBe(true);
    expect(result.commands.length).toBe(2);
  });
});
