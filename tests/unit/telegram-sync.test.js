import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import path from 'path';
import fs from 'fs';

const {
  extractFrontmatter,
  extractFrontmatterField,
  formatCommand,
  getPriority,
  buildCommandList,
  readBotToken,
  scanDirectory,
  validateBotToken,
  validateScope,
  pushToTelegram,
  deleteFromTelegram,
  pushToAllScopes,
  clearAllScopes,
  syncBotCommands,
  guardPrivateChat,
  cacheCommands,
  readCachedCommands,
  getCachePath,
  readAllowedUsers,
  MAX_COMMANDS,
  MAX_COMMAND_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  VALID_SCOPES,
  DEFAULT_SCOPE,
  PLUGIN_BASE_COMMANDS,
  GUARD_DELAY_MS,
  CACHE_FILENAME,
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

  it('extracts args from frontmatter', () => {
    const file = path.join(tmpDir, 'pr-review.md');
    fs.writeFileSync(file, '---\ndescription: Review a pull request\nargs: "PR #"\n---\n');
    const result = extractFrontmatter(file);
    expect(result).toEqual({ name: 'pr-review', description: 'Review a pull request', args: 'PR #' });
  });

  it('returns no args field when args not in frontmatter', () => {
    const file = path.join(tmpDir, 'status.md');
    fs.writeFileSync(file, '---\ndescription: Show status\n---\n');
    const result = extractFrontmatter(file);
    expect(result).toEqual({ name: 'status', description: 'Show status' });
    expect(result).not.toHaveProperty('args');
  });

  it('extracts unquoted args', () => {
    const file = path.join(tmpDir, 'deploy.md');
    fs.writeFileSync(file, '---\ndescription: Deploy app\nargs: environment\n---\n');
    const result = extractFrontmatter(file);
    expect(result.args).toBe('environment');
  });
});

// ---------------------------------------------------------------------------
// extractFrontmatterField
// ---------------------------------------------------------------------------

describe('extractFrontmatterField', () => {
  it('extracts unquoted value', () => {
    const lines = ['description: Some text', 'version: 1.0'];
    expect(extractFrontmatterField(lines, 'description')).toBe('Some text');
  });

  it('extracts quoted value and strips quotes', () => {
    const lines = ['description: "Quoted text"'];
    expect(extractFrontmatterField(lines, 'description')).toBe('Quoted text');
  });

  it('returns null for missing key', () => {
    const lines = ['description: text'];
    expect(extractFrontmatterField(lines, 'args')).toBeNull();
  });

  it('returns null for empty value', () => {
    const lines = ['args:'];
    expect(extractFrontmatterField(lines, 'args')).toBeNull();
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
    expect(getPriority('project-status')).toBe(3);
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
    fs.writeFileSync(path.join(workflowDir, 'project-status.md'), '---\ndescription: Project status overview\n---\n');
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
    // project-status (3) and review (3) should come before brainstorm (1) and custom (0)
    const names = commands.map(c => c.command);
    const reviewIdx = names.indexOf('review');
    const statusIdx = names.indexOf('project-status');
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

  it('appends args hint to description when args present', () => {
    fs.writeFileSync(
      path.join(workflowDir, 'pr-review.md'),
      '---\ndescription: Review a pull request\nargs: "PR #"\n---\n'
    );
    const commands = buildCommandList(tmpDir);
    const prReview = commands.find(c => c.command === 'pr_review');
    expect(prReview).toBeDefined();
    expect(prReview.description).toBe('Review a pull request (+ PR #)');
  });

  it('does not append args hint when args not present', () => {
    const commands = buildCommandList(tmpDir);
    const status = commands.find(c => c.command === 'project_status');
    expect(status).toBeDefined();
    expect(status.description).not.toContain('(+');
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
// validateScope
// ---------------------------------------------------------------------------

describe('validateScope', () => {
  it('accepts all valid scope types', () => {
    for (const scope of VALID_SCOPES) {
      expect(validateScope(scope)).toEqual({ valid: true });
    }
  });

  it('rejects null/undefined', () => {
    expect(validateScope(null).valid).toBe(false);
    expect(validateScope(undefined).valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateScope('').valid).toBe(false);
  });

  it('rejects invalid scope type', () => {
    const result = validateScope('chat');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid scope');
  });

  it('rejects non-string input', () => {
    expect(validateScope(42).valid).toBe(false);
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

  it('includes default scope in request body when no scope provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await pushToTelegram(validToken, commands);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.scope).toEqual({ type: 'all_private_chats' });
  });

  it('includes explicit scope in request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await pushToTelegram(validToken, commands, 'all_group_chats');
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.scope).toEqual({ type: 'all_group_chats' });
  });

  it('wraps default scope type as object', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await pushToTelegram(validToken, commands, 'default');
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.scope).toEqual({ type: 'default' });
  });

  it('rejects invalid scope without calling API', async () => {
    const result = await pushToTelegram(validToken, commands, 'invalid_scope');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid scope');
  });

  it('supports chat scope with chat_id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await pushToTelegram(validToken, commands, 'chat', { chat_id: '12345' });
    expect(result.success).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.scope).toEqual({ type: 'chat', chat_id: '12345' });
  });

  it('rejects chat scope without chat_id', async () => {
    const result = await pushToTelegram(validToken, commands, 'chat');
    expect(result.success).toBe(false);
    expect(result.message).toContain('chat_id');
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

  it('calls API with provided token for single scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    }));
    const result = await syncBotCommands(tmpDir, {
      token: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345',
      scope: 'all_private_chats',
    });
    expect(result.success).toBe(true);
    expect(result.commands.length).toBe(2);
    expect(result.scopeResults).toHaveLength(1);
  });

  it('passes explicit scope through to pushToTelegram', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await syncBotCommands(tmpDir, {
      token: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345',
      scope: 'all_group_chats',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.scope).toEqual({ type: 'all_group_chats' });
  });

  it('pushes to all 4 scopes when no scope specified (default)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await syncBotCommands(tmpDir, {
      token: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345',
    });
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.success).toBe(true);
    expect(result.scopeResults).toHaveLength(4);
    const scopes = result.scopeResults.map(r => r.scope).sort();
    expect(scopes).toEqual([...VALID_SCOPES].sort());
  });

  it('reports partial failure when one scope fails', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve({ json: () => Promise.resolve({ ok: false, error_code: 400, description: 'Bad Request' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await syncBotCommands(tmpDir, {
      token: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345',
    });
    expect(result.success).toBe(false);
    expect(result.scopeResults.filter(r => r.success)).toHaveLength(3);
    expect(result.scopeResults.filter(r => !r.success)).toHaveLength(1);
  });

  it('shows all scopes in dry-run message when no scope specified', async () => {
    const result = await syncBotCommands(tmpDir, { dryRun: true });
    expect(result.message).toContain('scope: all');
    for (const scope of VALID_SCOPES) {
      expect(result.message).toContain(scope);
    }
  });

  it('shows single scope in dry-run message', async () => {
    const result = await syncBotCommands(tmpDir, { dryRun: true, scope: 'all_group_chats' });
    expect(result.message).toContain('scope: all_group_chats');
  });

  it('clears commands for single scope', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await syncBotCommands(tmpDir, {
      token: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345',
      clear: true,
      scope: 'default',
    });
    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(0);
    expect(result.scopeResults).toHaveLength(1);
    expect(result.scopeResults[0].scope).toBe('default');
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/deleteMyCommands');
  });

  it('clears commands from all scopes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await syncBotCommands(tmpDir, {
      token: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345',
      clear: true,
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.scopeResults).toHaveLength(4);
  });

  it('clear mode returns error without token', async () => {
    const origHome = process.env.HOME;
    const origUserProfile = process.env.USERPROFILE;
    delete process.env.TELEGRAM_BOT_TOKEN;
    process.env.HOME = '/nonexistent';
    process.env.USERPROFILE = '/nonexistent';
    try {
      const result = await syncBotCommands(tmpDir, { clear: true });
      expect(result.success).toBe(false);
      expect(result.message).toContain('No bot token');
    } finally {
      process.env.HOME = origHome;
      process.env.USERPROFILE = origUserProfile;
    }
  });
});

// ---------------------------------------------------------------------------
// deleteFromTelegram
// ---------------------------------------------------------------------------

describe('deleteFromTelegram', () => {
  const validToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid token without calling API', async () => {
    const result = await deleteFromTelegram('bad');
    expect(result.success).toBe(false);
  });

  it('calls deleteMyCommands endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await deleteFromTelegram(validToken, 'default');
    expect(mockFetch.mock.calls[0][0]).toContain('/deleteMyCommands');
  });

  it('returns success on ok: true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    }));
    const result = await deleteFromTelegram(validToken, 'all_private_chats');
    expect(result.success).toBe(true);
    expect(result.message).toContain('Cleared');
  });

  it('returns error on ok: false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: false, error_code: 401, description: 'Unauthorized' }),
    }));
    const result = await deleteFromTelegram(validToken, 'default');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unauthorized');
  });

  it('rejects invalid scope', async () => {
    const result = await deleteFromTelegram(validToken, 'invalid');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid scope');
  });

  it('sends scope in request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await deleteFromTelegram(validToken, 'all_group_chats');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.scope).toEqual({ type: 'all_group_chats' });
  });
});

// ---------------------------------------------------------------------------
// pushToAllScopes
// ---------------------------------------------------------------------------

describe('pushToAllScopes', () => {
  const validToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345';
  const commands = [{ command: 'test', description: 'Test' }];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('makes 4 API calls (one per scope)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const { results, allSuccess } = await pushToAllScopes(validToken, commands);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(allSuccess).toBe(true);
    expect(results).toHaveLength(4);
  });

  it('returns allSuccess false when any scope fails', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ json: () => Promise.resolve({ ok: false, error_code: 400 }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
    }));
    const { results, allSuccess } = await pushToAllScopes(validToken, commands);
    expect(allSuccess).toBe(false);
    expect(results.filter(r => r.success)).toHaveLength(3);
  });

  it('each result has scope field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    }));
    const { results } = await pushToAllScopes(validToken, commands);
    const scopes = results.map(r => r.scope).sort();
    expect(scopes).toEqual([...VALID_SCOPES].sort());
  });

  it('fails fast with invalid token', async () => {
    const { results, allSuccess } = await pushToAllScopes('bad', commands);
    expect(allSuccess).toBe(false);
    expect(results.every(r => !r.success)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// clearAllScopes
// ---------------------------------------------------------------------------

describe('clearAllScopes', () => {
  const validToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('makes 4 delete calls', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const { results, allSuccess } = await clearAllScopes(validToken);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(allSuccess).toBe(true);
    expect(results).toHaveLength(4);
    for (const call of mockFetch.mock.calls) {
      expect(call[0]).toContain('/deleteMyCommands');
    }
  });

  it('fails fast with invalid token', async () => {
    const { allSuccess } = await clearAllScopes('bad');
    expect(allSuccess).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants (new)
// ---------------------------------------------------------------------------

describe('PLUGIN_BASE_COMMANDS', () => {
  it('contains start and help commands', () => {
    expect(PLUGIN_BASE_COMMANDS).toEqual([
      { command: 'start', description: 'Welcome and setup guide' },
      { command: 'help', description: 'What this bot can do' },
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(PLUGIN_BASE_COMMANDS)).toBe(true);
  });
});

describe('GUARD_DELAY_MS', () => {
  it('is 8000ms', () => {
    expect(GUARD_DELAY_MS).toBe(8000);
  });
});

describe('CACHE_FILENAME', () => {
  it('equals bot-menu-cache.json', () => {
    expect(CACHE_FILENAME).toBe('bot-menu-cache.json');
  });
});

// ---------------------------------------------------------------------------
// getCachePath
// ---------------------------------------------------------------------------

describe('getCachePath', () => {
  it('returns path under .claude/channels/telegram/', () => {
    const result = getCachePath();
    expect(result).toContain('.claude');
    expect(result).toContain('channels');
    expect(result).toContain('telegram');
    expect(result).toContain('bot-menu-cache.json');
  });
});

// ---------------------------------------------------------------------------
// cacheCommands
// ---------------------------------------------------------------------------

describe('cacheCommands', () => {
  const tmpDir = path.join(__dirname, '__tmp_cache_test__');
  let originalHome;

  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'channels', 'telegram'), { recursive: true });
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    // Also set USERPROFILE for Windows
    process.env.USERPROFILE = tmpDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes cache file with merged commands', () => {
    const commands = [
      { command: 'plan', description: 'Create plan' },
      { command: 'debug', description: 'Debug mode' },
    ];
    const result = cacheCommands(commands);
    expect(result.success).toBe(true);
    expect(result.count).toBe(4); // 2 plugin + 2 workflow

    const cached = JSON.parse(fs.readFileSync(result.path, 'utf-8'));
    expect(cached.version).toBe(1);
    expect(cached.commands).toHaveLength(4);
    expect(cached.commands[0].command).toBe('start');
    expect(cached.commands[1].command).toBe('help');
    expect(cached.commands[2].command).toBe('plan');
    expect(cached.commands[3].command).toBe('debug');
  });

  it('skips plugin commands that already exist in workflows', () => {
    const commands = [
      { command: 'start', description: 'Custom start' },
      { command: 'plan', description: 'Create plan' },
    ];
    const result = cacheCommands(commands);
    // existingNames = {start, plan}, so only 'help' from plugin base is added
    // merged = [help, start(custom), plan] = 3
    expect(result.count).toBe(3);
    const cached = JSON.parse(fs.readFileSync(result.path, 'utf-8'));
    expect(cached.commands).toHaveLength(3);
    expect(cached.commands[0].command).toBe('help');
    expect(cached.commands[1].command).toBe('start');
    expect(cached.commands[1].description).toBe('Custom start');
  });

  it('includes timestamp in cache', () => {
    cacheCommands([{ command: 'test', description: 'Test' }]);
    const cached = JSON.parse(fs.readFileSync(getCachePath(), 'utf-8'));
    expect(cached.timestamp).toBeDefined();
    expect(new Date(cached.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('creates directories if missing', () => {
    // Remove the pre-created dirs
    fs.rmSync(path.join(tmpDir, '.claude'), { recursive: true, force: true });
    const result = cacheCommands([{ command: 'x', description: 'x' }]);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// readCachedCommands
// ---------------------------------------------------------------------------

describe('readCachedCommands', () => {
  const tmpDir = path.join(__dirname, '__tmp_read_cache_test__');
  let originalHome;

  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'channels', 'telegram'), { recursive: true });
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    process.env.USERPROFILE = tmpDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads valid cache', () => {
    const cache = {
      version: 1,
      timestamp: new Date().toISOString(),
      commandCount: 2,
      commands: [
        { command: 'plan', description: 'Plan' },
        { command: 'test', description: 'Test' },
      ],
    };
    fs.writeFileSync(getCachePath(), JSON.stringify(cache), 'utf-8');
    const result = readCachedCommands();
    expect(result).not.toBeNull();
    expect(result.commands).toHaveLength(2);
  });

  it('returns null for missing cache', () => {
    const result = readCachedCommands();
    expect(result).toBeNull();
  });

  it('returns null for empty commands array', () => {
    fs.writeFileSync(getCachePath(), JSON.stringify({ commands: [] }), 'utf-8');
    expect(readCachedCommands()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    fs.writeFileSync(getCachePath(), 'not json', 'utf-8');
    expect(readCachedCommands()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// guardPrivateChat
// ---------------------------------------------------------------------------

describe('guardPrivateChat', () => {
  const validToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345';
  const tmpDir = path.join(__dirname, '__tmp_guard_test__');
  let originalHome;

  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'channels', 'telegram'), { recursive: true });
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    process.env.USERPROFILE = tmpDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalHome;
    delete process.env.TELEGRAM_BOT_TOKEN;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('fails when no cache exists', async () => {
    const result = await guardPrivateChat({ token: validToken });
    expect(result.success).toBe(false);
    expect(result.message).toContain('No cached commands');
  });

  it('fails when no token available', async () => {
    // Create cache
    cacheCommands([{ command: 'plan', description: 'Plan' }]);
    const result = await guardPrivateChat();
    expect(result.success).toBe(false);
    expect(result.message).toContain('No bot token');
  });

  it('uses chat scope when access.json has users', async () => {
    cacheCommands([{ command: 'plan', description: 'Plan' }]);
    // Write access.json with a user
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'channels', 'telegram', 'access.json'),
      JSON.stringify({ allowFrom: ['12345'] }),
      'utf-8'
    );
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await guardPrivateChat({ token: validToken });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.scope.type).toBe('chat');
    expect(body.scope.chat_id).toBe('12345');
  });

  it('pushes to multiple users from access.json', async () => {
    cacheCommands([{ command: 'plan', description: 'Plan' }]);
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'channels', 'telegram', 'access.json'),
      JSON.stringify({ allowFrom: ['111', '222', '333'] }),
      'utf-8'
    );
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await guardPrivateChat({ token: validToken });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.message).toContain('3 user(s)');
  });

  it('falls back to all_private_chats when no access.json', async () => {
    cacheCommands([{ command: 'plan', description: 'Plan' }]);
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await guardPrivateChat({ token: validToken });
    expect(result.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.scope.type).toBe('all_private_chats');
  });

  it('reads token from environment when not provided', async () => {
    cacheCommands([{ command: 'test', description: 'Test' }]);
    process.env.TELEGRAM_BOT_TOKEN = validToken;
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await guardPrivateChat();
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// readAllowedUsers
// ---------------------------------------------------------------------------

describe('readAllowedUsers', () => {
  const tmpDir = path.join(__dirname, '__tmp_allowed_test__');
  let originalHome;

  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'channels', 'telegram'), { recursive: true });
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    process.env.USERPROFILE = tmpDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads user IDs from access.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'channels', 'telegram', 'access.json'),
      JSON.stringify({ allowFrom: ['111', '222'] }),
      'utf-8'
    );
    const users = readAllowedUsers();
    expect(users).toEqual(['111', '222']);
  });

  it('returns empty array when access.json missing', () => {
    expect(readAllowedUsers()).toEqual([]);
  });

  it('returns empty array when allowFrom missing', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'channels', 'telegram', 'access.json'),
      JSON.stringify({ dmPolicy: 'open' }),
      'utf-8'
    );
    expect(readAllowedUsers()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// syncBotCommands — auto-caching
// ---------------------------------------------------------------------------

describe('syncBotCommands auto-caching', () => {
  const validToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345';
  const tmpDir = path.join(__dirname, '__tmp_sync_cache_test__');
  const projectDir = path.join(tmpDir, 'project');
  let originalHome;

  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'channels', 'telegram'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.agent', 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, '.agent', 'workflows', 'plan.md'),
      '---\ndescription: Create plan\n---\n'
    );
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    process.env.USERPROFILE = tmpDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('caches commands after successful sync', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await syncBotCommands(projectDir, { token: validToken });

    const cache = readCachedCommands();
    expect(cache).not.toBeNull();
    expect(cache.commands.length).toBeGreaterThanOrEqual(1);
  });

  it('caches commands after single-scope sync', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await syncBotCommands(projectDir, { token: validToken, scope: 'default' });

    const cache = readCachedCommands();
    expect(cache).not.toBeNull();
  });

  it('does not cache on dry run', async () => {
    await syncBotCommands(projectDir, { token: validToken, dryRun: true });
    expect(readCachedCommands()).toBeNull();
  });
});
