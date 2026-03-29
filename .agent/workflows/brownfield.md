---
description: Analyze an existing codebase and generate missing documentation, Kit configuration, and improvement recommendations.
args: "[--stealth] [--headless] [--telegram] [--scope <package>]"
version: 1.0.0
sdlc-phase: discover
oneTime: true
agents: [onboarding-specialist, codebase-scanner, market-researcher]
skills: [onboarding-engine, market-intelligence, doc-generation, research-methodology, architecture]
protectedAgents: [onboarding-specialist, codebase-scanner]
protectedSkills: [onboarding-engine, doc-generation]
commit-types: [docs, feat]
---

# /brownfield — Existing Project Onboarding

> **Trigger**: `/brownfield`
> **Lifecycle**: Pre-SDLC — one-time project analysis and documentation
> **Output**: Missing documents only + CLAUDE.md + IDE configs + improvement report

> Standards: See `rules/workflow-standards.md`

---

## Overview

Brownfield onboarding analyzes an existing codebase to understand its stack, architecture, and documentation gaps. It generates ONLY missing documentation, configures Kit for the detected stack, and produces a non-destructive improvement report. **Zero modification guarantee** during scanning.

---

## Refresh Mode

If `onboarding-state.json` has `status: "complete"`, brownfield enters **refresh mode**:

1. Compare current profile vs `previousProfile` using `lib/onboarding-engine.js → compareProfiles()`
2. **Pivot detection**: If 3+ major-severity changes detected, offer:
   - (A) Full re-onboard (preserves decisions)
   - (B) Incremental refresh (update changed docs only)
   - (C) Cancel
3. CLAUDE.md refresh: regenerate `## Kit-Generated Context` section only, present diff
4. **Stale decision detection**: Scan `decisions.json` for entries matching changed fields, mark as `stale`
5. Preserve all existing decisions — never delete, only mark stale

---

## Steps

### Step 1: Scope Detection

**Goal**: Detect monorepo structure and determine scan scope.

1. Check for monorepo indicators:
   - `lerna.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`
   - Multiple `package.json` at different directory levels
2. If monorepo detected: present package list, user selects scope
3. If polyglot project: identify language boundaries
4. Save checkpoint

### Step 2: Deep Scan

**Goal**: Non-destructive analysis of the existing codebase.

**CRITICAL**: Zero modification guarantee — `codebase-scanner` agent uses ONLY Read, Grep, Glob.

Safety limits:
- maxFiles: 5000
- maxDepth: 5
- timeout: 120s
- SKIP_DIRS: `node_modules, .git, .agent, dist, build, vendor, __pycache__, .next`

Detect:
- Languages, frameworks, build tools
- Test frameworks and coverage tools
- CI/CD configuration
- Database type and ORM
- Authentication methods

**UX Guard**: If scanner finds <5 code files, warn: "This project appears empty. Switch to `/greenfield`?"

Save checkpoint.

### Step 3: PRD Detection

**Goal**: Find existing product specifications to pre-populate profile.

1. Scan for: `PRD.md`, `SPEC.md`, `REQUIREMENTS.md`, `docs/prd/`, `docs/specs/`
2. Check README.md for requirements/features sections
3. If found: parse to pre-populate project profile (reduces discovery questions)
4. Flag any PRD-codebase contradictions
5. Save checkpoint

### Step 4: Output Directory Detection

**Goal**: Determine where to place generated documents.

1. Check if `docs/` has existing documentation framework (MkDocs, Docusaurus, VuePress)
2. If existing structure found:
   - Suggest: `docs/project/` or `docs/master/` or custom path
   - Ask user preference
3. If no framework: use default `docs/`
4. Save checkpoint

### Step 5: Documentation Gap Analysis

**Goal**: Classify existing documentation coverage.

Compare existing docs against 15 master template types:

| Status | Meaning | Action |
|--------|---------|--------|
| `EXISTS_COMPLETE` | Document exists with full coverage | Skip generation |
| `EXISTS_PARTIAL` | Document exists but has gaps | Suggest supplements (never overwrite) |
| `MISSING` | No corresponding document | Generate to staging |

Save checkpoint.

### Step 6: Supplementary Discovery

**Goal**: Ask focused questions about gaps not inferable from code.

1. Based on scan results + gap analysis, determine what's missing
2. Ask only questions that can't be answered from code analysis
3. Build/complete project profile
4. Validate profile
5. Save checkpoint

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Focused Q&A | Inline buttons | Accept defaults |

### Step 7: Market Research

**Goal**: Research scoped to the project's detected domain.

1. Research based on detected stack and project domain
2. Flag outdated patterns with modern alternatives
3. Record decisions in `decisions.json`
4. Graceful degradation if research unavailable
5. Save checkpoint

### Step 8: Document Generation

**Goal**: Generate ONLY missing documentation.

1. Generate documents for `MISSING` entries from gap analysis
2. For `EXISTS_PARTIAL`: suggest supplement content (never overwrite existing)
3. Write generated docs to staging directory
4. Claim output files via `conflict-detector.js → claimFile()`
5. Save checkpoint

### Step 9: Kit Configuration

**Goal**: Configure Kit based on detected stack.

1. Map detected stack to Kit configuration using `lib/onboarding-engine.js → resolveKitConfiguration()`
2. Generate CLAUDE.md:
   - If CLAUDE.md exists: merge under `## Kit-Generated Context` (never overwrite)
   - If missing: generate from template
3. Generate IDE configs (.cursorrules, .opencode/, .codex/)
4. Save checkpoint

### Step 10: Improvement Report

**Goal**: Non-destructive recommendations for project improvement.

Generate report covering:
- Outdated patterns detected with modern alternatives
- Missing best practices (testing, CI/CD, security)
- Security concerns identified during scan
- Documentation-codebase contradictions
- Architecture improvement opportunities

All recommendations are **advisory** — developer decides what to act on.

### Step 11: Completion

**Goal**: Validate, score, and deploy.

1. Run 4-check validation across generated documents
2. Calculate quality score (0-100)
3. Atomic move from staging to output directory
4. Release file claims from conflict-detector
5. Present final report: generated docs + improvement recommendations + quality score
6. Trigger `onboarding-complete` hook

---

## State Machine

```
IDLE → [/brownfield] → SCOPE → SCAN → PRD_DETECT → OUTPUT_DIR → GAP_ANALYSIS → DISCOVERY → RESEARCH → GENERATION → CONFIGURATION → COMPLETE
                          ↑                                                                                                              |
                          └──────────────────────── resumable from any checkpoint ───────────────────────────────────────────────────────┘
```

Progress persisted to `.agent/engine/onboarding-state.json` after each step.

---

## Key Differences from /greenfield

| Aspect | /greenfield | /brownfield |
|--------|------------|-------------|
| Starting point | Empty project | Existing codebase |
| Scanning | None | Deep read-only scan |
| Discovery | Full 8-12 questions | Reduced (code infers most answers) |
| Document generation | All applicable templates | Only missing/partial |
| CLAUDE.md | Generate new | Merge (never overwrite) |
| Extra output | None | Improvement report |
| Refresh mode | Not applicable | Re-run compares profiles |
