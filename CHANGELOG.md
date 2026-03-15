# Changelog

All notable changes to Antigravity AI Kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[3.1.0]: https://github.com/besync-labs/antigravity-ai-kit/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/besync-labs/antigravity-ai-kit/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/besync-labs/antigravity-ai-kit/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/besync-labs/antigravity-ai-kit/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/besync-labs/antigravity-ai-kit/releases/tag/v2.0.0
