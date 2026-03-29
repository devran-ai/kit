/**
 * Devran AI Kit — Document Generator
 *
 * Manifest-driven template registry with two-tier template engine:
 *   Tier 1 — Variable substitution: {{variable.path}}
 *   Tier 2 — Section-level conditionals: <!-- IF:flag -->...<!-- ENDIF:flag -->
 *
 * Provides:
 * - Template registry loading from manifest.json + plugin manifests
 * - Dependency-ordered batch generation
 * - Cross-document consistency validation (4 checks)
 * - Mermaid diagram generation (C4, data flow, deployment)
 * - Staging-directory-aware output
 *
 * Zero external dependencies. All template logic is pure string processing.
 *
 * @module lib/doc-generator
 * @since v5.1.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const { readJsonSafe } = require('./io');
const { AGENT_DIR } = require('./constants');
const { calculateQualityScore } = require('./quality-score');

const log = createLogger('doc-generator');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Relative path within AGENT_DIR to onboarding templates */
const TEMPLATES_ONBOARDING_DIR = path.join('templates', 'onboarding');

/** Plugin templates directory pattern */
const TEMPLATES_PLUGINS_DIR = path.join('templates', 'plugins');

/** Manifest file name */
const MANIFEST_FILE = 'manifest.json';

/** Current manifest schema version */
const MANIFEST_SCHEMA_VERSION = '1.0.0';

/** Regex for Tier-1 variable substitution: {{key}} or {{key.nested}} */
const VAR_PATTERN = /\{\{(\w[\w.]*)\}\}/g;

/** Regex for Tier-2 section conditionals: <!-- IF:flag -->...<!-- ENDIF:flag --> */
const CONDITIONAL_PATTERN = /<!--\s*IF:(\w+)\s*-->([\s\S]*?)<!--\s*ENDIF:\1\s*-->/g;

/** Regex to detect remaining unresolved variable tokens */
const UNRESOLVED_VAR_PATTERN = /\{\{[\w.]+\}\}/g;

/** Regex to detect cross-references to other .md files */
const CROSS_REF_PATTERN = /(?:See|see|Refer to|refer to|defined in|Details in)\s+(\S+\.md)/g;

/** Regex to detect markdown headers */
const HEADER_PATTERN = /^(#{1,6})\s+(.+)$/gm;

/**
 * Valid audience tags for templates.
 * @type {ReadonlyArray<string>}
 */
const VALID_AUDIENCES = Object.freeze([
  'all', 'developer', 'designer', 'pm', 'stakeholder',
]);

/**
 * Validation severity levels.
 * @type {Readonly<Record<string, string>>}
 */
const SEVERITY = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
});

// ─── Template Value Resolution ────────────────────────────────────────────────

/**
 * Resolves a dot-separated key path from a data object.
 * e.g., resolve({ a: { b: 'c' } }, 'a.b') → 'c'
 *
 * @param {object} data - Data object to resolve from
 * @param {string} keyPath - Dot-separated key path
 * @returns {string} Resolved value or empty string
 */
function resolveValue(data, keyPath) {
  if (!data || typeof data !== 'object') return '';

  const parts = keyPath.split('.');
  let current = data;

  for (const part of parts) {
    if (current === null || current === undefined) return '';
    if (typeof current !== 'object') return '';
    current = current[part];
  }

  if (current === null || current === undefined) return '';
  if (Array.isArray(current)) return current.join(', ');
  return String(current);
}

/**
 * Resolves a condition flag from profile data.
 * Supports simple flags (hasMobile, hasAuth) or dot-path boolean checks.
 *
 * @param {object} data - Profile/context data
 * @param {string} flag - Condition flag name
 * @returns {boolean}
 */
function resolveCondition(data, flag) {
  if (!data || typeof data !== 'object') return false;

  // Direct boolean property
  if (typeof data[flag] === 'boolean') return data[flag];

  // Dot-path resolution
  const value = resolveValue(data, flag);
  if (value === 'true') return true;
  if (value === 'false' || value === '' || value === '0') return false;

  // Truthy check for non-empty resolved values
  return Boolean(value);
}

// ─── Two-Tier Template Engine ─────────────────────────────────────────────────

/**
 * Processes a template string through the two-tier engine.
 *
 * Tier 1: Variable substitution — replaces {{key.path}} with resolved values
 * Tier 2: Section conditionals — includes/excludes <!-- IF:flag -->...<!-- ENDIF:flag --> blocks
 *
 * @param {string} template - Template string
 * @param {object} data - Data context for variable resolution
 * @param {object} [conditions] - Condition flags (overrides data-based resolution)
 * @returns {string} Processed template
 */
function processTemplate(template, data, conditions) {
  if (!template || typeof template !== 'string') return '';
  if (!data || typeof data !== 'object') data = {};

  const mergedConditions = { ...data, ...(conditions || {}) };

  // Tier 2 first: resolve conditionals (removes/keeps blocks)
  let result = template.replace(CONDITIONAL_PATTERN, (_, flag, content) => {
    const include = resolveCondition(mergedConditions, flag);
    return include ? content : '';
  });

  // Tier 1: variable substitution
  result = result.replace(VAR_PATTERN, (_, keyPath) => {
    return resolveValue(data, keyPath);
  });

  // Clean up empty lines left by removed conditionals (max 3 consecutive)
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result;
}

// ─── Manifest Registry ────────────────────────────────────────────────────────

/**
 * Loads the onboarding template manifest.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ valid: boolean, manifest: object|null, errors: string[] }}
 */
function loadManifest(projectRoot) {
  const manifestPath = path.join(
    projectRoot, AGENT_DIR, TEMPLATES_ONBOARDING_DIR, MANIFEST_FILE
  );

  const data = readJsonSafe(manifestPath, null);

  if (!data) {
    return { valid: false, manifest: null, errors: [`Manifest not found: ${manifestPath}`] };
  }

  const errors = validateManifest(data);
  return {
    valid: errors.length === 0,
    manifest: data,
    errors,
  };
}

/**
 * Validates a manifest object structure.
 *
 * @param {object} manifest - Manifest data
 * @returns {string[]} Array of validation errors (empty if valid)
 */
function validateManifest(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return ['Manifest must be a non-null object'];
  }

  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    errors.push(`Unsupported manifest schemaVersion: "${manifest.schemaVersion}" (expected: "${MANIFEST_SCHEMA_VERSION}")`);
  }

  if (!Array.isArray(manifest.templates)) {
    errors.push('Manifest must have a "templates" array');
    return errors;
  }

  const fileNames = new Set();

  for (let i = 0; i < manifest.templates.length; i++) {
    const tmpl = manifest.templates[i];
    const prefix = `templates[${i}]`;

    if (!tmpl.file || typeof tmpl.file !== 'string') {
      errors.push(`${prefix}: missing or invalid "file" field`);
      continue;
    }

    if (fileNames.has(tmpl.file)) {
      errors.push(`${prefix}: duplicate file "${tmpl.file}"`);
    }
    fileNames.add(tmpl.file);

    if (!Array.isArray(tmpl.requires)) {
      errors.push(`${prefix} (${tmpl.file}): "requires" must be an array`);
    }

    if (!Array.isArray(tmpl.audience)) {
      errors.push(`${prefix} (${tmpl.file}): "audience" must be an array`);
    } else {
      for (const aud of tmpl.audience) {
        if (!VALID_AUDIENCES.includes(aud)) {
          errors.push(`${prefix} (${tmpl.file}): invalid audience "${aud}"`);
        }
      }
    }

    if (!tmpl.applicability || typeof tmpl.applicability !== 'object') {
      errors.push(`${prefix} (${tmpl.file}): "applicability" must be an object`);
    }
  }

  // Validate dependency references
  for (const tmpl of manifest.templates) {
    if (!Array.isArray(tmpl.requires)) continue;
    for (const dep of tmpl.requires) {
      // Dependencies reference file stems (without .md)
      const depFile = `${dep}.md`;
      if (!fileNames.has(depFile) && !fileNames.has(dep)) {
        errors.push(`${tmpl.file}: dependency "${dep}" not found in manifest`);
      }
    }
  }

  return errors;
}

/**
 * Loads plugin template manifests from templates/plugins/<name>/.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Array<{ plugin: string, manifest: object, errors: string[] }>}
 */
function loadPluginManifests(projectRoot) {
  const pluginsDir = path.join(projectRoot, AGENT_DIR, TEMPLATES_PLUGINS_DIR);
  const results = [];

  if (!fs.existsSync(pluginsDir)) return results;

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;

    const manifestPath = path.join(pluginsDir, entry.name, MANIFEST_FILE);
    const data = readJsonSafe(manifestPath, null);

    if (data) {
      const errors = validateManifest(data);
      results.push({ plugin: entry.name, manifest: data, errors });
    }
  }

  return results;
}

/**
 * Resolves the full template registry: core + plugins.
 * Returns templates in dependency order.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{ templates: object[], errors: string[] }}
 */
function resolveTemplateRegistry(projectRoot) {
  const errors = [];

  // Load core manifest
  const core = loadManifest(projectRoot);
  if (!core.valid) {
    return { templates: [], errors: core.errors };
  }

  let allTemplates = [...core.manifest.templates];

  // Load plugin manifests
  const plugins = loadPluginManifests(projectRoot);
  for (const plugin of plugins) {
    if (plugin.errors.length > 0) {
      errors.push(...plugin.errors.map((e) => `[plugin:${plugin.plugin}] ${e}`));
    } else {
      allTemplates = [...allTemplates, ...plugin.manifest.templates];
    }
  }

  // Topological sort by dependency order
  const sorted = topologicalSort(allTemplates);
  if (sorted.error) {
    errors.push(sorted.error);
    return { templates: allTemplates, errors };
  }

  return { templates: sorted.ordered, errors };
}

/**
 * Topological sort of templates by their dependency requirements.
 *
 * @param {object[]} templates - Template entries with file and requires
 * @returns {{ ordered: object[], error: string|null }}
 */
function topologicalSort(templates) {
  const byFile = new Map();
  const byStem = new Map();

  for (const tmpl of templates) {
    byFile.set(tmpl.file, tmpl);
    const stem = tmpl.file.replace(/\.md$/, '');
    byStem.set(stem, tmpl);
  }

  const visited = new Set();
  const visiting = new Set();
  const ordered = [];

  function visit(tmpl) {
    if (visited.has(tmpl.file)) return null;
    if (visiting.has(tmpl.file)) {
      return `Circular dependency detected involving: ${tmpl.file}`;
    }

    visiting.add(tmpl.file);

    for (const dep of (tmpl.requires || [])) {
      const depTmpl = byFile.get(dep) || byFile.get(`${dep}.md`) || byStem.get(dep);
      if (depTmpl) {
        const err = visit(depTmpl);
        if (err) return err;
      }
    }

    visiting.delete(tmpl.file);
    visited.add(tmpl.file);
    ordered.push(tmpl);
    return null;
  }

  for (const tmpl of templates) {
    const err = visit(tmpl);
    if (err) return { ordered: [], error: err };
  }

  return { ordered, error: null };
}

// ─── Document Validation ──────────────────────────────────────────────────────

/**
 * Validates a generated document with 4 post-generation checks.
 *
 * 1. Remaining {{tokens}} → error
 * 2. Empty sections (header with no content before next header) → warning
 * 3. Broken cross-references (See X.md when X.md not generated) → error
 * 4. Inconsistent project names → error
 *
 * @param {string} content - Generated document content
 * @param {string} fileName - Document file name
 * @param {string} projectName - Expected project name
 * @param {Set<string>} generatedFiles - Set of files that were/will be generated
 * @returns {{ valid: boolean, issues: Array<{ check: number, severity: string, message: string }> }}
 */
function validateDocument(content, fileName, projectName, generatedFiles) {
  const issues = [];

  if (!content || typeof content !== 'string') {
    return { valid: false, issues: [{ check: 0, severity: SEVERITY.ERROR, message: 'Document content is empty or invalid' }] };
  }

  // Check 1: Remaining unresolved {{tokens}}
  const unresolvedTokens = content.match(UNRESOLVED_VAR_PATTERN);
  if (unresolvedTokens) {
    const unique = [...new Set(unresolvedTokens)];
    issues.push({
      check: 1,
      severity: SEVERITY.ERROR,
      message: `Unresolved template tokens in ${fileName}: ${unique.join(', ')}`,
    });
  }

  // Check 2: Empty sections (header followed immediately by another header or EOF)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const headerMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (!headerMatch) continue;

    // Look ahead for content between this header and the next header (or EOF)
    let hasContent = false;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (line.match(/^#{1,6}\s+/)) break;
      if (line.length > 0) {
        hasContent = true;
        break;
      }
    }

    if (!hasContent) {
      issues.push({
        check: 2,
        severity: SEVERITY.WARNING,
        message: `Empty section in ${fileName}: "${headerMatch[2]}" (line ${i + 1})`,
      });
    }
  }

  // Check 3: Broken cross-references
  if (generatedFiles && generatedFiles.size > 0) {
    let match;
    const crossRefRegex = /(?:See|see|Refer to|refer to|defined in|Details in)\s+(\S+\.md)/g;
    while ((match = crossRefRegex.exec(content)) !== null) {
      const referencedFile = match[1];
      if (!generatedFiles.has(referencedFile)) {
        issues.push({
          check: 3,
          severity: SEVERITY.ERROR,
          message: `Broken cross-reference in ${fileName}: "${referencedFile}" not in generated set`,
        });
      }
    }
  }

  // Check 4: Inconsistent project names
  if (projectName && projectName.trim()) {
    // Look for the project name in the title (first H1)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      const titleName = titleMatch[1].trim();
      // Check if the title contains the project name or a variant
      if (!titleName.toLowerCase().includes(projectName.toLowerCase()) &&
          !projectName.toLowerCase().includes(titleName.toLowerCase().split(/\s*[—–-]\s*/)[0].trim())) {
        issues.push({
          check: 4,
          severity: SEVERITY.ERROR,
          message: `Project name mismatch in ${fileName}: title "${titleName}" does not contain "${projectName}"`,
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === SEVERITY.ERROR);
  return { valid: !hasErrors, issues };
}

/**
 * Validates consistency across multiple generated documents.
 *
 * @param {Array<{ fileName: string, content: string }>} documents - Generated documents
 * @param {string} projectName - Expected project name
 * @returns {{ valid: boolean, issues: Array<{ check: number, severity: string, message: string }> }}
 */
function validateDocumentSet(documents, projectName) {
  const allIssues = [];
  const generatedFiles = new Set(documents.map((d) => d.fileName));

  for (const doc of documents) {
    const result = validateDocument(doc.content, doc.fileName, projectName, generatedFiles);
    allIssues.push(...result.issues);
  }

  const hasErrors = allIssues.some((i) => i.severity === SEVERITY.ERROR);
  return { valid: !hasErrors, issues: allIssues };
}

// ─── Mermaid Diagram Generation ───────────────────────────────────────────────

/**
 * Generates a C4 Level 1 component diagram in Mermaid syntax.
 *
 * @param {object} profile - Project profile
 * @returns {string} Mermaid diagram code block
 */
function generateC4Diagram(profile) {
  const name = profile.name || 'System';
  const platforms = profile.platforms || [];

  const lines = [
    '```mermaid',
    'C4Context',
    `  title ${name} — System Context Diagram`,
    '',
    `  Person(user, "User", "End user of ${name}")`,
  ];

  // Main system
  lines.push(`  System(system, "${name}", "${profile.description || 'Main application'}")`);

  // External systems based on integrations
  if (profile.integrations && profile.integrations.length > 0) {
    lines.push('');
    for (const integration of profile.integrations) {
      const safeId = integration.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      lines.push(`  System_Ext(${safeId}, "${integration}", "External service")`);
    }
  }

  // Relationships
  lines.push('');
  lines.push('  Rel(user, system, "Uses")');

  if (profile.integrations) {
    for (const integration of profile.integrations) {
      const safeId = integration.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      lines.push(`  Rel(system, ${safeId}, "Integrates with")`);
    }
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Generates a data flow diagram in Mermaid syntax.
 *
 * @param {object} profile - Project profile
 * @returns {string} Mermaid diagram code block
 */
function generateDataFlowDiagram(profile) {
  const name = profile.name || 'System';
  const lines = [
    '```mermaid',
    'flowchart LR',
    `  User([User]) --> |Request| FE[Frontend]`,
  ];

  const platforms = profile.platforms || [];

  if (platforms.includes('web') || platforms.includes('ios') || platforms.includes('android')) {
    lines.push('  FE --> |API Call| BE[Backend]');
    lines.push('  BE --> |Query| DB[(Database)]');
    lines.push('  BE --> |Response| FE');
  } else if (platforms.includes('api')) {
    lines.push('  User --> |API Call| BE[Backend]');
    lines.push('  BE --> |Query| DB[(Database)]');
  } else if (platforms.includes('cli')) {
    lines.push('  User --> |Command| CLI[CLI]');
    lines.push('  CLI --> |Process| Core[Core Logic]');
  }

  if (profile.auth && profile.auth.method && profile.auth.method.length > 0) {
    lines.push('  BE --> |Verify| Auth[Auth Service]');
  }

  if (profile.integrations && profile.integrations.length > 0) {
    lines.push(`  BE --> |Call| Ext[External APIs]`);
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Generates a deployment topology diagram in Mermaid syntax.
 *
 * @param {object} profile - Project profile
 * @returns {string} Mermaid diagram code block
 */
function generateDeploymentDiagram(profile) {
  const name = profile.name || 'System';
  const hosting = profile.budget?.hostingPreference || 'cloud';

  const lines = [
    '```mermaid',
    'flowchart TB',
    `  subgraph "${name} Deployment"`,
  ];

  const platforms = profile.platforms || [];

  if (platforms.includes('web')) {
    lines.push('    CDN[CDN / Static Assets]');
    lines.push('    Web[Web Server]');
  }
  if (platforms.includes('api') || platforms.includes('web')) {
    lines.push('    API[API Server]');
    lines.push('    DB[(Database)]');
  }
  if (platforms.includes('ios') || platforms.includes('android')) {
    lines.push('    Mobile[Mobile App]');
  }

  lines.push('  end');

  // Connections
  if (platforms.includes('web')) {
    lines.push('  CDN --> Web');
    if (platforms.includes('api') || platforms.includes('web')) {
      lines.push('  Web --> API');
    }
  }
  if (platforms.includes('api') || platforms.includes('web')) {
    lines.push('  API --> DB');
  }
  if (platforms.includes('ios') || platforms.includes('android')) {
    lines.push('  Mobile --> API');
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Generates all Mermaid diagrams for a project profile.
 *
 * @param {object} profile - Project profile
 * @returns {{ c4: string, dataFlow: string, deployment: string }}
 */
function generateMermaidDiagrams(profile) {
  return {
    c4: generateC4Diagram(profile),
    dataFlow: generateDataFlowDiagram(profile),
    deployment: generateDeploymentDiagram(profile),
  };
}

// ─── Batch Generation ─────────────────────────────────────────────────────────

/**
 * Reads a template file from the templates directory.
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} fileName - Template file name
 * @returns {string|null} Template content or null if not found
 */
function readTemplate(projectRoot, fileName) {
  // Defense-in-depth: strip path components to prevent directory traversal
  const safeName = path.basename(fileName);
  const templatePath = path.join(
    projectRoot, AGENT_DIR, TEMPLATES_ONBOARDING_DIR, safeName
  );

  if (!fs.existsSync(templatePath)) {
    log.warn(`Template not found: ${templatePath}`);
    return null;
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Generates a single document from a template.
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} templateFile - Template file name
 * @param {object} data - Data context for template processing
 * @param {object} [conditions] - Condition flags
 * @returns {{ fileName: string, content: string|null, error: string|null }}
 */
function generateDocument(projectRoot, templateFile, data, conditions) {
  const template = readTemplate(projectRoot, templateFile);

  if (!template) {
    return { fileName: templateFile, content: null, error: `Template not found: ${templateFile}` };
  }

  const content = processTemplate(template, data, conditions);
  return { fileName: templateFile, content, error: null };
}

/**
 * Generates all applicable documents in dependency order.
 *
 * @param {string} projectRoot - Project root directory
 * @param {object} profile - Project profile
 * @param {string[]} queue - Ordered list of template files to generate
 * @param {object} [options] - Generation options
 * @param {object} [options.conditions] - Additional condition flags
 * @param {object} [options.extraData] - Additional data context
 * @returns {{ documents: Array<{ fileName: string, content: string }>, errors: string[], validation: object }}
 */
function generateBatch(projectRoot, profile, queue, options = {}) {
  const documents = [];
  const errors = [];

  // Build data context from profile
  const data = {
    ...profile,
    project: profile,
    projectName: profile.name,
    projectDescription: profile.description,
    ...(options.extraData || {}),
  };

  // Build condition flags from profile
  const conditions = {
    hasMobile: (profile.platforms || []).some((p) => ['ios', 'android'].includes(p)),
    hasWeb: (profile.platforms || []).includes('web'),
    hasApi: (profile.platforms || []).includes('api'),
    hasCli: (profile.platforms || []).includes('cli'),
    hasDesktop: (profile.platforms || []).includes('desktop'),
    hasLibrary: (profile.platforms || []).includes('library'),
    hasAuth: Boolean(profile.auth?.method?.length),
    hasIntegrations: Boolean(profile.integrations?.length),
    hasCompliance: Boolean(profile.auth?.compliance?.length),
    isBeginnerTeam: profile.team?.experienceLevel === 'beginner',
    isExpertTeam: profile.team?.experienceLevel === 'expert',
    isSolo: profile.team?.size === 'solo',
    hasDesigns: Boolean(profile.existingAssets?.designs),
    hasBrand: Boolean(profile.existingAssets?.brand),
    stealthMode: Boolean(profile.stealthMode),
    ...(options.conditions || {}),
  };

  // Add Mermaid diagrams to data context
  const diagrams = generateMermaidDiagrams(profile);
  data.diagrams = diagrams;
  data.c4Diagram = diagrams.c4;
  data.dataFlowDiagram = diagrams.dataFlow;
  data.deploymentDiagram = diagrams.deployment;

  for (const templateFile of queue) {
    const result = generateDocument(projectRoot, templateFile, data, conditions);

    if (result.error) {
      errors.push(result.error);
    } else if (result.content !== null) {
      documents.push({ fileName: result.fileName, content: result.content });
    }
  }

  // Validate the entire document set
  const validation = validateDocumentSet(documents, profile.name);

  return { documents, errors, validation };
}

/**
 * Writes generated documents to the staging directory.
 *
 * @param {string} stagingDir - Absolute path to staging directory
 * @param {Array<{ fileName: string, content: string }>} documents - Generated documents
 * @returns {{ written: string[], errors: string[] }}
 */
function writeToStaging(stagingDir, documents) {
  const written = [];
  const errors = [];

  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }

  for (const doc of documents) {
    // Defense-in-depth: strip path components to prevent directory traversal
    const safeName = path.basename(doc.fileName);
    const filePath = path.join(stagingDir, safeName);
    try {
      fs.writeFileSync(filePath, doc.content, 'utf-8');
      written.push(safeName);
      log.info(`Written to staging: ${doc.fileName}`);
    } catch (err) {
      errors.push(`Failed to write ${doc.fileName}: ${err.message}`);
      log.error(`Staging write failed: ${doc.fileName}`, { error: err.message });
    }
  }

  return { written, errors };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
  // Constants
  MANIFEST_SCHEMA_VERSION,
  VALID_AUDIENCES,
  SEVERITY,
  TEMPLATES_ONBOARDING_DIR,
  TEMPLATES_PLUGINS_DIR,

  // Template engine
  resolveValue,
  resolveCondition,
  processTemplate,

  // Manifest registry
  loadManifest,
  validateManifest,
  loadPluginManifests,
  resolveTemplateRegistry,
  topologicalSort,

  // Document validation
  validateDocument,
  validateDocumentSet,

  // Mermaid diagrams
  generateC4Diagram,
  generateDataFlowDiagram,
  generateDeploymentDiagram,
  generateMermaidDiagrams,

  // Batch generation
  readTemplate,
  generateDocument,
  generateBatch,
  writeToStaging,

  // Quality score
  calculateQualityScore,
});
