---
name: project-docs-discovery
description: Auto-discover and consult project-specific documentation before development tasks.
version: 1.0.0
triggers: [review, plan, create, enhance, debug, design, architecture, compliance, screen, component]
---

# Project Docs Discovery

> **Purpose**: Automatically find and reference project-specific documentation so workflows produce output aligned with the project's design system, architecture, and guidelines — without manual prompting.

---

## Discovery Algorithm

At the start of any workflow that modifies or evaluates code, execute these steps:

### Step 1: Scan for documentation

Use Glob to find project docs:

```
Glob("docs/**/*.md")
```

Also check project root for: `ARCHITECTURE.md`, `COMPLIANCE.md`, `DESIGN.md`, `SECURITY.md`

If no results found — **skip remaining steps silently**. Do not mention missing docs.

### Step 2: Classify by relevance to current task

| Task Domain | Priority Docs | Why |
|---|---|---|
| Frontend/UI | `docs/design-system/`, `docs/screens/`, `SCREENS-INVENTORY.md` | Component consistency, token compliance |
| Security | `COMPLIANCE.md`, `docs/design-system/accessibility.md` | Regulatory and a11y requirements |
| Planning | `docs/epics/`, `ROADMAP.md`, `SPRINT*.md` | Feature scope and priorities |
| Backend/API | `docs/api-docs/`, `ARCHITECTURE.md` | API contracts and system design |
| Architecture | `ARCHITECTURE.md`, `docs/architecture/` | System design decisions |
| Any task | `ARCHITECTURE.md` | Always relevant for system context |

### Step 3: Read top 3-5 most relevant docs (context-aware)

Budget rules to preserve context window:

- **Design system files** (tokens, components, patterns): read **FULLY** — they define hard constraints
- **Architecture docs** (>200 lines): read **first 100 lines** for system overview
- **Epic/screen specs**: read **only the section** relevant to the current task
- **Total context budget**: ~800 lines max across all discovered docs

Skip directories:
- `docs/archives/` — historical only
- `docs/research/` — exploratory only

### Step 4: Reference in output

Cite specific constraints from discovered docs in your output.

Examples:
- "Per `design-system/tokens.md`, spacing uses 4px base unit"
- "Per `ARCHITECTURE.md`, data layer uses Repository pattern"
- "Per `COMPLIANCE.md`, PII must be encrypted at rest"

### Step 5: Graceful no-docs handling

If Glob returns zero results and no root-level doc files exist, skip this discovery entirely. Do not mention missing docs to the user. Not all projects have a `docs/` directory.

---

## When NOT to discover

- `/deploy` — deployment procedures, not code evaluation
- `/upgrade` — framework upgrade, not project code
- `/pr-merge` — merge mechanics, not code analysis
- Any project with no `docs/` directory — auto-skipped
