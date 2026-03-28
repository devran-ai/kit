---
description: Implement a feature based on an approved plan
workflow: implement
---

# /implement Command

Execute implementation based on an approved `docs/PLAN-*.md` or explicit approved task list. See `.agent/workflows/implement.md` for full process.

## Usage

| Command | Action |
| :--- | :--- |
| `/implement` | Interactive — ask for plan reference |
| `/implement [plan-slug]` | Load and execute `docs/PLAN-[plan-slug].md` |
| `/implement --resume [plan-slug]` | Resume from last completed step |
| `/implement --dry-run [plan-slug]` | Show execution order without implementing |

## Examples

```
/implement user-auth
/implement --resume checkout-flow
/implement --dry-run api-redesign
```

## Process (see workflow for full detail)

1. Load approved plan from `docs/PLAN-{slug}.md`
2. Verify all prerequisites exist
3. For each task: implement → verify (lint/types/tests) → commit → mark ✅
4. Run final full verification pipeline
5. Present progress summary

## Output Preview

```
## Implementation Complete: user-auth

| Task | Status | File(s) | Commit |
| :--- | :--- | :--- | :--- |
| Add JWT service | ✅ | src/auth/jwt.service.ts | abc1234 |
| Add auth middleware | ✅ | src/middleware/auth.ts | def5678 |

Final Verification: Lint ✅ · Types ✅ · Tests ✅ · Build ✅
```

## Related Commands

`/plan` — create the plan first · `/test` — run tests after · `/review` — quality gates · `/pr` — open pull request
