/**
 * Tests for lib/doc-discovery.js — Project Documentation Discovery
 */

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { discoverProjectDocs, findDocRoots, classifyDoc, rankAndFilter } = require('../../lib/doc-discovery');

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

let tmpDir;

function createTmpProject(structure) {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-discovery-'));
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(tmpDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content || `# ${path.basename(filePath)}\n`);
  }
  return tmpDir;
}

function cleanTmpProject() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// findDocRoots
// ---------------------------------------------------------------------------

describe('findDocRoots', () => {
  afterEach(cleanTmpProject);

  it('should find docs/ directory when it exists', () => {
    const root = createTmpProject({ 'docs/README.md': '# Docs' });
    const roots = findDocRoots(root);
    expect(roots.length).toBeGreaterThanOrEqual(1);
    expect(roots.some((r) => r.includes('docs'))).toBe(true);
  });

  it('should find doc/ as fallback', () => {
    const root = createTmpProject({ 'doc/guide.md': '# Guide' });
    const roots = findDocRoots(root);
    expect(roots.some((r) => r.includes('doc'))).toBe(true);
  });

  it('should find standalone root-level doc files', () => {
    const root = createTmpProject({ 'ARCHITECTURE.md': '# Arch' });
    const roots = findDocRoots(root);
    expect(roots.some((r) => r.includes('ARCHITECTURE.md'))).toBe(true);
  });

  it('should return empty array when no docs exist', () => {
    const root = createTmpProject({ 'src/index.js': 'console.log("hi")' });
    const roots = findDocRoots(root);
    expect(roots).toEqual([]);
  });

  it('should handle invalid projectRoot gracefully', () => {
    expect(findDocRoots(null)).toEqual([]);
    expect(findDocRoots('')).toEqual([]);
    expect(findDocRoots(123)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// classifyDoc
// ---------------------------------------------------------------------------

describe('classifyDoc', () => {
  it('should classify ARCHITECTURE.md as architecture/priority 0', () => {
    const result = classifyDoc('ARCHITECTURE.md');
    expect(result.category).toBe('architecture');
    expect(result.priority).toBe(0);
    expect(result.domains).toContain('architecture');
  });

  it('should classify design-system/ files as design-system/priority 0', () => {
    const result = classifyDoc('docs/design-system/tokens.md');
    expect(result.category).toBe('design-system');
    expect(result.priority).toBe(0);
    expect(result.domains).toContain('frontend');
  });

  it('should classify components.md as design-system', () => {
    const result = classifyDoc('docs/design-system/components.md');
    expect(result.category).toBe('design-system');
  });

  it('should classify COMPLIANCE.md as compliance/security', () => {
    const result = classifyDoc('docs/COMPLIANCE.md');
    expect(result.category).toBe('compliance');
    expect(result.domains).toContain('security');
    expect(result.priority).toBe(0);
  });

  it('should classify screens/ as screen-spec/frontend', () => {
    const result = classifyDoc('docs/screens/01-auth/login.md');
    expect(result.category).toBe('screen-spec');
    expect(result.domains).toContain('frontend');
    expect(result.priority).toBe(1);
  });

  it('should classify SCREENS-INVENTORY.md as screen-spec', () => {
    const result = classifyDoc('docs/SCREENS-INVENTORY.md');
    expect(result.category).toBe('screen-spec');
  });

  it('should classify epics/ as epic/planning', () => {
    const result = classifyDoc('docs/epics/E01-listing.md');
    expect(result.category).toBe('epic');
    expect(result.domains).toContain('planning');
  });

  it('should classify E-numbered files as epics', () => {
    const result = classifyDoc('docs/E03-payments-escrow.md');
    expect(result.category).toBe('epic');
  });

  it('should classify accessibility.md at root docs level as design-system with security domain', () => {
    const result = classifyDoc('docs/accessibility.md');
    expect(result.category).toBe('design-system');
    expect(result.domains).toContain('frontend');
    expect(result.domains).toContain('security');
  });

  it('should classify accessibility.md inside design-system/ via parent pattern', () => {
    const result = classifyDoc('docs/design-system/accessibility.md');
    expect(result.category).toBe('design-system');
    expect(result.domains).toContain('frontend');
  });

  it('should classify API.md as api-spec/backend', () => {
    const result = classifyDoc('docs/API.md');
    expect(result.category).toBe('api-spec');
    expect(result.domains).toContain('backend');
  });

  it('should classify ROADMAP.md as roadmap/planning', () => {
    const result = classifyDoc('docs/ROADMAP.md');
    expect(result.category).toBe('roadmap');
    expect(result.domains).toContain('planning');
  });

  it('should classify CHANGELOG.md as changelog/priority 3', () => {
    const result = classifyDoc('docs/CHANGELOG.md');
    expect(result.category).toBe('changelog');
    expect(result.priority).toBe(3);
  });

  it('should classify unknown files as general/priority 3', () => {
    const result = classifyDoc('docs/random-notes.md');
    expect(result.category).toBe('general');
    expect(result.priority).toBe(3);
  });

  it('should handle null/empty input gracefully', () => {
    expect(classifyDoc(null).category).toBe('general');
    expect(classifyDoc('').category).toBe('general');
  });
});

// ---------------------------------------------------------------------------
// rankAndFilter
// ---------------------------------------------------------------------------

describe('rankAndFilter', () => {
  const docs = [
    { relativePath: 'docs/CHANGELOG.md', category: 'changelog', domains: ['general'], priority: 3 },
    { relativePath: 'docs/ARCHITECTURE.md', category: 'architecture', domains: ['architecture'], priority: 0 },
    { relativePath: 'docs/design-system/tokens.md', category: 'design-system', domains: ['frontend', 'architecture'], priority: 0 },
    { relativePath: 'docs/ROADMAP.md', category: 'roadmap', domains: ['planning'], priority: 2 },
    { relativePath: 'docs/screens/login.md', category: 'screen-spec', domains: ['frontend'], priority: 1 },
  ];

  it('should rank higher-priority docs first', () => {
    const result = rankAndFilter(docs, [], 10);
    expect(result[0].relativePath).toBe('docs/ARCHITECTURE.md');
    expect(result[result.length - 1].relativePath).toBe('docs/CHANGELOG.md');
  });

  it('should boost domain-relevant docs', () => {
    const result = rankAndFilter(docs, ['frontend'], 10);
    // design-system has priority 0 + 2 domain matches (frontend, architecture with frontend active) = score 5
    // ARCHITECTURE has priority 0 + 0 domain match = score 3
    expect(result[0].domains).toContain('frontend');
  });

  it('should respect budget constraint', () => {
    const result = rankAndFilter(docs, [], 2);
    expect(result.length).toBe(2);
  });

  it('should return empty array for empty input', () => {
    expect(rankAndFilter([], ['frontend'], 10)).toEqual([]);
    expect(rankAndFilter(null, ['frontend'], 10)).toEqual([]);
  });

  it('should produce stable sort for equal scores', () => {
    const samePriority = [
      { relativePath: 'docs/b.md', category: 'general', domains: ['general'], priority: 2 },
      { relativePath: 'docs/a.md', category: 'general', domains: ['general'], priority: 2 },
    ];
    const result = rankAndFilter(samePriority, [], 10);
    expect(result[0].relativePath).toBe('docs/a.md');
    expect(result[1].relativePath).toBe('docs/b.md');
  });
});

// ---------------------------------------------------------------------------
// discoverProjectDocs (integration)
// ---------------------------------------------------------------------------

describe('discoverProjectDocs', () => {
  afterEach(cleanTmpProject);

  it('should discover DeelMarkt-like project structure', () => {
    const root = createTmpProject({
      'docs/ARCHITECTURE.md': '# Architecture',
      'docs/COMPLIANCE.md': '# Compliance',
      'docs/SCREENS-INVENTORY.md': '# Screens',
      'docs/ROADMAP.md': '# Roadmap',
      'docs/design-system/tokens.md': '# Tokens',
      'docs/design-system/components.md': '# Components',
      'docs/design-system/patterns.md': '# Patterns',
      'docs/design-system/accessibility.md': '# A11y',
      'docs/screens/01-auth/login.md': '# Login',
      'docs/screens/02-home/browse.md': '# Browse',
      'docs/epics/E01-listing.md': '# Listing',
      'docs/epics/E02-auth.md': '# Auth',
      'docs/CHANGELOG.md': '# Changelog',
    });

    const inventory = discoverProjectDocs(root, { domains: ['frontend'] });
    expect(inventory.totalFound).toBe(13);
    expect(inventory.returned).toBeLessThanOrEqual(8);
    expect(inventory.docs.length).toBeGreaterThan(0);
    // Design system and architecture should be top-ranked for frontend domain
    const topCategories = inventory.docs.slice(0, 4).map((d) => d.category);
    expect(topCategories).toContain('design-system');
  });

  it('should discover PathForge-like project structure', () => {
    const root = createTmpProject({
      'docs/AGENT_ARCHITECTURE.md': '# Agent Arch',
      'docs/BRANDING.md': '# Brand',
      'docs/ROADMAP.md': '# Roadmap',
      'docs/architecture/overview.md': '# Overview',
      'docs/guides/setup.md': '# Setup',
    });

    const inventory = discoverProjectDocs(root, { domains: ['architecture'] });
    expect(inventory.totalFound).toBe(5);
    expect(inventory.docs.length).toBe(5);
    // Architecture docs should be ranked highest
    expect(inventory.docs[0].domains).toContain('architecture');
  });

  it('should return empty inventory for project without docs', () => {
    const root = createTmpProject({
      'src/index.js': 'console.log("hi")',
      'package.json': '{}',
    });

    const inventory = discoverProjectDocs(root);
    expect(inventory.docs).toEqual([]);
    expect(inventory.totalFound).toBe(0);
    expect(inventory.returned).toBe(0);
  });

  it('should return empty inventory for invalid projectRoot', () => {
    const inventory = discoverProjectDocs(null);
    expect(inventory.docs).toEqual([]);
  });

  it('should return empty inventory for nonexistent directory', () => {
    const inventory = discoverProjectDocs('/nonexistent/path/12345');
    expect(inventory.docs).toEqual([]);
  });

  it('should skip archives directory', () => {
    const root = createTmpProject({
      'docs/ARCHITECTURE.md': '# Arch',
      'docs/archives/old-plan.md': '# Old',
      'docs/archives/deprecated.md': '# Deprecated',
    });

    const inventory = discoverProjectDocs(root);
    const paths = inventory.docs.map((d) => d.relativePath);
    expect(paths).not.toContain('docs/archives/old-plan.md');
    expect(paths).not.toContain('docs/archives/deprecated.md');
  });

  it('should respect maxDocs budget', () => {
    const files = {};
    for (let i = 0; i < 20; i++) {
      files[`docs/guide-${i}.md`] = `# Guide ${i}`;
    }
    const root = createTmpProject(files);

    const inventory = discoverProjectDocs(root, { maxDocs: 5 });
    expect(inventory.returned).toBeLessThanOrEqual(5);
    expect(inventory.totalFound).toBe(20);
  });

  it('should discover standalone root-level doc files', () => {
    const root = createTmpProject({
      'ARCHITECTURE.md': '# Root Arch',
      'src/main.js': 'console.log("hi")',
    });

    const inventory = discoverProjectDocs(root);
    expect(inventory.docs.length).toBe(1);
    expect(inventory.docs[0].relativePath).toBe('ARCHITECTURE.md');
    expect(inventory.docs[0].category).toBe('architecture');
  });

  it('should return frozen inventory', () => {
    const root = createTmpProject({ 'docs/README.md': '# Docs' });
    const inventory = discoverProjectDocs(root);
    expect(Object.isFrozen(inventory)).toBe(true);
  });

  it('should use defaults when maxDocs is 0 or negative', () => {
    const root = createTmpProject({
      'docs/ARCHITECTURE.md': '# Arch',
      'docs/README.md': '# Readme',
    });

    const inv0 = discoverProjectDocs(root, { maxDocs: 0 });
    expect(inv0.docs.length).toBeGreaterThan(0);

    const invNeg = discoverProjectDocs(root, { maxDocs: -1 });
    expect(invNeg.docs.length).toBeGreaterThan(0);
  });

  it('should prevent path traversal via relative path check', () => {
    const root = createTmpProject({ 'docs/README.md': '# Safe' });
    const inventory = discoverProjectDocs(root);
    for (const doc of inventory.docs) {
      expect(doc.relativePath.startsWith('..')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Alternative naming patterns
// ---------------------------------------------------------------------------

describe('alternative naming patterns', () => {
  // Design system alternatives
  it('should classify style-guide/ as design-system', () => {
    expect(classifyDoc('docs/style-guide/tokens.md').category).toBe('design-system');
  });

  it('should classify ui-kit/ as design-system', () => {
    expect(classifyDoc('docs/ui-kit/buttons.md').category).toBe('design-system');
  });

  it('should classify docs/theme/ as design-system (scoped to docs)', () => {
    expect(classifyDoc('docs/theme/dark-mode.md').category).toBe('design-system');
  });

  it('should classify docs/styles/ as design-system (scoped to docs)', () => {
    expect(classifyDoc('docs/styles/colors.md').category).toBe('design-system');
  });

  it('should NOT classify src/styles/ as design-system (ambiguous path)', () => {
    expect(classifyDoc('src/styles/theme.ts').category).toBe('general');
  });

  it('should classify typography.md as design-system', () => {
    expect(classifyDoc('docs/typography.md').category).toBe('design-system');
  });

  it('should classify colors.md as design-system', () => {
    expect(classifyDoc('docs/colors.md').category).toBe('design-system');
  });

  // Screen spec alternatives (scoped to docs)
  it('should classify docs/views/ as screen-spec (scoped to docs)', () => {
    expect(classifyDoc('docs/views/login.md').category).toBe('screen-spec');
  });

  it('should classify docs/pages/ as screen-spec (scoped to docs)', () => {
    expect(classifyDoc('docs/pages/dashboard.md').category).toBe('screen-spec');
  });

  it('should classify docs/layouts/ as screen-spec (scoped to docs)', () => {
    expect(classifyDoc('docs/layouts/sidebar.md').category).toBe('screen-spec');
  });

  it('should NOT classify src/pages/ as screen-spec (ambiguous path)', () => {
    expect(classifyDoc('src/pages/index.tsx').category).toBe('general');
  });

  it('should classify wireframes/ as screen-spec', () => {
    expect(classifyDoc('docs/wireframes/checkout.md').category).toBe('screen-spec');
  });

  it('should classify mockups/ as screen-spec', () => {
    expect(classifyDoc('docs/mockups/homepage.md').category).toBe('screen-spec');
  });

  // Epic/spec alternatives
  it('should classify docs/features/ as epic (scoped to docs)', () => {
    expect(classifyDoc('docs/features/auth.md').category).toBe('epic');
  });

  it('should NOT classify src/features/ as epic (ambiguous path)', () => {
    expect(classifyDoc('src/features/auth/index.ts').category).toBe('general');
  });

  it('should classify specs/ as epic', () => {
    expect(classifyDoc('docs/specs/api-v2.md').category).toBe('epic');
  });

  it('should classify stories/ as epic', () => {
    expect(classifyDoc('docs/stories/user-onboarding.md').category).toBe('epic');
  });

  it('should classify requirements/ as epic', () => {
    expect(classifyDoc('docs/requirements/phase-2.md').category).toBe('epic');
  });

  // API alternatives
  it('should classify endpoints/ as api-spec', () => {
    expect(classifyDoc('docs/endpoints/users.md').category).toBe('api-spec');
  });

  it('should classify swagger/ as api-spec', () => {
    expect(classifyDoc('docs/swagger/pets.md').category).toBe('api-spec');
  });

  it('should classify graphql/ as api-spec', () => {
    expect(classifyDoc('docs/graphql/schema.md').category).toBe('api-spec');
  });

  // Architecture alternatives
  it('should classify system-design/ as architecture', () => {
    expect(classifyDoc('docs/system-design/overview.md').category).toBe('architecture');
  });

  it('should classify infra/ as architecture', () => {
    expect(classifyDoc('docs/infra/networking.md').category).toBe('architecture');
  });

  it('should classify tech-design/ as architecture', () => {
    expect(classifyDoc('docs/tech-design/caching.md').category).toBe('architecture');
  });

  // Guidelines (priority 1)
  it('should classify guidelines/ as guide with priority 1', () => {
    const result = classifyDoc('docs/guidelines/naming.md');
    expect(result.category).toBe('guide');
    expect(result.priority).toBe(1);
  });

  it('should classify standards/ as guide with priority 1', () => {
    const result = classifyDoc('docs/standards/code-style.md');
    expect(result.category).toBe('guide');
    expect(result.priority).toBe(1);
  });

  it('should classify conventions/ as guide with priority 1', () => {
    const result = classifyDoc('docs/conventions/git.md');
    expect(result.category).toBe('guide');
    expect(result.priority).toBe(1);
  });

  // Runbook/ops alternatives
  it('should classify playbooks/ as guide/devops', () => {
    const result = classifyDoc('docs/playbooks/incident.md');
    expect(result.category).toBe('guide');
    expect(result.domains).toContain('devops');
  });

  it('should classify tutorials/ as guide', () => {
    expect(classifyDoc('docs/tutorials/getting-started.md').category).toBe('guide');
  });

  it('should classify how-to/ as guide', () => {
    expect(classifyDoc('docs/how-to/deploy.md').category).toBe('guide');
  });

  it('should classify operations/ as guide/devops', () => {
    const result = classifyDoc('docs/operations/runbook.md');
    expect(result.category).toBe('guide');
    expect(result.domains).toContain('devops');
  });

  it('should classify sre/ as guide/devops', () => {
    const result = classifyDoc('docs/sre/alerts.md');
    expect(result.category).toBe('guide');
    expect(result.domains).toContain('devops');
  });
});
