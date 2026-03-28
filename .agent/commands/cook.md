---
description: Full lifecycle coding workflow — from idea to production-ready code
sdlc-phase: cross-cutting
invokes: [planner, tdd-guide, code-reviewer, security-reviewer]
commit-types: [feat, fix, refactor]
---

# /cook Command

Complete "from scratch to done" coding workflow. Orchestrates the full SDLC: Plan → Build → Test → Review → Document → Verify. Cannot skip Plan or Test phases.

## Usage

```
/cook <feature description>
```

## Examples

```
/cook user authentication with JWT and refresh tokens
/cook product listing page with filtering and pagination
/cook payment checkout flow with Stripe integration
```

## Phase Breakdown

| Phase | Workflow/Command | Gate | Agent(s) |
| :--- | :--- | :--- | :--- |
| 1. Plan | `/plan` | **Required** — must complete before Build | `planner` |
| 2. Build | `/create` or `/implement` | Requires approved plan | `frontend-specialist` / `backend-specialist` |
| 3. Test | `/test` | **Required** — must achieve ≥80% coverage | `tdd-guide` |
| 4. Review | `/review` | All 5 gates must pass | `code-reviewer` |
| 5. Document | `/doc` | Required for public APIs and new features | `doc-updater` |
| 6. Verify | `/preflight` | Production readiness check | `reliability-engineer` |

> **Gates**: Plan and Test cannot be skipped. All other phases are required but adapt to scope.

## Process (see individual workflow files for detail)

1. Run `/plan [feature]` — wait for approval before proceeding
2. Run `/create` or `/implement` — scaffold and build per approved plan
3. Run `/test` — write and verify tests (≥80% coverage gate)
4. Run `/review` — lint, type-check, security, build gates
5. Update docs — inline, README, API docs as needed
6. Run `/preflight` — production readiness scorecard

## Output Preview

```
## Cook Complete: user-authentication

Phase Results:
- Plan: ✅ Approved (5 tasks)
- Build: ✅ 8 files created/modified
- Test: ✅ 23 tests, 87% coverage
- Review: ✅ All 5 gates passed
- Docs: ✅ JSDoc + README updated
- Preflight: ✅ 91/100 — Ready

Ready for /pr
```

## Related Commands

`/plan` — planning only · `/implement` — build from existing plan · `/pr` — open pull request after cook
