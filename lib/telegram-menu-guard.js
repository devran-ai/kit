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
  // Spawn detached child and exit immediately (non-blocking hook)
  const child = spawn(process.execPath, [__filename, '--now'], {
    detached: true,
    stdio: 'ignore',
    env: {
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      PATH: process.env.PATH,
    },
  });
  child.unref();
  process.exit(0);
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
      process.stderr.write('[telegram-guard] No bot token found — skipping\n');
      return 1;
    }

    // Read allowed users from access.json for chat-specific scope
    const users = readAllowedUsers();
    const url = `https://api.telegram.org/bot${token}/setMyCommands`;

    if (users.length > 0) {
      // Push to each user's chat scope in parallel (overrides plugin's all_private_chats)
      const results = await Promise.allSettled(
        users.map(chatId =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              commands: cache.commands,
              scope: { type: 'chat', chat_id: chatId },
            }),
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
          }).then(r => r.json())
        )
      );
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok).length;
      process.stderr.write(`[telegram-guard] Menu restored: ${cache.commands.length} commands to ${succeeded}/${users.length} user(s)\n`);
      return succeeded > 0 ? 0 : 1;
    }

    // Fallback: no users in access.json, push to all_private_chats
    const response = await fetch(url, {
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
      process.stderr.write(`[telegram-guard] Menu restored: ${cache.commands.length} commands (fallback scope)\n`);
      return 0;
    }

    process.stderr.write(`[telegram-guard] API error: ${data.description || 'unknown'}\n`);
    return 1;
  } catch (error) {
    process.stderr.write(`[telegram-guard] ${sanitizeError(error.message || String(error))}\n`);
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

  const resolvedBase = path.resolve(pluginCacheDir) + path.sep;

  try {
    const versions = fs.readdirSync(pluginCacheDir);
    for (const ver of versions) {
      const serverTs = path.join(pluginCacheDir, ver, 'server.ts');
      const resolved = path.resolve(serverTs);

      // Path containment check — prevent traversal
      if (!resolved.startsWith(resolvedBase)) continue;
      if (!fs.existsSync(serverTs)) continue;

      const content = fs.readFileSync(serverTs, 'utf-8');
      // Only patch if the active setMyCommands call exists (not already commented out)
      if (content.includes('void bot.api.setMyCommands') && !content.includes('// setMyCommands disabled')) {
        const patched = content.replace(
          /^(\s*)(void bot\.api\.setMyCommands\(.+\)\.catch\(\(\) => \{\}\));?\s*$/m,
          '$1// setMyCommands disabled — Devran Kit manages the bot menu via\n$1// kit sync-bot-commands + telegram-menu-guard\n$1// $2'
        );
        if (patched !== content) {
          // Create backup before patching
          const backup = serverTs + '.bak';
          if (!fs.existsSync(backup)) {
            fs.copyFileSync(serverTs, backup);
          }
          fs.writeFileSync(serverTs, patched, 'utf-8');
          process.stderr.write(`[telegram-guard] Patched plugin ${ver}/server.ts\n`);
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
