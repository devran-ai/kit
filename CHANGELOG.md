# Changelog

All notable changes to Devran AI Kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.2.7] — 2026-04-10

### Fixed

- **`kit update` missing gitignore pipeline** — `addToGitignore()` was not called during updates, leaving projects with stale gitignore entries after upgrade. Existing projects missing `.cursor/commands/`, `.opencode/commands/`, or other bridge entries will now be auto-fixed on `kit update`.

### Added

- 3 new updater tests: gitignore narrowing, missing entry addition, and no-gitignore creation during update
- Test count: 1015 → 1018 (53 files)

## [5.2.6] — 2026-04-09

### Fixed

- **CLI slash command discovery** — blanket `.claude/` gitignore replaced with `.claude/commands/` so Claude Code CLI/Desktop can discover the directory for autocomplete
- `cleanupLegacyClaudeTracking()` now produces `.claude/commands/` instead of `.claude/` — the previous target broke CLI directory discovery
- `addToGitignore()` parent-coverage logic no longer treats `.claude/` as covering `.claude/commands/` — blanket pattern breaks CLI discovery
- CRLF-safe regex patterns in all gitignore functions — Windows line endings handled correctly

### Added

- `narrowBlanketClaudeIgnore()` — migrates existing blanket `.claude/` to `.claude/commands/` for consumers who already have it
- `path.isAbsolute()` guards on `addToGitignore()`, `cleanupLegacyClaudeTracking()`, and `narrowBlanketClaudeIgnore()` for defense-in-depth
- 13 new tests: pipeline integration (narrow/cleanup/add), CRLF support, `already-ignored` branch, parent-coverage exception

### Changed

- `kit init` gitignore step reordered: narrow → cleanup → add (ensures blanket patterns are fixed before coverage checks)
- `kit update` now runs `narrowBlanketClaudeIgnore()` before legacy cleanup
- `console.error` in `updater.js` replaced with structured `report.warnings` array
- `module.exports` in `updater.js` frozen with `Object.freeze()` for immutability
- Test count: 1002 → 1015 (53 files)

## [5.2.5] — 2026-04-09

### Fixed

- `addToGitignore()` now gitignores all Kit-generated artifacts — bridge directories, IDE config paths (`.cursor/rules/`, `.codex/`, `.opencode/opencode.json`), and `.worktreeinclude`
- Parent directory coverage check uses line-level matching — `.cursor/rules/kit-governance.mdc` no longer falsely covers `.cursor/commands/`
- After `kit init`, `git status` shows zero untracked Kit artifacts
- Stale test count in `docs/architecture.md` (568 → 1002, 53 files)

### Changed

- New `IDE_CONFIG_PATHS` constant for IDE config artifacts Kit always generates
- `addToGitignore()` accepts `detectedIDEs` parameter to gitignore only relevant bridge directories
- IDE config paths are always gitignored since Kit generates them for all projects

## [5.2.4] — 2026-04-09

### Fixed

- `addToGitignore()` parent-directory coverage check switched from substring matching (`content.includes`) to line-level matching — specific file patterns like `.cursor/rules/kit-governance.mdc` no longer falsely cover `.cursor/commands/`
- Untracked `.cursor/commands/` and `.worktreeinclude` after `kit init` in projects that only gitignore specific `.cursor/` files

### Changed

- `addToGitignore()` accepts `detectedIDEs` parameter to gitignore only relevant bridge directories
- Test count: 1000 → 1001

## [5.2.3] — 2026-04-09

### Added

- `.worktreeinclude` generation — Claude Code copies `.agent/` and bridges into new worktrees automatically
- `post-checkout` git hook — copies `.agent/` from main worktree on `git worktree add` (preserves user customizations)
- `--skip-worktree` flag for `kit init`
- New `lib/worktree.js` module for worktree support functions
- `IDE_BRIDGE_DIRS` constant in `lib/constants.js` (shared between worktree and command-bridge modules)

## [5.2.2] — 2026-04-08

### Changed

- Bridge files (`.claude/commands/`, `.cursor/commands/`, etc.) are now local-only — no longer configured for git tracking
- `kit init` no longer modifies existing `.gitignore` entries (only adds `.agent/` block)
- Automatic cleanup of legacy `.claude/*` + `!.claude/commands/` gitignore patterns from v5.2.0
- Detects and suggests untracking `.claude/commands/` files committed during v5.2.0 window

### Removed

- `ensureClaudeCommandsTracked()` — replaced by local-only bridge model
- `checkBridgeGitignoreWarnings()` (S7) — no longer applicable with local-only bridges

## [5.2.1] — 2026-04-08

### Fixed

- **Claude Code bridge format** — removed quoted YAML description and provenance HTML comment that prevented Claude Code parser from recognizing slash commands
- Added `sanitizeForPlainYaml()` for unquoted YAML plain scalars (strips `#`, `"`, `'` chars that break plain scalar parsing)

### Changed

- **Documentation sync** — updated 8 docs files with correct v5.2.0 component counts (agents 23→26, skills 36→39, commands 37→40, workflows 23→25, runtime 34→43, rules 13→15, hooks 8→9)
- Architecture diagram version updated from v4.6.0 to v5.2.0 with corrected `+more` counts
- Added missing rules (market-awareness, doc-freshness) and hook (onboarding-complete) to architecture docs
- Standardized IDE count to 7 across all documentation
- Tests: 982 → 984 (2 new sanitizer and bridge format tests)

---

## [5.2.0] — 2026-04-08

### Added

**Universal Slash Command Bridge Generation**
- New `lib/command-bridge.js` module — generates IDE-native slash command bridge files from `.agent/workflows/*.md` for 5 IDEs: Claude Code/Antigravity, Cursor, OpenCode, VS Code Copilot, and Windsurf
- IDE auto-detection — scans project for `.cursor/`, `.opencode/`, `.windsurf/` directories; generates bridges only for detected IDEs; Claude Code always included
- Provenance-based overwrite protection — every bridge file includes `<!-- devran-kit-bridge v5.2.0 -->` header; `kit update` never overwrites user-created custom commands
- New `--skip-commands` CLI flag — skip bridge generation during init
- New `--ide <list>` flag extension — accepts comma-separated IDE list or `all` (e.g., `--ide claude,cursor,vscode`)
- VS Code Copilot support via `.github/prompts/*.prompt.md` with `mode: "agent"` (explicit opt-in only)
- Windsurf support via `.windsurf/workflows/*.md` with title + numbered steps format
- Bridge-sync verification in `kit verify` — detects missing and orphaned bridge files
- New `docs/ide-support.md` — comprehensive cross-IDE slash command support documentation

**Gitignore Worktree Support**
- New `ensureClaudeCommandsTracked()` — adds `.claude/*` + `!.claude/commands/` negation pattern so bridge files are available in git worktrees
- Migration support — automatically converts `.claude/` to `.claude/*` in existing `.gitignore` files
- Post-write gitignore warnings — alerts when IDE bridge directories are gitignored

**Architecture Improvements**
- Step-builder pattern in `kit init` — replaces fragile hardcoded step counter with declarative `steps[]` pipeline; self-correcting step numbering regardless of active flags
- Extracted `lib/commands/init.js` — init command logic moved from `bin/kit.js` (1076 lines) to dedicated module; CLI entry point now 719 lines (under 800-line limit)
- Atomic provenance check via `checkKitProvenance()` — eliminates TOCTOU race between existence check and header read
- New `writeBridgeConfigs()` in `lib/ide-generator.js` — provenance-aware wrapper around `writeIdeConfigs()` with safe overwrite semantics

**Security Hardening (9 measures)**
- S1: Strict name validation regex `/^[a-z0-9][a-z0-9-]{0,63}$/` — prevents path traversal and Windows reserved device names
- S2: `sanitizeForYaml()` — single-line extraction, backslash + quote escaping, 200-char limit
- S3: `sanitizeForMarkdown()` — strips `[text](url)` patterns and bare URLs from plain markdown bridges
- S4: `isKitGeneratedFile()` — reads first 128 bytes for provenance header before any overwrite
- S5: `safeResolveWorkflowPath()` — validates workflow file paths stay within `.agent/` boundary
- S6: `MAX_WORKFLOW_ITEMS = 100` cap on manifest items (DoS prevention)
- S7: Post-write gitignore detection with user warnings
- S8: `MAX_WORKFLOW_FILE_SIZE = 65536` byte limit before file read
- S9: Regex field name escaping in `extractFrontmatterField()` (ReDoS prevention)

**Plan Validation Threshold**
- Raised plan quality validation threshold from 70% to 80% across all files (plan-schema, plan-validation, planner agent, workflows, documentation)
- Updated scoring tables: Trivial 42 -> 48, Medium 56 -> 64, Large 70 -> 80

**Testing (940 -> 982 tests)**
- 42 new tests across 3 files
- New `tests/unit/command-bridge.test.js` — 37 tests covering 5 IDE adapters, security (YAML/markdown injection, path traversal, DoS cap, file size limit, provenance detection), auto-detection, idempotency
- Extended `tests/unit/gitignore.test.js` — 10 new tests for `ensureClaudeCommandsTracked` and `checkBridgeGitignoreWarnings`

### Changed

- `lib/constants.js` — added 11 new constants (CLAUDE_DIR, CLAUDE_COMMANDS_DIR, CURSOR_COMMANDS_DIR, OPENCODE_COMMANDS_DIR, GITHUB_PROMPTS_DIR, WINDSURF_DIR, WINDSURF_WORKFLOWS_DIR, MAX_WORKFLOW_ITEMS, MAX_WORKFLOW_FILE_SIZE, SAFE_COMMAND_NAME, KIT_BRIDGE_HEADER)
- `lib/ide-generator.js` — added `writeBridgeConfigs()` and `checkKitProvenance()` exports
- `lib/io.js` — added `ensureClaudeCommandsTracked()` and `checkBridgeGitignoreWarnings()` exports; frozen module.exports
- `lib/updater.js` — `applyUpdate()` now regenerates slash command bridges and ensures Claude commands are git-tracked
- `lib/verify.js` — added bridge-sync check (Check 13) for Claude Code command bridges
- `bin/kit.js` — delegated `initCommand` to `lib/commands/init.js`; added `--skip-commands` option parsing
- `docs/cli-reference.md` — documented `--skip-commands`, `--ide <list>`, and bridge generation behavior
- `docs/cross-ide-setup.md` — referenced new ide-support.md for bridge details

---

## [5.1.0] — 2026-03-29

### Added

**Onboarding Workflow System — `/greenfield` and `/brownfield`**
- New `/greenfield` command and workflow — 8-step checkpoint-based onboarding for new projects: Socratic discovery (8-12 questions), market research with T1-T5 evidence hierarchy, architecture with Mermaid diagrams, 15 master document templates, Kit configuration, quality scoring (0-100)
- New `/brownfield` command and workflow — 11-step onboarding for existing projects: read-only codebase scanning (zero-modification guarantee), documentation gap analysis, selective generation (only missing docs), CLAUDE.md merge-not-overwrite, improvement report, refresh mode with pivot detection
- New `/decisions` command — query architectural decision memory with keyword/domain/ID filters and stale detection
- Three interaction modes: Interactive (IDE), Telegram (inline keyboards), CI/Headless (accept defaults)
- Stealth mode for confidential projects — anonymized research queries and decision descriptions

**New Runtime Modules (7)**
- `lib/onboarding-engine.js` — checkpoint state machine, project profile validation, document queue, Kit config resolver, session management, staging directory
- `lib/market-research.js` — competitor analysis, weighted scoring matrices, tech stack evaluation, evidence validation (T1-T5), stealth mode, graceful degradation (3 retries + exponential backoff)
- `lib/doc-generator.js` — manifest-driven template registry, two-tier template engine (variable substitution + section conditionals), cross-document 4-check validation, Mermaid diagram generation (C4 context, data flow, deployment)
- `lib/project-ide-generator.js` — project-specific .cursorrules, .opencode/instructions.md, .codex/instructions.md from profile + CLAUDE.md
- `lib/quality-score.js` — 4-dimension quality scoring: completeness, consistency, depth, actionability
- `lib/decision-validator.js` — decision entry schema validation for decisions.json
- `lib/constants.js` — added TEMPLATES_DIR, STAGING_DIR, ONBOARDING_STATE_FILE, DECISIONS_FILE

**New Agents (23 → 26)**
- `onboarding-specialist` — Socratic discovery, profile building, document generation coordination (design-authority)
- `market-researcher` — evidence-based market intelligence, competitor matrices, tech stack evaluation (read-only, WebSearch/WebFetch)
- `codebase-scanner` — read-only brownfield analysis: stack detection, architecture patterns, documentation gaps, contradiction detection (read-only, brownfield only)

**New Skills (36 → 39)**
- `onboarding-engine` — discovery protocol, profile schema, template applicability matrix, Kit config mapping, adaptive guidance
- `market-intelligence` — competitor framework (5+ competitors, 7 dimensions), feature gap analysis, counter-evidence requirement, graceful degradation protocol
- `doc-generation` — two-tier template syntax, 4-check validation rules, ADR generation, quality scoring rubric (0-100), Mermaid guide

**New Rules (13 → 15)**
- `market-awareness` — cross-cutting rule loaded for ALL sessions; proactively checks market leaders during development decisions; non-dictatorial (presents evidence, developer decides, Kit records)
- `doc-freshness` — cross-cutting rule; flags documents as potentially stale when related code changes (trigger matrix: architecture → ARCHITECTURE.md, features → PRD.md, etc.)

**New Workflows (23 → 25)**
- `greenfield` — 8-step new project onboarding with UX guard, checkpoint persistence, quality gate
- `brownfield` — 11-step existing project onboarding with refresh mode, pivot detection, zero-overwrite guarantee

**New Commands (37 → 40)**
- `/greenfield` — entry point for new project onboarding
- `/brownfield` — entry point for existing project onboarding
- `/decisions` — architectural decision memory query

**Templates & Infrastructure**
- 15 onboarding document templates with two-tier syntax (TECH-STACK-ANALYSIS, COMPETITOR-ANALYSIS, PRD, ARCHITECTURE, DB-SCHEMA, API-SPEC, SECURITY-POLICY, DESIGN-SYSTEM, SCREENS-INVENTORY, USER-JOURNEY-MAP, ROADMAP, SPRINT-PLAN, COMPLIANCE, ONBOARDING-GUIDE, CLAUDE.md)
- Template manifest (`manifest.json`) with dependency ordering, audience tags, applicability rules
- Plugin template extensibility via `templates/plugins/<name>/manifest.json`
- Decision memory storage (`engine/decisions.json`)
- Onboarding context (`contexts/onboarding.md`)
- 5 Architecture Decision Records (ADR-003 through ADR-007)

**Testing (812 → 940 tests)**
- 128 new tests across 8 new test files + 2 test fixtures
- Unit tests: onboarding-engine (34), state machine (13), doc consistency (17), config validator (14), decision validation (15)
- Structural tests: onboarding templates (12)
- Integration tests: greenfield zero-flow (2), budget protection (10), session resumption (8)

### Changed

**Engine Integration**
- `engine/sdlc-map.json` — added `onboarding` as pre-SDLC one-time phase (discover.previous unchanged)
- `engine/workflow-state.json` — added ONBOARDING phase + 3 transitions (IDLE→ONBOARDING, ONBOARDING→EXPLORE, ONBOARDING→PLAN)
- `engine/loading-rules.json` — greenfield/brownfield workflow bindings with protectedAgents/protectedSkills; cross-cutting rules in defaultLoad; onboarding domain rule with 9 keywords
- `lib/workflow-engine.js` — ONBOARDING added to WorkflowPhase typedef
- `lib/config-validator.js` — ONBOARDING + CHECKPOINT added to validPhases; workflowBindings item schema validation
- `lib/loading-engine.js` — resolveForWorkflowWithRules returns protectedAgents/protectedSkills; getLoadPlan merges workflow-level protected items into budget enforcement
- `lib/updater.js` — onboarding-state.json, decisions.json added to USER_DATA_FILES; staging/ added to USER_DATA_DIRS
- `lib/plugin-system.js` — task-complete, onboarding-complete added to validEvents
- `lib/doc-discovery.js` — 7 new DOC_PATTERNS for onboarding documents; CLAUDE.md added to ROOT_DOC_FILES
- `hooks/hooks.json` — session-start: onboarding resumption check; new onboarding-complete hook with 9 actions (8 → 9 hooks)

**Cross-References & Counts**
- `manifest.json` — updated all counts (agents 26, skills 39, commands 40, workflows 25, rules 15, hooks 9)
- `README.md` — updated badges and tagline
- `CheatSheet.md` — added onboarding commands section; updated all directory structure counts
- `commands/help.md` — updated capability counts
- `commands/setup.md` — added `/greenfield` cross-reference
- `create-kit-app/index.js` — added `/greenfield` to post-scaffold Quick Start

### Fixed

- `lib/onboarding-engine.js` — `validateProfile` now correctly validates `platforms` as array field (was failing string check on array type)
- `lib/config-validator.js` — CHECKPOINT phase added to validPhases (pre-existing gap where CHECKPOINT existed in workflow-state but not in validator)

## [5.0.0] — 2026-03-28

### Added

**Workflow Governance — Tier-1 Production Quality**
- Scope Filter tables in all 23 workflows — commit-type (feat/fix/refactor/docs/chore) → Required / Conditional / Skip with rationale
- Argument Parsing tables in 14 workflows — bare command, `[args]`, and `--flag` variant behavior
- Failure Output / Failure Template sections in all 23 workflows — blocked paths, partial completion, escalation procedures
- New workflow: `/implement` — execute implementation from approved plan with incremental verification, atomic commits, and progress table
- Extended Completion Criteria: 4 → 8 binary, measurable items in all 9 critical workflows
- Ethics/Safety gate in `quality-gate.md` and `retrospective.md` — AI bias assessment, GDPR compliance, automation transparency, human-in-the-loop verification
- Rejection Triggers section in `quality-gate.md` — 5 explicit auto-reject conditions (harmful patterns, missing research, deceptive UX, privacy violation, accessibility failure)
- Enhancement Strategy dimensions in `quality-gate.md` — transparency, ethics, user-centric, data-sovereign, accurate

**New Governance Rules (10 → 13)**
- `rules/performance.md` — JS bundle ≤ 200KB gz, API p95 ≤ 300ms, LCP ≤ 2.5s, CLS ≤ 0.1; N+1 prevention; memory leak detection; regression CI gate
- `rules/accessibility.md` — WCAG 2.1 AA minimum; semantic HTML; ARIA roles; keyboard nav; color contrast 4.5:1/3:1; touch targets 44×44px; screen reader testing
- `rules/data-privacy.md` — PII never logged, encrypted at rest, minimized at collection; data classification (4 levels); GDPR core; AI pipeline anonymization

**Skill Sub-Files — Deep Specialization (8 new files)**
- `pr-toolkit/review-template.md` — 6-perspective review output template
- `pr-toolkit/fix-template.md` — fix plan table + resolution summary with before/after diffs
- `pr-toolkit/bot-parsers.md` — Gemini/CodeRabbit/SonarCloud/Dependabot/GitHub Actions parsing rules
- `verification-loop/gate-config.md` — gate definitions, thresholds, skip conditions, rigor profile integration
- `production-readiness/scorecard-template.md` — 10-domain scorecard, delta comparison, executive summary
- `intelligent-routing/multi-agent-protocols.md` — sequential/parallel/consensus patterns, conflict resolution
- `security-practices/owasp-checklist.md` — OWASP Top 10 with detection commands, code patterns, fix patterns
- `testing-patterns/test-matrix.md` — test type selection matrix, coverage strategy, edge case catalog

**New Skill: research-methodology (35 → 36)**
- T1-T5 evidence hierarchy with validity levels
- Multi-source evidence protocol (project docs → code → web → community)
- Competitive analysis framework (5+ comparisons, weighted evaluation matrix)
- Technology evaluation matrix template
- Quality rules: source attribution, freshness (≤12 months), cross-reference, bias mitigation, confidence scoring

**Instinct System — Living Pattern Memory**
- `contexts/instincts.md` — confidence-scored pattern database (0-100); auto-applied at ≥70 confidence
- 5 seed instincts: parameterized queries (100), test before/after refactor (95), JWT validation (95), service abstraction (90), bug-first edge case testing (85)
- Decay policy: confidence -10 per 6 months unused; archived at <30
- Planner reads instincts.md at Step 1 and applies all patterns ≥70 confidence automatically

**Rigor Profiles**
- Three enforcement tiers in `rules/workflow-standards.md`: strict (production, all gates, 80%+ enforced), standard (default), minimal (prototyping, lint+build only)
- Auto-elevation to strict: merging to main/master, running `/preflight`, or touching auth/payment/PII files

**Agent Enrichment — Before/After Anti-Pattern Examples**
- `tdd-guide.md` — test type decision tree (unit/integration/E2E), edge case catalog (null, empty, boundary, invalid, concurrent, failure), before/after examples
- `code-reviewer.md` — severity calibration examples (CRITICAL SQL injection, HIGH error handling), 3-role QA architecture
- `typescript-reviewer.md` — 5 anti-patterns with before/after: `as any`, `@ts-ignore`, bare `enum`, non-null `!`, `Function` type
- `python-reviewer.md` — 5 anti-patterns with before/after: bare `except:`, mutable defaults, missing type hints, `import *`, global mutable state
- `go-reviewer.md` — 5 anti-patterns with before/after: `panic` in library code, naked goroutines, ignored errors `_`, missing `context.Context`, direct error assertion

**Planner Rule Consultation**
- Rule Consultation table in `planner.md` with all 8 mandatory rules and precise domain triggers
- Loading engine `alwaysLoadRules`: all 8 rules active for every `/plan`
- Domain-specific loading: database+devops → data-privacy; frontend → accessibility; performance domain → performance rule

**Command Dependency Declarations**
- All 37 commands now declare `workflow:`, `invokes:`, or `uses:` frontmatter — enabling automated agent routing and dependency graph validation
- PR family: pr.md (workflow: pr), pr-review.md (+invokes: pr-reviewer), pr-fix/pr-merge/pr-split all wired to workflows
- Utility commands: security-scan (invokes: security-reviewer), scout (invokes: explorer-agent), research (invokes: knowledge-agent), learn (invokes: knowledge-agent), and 12 more

**Session Context Bootstrap Fix**
- `contexts/session-context.md` — created file that session-start hook required (`severity=critical, onFailure=block`)
- Resolves bootstrap failure where framework blocked every session on missing file

**Checklist Enhancements**
- `pre-commit.md` — lockfile consistency check, test coverage threshold validation, `npm audit fix` remediation
- `task-complete.md` — prerequisite gate matrix: `/pr` requires tests+review; `/deploy` requires PR merged+CI; `/review` requires build

**Command Output Preview**
- `commands/adr.md` — added Output Preview with full ADR example (status, date, context, decision, consequences, alternatives)

### Changed

- All 23 workflows enriched: Scope Filters, Argument Parsing (where applicable), Failure Output templates, Governance sections, measurable Completion Criteria
- `workflows/plan.md` — commit-types corrected: `[docs]` → `[feat, fix, refactor, docs]`; Scope Filter added
- `workflows/help-kit.md` — all 7 command names fixed: `/pr_review` → `/pr-review`, `/project_status` → `/project-status`, `/quality_gate` → `/quality-gate`, `/ui_ux_pro_max` → `/ui-ux-pro-max`
- `workflows/preview.md` — completion criteria: 1 subjective criterion replaced with 5 binary, measurable gates (type detected, status confirmed, port available, no orphaned processes, health check HTTP 2xx)
- `workflows/upgrade.md` — Preservation Contract defined with explicit list: rules/, checklists/, contexts/, engine/identity.json, engine/session-state.json, decisions/, custom agents/skills
- `workflows/deploy.md` — health check thresholds quantified: error rate ≤ baseline + 0.1% (warn >0.1%, critical >1%); p95 latency ≤ baseline + 20ms (warn p99 >200ms, critical >500ms)
- `workflows/pr-split.md` — user approval mechanism defined: explicit 'yes' or `--approve` flag required
- `workflows/project-status.md` — command names fixed (underscore → hyphen); completion criteria: 4 binary gates with data sources
- `workflows/retrospective.md` — duplicate Step 8 (ethics review) removed; merged into enriched Step 5
- `workflows/review.md` — cache rule: "immediately before" defined as "same session, no file changes since"
- `skills/strategic-compact/SKILL.md` — instincts.md preservation note: never compact away patterns ≥70 confidence
- `commands/cook.md` — added missing YAML frontmatter (sdlc-phase, invokes, commit-types)
- Manifest: rules.count 10 → 13, skills.count 35 → 36, workflows.count 22 → 23

---

## [4.6.0] — 2026-03-28

### Added

- **Project Documentation Auto-Discovery** — Zero-config discovery of project-specific documentation (design system, architecture, screen specs, compliance). Workflows automatically find and reference project docs without manual prompting.
  - New runtime module: `lib/doc-discovery.js` (450 LOC) — scans `docs/`, classifies by 55 patterns (including naming alternatives), ranks by domain relevance, budget-constrained (max 8 docs)
  - New skill: `project-docs-discovery` — instructs LLM to scan and read relevant project docs during workflows
  - Loading engine integration: `getLoadPlan()` returns `projectDocs[]` for CLI/tooling
  - 6 workflows updated: `/plan`, `/pr-review`, `/create`, `/enhance`, `/debug`, `/quality-gate`
  - 55 classification patterns covering naming alternatives: `style-guide/`, `ui-kit/`, `views/`, `pages/`, `features/`, `specs/`, `endpoints/`, `swagger/`, `guidelines/`, `standards/`, `playbooks/`, `sre/`, etc.
  - Ambiguous patterns (`pages/`, `styles/`, `views/`, `features/`, `theme/`) scoped to `docs/` prefix to prevent false positives on source dirs
  - Security hardened: `Number.isFinite()` guards (CWE-400), `realpathSync` symlink detection (CWE-59), path escape prevention (CWE-22), 27-dir skip list
- Skills: 34 → 35 (`project-docs-discovery` added)
- Runtime: 33 → 34 modules (`doc-discovery.js` added)
- Tests: 499 → 568 (69 new tests across doc-discovery + security, 39 test files)
- **GitHub Flow** — Established PR-based workflow with branch protection on `main`. Documented in CONTRIBUTING.md.
- **Telegram Menu Guard** — Fixed private chat menu overwrite. Guard now pushes to `all_private_chats` scope (not per-chat), with health check retry at +15s.

### Changed

- **Documentation alignment** — All 26 doc/config files synced to manifest SSOT (skills 35, runtime 34, tests 568, rules 10)
- **Nullish coalescing** — Loading engine config passthrough changed from `||` to `??` to prevent 0-as-falsy bugs
- **DOCS_DIR constant** — Added to `lib/constants.js` and wired into `doc-discovery.js`

---

## [4.5.1] — 2026-03-27

### Changed

- **Immutable state patterns** — Refactored all stateful runtime modules to use `Object.freeze` + spread patterns (circuit-breaker, rate-limiter, agent-reputation, task-governance, conflict-detector, plugin-system)
- **Structured error logging** — Added `createLogger` with contextual warnings to 15 silent `catch {}` blocks across 10 modules (agent-reputation, conflict-detector, task-model, task-governance, self-healing, error-budget, marketplace, workflow-persistence, verify, engineering-manager, plugin-system)
- **Input validation hardening** — Path traversal defense in skill-sandbox, credential leak prevention in marketplace URL validation, parameter validation in engineering-manager
- **Function decomposition** — Extracted `buildTransitionState()` from workflow-engine `executeTransition()` (104 → 32 lines), immutable `mergeHooks`/`unmergeHooks` in plugin-system
- **Documentation consolidation** — Removed 4 redundant docs (agents/architect.md, agents/code-reviewer.md, governance/constraints.md, session-management.md), merged content into parent pages, replaced per-release "What's New" sections with CHANGELOG links
- **Version alignment** — Fixed 12 stale references (rules 9→10, hooks 7→8, workflows 21→22, tests 492→499) across README, docs/index.md, architecture.md, mkdocs.yml
- Tests: 492 → 499 (38 test suites, zero regressions)

---

## [4.4.0] — 2026-03-26

### Added

- **Telegram menu guard** — `lib/telegram-menu-guard.js` auto-restores workflow menu after Telegram plugin overwrite via SessionStart hook. Cache-based, non-blocking, zero-config after initial install
- **`--guard` flag** — `kit sync-bot-commands --guard` for lightweight cache-based restore to `all_private_chats` scope
- **`--install-guard` flag** — `kit sync-bot-commands --install-guard` for one-command SessionStart hook installation
- **Command cache** — Auto-caches synced commands to `~/.claude/channels/telegram/bot-menu-cache.json` with plugin base commands merged

### Changed

- Runtime modules: 32 → 33 (`lib/telegram-menu-guard.js` added)
- Tests: 434 → 492 (38 test suites)

---

## [4.3.0] — 2026-03-25

### Added

- **`kit sync-bot-commands`** — New CLI command that scans `.agent/workflows/` and `.agent/commands/` frontmatter descriptions and pushes them to the Telegram Bot API via `setMyCommands`
- **`lib/telegram-sync.js`** — Runtime module with `syncBotCommands()`, `buildCommandList()`, `pushToTelegram()`, `readBotToken()`, and validation utilities
- **46 new tests** for telegram-sync module (extractFrontmatter, formatCommand, getPriority, buildCommandList, readBotToken, scanDirectory, validateBotToken, pushToTelegram, syncBotCommands)

### Changed

- Runtime modules: 31 → 32
- Tests: 388 → 434 (38 test suites)
- CLI flags: `--dry-run`, `--token <BOT_TOKEN>`, `--limit <N>`, `--source workflows|commands|both`
- Telegram limits enforced: max 100 commands, 32-char command names, 256-char descriptions

---

## [4.2.1] — 2026-03-24

### Changed

- **Untrack hint** — Detects tracked `.agent/` and prints `git rm --cached` command
- **Documentation fixes** — Updated release notes, stale test counts corrected

---

## [4.2.0] — 2026-03-23

### Added

- **Gitignore by default** — `kit init` adds `.agent/` to `.gitignore` — personal dev tooling
- **`--shared` flag** — Opt-in to commit `.agent/` for team sharing
- **388 tests** — 37 test suites across unit, structural, and security

---

## [4.1.0] — 2026-03-23

### Added

- **Cross-IDE support** — Cursor, OpenCode, Codex, Antigravity — all generated from one manifest
- **Multi-language reviewers** — TypeScript, Python, Go dedicated review agents
- **Continuous learning** — Confidence scoring with time-based decay model
- **MCP server templates** — GitHub, Supabase, Vercel, PostgreSQL, Filesystem

---

## [4.0.0] — 2026-03-22

### Breaking Changes

- Package renamed from `antigravity-ai-kit` to `@devran-ai/kit`
- CLI command renamed from `ag-kit` to `kit`
- Scaffolder renamed from `create-antigravity-app` to `create-kit-app`

### Changed

- Full rebranding from "Antigravity AI Kit" to "Devran AI Kit"
- README rewritten for enterprise clarity (758 lines to ~120 lines)
- Untracked `node_modules/` from git (917 files, 236K lines) — added to `.gitignore`
- Deleted operational docs bloat (`google-search-console-setup.md`, `github-repository-settings.md`)
- Deleted `npm-publish-output.txt` build artifact, added to `.gitignore`
- Framework token optimization: 56% reduction across workflows, agents, and skills

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
- **Plan Validation Skill** (`plan-validation/SKILL.md`) — Quality gate with schema compliance, cross-cutting verification, specificity audit, and completeness scoring (80% pass threshold)
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

[4.5.1]: https://github.com/devran-ai/kit/compare/v4.4.0...v4.5.1
[4.4.0]: https://github.com/devran-ai/kit/compare/v4.3.0...v4.4.0
[4.3.0]: https://github.com/devran-ai/kit/compare/v4.2.1...v4.3.0
[4.2.1]: https://github.com/devran-ai/kit/compare/v4.2.0...v4.2.1
[4.2.0]: https://github.com/devran-ai/kit/compare/v4.1.0...v4.2.0
[4.1.0]: https://github.com/devran-ai/kit/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/devran-ai/kit/compare/v3.9.0...v4.0.0
[3.9.0]: https://github.com/devran-ai/kit/compare/v3.8.0...v3.9.0
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
