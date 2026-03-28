---
description: Learn patterns from current session
uses: [continuous-learning]
invokes: [knowledge-agent]
---

# /learn Command

Extract reusable patterns and best practices discovered in the current session. Saves insights for future use by the planner and knowledge agents.

## Usage

| Command | Action |
| :--- | :--- |
| `/learn` | Extract all patterns from current session |
| `/learn [topic]` | Focus on specific topic's patterns |
| `/learn --instinct` | Record as high-confidence instinct for planner |

## Examples

```
/learn
/learn authentication patterns
/learn error handling approaches
/learn --instinct "always validate JWT on refresh"
```

## What Gets Captured

| Type | Example |
| :--- | :--- |
| Code patterns | Reusable code snippets with context |
| Best practices | Discoveries that improved quality |
| Anti-patterns | What to avoid and why |
| Project conventions | Naming, structure, style rules |
| Instincts (--instinct) | High-confidence rules for planner auto-apply |

## Output

Patterns saved to `.agent/contexts/` for future session pickup. Instincts recorded to `.agent/contexts/instincts.md`.

## Related Commands

`/checkpoint` — save work progress · `/compact` — compress session context · `/retrospective` — full session retrospective
