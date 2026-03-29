---
description: Initialize a new project with comprehensive documentation, market research, and Kit configuration.
args: "[--stealth] [--headless] [--telegram]"
version: 1.0.0
sdlc-phase: discover
oneTime: true
agents: [onboarding-specialist, market-researcher]
skills: [onboarding-engine, market-intelligence, doc-generation, brainstorming, research-methodology, architecture]
protectedAgents: [onboarding-specialist]
protectedSkills: [onboarding-engine, market-intelligence, doc-generation]
commit-types: [docs, feat]
---

# /greenfield — New Project Onboarding

> **Trigger**: `/greenfield`
> **Lifecycle**: Pre-SDLC — one-time project initialization
> **Output**: 7-15 master documents + CLAUDE.md + IDE configs + Kit configuration

> Standards: See `rules/workflow-standards.md`

---

## Overview

Greenfield onboarding creates a comprehensive project foundation from scratch through Socratic discovery, market intelligence, and automated document generation. Every step is a checkpoint — resumable on failure.

---

## UX Guard (Step 0)

Before starting, check for existing documentation:

```
IF docs/ has >2 markdown files:
  WARN: "This project already has documentation. Did you mean /brownfield?"
  OFFER: (A) Switch to /brownfield, (B) Continue (output to separate dir), (C) Cancel
```

---

## Interaction Modes

| Mode | Flag | Behavior |
|------|------|----------|
| Interactive | *(default)* | Full Socratic Q&A, review at each step |
| Telegram | `--telegram` | Inline keyboard buttons, summaries |
| Headless | `--headless` | Accept defaults, flag as "unreviewed" |

Add `--stealth` for confidential projects (anonymizes research queries).

---

## Steps

### Step 1: Discovery

**Goal**: Build a comprehensive project profile through Socratic questioning.

1. Ask 8-12 adaptive discovery questions (see `skills/onboarding-engine/SKILL.md`)
2. Map answers to structured project profile
3. Validate profile using `lib/onboarding-engine.js → validateProfile()`
4. If validation fails, ask targeted follow-up questions
5. Save checkpoint

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Full Q&A with explanations | Inline keyboard options | Accept from config file |

### Step 2: Market Research

**Goal**: Gather competitive intelligence and tech stack recommendations.

1. Identify 5+ competitors using `market-researcher` agent
2. Build weighted comparison matrix
3. Evaluate tech stack options per platform
4. Present findings with evidence (T1-T5 hierarchy)
5. Record decisions in `decisions.json`
6. Save checkpoint

**Graceful degradation**: If research fails after 3 retries, mark `researchDegraded: true` and continue with placeholders.

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Present findings, await confirm | Summary + confirm button | Auto-proceed, flag "unreviewed" |

### Step 3: Architecture

**Goal**: Define system architecture with diagrams and ADRs.

1. Propose architecture based on profile + research
2. Generate Mermaid diagrams (C4, data flow, deployment)
3. Create ADRs for key decisions
4. Generate TECH-STACK-ANALYSIS.md and ARCHITECTURE.md to staging
5. Save checkpoint

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Detailed review of each diagram | Key decisions only | Auto-proceed |

### Step 4: Product Definition

**Goal**: Generate product and UX documentation.

1. Generate PRD.md from profile + research
2. Generate USER-JOURNEY-MAP.md
3. Generate DESIGN-SYSTEM.md (if UI platforms)
4. Generate SCREENS-INVENTORY.md (if UI platforms)
5. Generate COMPETITOR-ANALYSIS.md
6. Save checkpoint

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Review each document | Summary only | Auto-proceed |

### Step 5: Planning

**Goal**: Create actionable project plans.

1. Generate ROADMAP.md from profile + timeline
2. Generate SPRINT-PLAN.md with estimations
3. Generate ONBOARDING-GUIDE.md for team
4. Generate remaining applicable templates (DB-SCHEMA, API-SPEC, SECURITY-POLICY, COMPLIANCE)
5. Save checkpoint

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Review plans | Summary | Auto-proceed |

### Step 6: Kit Configuration

**Goal**: Configure Kit for this specific project.

1. Resolve Kit configuration using `lib/onboarding-engine.js → resolveKitConfiguration()`
2. Generate CLAUDE.md from template
3. Generate IDE configs (.cursorrules, .opencode/, .codex/) using `lib/project-ide-generator.js`
4. Present configuration summary
5. Save checkpoint

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Confirm selections | Auto | Auto |

### Step 7: Scaffolding (Optional)

**Goal**: Optionally generate initial project structure.

1. Ask: "Generate initial project structure?"
2. If yes: invoke `app-builder` skill (loaded on-demand)
3. Generate project scaffolding based on tech stack decisions

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Prompt user | Prompt | Skip |

### Step 8: Completion

**Goal**: Validate, score, and deploy generated documents.

1. Run 4-check validation across all generated documents
2. Calculate quality score (0-100)
3. Atomic move from staging to output directory
4. CLAUDE.md placed at project root
5. Present final report with quality score
6. Trigger `onboarding-complete` hook

| Interactive | Telegram | Headless |
|-------------|----------|----------|
| Full quality report | Done notification | CI artifact output |

---

## State Machine

```
IDLE → [/greenfield] → DISCOVERY → MARKET_RESEARCH → ARCHITECTURE → PRODUCT_DEF → PLANNING → KIT_CONFIG → SCAFFOLDING? → COMPLETION
                            ↑         (Step 1)         (Step 2)       (Step 3)     (Step 4)   (Step 5)     (Step 6)      (Step 7)     (Step 8)
                            └──────────────────────── resumable from any checkpoint ──────────────────────────────────────────────────────┘
```

Progress persisted to `.agent/engine/onboarding-state.json` after each step. Step 7 (Scaffolding) is optional — skipped in headless mode.

---

## Generated Documents

See `skills/onboarding-engine/SKILL.md` for the full template applicability matrix. CLI/library projects get ~7 documents; web+mobile projects get all 15.

---

## Post-Completion

- Quality score >= 80: "Excellent — ready for development"
- Quality score 60-79: "Good — minor items to review"
- Quality score < 60: "Review flagged issues before proceeding"
- Run `/decisions` to review all architectural decisions
- Onboarding state set to `complete`
