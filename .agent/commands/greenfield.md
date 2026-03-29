---
description: Initialize a new project with comprehensive documentation and Kit configuration
uses: [onboarding-engine, market-intelligence, doc-generation]
workflow: greenfield
---

# /greenfield Command

Start a new project onboarding workflow. Conducts Socratic discovery, market research, generates master documentation, and configures Kit for your specific project type.

## Usage

| Command | Action |
|:--------|:-------|
| `/greenfield` | Start interactive onboarding |
| `/greenfield --stealth` | Confidential mode (anonymized research queries) |
| `/greenfield --headless` | CI mode (accept defaults, flag as unreviewed) |
| `/greenfield --telegram` | Telegram-optimized interaction |

## Examples

```
/greenfield
/greenfield --stealth
/greenfield --headless
```

## What It Does

1. **Discovery** — Asks 8-12 questions about your project (vision, users, platforms, team, timeline)
2. **Market Research** — Analyzes competitors and evaluates tech stack options
3. **Architecture** — Proposes architecture with Mermaid diagrams and ADRs
4. **Documentation** — Generates 7-15 master documents based on project type
5. **Configuration** — Sets up Kit agents/skills/rules + CLAUDE.md + IDE configs
6. **Quality Report** — Validates all documents and scores quality (0-100)

## Output

- `docs/` — Generated master documents (ARCHITECTURE.md, PRD.md, ROADMAP.md, etc.)
- `CLAUDE.md` — Project-specific AI assistant instructions (project root)
- `.cursorrules` — Cursor IDE configuration
- `.opencode/instructions.md` — OpenCode IDE configuration
- `.codex/instructions.md` — Codex IDE configuration
- `.agent/engine/decisions.json` — Architectural decision records

## Resumability

Progress is checkpointed after each step. If interrupted, run `/greenfield` again to resume from where you left off.

## Related

- `/brownfield` — For existing projects with code already written
- `/decisions` — Query architectural decisions made during onboarding
- `/setup` — Additional tooling configuration (ESLint, Git hooks, etc.)
