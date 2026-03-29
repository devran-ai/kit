# Onboarding Context

> **Scope**: Active during `/greenfield` and `/brownfield` workflows
> **Source**: Populated from `lib/onboarding-engine.js` state and project profile

---

## Current Onboarding State

This context is loaded when an onboarding session is active or resumable. It provides agents and skills with awareness of:

- Current onboarding phase and progress
- Project profile (once discovery is complete)
- Generated documents and their validation status
- Kit configuration decisions
- Interaction mode (interactive / telegram / headless)

---

## State File

Location: `.agent/engine/onboarding-state.json`

### Key Fields

| Field | Purpose |
|-------|---------|
| `status` | Current state: `idle`, `in-progress`, `complete`, `failed` |
| `workflow` | `greenfield` or `brownfield` |
| `currentStep` | Current phase index (0-5) |
| `interactionMode` | `interactive`, `telegram`, or `headless` |
| `stealthMode` | Whether project is confidential |
| `projectProfile` | Validated project profile (after discovery) |
| `researchDegraded` | Whether market research was unavailable |
| `qualityScore` | Document quality score (0-100, after generation) |
| `canResume` | Whether session can be resumed from checkpoint |
| `resumeFrom` | Phase index to resume from |

---

## Phases

| # | Phase | Description |
|---|-------|-------------|
| 0 | DISCOVERY | Socratic Q&A to build project profile |
| 1 | RESEARCH | Market research, competitor analysis, tech stack evaluation |
| 2 | ANALYSIS | Architecture decisions, ADR generation |
| 3 | GENERATION | Document generation from templates |
| 4 | CONFIGURATION | Kit config resolution, CLAUDE.md + IDE configs |
| 5 | COMPLETE | Validation, quality scoring, atomic move from staging |

---

## Decision Memory

Location: `.agent/engine/decisions.json`

Decisions made during onboarding are recorded for:
- Future reference via `/decisions` command
- Stale detection during `/brownfield` refresh
- Instinct extraction during `onboarding-complete` hook
- Market awareness rule during development sessions

---

## Session Resumption

If `canResume: true` and `status: "in-progress"`:
- Session can be resumed from `resumeFrom` phase
- Staging directory contains partially generated documents
- Previous answers and profile are preserved

If session is stale (>7 days since `startedAt`):
- Prompt user: resume / restart / abandon
- Abandon cleans staging directory
