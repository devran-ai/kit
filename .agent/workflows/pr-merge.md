---
description: Safe PR merge with dependency validation, CI verification, post-merge checks, and branch cleanup.
args: "PR #"
version: 1.0.0
sdlc-phase: ship
skills: [pr-toolkit, verification-loop]
commit-types: [feat, fix, refactor, perf, chore, docs, test]
---

# /pr-merge — Safe Pull Request Merge Workflow

> **Trigger**: `/pr-merge <url>` · `/pr-merge #<number>`
> **Lifecycle**: Ship — after review approval, before deployment

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Merging modifies the target branch and is difficult to reverse. Ensure all checks pass, reviews approved, and dependencies merged.

---

## Critical Rules

1. Never merge with failing CI checks
2. Never merge without at least 1 approval (unless solo project)
3. Never merge with unresolved `Depends-On:` PRs still open
4. Verify merge target matches branch strategy
5. Run post-merge validation for integration issues
6. Prefer squash merge for features, merge commit for release/dev→main

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/pr-merge #<number>` | Merge PR in current repo |
| `/pr-merge #<number> --squash/--merge-commit/--rebase` | Force merge strategy |
| `/pr-merge #<number> --dry-run` | Validate readiness without merging |

---

## Steps

### Step 1: Validate PR State
// turbo
Verify PR is open, mergeable, not blocked via `gh pr view`.

### Step 2: Verify Prerequisites
// turbo
- **Review**: `reviewDecision` must be `APPROVED`
- **CI**: all checks passing via `gh pr checks`
- **Dependencies**: extract `Depends-On` from body, verify all merged
- **Branch strategy**: verify target matches detected strategy

### Step 3: Execute Merge

| Scenario | Default Strategy |
| :--- | :--- |
| Feature → dev | Squash merge |
| dev → main (release) | Merge commit |
| hotfix → main | Squash merge |

```bash
gh pr merge <number> --repo <owner/repo> --{squash|merge|rebase} --delete-branch
```

### Step 4: Post-Merge Validation
// turbo
- Verify merge recorded, check target branch CI
- Notify dependent PRs that this dependency is now merged

---

## Output Template

```markdown
## PR Merged: #{number}

| Field | Value |
| :--- | :--- |
| Merged into | {base} |
| Strategy | {squash/merge/rebase} |
| Branch cleanup | Deleted |

### Post-Merge
| Check | Status |
| :--- | :--- |
| CI on target | {status} |
| Dependent PRs notified | {count} |

**Next**: `/deploy` when ready
```

---

## Governance

**PROHIBITED:** Merging with failing CI · without approval · with open dependencies · force-merging past protections

**REQUIRED:** All CI passing · review approval · dependency validation · branch strategy compliance · post-merge verification · branch cleanup

---

## Completion Criteria

- [ ] PR validated (open, mergeable, approved, CI passing)
- [ ] Dependencies verified, strategy compliance checked
- [ ] Merged with appropriate strategy, branch deleted
- [ ] Post-merge CI checked, dependent PRs notified

---

## Related Resources

- **Skill**: `.agent/skills/pr-toolkit/SKILL.md`
- **Previous**: `/pr-review` · `/pr-fix`
- **Next**: `/deploy`
