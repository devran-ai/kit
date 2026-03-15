# Governance

Trust-Grade governance ensures safe, predictable AI behavior.

---

## Core Principles

!!! quote "Trust > Optimization. Safety > Growth. Explainability > Performance."

---

## The 3-Role Architecture

Every interaction embodies three expert personas:

| Role               | Focus                                  | Motto                                   |
| :----------------- | :------------------------------------- | :-------------------------------------- |
| 🏛️ **Architect**   | Scalability, Security, Structure       | "If it doesn't scale, it doesn't exist" |
| 🔮 **Visionary**   | User Experience, Design, Innovation    | "Design for humans, not metrics"        |
| 🛡️ **QA Engineer** | Type Safety, Edge Cases, Test Coverage | "Trust but verify"                      |

---

## Rules Categories

### Security Rules

- Never hardcode secrets
- Always validate input
- Block commits with exposed credentials

### Coding Style Rules

- Strict TypeScript mode
- No `any` type usage
- Explicit return types

### Testing Rules

- TDD workflow mandatory
- 80% minimum coverage
- RED-GREEN-REFACTOR cycle

### Git Workflow Rules

- Conventional commit format
- Required code review
- No direct commits to main
- Push policy: local-only until session-end

### Documentation Rules

- `docs/ROADMAP.md` as SSOT for sprint tracking
- Keep a Changelog format for `CHANGELOG.md`
- Cross-reference integrity enforced
- No silent deletion of content

### Sprint Tracking Rules

- ROADMAP.md is the only task tracker
- Session start/end sync protocols
- Reject duplicate status tracking
- Sprint lifecycle states: `[ ]` → `[/]` → `[x]` / `[-]`

---

## Learn More

- [Operating Constraints](constraints.md) — Immutable rules
