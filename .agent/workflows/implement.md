---
description: Execute implementation based on an approved plan or explicit task list.
args: task or plan reference
version: 1.0.0
sdlc-phase: build
skills: [clean-code, verification-loop, project-docs-discovery]
commit-types: [feat, fix, refactor]
---

# /implement — Plan-Based Implementation

> **Trigger**: `/implement [plan-slug|task description]`
> **Lifecycle**: Build — after `/plan` approval, before `/test`

> Standards: See `rules/workflow-standards.md`

> [!IMPORTANT]
> Must have an approved plan or explicit task list before implementing. No speculative implementation.

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features need plan-guided implementation |
| `fix` | Required | Bug fixes need systematic implementation |
| `refactor` | Required | Refactors need plan to avoid scope creep |
| `docs` | Skip | Documentation doesn't need implementation workflow |
| `chore` | Skip | Tooling changes don't need plan-based execution |

---

## Critical Rules

1. **Plan required** — must reference an approved `docs/PLAN-*.md` or explicit approved task list
2. **No deviation** — implement exactly what was planned; deviations require user approval
3. **Incremental verification** — verify (tests + lint + types) after each implementation step
4. **Atomic commits** — one commit per completed task/step, referencing plan item
5. **Minimal scope** — only touch files specified in the plan; no "while I'm here" changes
6. **Mark complete** — update plan task checkboxes as each item is finished

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/implement` | Interactive — ask for plan reference |
| `/implement [plan-slug]` | Load `docs/PLAN-[plan-slug].md` and execute |
| `/implement --resume [plan-slug]` | Resume partial implementation from last completed step |
| `/implement --dry-run [plan-slug]` | Show execution order without implementing |

---

## Steps

// turbo
1. **Load Plan** — read `docs/PLAN-{slug}.md`, parse task list, identify incomplete tasks, determine execution order

// turbo
2. **Verify Prerequisites** — check all plan dependencies exist (files, packages, services); report missing prerequisites before starting

3. **For Each Task** (in plan order):
   a. Read plan task: action, file path, why, verification criteria
   b. Check file exists and review current state
   c. Implement the change — following plan exactly
   d. Run per-step verification: `lint`, `tsc --noEmit`, affected tests
   e. Commit with message referencing plan:
   ```bash
   git commit -m "feat([scope]): [task description]

   Implements: PLAN-[slug] Task [N] — [task title]"
   ```
   f. Mark task checkbox complete in plan file: `- [x]`

// turbo
4. **Final Verification** — run full pipeline: lint → type-check → tests → build. Record pass/fail per gate.

5. **Implementation Summary** — present progress table and next steps

---

## Output Template

```markdown
## ⚙️ Implementation Complete: [Plan Slug]

### Progress
| Task | Status | File(s) | Commit |
| :--- | :--- | :--- | :--- |
| [task 1] | ✅ Done | `path/to/file.ts` | abc1234 |
| [task 2] | ✅ Done | `path/to/other.ts` | def5678 |

### Final Verification
| Gate | Status |
| :--- | :--- |
| Lint | ✅ Pass |
| Type Check | ✅ Pass |
| Tests | ✅ Pass (coverage: 84%) |
| Build | ✅ Pass |

**Next**: `/test` for full suite · `/review` for quality gates · `/pr` to open pull request
```

**Partial Completion (blocker encountered):**
```markdown
## Implementation Partial — [Plan Slug]

**Completed**: [N] / [total] tasks
**Blocked at**: Task [N] — [task title]
**Reason**: [exact blocker description]

### Completed Tasks
| Task | File(s) | Commit |

### Blocked Task
**What was attempted**: [description]
**Blocker**: [error or missing dependency]
**Action required**: [what the user needs to do]
```

---

## Governance

**PROHIBITED:** Implementing without approved plan · deviating from plan without approval · committing unverified code · touching files not in plan · skipping step verification

**REQUIRED:** Plan reference · prerequisite check · incremental verification after each step · atomic commits with plan references · plan checkbox updates · final full verification

---

## Completion Criteria

- [ ] Approved plan loaded and task list parsed
- [ ] Prerequisites verified — all dependencies exist
- [ ] All plan tasks implemented in order
- [ ] Per-step verification passed after each task
- [ ] Each task committed atomically with plan reference
- [ ] Plan task checkboxes updated to `[x]`
- [ ] Final verification pipeline passed (lint, types, tests, build)

---

## Related Resources

- **Previous**: `/plan` · **Next**: `/test` · `/review` · `/pr`
- **Skills**: `.agent/skills/clean-code/SKILL.md` · `.agent/skills/verification-loop/SKILL.md`
