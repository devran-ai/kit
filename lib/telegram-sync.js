/**
 * Telegram Bot Menu Command Sync
 *
 * Scans .agent/workflows/ and .agent/commands/ for frontmatter descriptions,
 * then pushes them to the Telegram Bot API via setMyCommands.
 *
 * Requires: Node.js 18.0.0+ (native fetch API)
 *
 * Telegram limits: max 100 commands, each command max 32 chars,
 * description max 256 chars.
 *
 * @module telegram-sync
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants (frozen — immutable at runtime)
// ---------------------------------------------------------------------------

/** @type {number} Telegram maximum commands per bot */
const MAX_COMMANDS = 100;
/** @type {number} Telegram max command name length */
const MAX_COMMAND_LENGTH = 32;
/** @type {number} Telegram max description length */
const MAX_DESCRIPTION_LENGTH = 256;
/** @type {number} API request timeout in milliseconds */
const API_TIMEOUT_MS = 10000;
/** @type {RegExp} Telegram bot token format: {numeric-id}:{alphanumeric-secret} */
const BOT_TOKEN_PATTERN = /^\d{5,}:[A-Za-z0-9_]{30,}$/;

/** @type {readonly string[]} Valid Telegram bot command scope types */
const VALID_SCOPES = Object.freeze([
  'default',
  'all_private_chats',
  'all_group_chats',
  'all_chat_administrators',
]);

/** @type {string} Default scope — matches Telegram plugin's DM scope for override */
const DEFAULT_SCOPE = 'all_private_chats';

/** @type {string} Chat-specific scope — overrides all_private_chats, immune to plugin overwrite */
const CHAT_SCOPE = 'chat';

/**
 * Plugin base commands — hardcoded by claude-plugins-official/telegram plugin.
 * Merged into the cached command list so they remain visible after guard restore.
 * @type {readonly Array<{ command: string, description: string }>}
 */
const PLUGIN_BASE_COMMANDS = Object.freeze([
  { command: 'start', description: 'Welcome and setup guide' },
  { command: 'help', description: 'What this bot can do' },
]);

/** @type {number} Guard delay in ms — waits for plugin onStart to complete */
const GUARD_DELAY_MS = 8000;

/** @type {string} Cache filename for guard script */
const CACHE_FILENAME = 'bot-menu-cache.json';

/**
 * Priority tiers for workflow sorting.
 * Higher tier = shown first when truncating to fit Telegram limit.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
const PRIORITY_TIERS = Object.freeze({
  critical: Object.freeze(['status', 'review', 'plan', 'test', 'pr', 'debug']),
  high: Object.freeze(['create', 'deploy', 'pr-review', 'pr-fix', 'preflight', 'enhance']),
  medium: Object.freeze(['brainstorm', 'orchestrate', 'retrospective', 'pr-merge', 'pr-split', 'upgrade']),
  low: Object.freeze(['quality-gate', 'ui-ux-pro-max', 'preview']),
});

// Pre-compute priority map for O(1) lookup (vs O(n) array.includes)
/** @type {Map<string, number>} */
const _priorityMap = new Map();
for (const [tier, names] of Object.entries(PRIORITY_TIERS)) {
  const score = tier === 'critical' ? 3 : tier === 'high' ? 2 : tier === 'medium' ? 1 : 0;
  for (const name of names) {
    _priorityMap.set(name, score);
  }
}

// ---------------------------------------------------------------------------
// Token Validation
// ---------------------------------------------------------------------------

/**
 * Validate Telegram bot token format.
 * @param {string} token - Token to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateBotToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Bot token is required' };
  }
  if (!token.includes(':')) {
    return { valid: false, error: 'Invalid token format — expected {bot-id}:{secret}' };
  }
  if (!BOT_TOKEN_PATTERN.test(token)) {
    return { valid: false, error: 'Invalid token format — does not match Telegram pattern' };
  }
  return { valid: true };
}

/**
 * Validate Telegram bot command scope type.
 * @param {string} scope - Scope type to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateScope(scope) {
  if (!scope || typeof scope !== 'string') {
    return { valid: false, error: 'Scope is required and must be a string' };
  }
  if (!VALID_SCOPES.includes(scope)) {
    return { valid: false, error: `Invalid scope "${scope}". Must be one of: ${VALID_SCOPES.join(', ')}` };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Frontmatter Extraction
// ---------------------------------------------------------------------------

/**
 * Extract a YAML frontmatter value by key.
 * Handles quoted/unquoted values.
 * @param {string[]} lines - Frontmatter lines
 * @param {string} key - YAML key to find
 * @returns {string | null}
 */
function extractFrontmatterField(lines, key) {
  const line = lines.find(l => l.startsWith(`${key}:`));
  if (!line) return null;
  const raw = line.replace(new RegExp(`^${key}:\\s*`), '').trim();
  if (!raw) return null;
  return /^(['"]).*\1$/.test(raw) ? raw.slice(1, -1) : raw;
}

/**
 * Extract description and args from markdown frontmatter.
 * Handles both LF and CRLF line endings, quoted/unquoted YAML values.
 * When `args` is present in frontmatter, appends hint to description.
 *
 * @param {string} filePath - Absolute path to markdown file
 * @returns {{ name: string, description: string, args?: string } | null}
 */
function extractFrontmatter(filePath) {
  const name = path.basename(filePath, '.md');
  if (name === 'README') return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Strip BOM if present
    const clean = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

    // YAML frontmatter (handle LF + CRLF)
    const fmMatch = clean.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const fmLines = fmMatch[1].split(/\r?\n/);
      const desc = extractFrontmatterField(fmLines, 'description');
      const args = extractFrontmatterField(fmLines, 'args');
      if (desc) {
        const result = { name, description: desc };
        if (args) result.args = args;
        return result;
      }
    }

    // Fallback: first content line (skip headings, frontmatter delimiters, blockquotes)
    const lines = clean.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---') && !trimmed.startsWith('>')) {
        return { name, description: trimmed.slice(0, MAX_DESCRIPTION_LENGTH) };
      }
    }

    return { name, description: `Run /${name} workflow` };
  } catch (error) {
    // ENOENT is expected (file doesn't exist) — don't log
    // Other errors (EACCES, encoding) get a warning
    if (error.code !== 'ENOENT') {
      const safePath = filePath.replace(/[/\\][^/\\]*\.env[^/\\]*/g, '[REDACTED]');
      process.stderr.write(`[telegram-sync] Warning: cannot read ${safePath}: ${error.code || error.message}\n`);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Directory Scanning
// ---------------------------------------------------------------------------

/**
 * Scan a directory for workflow/command markdown files.
 * @param {string} dirPath - Directory to scan
 * @returns {Array<{ name: string, description: string }>}
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => extractFrontmatter(path.join(dirPath, f)))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Priority & Formatting
// ---------------------------------------------------------------------------

/**
 * Get priority score for a workflow name.
 * @param {string} name
 * @returns {number} 0-3 (higher = more important)
 */
function getPriority(name) {
  return _priorityMap.get(name) ?? 0;
}

/**
 * Format workflow name as Telegram command.
 * Telegram: lowercase a-z, 0-9, underscores only, 1-32 chars.
 *
 * @param {string} name - Workflow name (may contain hyphens)
 * @returns {string | null} Telegram-safe command, or null if invalid
 */
function formatCommand(name) {
  const formatted = name
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, MAX_COMMAND_LENGTH);

  return formatted.length > 0 ? formatted : null;
}

// ---------------------------------------------------------------------------
// Command List Builder
// ---------------------------------------------------------------------------

/**
 * Build the command list from .agent/ directory.
 *
 * @param {string} projectPath - Project root path
 * @param {object} [options]
 * @param {number} [options.limit] - Max commands (1-100, default: 100)
 * @param {'workflows' | 'commands' | 'both'} [options.source] - Which directory to scan
 * @returns {Array<{ command: string, description: string }>}
 */
function buildCommandList(projectPath, options = {}) {
  const rawLimit = typeof options.limit === 'number' ? options.limit : MAX_COMMANDS;
  const limit = Math.min(Math.max(rawLimit, 1), MAX_COMMANDS);
  const source = ['workflows', 'commands', 'both'].includes(options.source) ? options.source : 'workflows';

  const items = [];

  if (source === 'workflows' || source === 'both') {
    items.push(...scanDirectory(path.join(projectPath, '.agent', 'workflows')));
  }

  if (source === 'commands' || source === 'both') {
    const commands = scanDirectory(path.join(projectPath, '.agent', 'commands'));
    const existingNames = new Set(items.map(i => i.name));
    for (const cmd of commands) {
      if (!existingNames.has(cmd.name)) {
        items.push(cmd);
      }
    }
  }

  // Sort: priority descending, then alphabetical
  const sorted = [...items].sort((a, b) => {
    const pa = getPriority(a.name);
    const pb = getPriority(b.name);
    if (pa !== pb) return pb - pa;
    return a.name.localeCompare(b.name);
  });

  // Format, filter invalid, truncate. Append args hint if present.
  return sorted
    .slice(0, limit)
    .map(item => {
      const command = formatCommand(item.name);
      if (!command) return null;
      const desc = item.args
        ? `${item.description} (+ ${item.args})`
        : item.description;
      return { command, description: desc.slice(0, MAX_DESCRIPTION_LENGTH) };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Telegram API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} TelegramApiResponse
 * @property {boolean} ok
 * @property {string} [description] - Error description if !ok
 * @property {number} [error_code] - HTTP error code if !ok
 */

/**
 * @typedef {object} PushResult
 * @property {boolean} success
 * @property {string} message
 * @property {number} commandCount
 */

/**
 * Push commands to Telegram Bot API via setMyCommands.
 *
 * Error codes: 401=invalid token, 400=malformed, 429=rate limited, 500+=server
 *
 * @param {string} botToken - Telegram Bot API token
 * @param {Array<{ command: string, description: string }>} commands
 * @param {string} [scope] - Bot command scope type (default: 'all_private_chats')
 * @param {object} [scopeOptions] - Additional scope parameters
 * @param {string|number} [scopeOptions.chat_id] - Chat ID for 'chat' scope
 * @returns {Promise<PushResult>}
 */
async function pushToTelegram(botToken, commands, scope, scopeOptions) {
  const validation = validateBotToken(botToken);
  if (!validation.valid) {
    return { success: false, message: validation.error, commandCount: 0 };
  }

  const resolvedScope = scope || DEFAULT_SCOPE;

  // 'chat' scope is valid but not in VALID_SCOPES (requires chat_id)
  if (resolvedScope !== CHAT_SCOPE) {
    const scopeValidation = validateScope(resolvedScope);
    if (!scopeValidation.valid) {
      return { success: false, message: scopeValidation.error, commandCount: 0 };
    }
  }

  // Build scope object — 'chat' scope requires chat_id
  const scopeObj = resolvedScope === CHAT_SCOPE
    ? { type: CHAT_SCOPE, chat_id: scopeOptions?.chat_id }
    : { type: resolvedScope };

  if (resolvedScope === CHAT_SCOPE && !scopeObj.chat_id) {
    return { success: false, message: 'chat scope requires a chat_id', commandCount: 0 };
  }

  const url = `https://api.telegram.org/bot${botToken}/setMyCommands`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands, scope: scopeObj }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    /** @type {TelegramApiResponse} */
    let data;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        message: `Telegram API returned invalid JSON (HTTP ${response.status})`,
        commandCount: 0,
      };
    }

    if (data.ok) {
      return {
        success: true,
        message: `Successfully synced ${commands.length} commands to Telegram`,
        commandCount: commands.length,
      };
    }

    return {
      success: false,
      message: `Telegram API error (${data.error_code || response.status}): ${data.description || 'Unknown error'}`,
      commandCount: 0,
    };
  } catch (error) {
    // AbortSignal.timeout throws different error names across Node versions
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError' || error.code === 'ETIMEDOUT';
    if (isTimeout) {
      return { success: false, message: `Request timeout (${API_TIMEOUT_MS / 1000}s)`, commandCount: 0 };
    }
    return { success: false, message: `Network error: ${error.message || String(error)}`, commandCount: 0 };
  }
}

/**
 * Delete bot commands from Telegram for a specific scope.
 *
 * @param {string} botToken - Telegram Bot API token
 * @param {string} [scope] - Bot command scope type (default: 'all_private_chats')
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function deleteFromTelegram(botToken, scope) {
  const validation = validateBotToken(botToken);
  if (!validation.valid) {
    return { success: false, message: validation.error };
  }

  const resolvedScope = scope || DEFAULT_SCOPE;
  const scopeValidation = validateScope(resolvedScope);
  if (!scopeValidation.valid) {
    return { success: false, message: scopeValidation.error };
  }

  const url = `https://api.telegram.org/bot${botToken}/deleteMyCommands`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: { type: resolvedScope } }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        message: `Telegram API returned invalid JSON (HTTP ${response.status})`,
      };
    }

    if (data.ok) {
      return { success: true, message: `Cleared commands for scope: ${resolvedScope}` };
    }

    return {
      success: false,
      message: `Telegram API error (${data.error_code || response.status}): ${data.description || 'Unknown error'}`,
    };
  } catch (error) {
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError' || error.code === 'ETIMEDOUT';
    if (isTimeout) {
      return { success: false, message: `Request timeout (${API_TIMEOUT_MS / 1000}s)` };
    }
    return { success: false, message: `Network error: ${error.message || String(error)}` };
  }
}

/**
 * Push commands to ALL scopes concurrently via Promise.allSettled.
 *
 * @param {string} botToken - Telegram Bot API token
 * @param {Array<{ command: string, description: string }>} commands
 * @returns {Promise<{ results: Array<{ scope: string, success: boolean, message: string, commandCount: number }>, allSuccess: boolean }>}
 */
async function pushToAllScopes(botToken, commands) {
  const validation = validateBotToken(botToken);
  if (!validation.valid) {
    return {
      results: VALID_SCOPES.map(scope => ({ scope, success: false, message: validation.error, commandCount: 0 })),
      allSuccess: false,
    };
  }

  const settled = await Promise.allSettled(
    VALID_SCOPES.map(scope =>
      pushToTelegram(botToken, commands, scope)
        .then(result => ({ ...result, scope }))
    )
  );

  const results = settled.map((entry, i) => {
    if (entry.status === 'fulfilled') return entry.value;
    return { scope: VALID_SCOPES[i], success: false, message: entry.reason?.message || String(entry.reason), commandCount: 0 };
  });

  return { results, allSuccess: results.every(r => r.success) };
}

/**
 * Delete commands from ALL scopes concurrently via Promise.allSettled.
 *
 * @param {string} botToken - Telegram Bot API token
 * @returns {Promise<{ results: Array<{ scope: string, success: boolean, message: string }>, allSuccess: boolean }>}
 */
async function clearAllScopes(botToken) {
  const validation = validateBotToken(botToken);
  if (!validation.valid) {
    return {
      results: VALID_SCOPES.map(scope => ({ scope, success: false, message: validation.error })),
      allSuccess: false,
    };
  }

  const settled = await Promise.allSettled(
    VALID_SCOPES.map(scope =>
      deleteFromTelegram(botToken, scope)
        .then(result => ({ ...result, scope }))
    )
  );

  const results = settled.map((entry, i) => {
    if (entry.status === 'fulfilled') return entry.value;
    return { scope: VALID_SCOPES[i], success: false, message: entry.reason?.message || String(entry.reason) };
  });

  return { results, allSuccess: results.every(r => r.success) };
}

// ---------------------------------------------------------------------------
// Token Reader
// ---------------------------------------------------------------------------

/**
 * Read bot token from environment or .env file.
 * Search order: TELEGRAM_BOT_TOKEN env → explicit path → ~/.claude/channels/telegram/.env
 *
 * @param {string} [envPath] - Explicit .env file path
 * @returns {string | null}
 */
function readBotToken(envPath) {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }

  const channelEnvPaths = [
    envPath,
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'channels', 'telegram', '.env'),
  ].filter(Boolean);

  for (const p of channelEnvPaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      // Anchored regex: match full line, ignore comments
      const match = content.match(/^TELEGRAM_BOT_TOKEN=([^\s#]+)/m);
      if (match) return match[1].trim();
    } catch {
      // File not found — try next source
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Command Cache (for SessionStart guard)
// ---------------------------------------------------------------------------

/**
 * Resolve the global cache path for bot menu commands.
 * @returns {string} Absolute path to bot-menu-cache.json
 */
function getCachePath() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.claude', 'channels', 'telegram', CACHE_FILENAME);
}

/**
 * Cache commands globally for the SessionStart guard.
 * Merges plugin base commands (/start, /help) so they remain visible
 * when the guard restores the menu after plugin overwrite.
 *
 * @param {Array<{ command: string, description: string }>} commands - Workflow commands
 * @returns {{ success: boolean, path?: string, count?: number, error?: string }}
 */
function cacheCommands(commands) {
  const cachePath = getCachePath();
  const cacheDir = path.dirname(cachePath);

  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Merge: workflow commands first (higher priority), then plugin base commands
    // Skip plugin commands that already exist in workflows (e.g. /status)
    const existingNames = new Set(commands.map(c => c.command));
    const merged = [
      ...PLUGIN_BASE_COMMANDS.filter(c => !existingNames.has(c.command)),
      ...commands,
    ];

    const cache = {
      version: 1,
      timestamp: new Date().toISOString(),
      commandCount: merged.length,
      commands: merged,
    };

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');

    return { success: true, path: cachePath, count: merged.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Read cached commands from global cache file.
 * @returns {{ version: number, timestamp: string, commandCount: number, commands: Array<{ command: string, description: string }> } | null}
 */
function readCachedCommands() {
  try {
    const content = fs.readFileSync(getCachePath(), 'utf-8');
    const cache = JSON.parse(content);
    if (!Array.isArray(cache.commands) || cache.commands.length === 0) return null;
    return cache;
  } catch {
    return null;
  }
}

/**
 * Read allowed user IDs from the Telegram channel access.json.
 * These are the users who have paired with the bot via /telegram:access.
 *
 * @returns {string[]} Array of Telegram user ID strings
 */
function readAllowedUsers() {
  const accessPath = path.join(
    process.env.HOME || process.env.USERPROFILE || '',
    '.claude', 'channels', 'telegram', 'access.json'
  );

  try {
    const content = fs.readFileSync(accessPath, 'utf-8');
    const access = JSON.parse(content);
    return Array.isArray(access.allowFrom) ? access.allowFrom : [];
  } catch {
    return [];
  }
}

/**
 * Guard: restore cached commands using chat-specific scope.
 *
 * Uses Telegram scope hierarchy: chat > all_private_chats > default.
 * The plugin writes to all_private_chats, but chat scope overrides it,
 * making our workflow menu immune to plugin overwrites.
 *
 * Reads allowed user IDs from ~/.claude/channels/telegram/access.json
 * and pushes commands to each user's chat scope.
 *
 * @param {object} [options]
 * @param {string} [options.token] - Bot token override
 * @returns {Promise<PushResult>}
 */
async function guardPrivateChat(options = {}) {
  const cache = readCachedCommands();
  if (!cache) {
    return { success: false, message: 'No cached commands found. Run "kit sync-bot-commands" first.', commandCount: 0 };
  }

  const token = options.token || readBotToken();
  if (!token) {
    return { success: false, message: 'No bot token found', commandCount: 0 };
  }

  const users = readAllowedUsers();
  if (users.length === 0) {
    // Fallback to all_private_chats if no users in access.json
    return pushToTelegram(token, cache.commands, 'all_private_chats');
  }

  // Push to each user's chat scope (overrides plugin's all_private_chats)
  const results = await Promise.allSettled(
    users.map(chatId =>
      pushToTelegram(token, cache.commands, CHAT_SCOPE, { chat_id: chatId })
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const total = users.length;

  if (succeeded === total) {
    return {
      success: true,
      message: `Successfully synced ${cache.commands.length} commands to ${succeeded} user(s)`,
      commandCount: cache.commands.length,
    };
  }

  return {
    success: succeeded > 0,
    message: `Synced to ${succeeded}/${total} user(s)`,
    commandCount: succeeded > 0 ? cache.commands.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Main Sync Orchestrator
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SyncResult
 * @property {boolean} success
 * @property {Array<{ command: string, description: string }>} commands
 * @property {string} message
 * @property {Array<{ scope: string, success: boolean, message: string, commandCount?: number }>} [scopeResults]
 */

/**
 * Full sync: scan workflows → build command list → push to Telegram.
 *
 * @param {string} projectPath - Project root
 * @param {object} [options]
 * @param {string} [options.token] - Bot token (reads from env/.env if not provided)
 * @param {number} [options.limit] - Max commands (1-100)
 * @param {'workflows' | 'commands' | 'both'} [options.source] - Source directories
 * @param {string} [options.scope] - Bot command scope type (undefined = all scopes)
 * @param {boolean} [options.clear] - Clear commands instead of pushing
 * @param {boolean} [options.dryRun] - Preview without pushing
 * @returns {Promise<SyncResult>}
 */
async function syncBotCommands(projectPath, options = {}) {
  const token = options.token || readBotToken();

  // Clear mode: delete commands from scope(s)
  if (options.clear) {
    if (!token) {
      return { success: false, commands: [], message: 'No bot token found. Pass --token or set TELEGRAM_BOT_TOKEN' };
    }
    if (options.scope) {
      const result = await deleteFromTelegram(token, options.scope);
      return { success: result.success, commands: [], message: result.message, scopeResults: [{ scope: options.scope, ...result }] };
    }
    const { results, allSuccess } = await clearAllScopes(token);
    const ok = results.filter(r => r.success).length;
    return { success: allSuccess, commands: [], message: `Cleared commands from ${ok}/${results.length} scopes`, scopeResults: results };
  }

  const commands = buildCommandList(projectPath, {
    limit: options.limit,
    source: options.source,
  });

  if (commands.length === 0) {
    return { success: false, commands: [], message: 'No workflows found in .agent/workflows/' };
  }

  if (options.dryRun) {
    const scopeLabel = options.scope || `all (${VALID_SCOPES.join(', ')})`;
    return { success: true, commands, message: `Dry run: ${commands.length} commands would be synced (scope: ${scopeLabel})` };
  }

  if (!token) {
    return { success: false, commands, message: 'No bot token found. Pass --token or set TELEGRAM_BOT_TOKEN' };
  }

  // Single scope
  if (options.scope) {
    const result = await pushToTelegram(token, commands, options.scope);
    if (result.success) cacheCommands(commands);
    return { success: result.success, commands, message: result.message, scopeResults: [{ scope: options.scope, ...result }] };
  }

  // All scopes (default)
  const { results, allSuccess } = await pushToAllScopes(token, commands);
  const ok = results.filter(r => r.success).length;
  if (ok > 0) cacheCommands(commands);
  return { success: allSuccess, commands, message: `Synced ${commands.length} commands to ${ok}/${results.length} scopes`, scopeResults: results };
}

// ---------------------------------------------------------------------------
// Public API (frozen exports)
// ---------------------------------------------------------------------------

module.exports = Object.freeze({
  // Core API
  syncBotCommands,
  buildCommandList,
  pushToTelegram,
  deleteFromTelegram,
  pushToAllScopes,
  clearAllScopes,
  readBotToken,

  // Guard API
  guardPrivateChat,
  cacheCommands,
  readCachedCommands,
  getCachePath,
  readAllowedUsers,

  // Utilities (exported for testing)
  extractFrontmatter,
  extractFrontmatterField,
  scanDirectory,
  formatCommand,
  getPriority,
  validateBotToken,
  validateScope,

  // Constants
  MAX_COMMANDS,
  MAX_COMMAND_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  API_TIMEOUT_MS,
  PRIORITY_TIERS,
  VALID_SCOPES,
  DEFAULT_SCOPE,
  PLUGIN_BASE_COMMANDS,
  GUARD_DELAY_MS,
  CACHE_FILENAME,
  CHAT_SCOPE,
});
