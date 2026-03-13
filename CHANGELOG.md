# Changelog

All notable changes to Antigravity AI Kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.1.0]: https://github.com/besync-labs/antigravity-ai-kit/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/besync-labs/antigravity-ai-kit/releases/tag/v2.0.0
