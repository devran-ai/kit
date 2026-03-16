#!/usr/bin/env node

/**
 * Antigravity AI Kit — Clean Identity Template
 *
 * Resets .agent/engine/identity.json to the empty template before
 * publishing. This prevents PII leaks caused by the identity module
 * auto-populating the file at runtime from git config.
 *
 * Called via: package.json "prepublishOnly" script
 *
 * @module scripts/clean-identity
 * @since v3.5.3
 */

'use strict';

const fs = require('fs');
const path = require('path');

const IDENTITY_PATH = path.join(__dirname, '..', '.agent', 'engine', 'identity.json');

const CLEAN_TEMPLATE = JSON.stringify(
  { developers: [], activeId: null },
  null,
  2
) + '\n';

try {
  const current = fs.readFileSync(IDENTITY_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(current);

  if (parsed.developers && parsed.developers.length > 0) {
    fs.writeFileSync(IDENTITY_PATH, CLEAN_TEMPLATE, 'utf-8');
    console.log('🧹 identity.json: cleaned PII before publish');
  } else {
    console.log('✅ identity.json: already clean');
  }
} catch (error) {
  // If file doesn't exist or is malformed, write clean template
  fs.writeFileSync(IDENTITY_PATH, CLEAN_TEMPLATE, 'utf-8');
  console.log('🧹 identity.json: reset to clean template');
}
