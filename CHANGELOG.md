# Changelog

All notable changes to Devran AI Kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] — 2026-03-22

### Breaking Changes

- Package renamed from `antigravity-ai-kit` to `@devran-ai/kit`
- CLI command renamed from `ag-kit` to `kit`
- Scaffolder renamed from `create-antigravity-app` to `create-kit-app`

### Changed

- Full rebranding from "Antigravity AI Kit" to "Devran AI Kit"
- README rewritten for enterprise clarity (758 lines to ~120 lines)
- Removed `node_modules/` from git tracking (917 files, 236K lines)
- Removed documentation bloat (archive docs, operational guides)
- Removed `npm-publish-output.txt` build artifact

## [3.9.0] — 2026-03-20

### Added

- **PR Toolkit v2.0** — Comprehensive PR lifecycle management with 8 enhancements (E1-E8):
  - **E1: Confidence Scoring** — 0-100 scoring framework for review findings with configurable thresholds (default 70, `--strict` 50, `--relaxed` 90)
  - **E2: `/pr-merge` workflow** — Safe PR merge with dependency validation, CI verification, merge strategy selection (squash/merge-commit/rebase), post-merge checks, and dependent PR notification
  - **E3: `/pr-status` command** — PR triage with CI status, staleness detection, dependency readiness, and merge eligibility scoring
  - **E4: Git-Aware Context** — `git blame`-based detection of PR-introduced vs pre-existing issues with confidence score adjustments (+20 new, -10 pre-existing)
  - **E5: `/pr-split` workflow** — Split L/XL PRs into focused sub-PRs by concern category (feature, tests, config, deps, docs, infra) with dependency-ordered merge plans
  - **E6: PR Analytics** — DORA metrics alignment (deployment frequency, lead time, change failure rate, MTTR) mapped to PR metrics
  - **E7: `/pr-describe` command** — Auto-generate conventional-commit title, structured summary, change categorization, and suggested labels from diff analysis
  - **E8: PR Dependencies** — `Depends-On: #N` convention with cycle detection, cross-repo support, and merge ordering validation
- **`pr-reviewer` agent** — Senior Staff Engineer PR review specialist with 6-perspective review protocol (PR Hygiene, Branch Strategy, Code Quality, Security, Testing, Architecture), confidence scoring, and git-aware context
- **`pr-toolkit` skill v2.0** — 12-section domain knowledge skill (branch strategy detection, size classification, title enforcement, review patterns, fix prioritization, body checklist, repo health signals, confidence scoring, PR analytics, dependency management, split strategy, auto-description)
- **`/pr-review` workflow** — Multi-perspective PR review with severity-scored findings and GitHub review posting
- **`/pr-fix` workflow** — Fix PR issues based on review comments with P0-P3 priority ordering and verification
- **`/pr-merge` command** — Command stub for safe PR merge
- **`/pr-split` command** — Command stub for PR splitting
- **`/pr-status` command** — Command stub for PR triage
- **`/pr-describe` command** — Command stub for auto-description

### Changed

- **`/pr` workflow v3.0** — Added branch strategy detection (Step 1a), target branch validation (Step 1b), PR size & scope guard with XS-XL classification (Step 2.5), strict title validation, and PR Toolkit reference table
- **`/pr` command** — Updated with full PR Toolkit command reference (7 commands)
- **`/pr-review` command** — Added cross-references to `/pr-merge`, `/pr-split`, `/pr-status`
- **`/pr-fix` command** — Added cross-references to `/pr-merge`, `/pr-status`
- **Documentation alignment** — Fixed 30+ stale counts across all README files, docs site, GitHub Pages meta tags, SEO tags, and package.json
  - Agent count: 19 → 20 across all documentation
  - Command count: 31/33 → 37 across all documentation
  - Workflow count: 17/19 → 21 across all documentation
  - Skills count: 32/33 → 34 across all documentation
  - Runtime modules: 21 → 29 in docs/overrides/main.html (was never updated)
- **`.agent/CheatSheet.md`** — Complete rewrite with all current counts, PR Toolkit section, PR lifecycle scenario, 4 checklists, 9 rules
- **`mkdocs.yml`** — Updated site description, OG meta tags, and Twitter card with correct counts
- **`docs/overrides/main.html`** — Fixed all SEO meta tags with accurate counts
- **`package.json`** — Updated description with accurate capability counts
- **`manifest.json`** — Registered pr-merge and pr-split workflows, updated counts (commands 33→37, workflows 19→21)
- **`loading-rules.json`** — Added workflow bindings for pr-merge and pr-split

## [3.8.0] — 2026-03-19

### Added

- **`/upgrade` workflow** — EWS v1.0 compliant non-destructive framework upgrade protocol (163 lines, all 11 sections) with preservation verification, rollback instructions, and `--dry-run` / `--verify-only` modes
- **`agent-upgrade-policy.md`** — Global rule (Priority: CRITICAL) formalizing the Preservation Contract for 7 protected items (sessions, identity, rules, checklists, decisions, contexts)

### Changed

- **`/preflight` workflow** — Added `Bash` to allowed-tools, clarified non-destructive principle to allow verification commands (tests, linters, builds), fixed evidence types to include N/A justification
- **`/pr` workflow** — Added Step 3a: `/preflight` prerequisite enforcement for feat/fix/refactor/perf commits
- **`/deploy` workflow** — Clarified pre-flight step as "re-validation" checks (intentionally lighter than full `/preflight`)
- **`production-readiness` skill** — Fixed D4 Quality Floor threshold notation (`score <= 7/15`), clarified verdict label to "Caps verdict at Conditionally Ready"
- **Documentation alignment** — Fixed 20+ stale counts across README.md, docs/index.md, docs/architecture.md, docs/getting-started.md, docs/workflows/index.md, .agent/README.md, .agent/skills/README.md, .agent/commands/help.md, .agent/checklists/README.md, .agent/hooks/README.md
- Added `plan-validation` skill to `skills/README.md` (was in manifest but missing from README)
- Added `.vscode/` to `.gitignore`
- Workflow count: 16 → 17 across all documentation
- Skills count: 32 → 33 across all documentation
- Rules count: 8 → 9 across all documentation
- Tests count: 327/341 → 349 across all documentation
- Test files count: 32 → 34 across all documentation


## [3.7.0] — 2026-03-19

### Added

- **`/preflight` workflow** — Production readiness assessment with weighted scoring across 10 audit domains
- **`production-readiness` skill** — Operational skill for evaluating project architecture, security, and devops readiness

### Changed

- Workflow count: 15 → 16 across README, manifest, docs site, package description
- Skills count: 32 → 33 across README, manifest, docs site, package description

---

## [3.6.0] — 2026-03-16

### Added

- **`/pr` workflow** — Production-grade 8-step PR creation with MCP-first 3-tier fallback (MCP → `gh` CLI → manual), conflict resolution protocol, conventional commit titles, draft PR support, and CI verification
- **`/pr` in Task-Complete Protocol** — Option 5 in checkpoint menu (9 options total) for seamless PR creation after task completion
- Recommendation intelligence: "Feature branch with unpushed commits → recommend `/pr`"

### Changed

- Workflow count: 14 → 15 across README, manifest, docs site, package description, and 6 additional files
- Task-Complete checkpoint: 8 → 9 options (added `/pr` between Commit & Push and Session-End)
- `review.md` lifecycle: Next step updated from `/deploy` to `/pr`
- `deploy.md` lifecycle: Previous step updated to `/pr`
- SDLC lifecycle diagram: Ship phase now includes `/pr` between `/review` and `/deploy`

---

## [3.5.0] — 2026-03-16

### Added

#### Task-Complete Checkpoint
- **CHECKPOINT phase** — New SDLC phase between VERIFY and REVIEW providing a developer decision gate with 8-option prompt before commit/push
- **task-complete hook event** — 4-action runtime hook triggered after quality gates pass (8 hooks total)
- **task-complete.md checklist** — Structured decision prompt with recommendation intelligence (sprint boundary, production impact, session duration)
- **Task-Complete Protocol** — Added to GEMINI.md Session Protocol and rules.md Meta-Directives (F. Task-Complete Checkpoint Protocol)

#### Version Synchronization Infrastructure
- **version-sync.test.js** — 12 structural assertions verifying all version references match `package.json` SSOT on every `npm test` run
- **sync-version.js** — Automated npm lifecycle script syncing 10 files on `npm version` commands
- **npm lifecycle hooks** — `preversion` (runs tests), `version` (syncs files + stages) ensuring zero version drift

### Changed

- Workflow state machine: 7 → 8 phases, 13 → 15 transitions (added CHECKPOINT)
- SDLC map: 6 → 7 phases with bidirectional checkpoint pointers
- `WorkflowPhase` typedef: added CHECKPOINT to 9 valid phases
- Manifest: `kitVersion` 3.5.0, checklists 3 → 4, hooks 7 → 8
- README: 7-phase workflow diagram, updated capability counts
- rules.md: Section renumbering (F → G → H) to accommodate new checkpoint protocol

### Fixed

- **14+ stale version references** across 12 files spanning 5 different versions (v2.0.0, v3.0.0, v3.1.0, v3.3.1, v3.4.1) synchronized to v3.5.0

---

## [3.4.1] — 2026-03-16

### Added

- **quality-gate.md** — Generic quality-gate governance rule for pre-task research and validation
- **architecture.md** — Generic architecture governance rule for system design patterns and ADR management
- Rules count: 6 → 8 across manifest, CheatSheet, and help.md

### Fixed

- Manifest `kitVersion` drift: `3.3.1` → `3.4.1` aligned with `package.json`
- Skills count corrected: 31 → 32 in CheatSheet.md and help.md
- Runtime modules count corrected: 21 → 29 in help.md

---

## [3.3.1] — 2026-03-16

### Security

- **Symlink traversal guard** (C-1) — All copy and scan functions now use `lstatSync` to detect and skip symbolic links, preventing path traversal attacks outside `.agent/`
- **Atomic copy for init** (C-3) — `init` copies to temp directory first, then renames atomically to prevent corruption on disk failure
- **Auto-backup before init --force** (C-2) — Creates timestamped `.agent.backup-<timestamp>` before overwriting, preventing irreversible data loss

### Fixed

- **Stale CLI banner** (H-2) — Fixed `31 Skills` → `32 Skills` in `ag-kit` banner output
- **Contexts preservation** (H-1) — Added `contexts/` to `PRESERVED_DIRS` in updater, preventing learning data loss during `ag-kit update`
- **Duplicate copy functions** (H-4) — Consolidated `copyFolderSync` (ag-kit.js) and `copyDirSync` (plugin-system.js) into shared `safeCopyDirSync` in `lib/io.js`

### Added

- **Version transition display** (M-1) — `ag-kit update` now shows "Upgrading from vX → vY" when versions differ
- **Enhanced dry-run for --force** (M-2) — `ag-kit init --dry-run --force` previews which user files would be overwritten
- **Active session warning** (M-3) — `init --force` warns if `session-state.json` indicates active work in progress
- **Safety documentation** (C-4) — Added "Safety Guarantees" section to README with project file safety table and init/update behavior guide

---

## [3.3.0] — 2026-03-16

### Added

#### Senior Staff Engineer Agent Elevation
- **14 agents elevated** to Senior Staff Engineer level with deep domain-specific methodologies, industry-standard frameworks, and professional decision matrices
- **devops-engineer.md** (130 → 597 lines) — 12-Factor App, GitOps principles, Kubernetes orchestration, IaC patterns (Terraform/Pulumi), Observability Triad (logs/metrics/traces), Progressive Delivery (canary/blue-green/rolling), Deployment Strategy Decision Matrix, Container Security, Secret Management
- **performance-optimizer.md** (120 → 538 lines) — Caching Architecture (Cache-Aside, Write-Through, Write-Behind, Read-Through, multi-layer), CDN Strategy, Load Balancing Algorithms, Backend Performance (connection pooling, query optimization), Performance Budget Framework, Distributed Tracing, RUM vs Synthetic monitoring
- **reliability-engineer.md** (115 → 534 lines) — SRE Golden Signals, SLO/SLI/SLA Framework with error budgets, OpenTelemetry observability, Incident Response Protocol (SEV1-4), Chaos Engineering methodology, Deep Resilience Patterns (circuit breaker, bulkhead, retry with backoff), Capacity Planning models
- **security-reviewer.md** (146 → 350 lines) — STRIDE Threat Modeling with structured output, Zero Trust Architecture principles, OAuth 2.0/OIDC flow selection matrix, OWASP Top 10 deep analysis (A01-A10), Supply Chain Security, GDPR Assessment checklist, vulnerability classification with escalation paths
- **database-architect.md** (130 → 330 lines) — CAP Theorem decision framework, ACID vs BASE trade-offs, Event Sourcing & CQRS patterns, advanced index strategy (8 types + composite rules), zero-downtime migration patterns, query optimization (EXPLAIN ANALYZE), connection pooling, multi-tenancy patterns
- **mobile-developer.md** (125 → 280 lines) — Navigation architecture decision matrix, state management hierarchy (6 levels), offline-first architecture (CRDT, queue+retry), iOS HIG / Material Design 3 platform-specific UX, mobile performance budgets, list rendering optimization
- **explorer-agent.md** (146 → 260 lines) — DDD bounded context discovery, building block identification, context map assessment, architectural health metrics (8 quantified), technical debt classification (6 categories)
- **e2e-runner.md** (111 → 310 lines) — Testing Diamond with test type decision matrix, Page Object Model pattern, contract testing (Zod schema validation), visual regression testing, accessibility testing (axe-core), test reliability engineering, quarantine protocol
- **refactor-cleaner.md** (100 → 201 lines) — Code smell detection framework (9 smells), refactoring patterns catalog (6 patterns), safe refactoring protocol, architectural refactoring (Strangler Fig, Branch by Abstraction), metrics-driven refactoring with priority formula
- **build-error-resolver.md** (85 → 207 lines) — Root cause analysis framework (5-step), expanded error taxonomy (TypeScript, module resolution, build tool, environment), dependency resolution patterns, CI/CD pipeline debugging, prevention patterns
- **knowledge-agent.md** (80 → 197 lines) — Multi-source retrieval with priority ranking, decision archaeology protocol, knowledge gap identification (6 gap types), citation protocol with confidence levels
- **doc-updater.md** (75 → 229 lines) — Diataxis documentation framework, change impact analysis matrix, documentation quality checklist (5 dimensions), API documentation standards, ADR management lifecycle
- **architect.md** — Already SENIOR level; verified sufficient
- **sprint-orchestrator.md** — Already SENIOR level; verified sufficient

#### Skill Enrichment
- **architecture/SKILL.md** (110 → 220 lines) — DDD Strategic Patterns (Bounded Contexts, Ubiquitous Language, Context Maps, Anti-Corruption Layer), DDD Tactical Patterns (Entity, Value Object, Aggregate, Repository, Domain Service, Domain Event, Factory), Aggregate Design Rules, 12-Factor App table, Event-Driven Architecture pattern selection, SOLID Applied with violation detection, ADR template
- **security-practices/SKILL.md** (130 → 320 lines) — Zero Trust principles, OAuth 2.0 flow selection, API security patterns, supply chain security audit
- **database-design/SKILL.md** (120 → 303 lines) — CAP theorem decision framework, ACID vs BASE, consistency models, migration safety patterns, connection pooling strategies

#### Domain Enhancers Expansion
- **domain-enhancers.md** — Added 3 new domain sections (reliability, observability, distributed systems) bringing total from 7 to 10 domain enhancers
- Enhanced all existing 7 domain sections with deeper domain-specific requirements from elevated agents

#### Loading Engine Enhancement
- Added `reliability` domain rule with 14 keywords, linked to reliability-engineer agent
- Added `observability` domain rule with 11 keywords, linked to reliability-engineer + devops-engineer agents
- Added `implicitTriggers` to frontend, backend, database, and devops domains for broader detection
- Enhanced `performance` domain with 4 additional keywords (cdn, latency, p99, tracing)
- Enhanced `devops` domain with 4 additional keywords (terraform, gitops, canary, helm)
- Domain rules count: 13 → 15

### Changed

#### Agent Tier Distribution (Before → After)
- **ELITE** (unchanged): frontend-specialist (357 lines), planner (334 lines)
- **SENIOR** (4 → 8): backend-specialist, architect, tdd-guide, code-reviewer + devops-engineer, performance-optimizer, reliability-engineer, e2e-runner
- **INTERMEDIATE** (9 → 5): security-reviewer, database-architect, mobile-developer, explorer-agent, sprint-orchestrator
- **JUNIOR** (5 → 0): All former junior agents elevated to INTERMEDIATE or higher

---

## [3.2.0] — 2026-03-16

### Added

#### Multi-Agent Plan Synthesis Pipeline
- **Plan Quality Schema** (`plan-schema.md`) — Tiered scoring rubric (Tier 1: 60 pts, Tier 2: 80 pts) with domain enhancement bonus/penalty scoring
- **Domain Enhancers** (`domain-enhancers.md`) — Domain-specific plan sections for frontend, backend, database, DevOps, and security
- **Plan Validation Skill** (`plan-validation/SKILL.md`) — Quality gate with schema compliance, cross-cutting verification, specificity audit, and completeness scoring (70% pass threshold)
- **Plan Retrospective** (`plan-retrospective.md`) — Post-implementation accuracy review comparing predicted vs actual files, tasks, estimates, and risks
- **Plan Quality Log** (`contexts/plan-quality-log.md`) — Persistent accuracy log enabling adaptive learning across planning sessions

#### Loading Engine Enhancements
- `planningMandates` in `loading-rules.json` — Mandatory rules (security, testing, coding-style, documentation) always loaded during planning
- `implicitTriggers` for security domain — Word-boundary regex matching for security-sensitive terms (login, payment, upload, admin, etc.)
- `resolveForPlanning()` function in `loading-engine.js` — Planning-specific resolution with mandatory skill merging
- Protected budget enforcement — Mandatory planning skills survive context budget trimming via `protectedItems` parameter
- Context budget increased: `maxSkillsPerSession` 6 → 8

#### Runtime Engine
- `lib/io.js` — Centralized I/O module replacing scattered `fs` calls across runtime modules
- `plan-complete` hook in `hooks.json` — Fires on VERIFY phase transition, triggers retrospective and learning extraction

#### Test Suite (327 tests, +11 from v3.1.0)
- 7 new loading-engine tests (resolveForPlanning, implicit triggers, protected budget, plan workflow routing)
- 4 new structural/schema validation tests for plan-validation skill and plan-quality-log

### Changed

#### Planner Agent (`planner.md`) — Major Enhancement
- Added Rule Consultation step (1.5) — Mandatory review of all governance rules with structured extraction algorithm
- Added Specialist Synthesis step (3.5) — Explicit invocation protocol with input/output format per specialist and conflict resolution priority (Security > Testing > Architecture)
- Added Domain Enhancement step (4.5) — `matchedDomains` data flow from loading engine with labeled domain sections
- Added Self-Validation checklist — 8-point quality check before user presentation
- Updated plan output format — Full tiered schema with all Tier 1 and Tier 2 sections
- Added adaptive learning — Planner reads `plan-quality-log.md` for historical drift and blind spot compensation

#### Plan Writing Skill (`plan-writing/SKILL.md`)
- Replaced "1 page max" with tier-aware sizing (Trivial: ~1 page, Medium: 2-3 pages, Large: 3-5 pages)
- Added Principle 5: Cross-Cutting Concerns Are Mandatory
- Added Principle 6: Schema Compliance
- Clarified "no fixed templates" — dynamic content within consistent structure

#### Plan Workflow (`plan.md`) — v2.1.0 → v2.2.0
- Added validation step (3.5) with 6-step self-validation procedure
- Added `matchedDomains` and `mandatoryRules` data flow from loading engine
- Added Post-Implementation Retrospective section
- Updated completion criteria with domain coverage and retrospective logging

#### Loading Rules (`loading-rules.json`)
- Specialist contributors updated: security-reviewer and tdd-guide use `crossCuttingAlways: true` flag (cross-cutting sections always required, full specialist invocation for Medium+ only)
- Plan workflow binding updated to include `plan-validation` skill

#### Manifest & Counts
- Skills: 31 → 32 (added plan-validation)
- Hooks: 6 → 7 (added plan-complete)
- Tests: 261 → 327 (25 → 32 test files)

### Fixed

#### Architectural Audit (18 fixes)
- **C-1**: Manifest `kitVersion` drift — aligned with `package.json`
- **H-1 through H-9**: High-severity fixes including orphan skill registration, schema validation gaps, missing test coverage, and broken cross-references
- **M-1 through M-8**: Medium-severity fixes including stale counts, incorrect categorizations, and documentation drift

#### Plan Generation Pipeline (9 gap fixes)
- GAP 1: Specialist invocation protocol — explicit input/output format replacing vague "contribute" language
- GAP 2: Plan-validation self-check — clarified as planner self-validation, not separate agent
- GAP 3: `matchedDomains` data flow — explicit 6-step process from loading engine to planner
- GAP 4: Retrospective trigger mechanism — concrete hook, data source, and planner integration
- GAP 5: Unified cross-cutting enforcement — always required via rules, full specialist for Medium+
- GAP 6: Rule extraction algorithm — 4-step assessment with applicability criteria table
- GAP 7: Domain enhancement scoring — +2 bonus/-2 penalty per matched domain in plan-validation
- GAP 8: Missing Tier 2 sections — added API/Data Model, Observability, Performance, Dependencies to output format
- GAP 9: Tier-aware plan sizing — replaced fixed "1 page max" with tier-proportional sizing

#### Documentation Sync
- README.md — 7 stale references updated (context budget, skill count, test count, descriptions)
- docs/index.md — 5 stale references updated (skills, hooks, runtime counts)
- docs/architecture.md — 8 stale references updated (version, diagram counts, hook names, module counts)
- docs/getting-started.md — Skills count 31 → 32, planner description updated
- docs/agents/planner.md — Complete rewrite reflecting multi-agent synthesis pipeline

## [3.1.0] — 2026-03-15

### Added
- `CheatSheet.md` — English quick-reference for all kit capabilities
- `documentation.md` — Documentation rules (SSOT, preservation, cross-reference integrity)
- `sprint-tracking.md` — Sprint tracking protocol (ROADMAP.md as SSOT, lifecycle states)
- Sprint State Validation section in `session-start.md` checklist
- Sprint State Sync section in `session-end.md` checklist
- 4 missing agents in `agents/README.md` Selection Matrix (frontend, backend, sprint, reliability)

### Changed
- `frontend-specialist.md` enriched: 80 → 350 lines (Deep Design Thinking, anti-AI-cliché, Maestro Auditor)
- `backend-specialist.md` enriched: 89 → 270 lines (Clarify Before Coding, decision frameworks)
- `coding-style.md` enriched: 31 → 88 lines (Python conventions, naming table, import order)
- `security.md` enriched: 30 → 65 lines (GDPR data protection table, AI pipeline safety)
- `testing.md` enriched: 38 → 85 lines (pytest patterns, quality principles table)
- `git-workflow.md` — added push policy CAUTION alert
- `session-start.md` / `session-end.md` — version headers updated to v3.0.1 → v3.1.0
- Rules count updated: 5 → 8 across README.md, docs site, and architecture docs
- Skills categorization fixed: Domain 12 → 13, Development 7 → 9

### Fixed
- `manifest.json` kitVersion drift: `2.2.0` → `3.1.0` (aligned with package.json)
- `rules.md` skill table count: header `28` → `31`, added 4 missing skills
- Author email corrected across `package.json`, `create-antigravity-app/package.json`, `SECURITY.md`
- Version badge and text references: `v3.0.0` → `v3.1.0` across README and docs site

## [3.0.1] — 2026-03-14

### Added
- Comprehensive `/help` command — hybrid reference (~230 lines) with drill-down: `/help commands`, `/help agents`, `/help workflows`, `/help skills`, `/help rules`, `/help checklists`
- "IDE Reference" section in `ag-kit --help` pointing to `/help`

### Fixed
- Mermaid diagram workflow count: 11 → 14 templates in README
- Expanded `/help` description in README and docs/commands/index.md

## [3.0.0] — 2026-03-14

### Added

#### Runtime Engine (21 modules — zero external dependencies)
- **Phase 1 — Foundation**: `workflow-engine`, `session-manager`, `verify`, `updater`, `error-budget`
- **Phase 2 — Runtime**: `workflow-persistence`, `agent-registry`, `loading-engine`, `hook-system`, `task-model`
- **Phase 3 — Collaboration**: `identity`, `task-governance`, `skill-sandbox`, `conflict-detector`, `security-scanner`, `plugin-system`
- **Phase 4 — Platform**: `agent-reputation`, `engineering-manager`, `self-healing`, `marketplace`, `cli-commands`

#### Skills (31 total, +4 new)
- `i18n-localization` — Internationalization and localization patterns
- `shell-conventions` — PowerShell shell conventions for Windows
- `context-budget` — Active token budget management (promoted from v2.1.0)
- `mcp-integration` — Model Context Protocol server integration (promoted from v2.1.0)

#### Workflows (14 total, +3 new)
- `quality-gate` — Pre-task research and validation protocol
- `retrospective` — Tier-1 sprint audit and review
- `review` — Sequential quality gate pipeline (lint, types, tests, security, build)

#### CLI Commands
- `ag-kit verify` — Manifest integrity verification (90 checks)
- `ag-kit scan` — Enhanced security scanning (injection, secrets, leakage detection)
- `ag-kit update` — Diff-based update with preserved user files
- `ag-kit heal` — CI failure detection and JSON patch generation
- `ag-kit plugin list|install|remove` — Full plugin lifecycle management
- `ag-kit market search|info|install` — Community skill marketplace

#### Test Suite (261 tests, +218 from v2.1.0)
- 21 unit test files for all runtime modules
- Structural integrity tests (filesystem ↔ manifest validation)
- Schema validation tests (JSON + YAML frontmatter)
- Security scan tests (injection detection, secret scanning, leakage)

#### Documentation
- Contributor Guide — end-to-end project lifecycle
- Verify Installation section in Getting Started and README
- MkDocs site with full capability index pages

### Changed
- Version: `2.1.0` → `3.0.0` (major: runtime engine, breaking CLI additions)
- Description updated to reflect 21-module runtime engine and 261 tests
- CLI init success message now includes `ag-kit verify` and `ag-kit scan` guidance
- Fixed scoped package name reference in JSDoc header (`@emredursun/` → unscoped)

## [2.1.0] — 2026-03-13

### Added

#### Agents (19 total)
- `frontend-specialist` — React, Next.js, UI architecture specialist
- `backend-specialist` — Node.js, NestJS, API design specialist
- `sprint-orchestrator` — Autonomous sprint planning and velocity tracking
- `reliability-engineer` — SRE, production readiness, SLA monitoring

#### Skills (28 total)
- `context-budget` — Active token budget management for context window optimization
- `mcp-integration` — Model Context Protocol server integration patterns

#### Autonomy Engine
- `engine/workflow-state.json` — 6-phase lifecycle state machine (EXPLORE → DEPLOY)
- `engine/loading-rules.json` — 13-domain selective agent/skill loading with context budgets
- `manifest.json` — Machine-readable capability registry (SSOT for integrity verification)

#### Test Infrastructure
- Vitest configuration with 43 comprehensive tests across 4 suites:
  - CLI tests (5) — version, help, status, init, exists
  - Structural integrity (10) — filesystem ↔ manifest consistency
  - Schema validation (13) — JSON structure + YAML frontmatter validation
  - Security scan (15) — injection detection, secret scan, leakage detection

#### Tooling
- `create-antigravity-app` scaffolder (3 templates: minimal, node-api, nextjs)
- `.github/workflows/ci.yml` — 4-job CI pipeline (lint, test, build, security)
- `.githooks/pre-commit` — Secret detection hook
- `hooks.json` — 6 event hooks with enforcement types
- ADR-001: Trust-Grade Governance architecture decision
- Templates: ADR, feature-request, bug-report

#### Documentation
- Mermaid architecture diagram in README
- "How It Works" section with 6-phase lifecycle explanation
- CONTRIBUTING.md with contributor guide
- Full-stack example (auth system walkthrough)
- Minimal example

### Changed
- Package name: `@emredursun/antigravity-ai-kit` → `antigravity-ai-kit` (unscoped for discoverability)
- Repository URLs: `emredursun/` → `besync-labs/` (canonical org)
- README completely rewritten with accurate counts, Mermaid diagram, and create-antigravity-app Quick Start
- BeSync-specific language sanitized across 3 skill files
- `.npmignore` added for lean npm distribution

### Fixed
- Stale counts synchronized: 19 agents, 28 skills, 31 commands, 11 workflows across 6 sources
- Duplicate agent entries removed from README
- CLI banner count accuracy
- Frontmatter detection handling CRLF line endings

## [2.0.0] — 2026-02-05

### Added
- Initial v2.0.0 release with Trust-Grade governance framework
- 17 agents, 27 skills, 31 commands, 11 workflows
- Session management architecture
- PAAL continuous learning cycle

[3.8.0]: https://github.com/devran-ai/kit/compare/v3.7.0...v3.8.0
[3.7.0]: https://github.com/devran-ai/kit/compare/v3.6.0...v3.7.0
[3.6.0]: https://github.com/devran-ai/kit/compare/v3.5.0...v3.6.0
[3.5.0]: https://github.com/devran-ai/kit/compare/v3.4.1...v3.5.0
[3.4.1]: https://github.com/devran-ai/kit/compare/v3.3.1...v3.4.1
[3.3.1]: https://github.com/devran-ai/kit/compare/v3.3.0...v3.3.1
[3.3.0]: https://github.com/devran-ai/kit/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/devran-ai/kit/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/devran-ai/kit/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/devran-ai/kit/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/devran-ai/kit/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/devran-ai/kit/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/devran-ai/kit/releases/tag/v2.0.0
