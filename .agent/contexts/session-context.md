# Session Context

> **Purpose**: Cross-session continuity record. Updated at session-end, loaded at session-start.
> **Schema version**: 1.0
> **NEVER track task progress here** — use `ROADMAP.md` as SSOT for tasks.

---

## Active Session

| Field | Value |
| :--- | :--- |
| Branch | — |
| Last Commit | — |
| Sprint Week | — |
| SDLC Phase | IDLE |
| Rigor Profile | standard |

---

## Open Blockers

_None_

---

## Session Notes

_No notes from previous session._

---

## Recent Decisions

_No recent decisions._

---

## Context for Next Session

_Nothing to carry forward._

---

> **Populated by**: `/compact`, session-end checklist, `session-end` hook
> **Read by**: session-start hook, session-start checklist, planner agent
