---
description: Save a checkpoint for later recovery
uses: [verification-loop]
---

# /checkpoint Command

Create a named save point before risky operations. Uses git tags and context snapshots for reliable recovery.

## Usage

| Command | Action |
| :--- | :--- |
| `/checkpoint [name]` | Create named checkpoint (git tag + context) |
| `/checkpoint restore` | List checkpoints and restore one |
| `/checkpoint list` | Show all checkpoints with metadata |
| `/checkpoint delete [name]` | Remove a checkpoint |

## Examples

```
/checkpoint before-refactor
/checkpoint auth-complete
/checkpoint pre-migration
/checkpoint restore
/checkpoint list
```

## What's Saved

| Component | How |
| :--- | :--- |
| Code state | `git tag checkpoint/{name}` |
| Context snapshot | Task state, decisions, current plan step |
| Timestamp | Automatic — shows in list |

## When to Use

- Before a large refactor
- Before database migrations
- When completing a major feature phase
- Before experimenting with risky changes

## Related Commands

`/compact` — compress context (not a restore point) · `/deploy rollback` — production rollback
