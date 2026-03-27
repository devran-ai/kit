/**
 * Devran AI Kit — Project Documentation Discovery
 *
 * Zero-config scanner that discovers, classifies, and ranks project-specific
 * documentation files. Enables workflows to automatically reference design
 * systems, architecture docs, screen specs, and guidelines without manual
 * user prompting.
 *
 * Design:
 *   - Scans docs/, doc/, and root-level files (ARCHITECTURE.md, COMPLIANCE.md)
 *   - Classifies each file by domain (frontend, security, architecture, etc.)
 *   - Ranks by priority + domain relevance to the current task
 *   - Returns a budget-constrained DocInventory
 *
 * Safety:
 *   - Hard file cap (200) prevents runaway on massive repos
 *   - Depth limit (3) prevents deep recursion
 *   - Symlink loop detection via inode tracking
 *   - All filesystem operations wrapped in try/catch
 *   - Never throws — returns empty inventory on failure
 *
 * @module lib/doc-discovery
 * @author Emre Dursun
 * @since v4.6.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');

const log = createLogger('doc-discovery');

// ---------------------------------------------------------------------------
// Constants (frozen — immutable at runtime)
// ---------------------------------------------------------------------------

/** @type {readonly string[]} Documentation directory names to scan */
const DOC_DIR_NAMES = Object.freeze(['docs', 'doc', 'documentation', '.docs']);

/** @type {readonly string[]} Standalone root-level doc files to discover */
const ROOT_DOC_FILES = Object.freeze([
  'ARCHITECTURE.md',
  'COMPLIANCE.md',
  'DESIGN.md',
  'SECURITY.md',
]);

/** @type {readonly string[]} Directories to skip during scan */
const SKIP_DIRS = Object.freeze([
  'node_modules', '.git', 'dist', 'build', '.next', '.agent',
  '__pycache__', '.dart_tool', '.flutter-plugins', 'archives',
  'archive', '.cache', 'coverage', '.turbo', '.vercel',
  '.svn', '.hg', 'vendor', '.terraform', '.pulumi',
  '.idea', '.vscode', 'tmp', '.tmp', '.docker',
]);

/** @type {number} Default maximum files to scan */
const DEFAULT_MAX_FILES = 200;

/** @type {number} Default maximum directory depth */
const DEFAULT_MAX_DEPTH = 3;

/** @type {number} Default maximum docs to return */
const DEFAULT_MAX_DOCS = 8;

/** @type {number} Default domain relevance boost */
const DEFAULT_DOMAIN_BOOST = 2;

// ---------------------------------------------------------------------------
// Classification Patterns
// ---------------------------------------------------------------------------

/**
 * @typedef {object} DocPattern
 * @property {RegExp} test - Pattern to match against relative path
 * @property {string} category - Document category
 * @property {string[]} domains - Relevant domains
 * @property {number} priority - 0=critical, 1=high, 2=medium, 3=low
 */

/** @type {readonly DocPattern[]} Ordered from most to least specific */
const DOC_PATTERNS = Object.freeze([
  // Priority 0 — Critical (architecture, design system, compliance)
  { test: /(?:^|\/)ARCHITECTURE\.md$/i, category: 'architecture', domains: ['architecture'], priority: 0 },
  { test: /(?:^|\/)architecture\//i, category: 'architecture', domains: ['architecture'], priority: 0 },
  { test: /(?:^|\/)design-system\//i, category: 'design-system', domains: ['frontend', 'architecture'], priority: 0 },
  { test: /(?:^|\/)tokens\.md$/i, category: 'design-system', domains: ['frontend', 'architecture'], priority: 0 },
  { test: /(?:^|\/)components\.md$/i, category: 'design-system', domains: ['frontend', 'architecture'], priority: 0 },
  { test: /(?:^|\/)patterns\.md$/i, category: 'design-system', domains: ['frontend', 'architecture'], priority: 0 },
  { test: /(?:^|\/)COMPLIANCE\.md$/i, category: 'compliance', domains: ['security'], priority: 0 },
  { test: /(?:^|\/)SECURITY\.md$/i, category: 'compliance', domains: ['security'], priority: 0 },

  // Priority 1 — High (screens, epics, accessibility, API)
  { test: /(?:^|\/)screens\//i, category: 'screen-spec', domains: ['frontend'], priority: 1 },
  { test: /(?:^|\/)SCREENS-INVENTORY\.md$/i, category: 'screen-spec', domains: ['frontend'], priority: 1 },
  { test: /(?:^|\/)epics\//i, category: 'epic', domains: ['planning'], priority: 1 },
  { test: /E\d+-.*\.md$/i, category: 'epic', domains: ['planning'], priority: 1 },
  { test: /(?:^|\/)accessibility\.md$/i, category: 'design-system', domains: ['frontend', 'security'], priority: 1 },
  { test: /(?:^|\/)a11y\.md$/i, category: 'design-system', domains: ['frontend', 'security'], priority: 1 },
  { test: /(?:^|\/)api-docs?\//i, category: 'api-spec', domains: ['backend'], priority: 1 },
  { test: /(?:^|\/)API\.md$/i, category: 'api-spec', domains: ['backend'], priority: 1 },
  { test: /(?:^|\/)openapi/i, category: 'api-spec', domains: ['backend'], priority: 1 },

  // Priority 2 — Medium (guides, roadmap, branding, runbooks)
  { test: /(?:^|\/)guides?\//i, category: 'guide', domains: ['general'], priority: 2 },
  { test: /(?:^|\/)SETUP\.md$/i, category: 'guide', domains: ['general'], priority: 2 },
  { test: /(?:^|\/)DEVELOPMENT/i, category: 'guide', domains: ['general'], priority: 2 },
  { test: /(?:^|\/)ROADMAP\.md$/i, category: 'roadmap', domains: ['planning'], priority: 2 },
  { test: /(?:^|\/)SPRINT/i, category: 'roadmap', domains: ['planning'], priority: 2 },
  { test: /(?:^|\/)runbooks?\//i, category: 'guide', domains: ['devops', 'reliability'], priority: 2 },
  { test: /(?:^|\/)baselines?\//i, category: 'guide', domains: ['devops', 'reliability'], priority: 2 },
  { test: /(?:^|\/)BRANDING\.md$/i, category: 'design-system', domains: ['frontend'], priority: 2 },
  { test: /(?:^|\/)README\.md$/i, category: 'guide', domains: ['general'], priority: 2 },

  // Priority 3 — Low (changelog, research)
  { test: /(?:^|\/)CHANGELOG\.md$/i, category: 'changelog', domains: ['general'], priority: 3 },
  { test: /(?:^|\/)research\//i, category: 'general', domains: ['general'], priority: 3 },
]);

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {object} DiscoveredDoc
 * @property {string} relativePath - Path relative to project root
 * @property {string} category - Document category
 * @property {string[]} domains - Relevant domain tags
 * @property {number} priority - 0=critical, 1=high, 2=medium, 3=low
 */

/**
 * @typedef {object} DocInventory
 * @property {DiscoveredDoc[]} docs - Discovered docs sorted by relevance
 * @property {string[]} scannedRoots - Directories that were scanned
 * @property {number} totalFound - Total docs found before budget filtering
 * @property {number} returned - Docs returned after budget filtering
 */

/**
 * @typedef {object} DiscoverOptions
 * @property {number} [maxDocs] - Maximum docs to return (default: 8)
 * @property {number} [maxDepth] - Maximum scan depth (default: 3)
 * @property {number} [maxFiles] - Maximum files to scan (default: 200)
 * @property {string[]} [domains] - Active domains for relevance scoring
 * @property {number} [domainBoost] - Score boost per matching domain (default: 2)
 */

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Discovers documentation directories and standalone root-level doc files.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @returns {string[]} Array of absolute paths to doc roots/files that exist
 */
function findDocRoots(projectRoot) {
  if (!projectRoot || typeof projectRoot !== 'string') {
    return [];
  }

  const roots = [];

  // Check standard doc directories
  for (const dirName of DOC_DIR_NAMES) {
    try {
      const dirPath = path.join(projectRoot, dirName);
      const stat = fs.statSync(dirPath);
      if (stat.isDirectory()) {
        roots.push(dirPath);
      }
    } catch {
      // Directory doesn't exist — skip
    }
  }

  // Check standalone root-level doc files
  for (const fileName of ROOT_DOC_FILES) {
    try {
      const filePath = path.join(projectRoot, fileName);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        roots.push(filePath);
      }
    } catch {
      // File doesn't exist — skip
    }
  }

  return roots;
}

/**
 * Recursively scans a directory tree for markdown files.
 *
 * @param {string} docRoot - Absolute path to scan root
 * @param {string} projectRoot - Absolute path to project root
 * @param {number} maxDepth - Maximum recursion depth
 * @param {number} maxFiles - Hard cap on files to collect
 * @returns {string[]} Array of relative paths (relative to projectRoot)
 */
function scanDocTree(docRoot, projectRoot, maxDepth, maxFiles) {
  const collected = [];
  const visitedPaths = new Set();

  /**
   * @param {string} dir - Current directory to scan
   * @param {number} depth - Current depth level
   */
  function walk(dir, depth) {
    if (depth > maxDepth || collected.length >= maxFiles) {
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      log.warn('Cannot read directory', { dir: path.relative(projectRoot, dir), error: err.message });
      return;
    }

    for (const entry of entries) {
      if (collected.length >= maxFiles) {
        break;
      }

      const fullPath = path.join(dir, entry.name);

      // Symlink loop detection via realpath (cross-platform, Windows-safe)
      try {
        const realPath = fs.realpathSync(fullPath);
        if (visitedPaths.has(realPath)) {
          continue; // Symlink loop detected
        }
        visitedPaths.add(realPath);
      } catch {
        continue; // Cannot resolve — skip
      }

      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        if (!SKIP_DIRS.includes(lowerName)) {
          walk(fullPath, depth + 1);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
        // Skip files that escaped project root via symlink (CWE-22)
        if (relativePath.startsWith('..')) {
          continue;
        }
        collected.push(relativePath);
      }
    }
  }

  // If docRoot is a file (standalone root doc), add it directly
  try {
    const rootStat = fs.statSync(docRoot);
    if (rootStat.isFile() && docRoot.endsWith('.md')) {
      const relativePath = path.relative(projectRoot, docRoot).replace(/\\/g, '/');
      return [relativePath];
    }
  } catch {
    return [];
  }

  walk(docRoot, 0);
  return collected;
}

/**
 * Classifies a documentation file by its path and filename.
 * Matches against DOC_PATTERNS in order (first match wins).
 *
 * @param {string} relativePath - Path relative to project root (forward slashes)
 * @returns {{ category: string, domains: string[], priority: number }}
 */
function classifyDoc(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    return { category: 'general', domains: ['general'], priority: 3 };
  }

  for (const pattern of DOC_PATTERNS) {
    if (pattern.test.test(relativePath)) {
      return {
        category: pattern.category,
        domains: [...pattern.domains],
        priority: pattern.priority,
      };
    }
  }

  // No pattern matched — classify as general
  return { category: 'general', domains: ['general'], priority: 3 };
}

/**
 * Ranks discovered docs by relevance and applies budget constraint.
 *
 * Scoring: score = (3 - priority) + (domainBoost × overlapping_domains)
 * Sort: score desc → priority asc (tiebreaker) → path alpha (stability)
 *
 * @param {DiscoveredDoc[]} docs - All discovered documents
 * @param {string[]} activeDomains - Currently active domains from task analysis
 * @param {number} budget - Maximum docs to return
 * @param {number} [domainBoost] - Score bonus per matching domain (default: 2)
 * @returns {DiscoveredDoc[]}
 */
function rankAndFilter(docs, activeDomains, budget, domainBoost) {
  if (!Array.isArray(docs) || docs.length === 0) {
    return [];
  }

  const boost = typeof domainBoost === 'number' ? domainBoost : DEFAULT_DOMAIN_BOOST;
  const domains = Array.isArray(activeDomains) ? activeDomains : [];

  const scored = docs.map((doc) => {
    const baseScore = 3 - doc.priority;
    const overlap = doc.domains.filter((d) => domains.includes(d)).length;
    const score = baseScore + (boost * overlap);
    return { ...doc, _score: score };
  });

  // Sort: score descending, priority ascending (tiebreaker), path alphabetical (stability)
  scored.sort((a, b) => {
    if (b._score !== a._score) {
      return b._score - a._score;
    }
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.relativePath.localeCompare(b.relativePath);
  });

  // Apply budget and strip internal _score field
  const budgetCount = typeof budget === 'number' && budget > 0 ? budget : DEFAULT_MAX_DOCS;

  return scored.slice(0, budgetCount).map(({ _score, ...doc }) => doc);
}

/**
 * Main entry point: discovers project documentation.
 *
 * Scans standard documentation directories, classifies files by domain,
 * ranks by relevance to the current task, and returns a budget-constrained
 * inventory. Zero-config — works with any project structure.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {DiscoverOptions} [options] - Discovery options
 * @returns {DocInventory} Frozen inventory of discovered documentation
 */
function discoverProjectDocs(projectRoot, options = {}) {
  // Validate numeric options — reject negative/zero, default on falsy
  const maxDocs = (typeof options.maxDocs === 'number' && options.maxDocs > 0) ? options.maxDocs : DEFAULT_MAX_DOCS;
  const maxDepth = (typeof options.maxDepth === 'number' && options.maxDepth > 0) ? options.maxDepth : DEFAULT_MAX_DEPTH;
  const maxFiles = (typeof options.maxFiles === 'number' && options.maxFiles > 0) ? options.maxFiles : DEFAULT_MAX_FILES;
  const activeDomains = options.domains || [];
  const domainBoost = (typeof options.domainBoost === 'number' && options.domainBoost >= 0) ? options.domainBoost : DEFAULT_DOMAIN_BOOST;

  /** @type {DocInventory} */
  const emptyInventory = Object.freeze({
    docs: [],
    scannedRoots: [],
    totalFound: 0,
    returned: 0,
  });

  if (!projectRoot || typeof projectRoot !== 'string') {
    return emptyInventory;
  }

  // Canonicalize and require absolute path (CWE-22 defense)
  const resolvedRoot = path.resolve(projectRoot);
  if (!path.isAbsolute(resolvedRoot)) {
    return emptyInventory;
  }

  try {
    // Step 1: Find documentation roots (using canonicalized path)
    const docRoots = findDocRoots(resolvedRoot);
    if (docRoots.length === 0) {
      return emptyInventory;
    }

    // Step 2: Scan all roots for markdown files
    const allPaths = [];
    for (const root of docRoots) {
      const paths = scanDocTree(root, resolvedRoot, maxDepth, maxFiles - allPaths.length);
      for (const p of paths) {
        if (allPaths.length >= maxFiles) {
          break;
        }
        allPaths.push(p);
      }
    }

    if (allPaths.length === 0) {
      return Object.freeze({
        docs: [],
        scannedRoots: docRoots.map((r) => path.relative(resolvedRoot, r).replace(/\\/g, '/')),
        totalFound: 0,
        returned: 0,
      });
    }

    // Step 3: Classify each file
    const classified = allPaths.map((relativePath) => {
      const classification = classifyDoc(relativePath);
      return Object.freeze({
        relativePath,
        category: classification.category,
        domains: classification.domains,
        priority: classification.priority,
      });
    });

    // Step 4: Rank and filter by relevance + budget
    const ranked = rankAndFilter(classified, activeDomains, maxDocs, domainBoost);

    return Object.freeze({
      docs: ranked,
      scannedRoots: docRoots.map((r) => path.relative(resolvedRoot, r).replace(/\\/g, '/')),
      totalFound: classified.length,
      returned: ranked.length,
    });
  } catch (err) {
    log.warn('Project doc discovery failed', { projectRoot, error: err.message });
    return emptyInventory;
  }
}

module.exports = {
  discoverProjectDocs,
  findDocRoots,
  classifyDoc,
  rankAndFilter,
};
