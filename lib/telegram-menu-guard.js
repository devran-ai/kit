#!/usr/bin/env node

/**
 * Telegram Menu Guard — SessionStart hook script.
 *
 * Problem: The Telegram plugin (claude-plugins-official) hardcodes 3 commands
 * (/start, /help, /status) and pushes them to `all_private_chats` scope during
 * onStart, overwriting Devran Kit's workflow menu.
 *
 * Solution: This script runs as a SessionStart hook, waits for the plugin to
 * finish connecting, then restores the full command list from a cached file.
 *
 * Design:
 *   - Spawns a detached child process so the hook returns immediately
 *   - Child waits GUARD_DELAY_MS (8s) for the plugin to connect
 *   - Reads cached commands from ~/.claude/channels/telegram/bot-menu-cache.json
 *   - Reads bot token from env or ~/.claude/channels/telegram/.env
 *   - Pushes commands to chat scope per user (overrides plugin's all_private_chats)
 *   - Exits silently on success, logs to stderr on error
 *
 * Cache is created/updated by `kit sync-bot-commands` (see telegram-sync.js).
 * If no cache exists, the guard is a no-op.
 *
 * Usage:
 *   node lib/telegram-menu-guard.js          # Run with default 8s delay
 *   node lib/telegram-menu-guard.js --now    # Run immediately (no delay)
 *
 * @module telegram-menu-guard
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const GUARD_DELAY_MS = 8000;
const API_TIMEOUT_MS = 10000;

const home = process.env.HOME || process.env.USERPROFILE || '';
const telegramDir = path.join(home, '.claude', 'channels', 'telegram');
const cachePath = path.join(telegramDir, 'bot-menu-cache.json');
const envPath = path.join(telegramDir, '.env');
const accessPath = path.join(telegramDir, 'access.json');
const pluginCacheDir = path.join(home, '.claude', 'plugins', 'cache', 'claude-plugins-official', 'telegram');

// Quick exit if no cache — nothing to guard
if (!fs.existsSync(cachePath)) {
  process.exit(0);
}

const immediate = process.argv.includes('--now');

if (immediate) {
  patchPlugin();
  runGuard().then(code => process.exit(code));
} else {
  // Spawn detached child and exit immediately (non-blocking hook).
  // Uses a log file so failures are diagnosable even though stdio is ignored.
  const logPath = path.join(telegramDir, 'guard.log');
  const child = spawn(process.execPath, [__filename, '--now'], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: {
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      PATH: process.env.PATH,
      GUARD_LOG: logPath,
    },
  });
  child.unref();
  process.exit(0);
}

/**
 * Write a timestamped log entry to stderr and optionally to GUARD_LOG file.
 * This ensures failures are diagnosable even when stdio is redirected.
 * @param {string} level - 'INFO' | 'WARN' | 'ERROR'
 * @param {string} msg
 */
function guardLog(level, msg) {
  const line = `[telegram-guard][${level}] ${msg}`;
  process.stderr.write(line + '\n');
  const logPath = process.env.GUARD_LOG;
  if (logPath) {
    try {
      fs.appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`, 'utf-8');
    } catch {
      // Log write failure is non-critical
    }
  }
}

/**
 * Sanitize error messages to strip bot tokens from URLs.
 * @param {string} msg
 * @returns {string}
 */
function sanitizeError(msg) {
  return (msg || '').replace(/bot[^/]+\//g, 'bot[REDACTED]/');
}

/**
 * Fetch with exponential backoff retry (handles transient errors + 429).
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} maxAttempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, maxAttempts = 3) {
  const BACKOFF_MS = [1000, 3000, 10000];
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      // Retry on 429 (rate limit) using Retry-After header if present
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10) * 1000;
        const delay = Math.max(retryAfter, BACKOFF_MS[attempt] || 10000);
        guardLog('WARN', `Rate limited (429) — retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        lastError = new Error('Rate limited');
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = BACKOFF_MS[attempt];
        guardLog('WARN', `Request failed (${sanitizeError(err.message)}) — retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Execute the guard: wait, read cache, read token, push to Telegram.
 * @returns {Promise<number>} Exit code (0 = success, 1 = error)
 */
async function runGuard() {
  // Wait for plugin to finish connecting
  await new Promise(resolve => setTimeout(resolve, GUARD_DELAY_MS));

  try {
    // Read cached commands
    const cacheContent = fs.readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(cacheContent);
    if (!Array.isArray(cache.commands) || cache.commands.length === 0) {
      return 0; // Empty cache — nothing to do
    }

    // Read bot token
    const token = readToken();
    if (!token) {
      guardLog('ERROR', 'No bot token found — skipping');
      return 1;
    }

    // Read allowed users from access.json for chat-specific scope
    const users = readAllowedUsers();
    const url = `https://api.telegram.org/bot${token}/setMyCommands`;

    if (users.length > 0) {
      // Push to each user's chat scope in parallel (overrides plugin's all_private_chats).
      // Graceful degradation: partial success is acceptable — succeed if ANY user restored.
      const results = await Promise.allSettled(
        users.map(async chatId => {
          try {
            const res = await fetchWithRetry(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                commands: cache.commands,
                scope: { type: 'chat', chat_id: Number(chatId) },
              }),
              signal: AbortSignal.timeout(API_TIMEOUT_MS),
            });
            const data = await res.json();
            if (!data.ok) {
              guardLog('WARN', `Failed for user ${chatId}: ${data.description || 'unknown'}`);
            }
            return data;
          } catch (err) {
            guardLog('WARN', `Error for user ${chatId}: ${sanitizeError(err.message)}`);
            throw err;
          }
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok).length;
      const failed = users.length - succeeded;

      if (succeeded > 0) {
        guardLog('INFO', `Menu restored: ${cache.commands.length} commands to ${succeeded}/${users.length} user(s)${failed > 0 ? ` (${failed} failed)` : ''}`);
        return 0; // Partial success is acceptable
      }

      guardLog('ERROR', `Menu restore failed for all ${users.length} user(s)`);

      // Last resort: fall back to all_private_chats scope
      guardLog('INFO', 'Falling back to all_private_chats scope');
    }

    // Fallback: no users in access.json (or all per-user attempts failed)
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: cache.commands,
        scope: { type: 'all_private_chats' },
      }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    const data = await response.json();

    if (data.ok) {
      guardLog('INFO', `Menu restored: ${cache.commands.length} commands (fallback scope)`);
      return 0;
    }

    guardLog('ERROR', `API error: ${data.description || 'unknown'}`);
    return 1;
  } catch (error) {
    guardLog('ERROR', sanitizeError(error.message || String(error)));
    return 1;
  }
}

/**
 * Patch the Telegram plugin to disable its setMyCommands call.
 * Scans all cached plugin versions and comments out the line if present.
 * Idempotent — safe to run multiple times.
 */
function patchPlugin() {
  if (!fs.existsSync(pluginCacheDir)) return;

  // Resolve symlinks to get the real base path (prevents symlink bypass attacks)
  let resolvedBase;
  try {
    resolvedBase = fs.realpathSync(pluginCacheDir);
  } catch {
    return; // Can't resolve base — skip patching safely
  }
  // Normalise separator and ensure trailing sep for prefix check
  resolvedBase = resolvedBase.replace(/[\\/]+$/, '') + path.sep;

  try {
    const versions = fs.readdirSync(pluginCacheDir);
    for (const ver of versions) {
      // Only accept simple version directory names (e.g. "1.2.3", "latest")
      if (!/^[\w.-]+$/.test(ver)) continue;

      const serverTs = path.join(pluginCacheDir, ver, 'server.ts');

      // Resolve symlinks on the target file before containment check
      let resolvedTarget;
      try {
        resolvedTarget = fs.realpathSync(serverTs);
      } catch {
        continue; // File doesn't exist or unresolvable symlink — skip
      }

      // Normalise path separator (Windows may mix / and \)
      const normTarget = resolvedTarget.replace(/\\/g, '/');
      const normBase = resolvedBase.replace(/\\/g, '/');

      // Containment check using normalised paths — use path.relative for robustness
      const rel = path.relative(resolvedBase.replace(/\\/g, '/'), normTarget);
      if (rel.startsWith('..') || path.isAbsolute(rel)) continue;

      // Only allow .ts files — reject any other extension
      if (!resolvedTarget.endsWith('.ts')) continue;

      const content = fs.readFileSync(resolvedTarget, 'utf-8');
      // Only patch if the active setMyCommands call exists (not already commented out)
      if (content.includes('void bot.api.setMyCommands') && !content.includes('// setMyCommands disabled')) {
        const patched = content.replace(
          /^(\s*)(void bot\.api\.setMyCommands\(.+\)\.catch\(\(\) => \{\}\));?\s*$/m,
          '$1// setMyCommands disabled — Devran Kit manages the bot menu via\n$1// kit sync-bot-commands + telegram-menu-guard\n$1// $2'
        );
        if (patched !== content) {
          // Create backup before patching (mode 0o600 — owner read/write only)
          const backup = resolvedTarget + '.bak';
          if (!fs.existsSync(backup)) {
            fs.copyFileSync(resolvedTarget, backup);
            fs.chmodSync(backup, 0o600);
          }
          fs.writeFileSync(resolvedTarget, patched, { encoding: 'utf-8', mode: 0o644 });
          guardLog('INFO', `Patched plugin ${ver}/server.ts`);
        }
      }
    }
  } catch {
    // Non-critical — guard will still restore commands even without patch
  }
}

/**
 * Read allowed user IDs from access.json.
 * Validates each entry is a numeric chat ID.
 * @returns {string[]}
 */
function readAllowedUsers() {
  try {
    const content = fs.readFileSync(accessPath, 'utf-8');
    const access = JSON.parse(content);
    if (!Array.isArray(access.allowFrom)) return [];
    // Validate each entry is a numeric string or number
    return access.allowFrom.filter(id =>
      (typeof id === 'string' || typeof id === 'number') &&
      /^-?\d{1,20}$/.test(String(id))
    );
  } catch {
    return [];
  }
}

/**
 * Read bot token from environment or .env file.
 * @returns {string | null}
 */
function readToken() {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^TELEGRAM_BOT_TOKEN=([^\s#]+)/m);
    if (match) return match[1].trim();
  } catch {
    // .env not found
  }

  return null;
}
