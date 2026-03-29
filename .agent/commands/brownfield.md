---
description: Analyze an existing codebase and generate missing documentation with Kit configuration
uses: [onboarding-engine, doc-generation]
workflow: brownfield
---

# /brownfield Command

Start onboarding for an existing project. Scans the codebase (read-only), identifies documentation gaps, generates only what's missing, and configures Kit for the detected stack.

## Usage

| Command | Action |
|:--------|:-------|
| `/brownfield` | Start interactive analysis |
| `/brownfield --stealth` | Confidential mode (anonymized research queries) |
| `/brownfield --headless` | CI mode (accept defaults) |
| `/brownfield --telegram` | Telegram-optimized interaction |
| `/brownfield --scope <pkg>` | Monorepo: analyze specific package only |

## Examples

```
/brownfield
/brownfield --stealth
/brownfield --scope packages/api
```

## What It Does

1. **Scope Detection** — Detects monorepo structure, polyglot boundaries
2. **Deep Scan** — Read-only analysis: languages, frameworks, architecture patterns
3. **Gap Analysis** — Classifies existing docs as complete/partial/missing
4. **Supplementary Discovery** — Asks only questions code can't answer
5. **Market Research** — Flags outdated patterns with modern alternatives
6. **Document Generation** — Generates ONLY missing documents (never overwrites)
7. **Kit Configuration** — Maps detected stack to Kit config + CLAUDE.md merge
8. **Improvement Report** — Non-destructive recommendations

## Zero Modification Guarantee

The codebase scanner is strictly read-only during analysis. Your code is never modified. Only new documentation files are generated to a staging directory, then atomically moved after validation.

## CLAUDE.md Merge Strategy

If your project already has a `CLAUDE.md`, brownfield will **never overwrite** it. Instead, it merges onboarding-generated context under a `## Kit-Generated Context` section.

## Refresh Mode

Running `/brownfield` on a previously onboarded project enters refresh mode:
- Compares current vs previous profile
- Detects project pivots (3+ major changes)
- Updates only changed documents
- Marks stale decisions for review

## Output

- `docs/` — Only missing documents generated
- `CLAUDE.md` — Merged (existing + Kit context) or new if missing
- `.cursorrules`, `.opencode/`, `.codex/` — IDE configs
- Improvement report with non-destructive recommendations

## Related

- `/greenfield` — For brand new projects without existing code
- `/decisions` — Query architectural decisions made during onboarding
- `/setup` — Additional tooling configuration
