/**
 * Antigravity AI Kit — CLI Command Handlers (Phase 4)
 *
 * Extracted command handlers to keep bin/ag-kit.js under 800 lines.
 * Handles: `market`, `heal`, and dashboard sections.
 *
 * @module lib/cli-commands
 * @author Emre Dursun
 * @since v3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ANSI colors (shared with ag-kit.js)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Marketplace CLI handler.
 *
 * @param {string} projectRoot - Root directory
 * @param {string} subCommand - Sub-command: search, info, install, update
 * @param {string} [argument] - Argument for the sub-command
 * @param {object} [options] - CLI options
 * @returns {void}
 */
function marketCommand(projectRoot, subCommand, argument, options = {}) {
  const marketplace = require('./marketplace');

  switch (subCommand) {
    case 'search': {
      if (!argument) {
        console.log(`${colors.yellow}Usage: ag-kit market search <query>${colors.reset}`);
        return;
      }
      const results = marketplace.searchMarket(projectRoot, argument);
      console.log(`\n${colors.bright}${colors.blue}═══ Marketplace Search: "${argument}" ═══${colors.reset}\n`);
      if (results.length === 0) {
        console.log(`   No plugins found matching "${argument}"`);
      } else {
        for (const entry of results) {
          console.log(`   ${colors.green}${entry.name}${colors.reset} v${entry.version}`);
          console.log(`   ${entry.description}`);
          console.log(`   Tags: ${(entry.tags || []).join(', ')}`);
          console.log('');
        }
      }
      console.log(`   ${results.length} result(s)\n`);
      break;
    }

    case 'info': {
      if (!argument) {
        console.log(`${colors.yellow}Usage: ag-kit market info <plugin-name>${colors.reset}`);
        return;
      }
      const info = marketplace.getMarketInfo(projectRoot, argument);
      if (!info) {
        console.log(`${colors.red}Plugin not found: ${argument}${colors.reset}`);
        return;
      }
      console.log(`\n${colors.bright}${colors.blue}═══ Plugin: ${info.name} ═══${colors.reset}\n`);
      console.log(`   Version:     ${info.version}`);
      console.log(`   Author:      ${info.author}`);
      console.log(`   Description: ${info.description}`);
      console.log(`   Repository:  ${info.repository}`);
      console.log(`   Tags:        ${(info.tags || []).join(', ')}\n`);
      break;
    }

    case 'install': {
      if (!argument) {
        console.log(`${colors.yellow}Usage: ag-kit market install <plugin-name>${colors.reset}`);
        return;
      }
      console.log(`${colors.cyan}Installing ${argument}...${colors.reset}`);
      const result = marketplace.installFromMarket(projectRoot, argument);
      if (result.success) {
        console.log(`${colors.green}✓ ${result.message}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${result.message}${colors.reset}`);
      }
      break;
    }

    case 'update': {
      const force = options.force || false;
      const result = marketplace.updateRegistryIndex(projectRoot, { force });
      if (result.updated) {
        console.log(`${colors.green}✓ Registry updated (${result.entryCount} entries)${colors.reset}`);
      } else {
        console.log(`${colors.yellow}Registry is fresh (${result.entryCount} entries). Use --force to update.${colors.reset}`);
      }
      break;
    }

    default:
      console.log(`${colors.yellow}Usage: ag-kit market <search|info|install|update> [arg]${colors.reset}`);
      break;
  }
}

/**
 * Self-healing CLI handler.
 *
 * @param {string} projectRoot - Root directory
 * @param {object} [options] - CLI options
 * @param {string} [options.file] - Path to CI log file
 * @param {boolean} [options.apply] - Apply patches (default: dry-run)
 * @returns {void}
 */
function healCommand(projectRoot, options = {}) {
  const selfHealing = require('./self-healing');
  let ciOutput = '';

  // Input source (E-3): file > stdin > last-saved
  if (options.file) {
    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}✗ CI log file not found: ${filePath}${colors.reset}`);
      process.exit(1);
    }
    ciOutput = fs.readFileSync(filePath, 'utf-8');
  } else {
    // Try last-saved CI output
    const lastCiPath = path.join(projectRoot, '.agent', 'engine', 'last-ci-output.txt');
    if (fs.existsSync(lastCiPath)) {
      ciOutput = fs.readFileSync(lastCiPath, 'utf-8');
    } else {
      console.log(`${colors.yellow}No CI output found. Use: ag-kit heal --file <path>${colors.reset}`);
      return;
    }
  }

  console.log(`\n${colors.bright}${colors.blue}═══ Self-Healing Pipeline ═══${colors.reset}\n`);

  // Detect failures
  const failures = selfHealing.detectFailure(ciOutput);

  if (failures.length === 0) {
    console.log(`   ${colors.green}✓ No failures detected — pipeline is healthy${colors.reset}\n`);
    return;
  }

  console.log(`   ${colors.red}${failures.length} failure(s) detected${colors.reset}\n`);

  // Diagnose and generate patches
  for (const failure of failures) {
    const diagnosis = selfHealing.diagnoseFailure(failure);
    console.log(`   ${colors.yellow}[${failure.type.toUpperCase()}]${colors.reset} ${failure.message}`);
    console.log(`   Diagnosis: ${diagnosis.category} — ${diagnosis.explanation}`);

    if (diagnosis.autoFixable) {
      const patch = selfHealing.generateFixPatch(failure, diagnosis);
      if (patch) {
        const dryRun = !options.apply;
        const result = selfHealing.applyFixWithConfirmation(projectRoot, patch, { dryRun });
        console.log(`   Patch ${patch.patchId}: ${dryRun ? 'DRY RUN' : result.applied ? 'APPLIED' : 'FAILED'}`);
      }
    } else {
      console.log(`   ${colors.cyan}→ Manual review required${colors.reset}`);
    }
    console.log('');
  }
}

/**
 * Dashboard sections for Phase 4 features.
 * Called by statusCommand() in ag-kit.js.
 *
 * @param {string} projectRoot - Root directory
 * @returns {void}
 */
function renderDashboardSections(projectRoot) {
  // ═══ Reputation ═══
  try {
    const reputation = require('./agent-reputation');
    const rankings = reputation.getRankings(projectRoot);

    console.log(`\n${colors.bright}${colors.cyan}═══ Reputation ═══${colors.reset}`);

    if (rankings.length === 0) {
      console.log('   No reputation data yet');
    } else {
      for (const agent of rankings.slice(0, 5)) {
        const trend = agent.trend;
        console.log(`   ${colors.green}${agent.agent}${colors.reset} — Score: ${agent.score} ${trend} | Reliability: ${agent.reliability}%`);
      }
    }
  } catch {
    // Reputation module not available — silently skip
  }

  // ═══ Sprint ═══
  try {
    const engMgr = require('./engineering-manager');
    const metrics = engMgr.getSprintMetrics(projectRoot);

    console.log(`\n${colors.bright}${colors.cyan}═══ Sprint ═══${colors.reset}`);
    console.log(`   Total Sprints: ${metrics.totalSprints}`);
    console.log(`   Active Sprint: ${metrics.activeSprint ? metrics.activeSprint.name : 'none'}`);
    console.log(`   Velocity:      ${metrics.velocity} tasks/sprint`);
  } catch {
    // Module not available — silently skip
  }

  // ═══ Health ═══
  try {
    const selfHealing = require('./self-healing');
    const report = selfHealing.getHealingReport(projectRoot);

    console.log(`\n${colors.bright}${colors.cyan}═══ Health ═══${colors.reset}`);
    console.log(`   Total Heals:    ${report.totalHeals}`);
    console.log(`   Success Rate:   ${report.successRate}%`);
    console.log(`   Pending Patches: ${report.pendingPatches}`);
  } catch {
    // Module not available — silently skip
  }
}

module.exports = {
  marketCommand,
  healCommand,
  renderDashboardSections,
};
