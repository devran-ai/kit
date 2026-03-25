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

// ---------------------------------------------------------------------------
// Frontmatter Extraction
// ---------------------------------------------------------------------------

/**
 * Extract description from markdown frontmatter.
 * Handles both LF and CRLF line endings, quoted/unquoted YAML values.
 *
 * @param {string} filePath - Absolute path to markdown file
 * @returns {{ name: string, description: string } | null}
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
      const descLine = fmMatch[1].split(/\r?\n/).find(l => l.startsWith('description:'));
      if (descLine) {
        const raw = descLine.replace(/^description:\s*/, '').trim();
        // Strip balanced quotes only
        const desc = /^(['"]).*\1$/.test(raw) ? raw.slice(1, -1) : raw;
        if (desc) return { name, description: desc };
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

  // Format, filter invalid, truncate
  return sorted
    .slice(0, limit)
    .map(item => {
      const command = formatCommand(item.name);
      if (!command) return null;
      return { command, description: item.description.slice(0, MAX_DESCRIPTION_LENGTH) };
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
 * @returns {Promise<PushResult>}
 */
async function pushToTelegram(botToken, commands) {
  const validation = validateBotToken(botToken);
  if (!validation.valid) {
    return { success: false, message: validation.error, commandCount: 0 };
  }

  const url = `https://api.telegram.org/bot${botToken}/setMyCommands`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
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
// Main Sync Orchestrator
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SyncResult
 * @property {boolean} success
 * @property {Array<{ command: string, description: string }>} commands
 * @property {string} message
 */

/**
 * Full sync: scan workflows → build command list → push to Telegram.
 *
 * @param {string} projectPath - Project root
 * @param {object} [options]
 * @param {string} [options.token] - Bot token (reads from env/.env if not provided)
 * @param {number} [options.limit] - Max commands (1-100)
 * @param {'workflows' | 'commands' | 'both'} [options.source] - Source directories
 * @param {boolean} [options.dryRun] - Preview without pushing
 * @returns {Promise<SyncResult>}
 */
async function syncBotCommands(projectPath, options = {}) {
  const token = options.token || readBotToken();
  const commands = buildCommandList(projectPath, {
    limit: options.limit,
    source: options.source,
  });

  if (commands.length === 0) {
    return { success: false, commands: [], message: 'No workflows found in .agent/workflows/' };
  }

  if (options.dryRun) {
    return { success: true, commands, message: `Dry run: ${commands.length} commands would be synced` };
  }

  if (!token) {
    return { success: false, commands, message: 'No bot token found. Pass --token or set TELEGRAM_BOT_TOKEN' };
  }

  const result = await pushToTelegram(token, commands);
  return { success: result.success, commands, message: result.message };
}

// ---------------------------------------------------------------------------
// Public API (frozen exports)
// ---------------------------------------------------------------------------

module.exports = Object.freeze({
  // Core API
  syncBotCommands,
  buildCommandList,
  pushToTelegram,
  readBotToken,

  // Utilities (exported for testing)
  extractFrontmatter,
  scanDirectory,
  formatCommand,
  getPriority,
  validateBotToken,

  // Constants
  MAX_COMMANDS,
  MAX_COMMAND_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  API_TIMEOUT_MS,
  PRIORITY_TIERS,
});
