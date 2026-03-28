---
description: Compact context to preserve memory
uses: [strategic-compact]
---

# /compact Command

Summarize and compact the current session context to reduce memory usage while preserving critical information. Enables continuation across sessions.

## Usage

| Command | Action |
| :--- | :--- |
| `/compact` | Compact full session context |
| `/compact [focus]` | Compact with emphasis on specific area |
| `/compact --aggressive` | Maximum compression (keeps only decisions + state) |

## Examples

```
/compact
/compact authentication work
/compact database changes
/compact --aggressive
```

## What's Preserved

| Priority | Content |
| :--- | :--- |
| Always | Decisions made, current task state, blockers |
| High | Key code patterns, file paths of modified files |
| Medium | Context behind decisions, alternatives rejected |
| Compressed | Conversation history, exploration details |

## When to Use

- Context window approaching 70%+
- Starting a new sub-task within a long session
- Before switching to a different phase of work

## Related Commands

`/checkpoint` — save a named restore point · `/learn` — extract patterns before compacting
