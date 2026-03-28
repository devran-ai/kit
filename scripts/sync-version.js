#!/usr/bin/env node

/**
 * Devran AI Kit — Version Sync Script
 *
 * Automatically synchronizes version references across the codebase
 * when `npm version` is run. This is the companion to the
 * version-sync.test.js structural test.
 *
 * Usage:
 *   Runs automatically via npm `version` lifecycle hook.
 *   Can also be run manually: `node scripts/sync-version.js`
 *
 * @module scripts/sync-version
 * @author Emre Dursun
 * @since v3.4.1
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const MANIFEST = require(path.join(ROOT, '.agent/manifest.json'));
const CAP = {
  agents: MANIFEST.capabilities.agents.count,
  skills: MANIFEST.capabilities.skills.count,
  commands: MANIFEST.capabilities.commands.count,
  workflows: MANIFEST.capabilities.workflows.count,
  rules: MANIFEST.capabilities.rules.count,
};

/**
 * @typedef {object} SyncTarget
 * @property {string} file - Relative path from project root
 * @property {'json' | 'regex'} type - Type of replacement
 * @property {string} [jsonPath] - JSON key to update (dot notation)
 * @property {RegExp} [pattern] - Regex pattern with capture group for version
 * @property {function(string, string): string} [replacer] - Custom replacer function
 */

/** @type {SyncTarget[]} */
const SYNC_TARGETS = [
  // --- JSON files ---
  {
    file: '.agent/manifest.json',
    type: 'json',
    jsonPath: 'kitVersion',
  },

  // --- Markdown files (regex-based) ---
  {
    file: 'README.md',
    type: 'regex',
    pattern: /badge\/version-[\d.]+-/,
    replacer: (content, version) => {
      let updated = content.replace(/badge\/version-[\d.]+-/, `badge/version-${version}-`);
      // Sync capability badge counts from manifest
      updated = updated.replace(/AI%20Agents-\d+-purple/, `AI%20Agents-${CAP.agents}-purple`);
      updated = updated.replace(/Skills-\d+-orange/, `Skills-${CAP.skills}-orange`);
      updated = updated.replace(/Commands-\d+-blue/, `Commands-${CAP.commands}-blue`);
      updated = updated.replace(/Workflows-\d+-blueviolet/, `Workflows-${CAP.workflows}-blueviolet`);
      updated = updated.replace(/Rules-\d+-red/, `Rules-${CAP.rules}-red`);
      return updated;
    },
  },
  {
    file: 'docs/architecture.md',
    type: 'regex',
    pattern: /Devran AI Kit v[\d.]+/g,
    replacer: (content, version) =>
      content.replace(/Devran AI Kit v[\d.]+/g, `Devran AI Kit v${version}`),
  },
  {
    file: '.agent/CheatSheet.md',
    type: 'regex',
    pattern: /\*\*Version\*\*: v[\d.]+/,
    replacer: (content, version) =>
      content.replace(/\*\*Version\*\*: v[\d.]+/, `**Version**: v${version}`),
  },
  {
    file: '.agent/commands/help.md',
    type: 'regex',
    pattern: /Devran AI Kit v[\d.]+/,
    replacer: (content, version) =>
      content.replace(/Devran AI Kit v[\d.]+/, `Devran AI Kit v${version}`),
  },
  // NOTE: .agent/checklists/ files are EXCLUDED from sync targets.
  // They are STRICTLY PROTECTED per the Preservation Contract
  // (.agent/rules/agent-upgrade-policy.md § 1) and must not be
  // modified during upgrades. Version is stamped at init time only.
  {
    file: '.agent/session-context.md',
    type: 'regex',
    pattern: /Devran AI Kit v[\d.]+/,
    replacer: (content, version) =>
      content.replace(/Devran AI Kit v[\d.]+/, `Devran AI Kit v${version}`),
  },
];

/**
 * Updates a JSON file's nested key to the new version.
 *
 * @param {string} filePath - Absolute path to JSON file
 * @param {string} jsonPath - Dot-separated key path (e.g., 'kitVersion')
 * @param {string} version - New version string
 * @returns {boolean} Whether the file was modified
 */
function updateJsonFile(filePath, jsonPath, version) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  Skipped (not found): ${path.relative(ROOT, filePath)}`);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const keys = jsonPath.split('.');
  let target = data;

  for (let index = 0; index < keys.length - 1; index++) {
    target = target[keys[index]];
    if (!target) {
      console.warn(`  ⚠️  Key path not found: ${jsonPath} in ${path.relative(ROOT, filePath)}`);
      return false;
    }
  }

  const lastKey = keys[keys.length - 1];
  const oldValue = target[lastKey];
  if (oldValue === version) {
    console.log(`  ✅ Already synced: ${path.relative(ROOT, filePath)}`);
    return false;
  }

  target[lastKey] = version;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`  📝 Updated: ${path.relative(ROOT, filePath)} (${oldValue} → ${version})`);
  return true;
}

/**
 * Updates a text file using a regex replacer function.
 *
 * @param {string} filePath - Absolute path to text file
 * @param {function(string, string): string} replacer - Replacer function
 * @param {string} version - New version string
 * @returns {boolean} Whether the file was modified
 */
function updateTextFile(filePath, replacer, version) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  Skipped (not found): ${path.relative(ROOT, filePath)}`);
    return false;
  }

  const original = fs.readFileSync(filePath, 'utf-8');
  const updated = replacer(original, version);

  if (original === updated) {
    console.log(`  ✅ Already synced: ${path.relative(ROOT, filePath)}`);
    return false;
  }

  fs.writeFileSync(filePath, updated, 'utf-8');
  console.log(`  📝 Updated: ${path.relative(ROOT, filePath)}`);
  return true;
}

/**
 * Main execution — syncs all targets.
 */
function main() {
  console.log(`\n🔄 Syncing version references to ${VERSION}\n`);

  let updatedCount = 0;

  for (const target of SYNC_TARGETS) {
    const filePath = path.join(ROOT, target.file);

    if (target.type === 'json') {
      if (updateJsonFile(filePath, target.jsonPath, VERSION)) {
        updatedCount++;
      }
    } else if (target.type === 'regex') {
      if (updateTextFile(filePath, target.replacer, VERSION)) {
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    console.log(`\n✅ Synced ${updatedCount} file(s) to v${VERSION}`);
  } else {
    console.log('\n✅ All files already in sync');
  }
}

main();
