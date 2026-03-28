---
description: Fix PR issues from review comments. Fetch findings, prioritize by severity, implement fixes with evidence, verify, push, and post resolution summary with reviewer attribution.
args: "PR #"
version: 1.1.0
sdlc-phase: build
skills: [pr-toolkit, verification-loop, project-docs-discovery]
commit-types: [fix]
---

# /pr-fix — Pull Request Fix Workflow

> **Trigger**: `/pr-fix <url>` · `/pr-fix <owner/repo>#<number>` · `/pr-fix #<number>`
> **Lifecycle**: Build — remediation after review, before re-review

> Standards: See `rules/workflow-standards.md` (artifact discipline, evidence standard, governance)

> [!CAUTION]
> This workflow modifies code and pushes to the PR branch. Ensure write access and coordinate with PR author if needed.

---

## Critical Rules

0. **NO ARTIFACT FILES** — never create `.md` notes, fix summaries, or scratch files in the repository. Post summaries as PR comments only.
1. **REVIEWER ATTRIBUTION** — every fix MUST credit the reviewer who flagged it (stated once, applies to all steps and output)
2. Fetch ALL review comments (humans AND bots) before implementing any fix
3. Prioritize fixes: CRITICAL → HIGH → MEDIUM → LOW — never skip severity levels
4. Run `/review` pipeline after all fixes before pushing — never push broken code
5. Never modify code unrelated to review findings — stay scoped
6. Atomic commits — one fix per commit referencing the finding (exception: related doc fixes in same file)
7. **EVIDENCE MANDATE** — every fix comment must include: before state (file:line + content), after state (file:line + content), and which reviewer's concern it addresses

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/pr-fix #<number>` | Fix PR in current repo |
| `/pr-fix <url>` | Fix PR at GitHub URL |
| `/pr-fix #<number> --critical-only` | Fix only CRITICAL findings |
| `/pr-fix #<number> --dry-run` | Show fix plan without implementing |

---

## Steps

### Step 1: Parse PR Reference and Validate

// turbo

Parse PR reference, validate PR is open. If closed/merged → **STOP**.

### Step 2: Fetch ALL Review Comments

```bash
gh api repos/<owner>/<repo>/pulls/<number>/reviews
gh api repos/<owner>/<repo>/pulls/<number>/comments
gh api repos/<owner>/<repo>/issues/<number>/comments
gh pr diff <number> --repo <owner/repo>
```

For each comment extract: **Reviewer**, **Type** (inline/general), **Finding**, **Severity**, **Suggested fix**, **Status**. Skip resolved/outdated comments.

**Bot parsing** (see `.agent/skills/pr-toolkit/bot-parsers.md` for detailed patterns):
- **Gemini Code Assist**: Extract `Medium/High Priority` labels + `Suggested change` code blocks
- **CodeRabbit**: Extract severity badges (🔴 Critical, 🟠 Major, 🟡 Minor) + nitpick tags
- **SonarCloud**: Quality gate failures → map to CRITICAL/HIGH; code smells → MEDIUM/LOW
- **Dependabot**: Security advisories → always CRITICAL; version bumps → LOW
- **GitHub Actions**: Failed checks → extract job name, step, error message → P0/P1

### Step 3: Categorize and Prioritize

| Priority | Category | Examples |
| :--- | :--- | :--- |
| P0 | CRITICAL | Security, data loss, crashes |
| P1 | HIGH | Broken functionality, test failures |
| P2 | MEDIUM | Doc inconsistencies, naming |
| P3 | LOW/NIT | Suggestions, preferences |

Generate fix plan as markdown table:

```markdown
## Fix Plan — PR #<number>
| # | Priority | Reviewer | File:Line | Finding | Planned Fix |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | P0 CRITICAL | @alice | src/auth.ts:42 | SQL injection risk | Parameterized query |
| 2 | P1 HIGH | CodeRabbit 🟠 | src/api.ts:15 | Missing error handler | Add try/catch |
```

If `--dry-run` → display plan and **STOP**. If `--critical-only` → filter to P0.

### Step 4: Checkout PR Branch

```bash
git fetch origin <head-branch> && git checkout <head-branch> && git pull origin <head-branch>
```

### Step 5: Implement Fixes

For each fix (P0 → P3 order):
1. Read file, record before state with line number
2. Implement fix addressing reviewer's exact concern
3. Record after state
4. Verify fix, commit:
```bash
git commit -m "fix(review): <description>

Addresses @<reviewer>'s finding at <file>:<line>"
```

**Guidelines**: Address exact concern — no over-fixing. Apply bot `Suggested change` blocks when valid. Verify cross-file consistency after each fix. Closely related fixes in same file from same reviewer may be grouped with documented reason.

### Step 6: Run Verification

Run `/review` pipeline. Record per-gate result:

| Gate | Command | Pass Condition | On Fail |
| :--- | :--- | :--- | :--- |
| Lint | `eslint`/`ruff`/`golangci-lint` | Zero errors | Fix then retry (max 3) |
| Type Check | `tsc --noEmit` / `mypy` | Zero type errors | Fix then retry |
| Tests | `jest`/`pytest`/`go test` | All pass, coverage ≥ pre-PR | Fix then retry |
| Security | `npm audit`/`trivy` | No new CRITICAL/HIGH | Fix then retry |
| Build | `npm run build` / stack-specific | Clean exit code 0 | Fix then retry |

Max 3 retry cycles per gate. If any gate still fails after 3 retries → STOP, report blocker to user.

### Step 7: Push Fixes

```bash
git push origin <head-branch>
```

### Step 8: Post Resolution Summary

Post comment on PR using `gh pr comment #<number> --body "..."` with full resolution summary. Re-request review from human reviewers via `gh pr edit --add-reviewer`.

Resolution summary format:
```markdown
## 🔧 ✅ PR Fix Complete

**Findings addressed:** {count} ({n} human · {n} bot)
**Commits:** {count} · **Verification:** All gates passed

### Fix Summary
| # | Priority | Reviewer | File:Line | Finding | Fix Applied | Commit |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | P0 | @alice | auth.ts:42 | SQL injection | Parameterized query | abc1234 |

### Diffs (Critical/High findings)
**Fix #1 — auth.ts:42** (@alice: "SQL injection risk")
```diff
- const query = `SELECT * FROM users WHERE id = ${userId}`
+ const query = `SELECT * FROM users WHERE id = $1`
+ db.query(query, [userId])
```

### Verification
| Gate | Status |
| :--- | :--- |
| Lint | ✅ Pass |
| Type Check | ✅ Pass |
| Tests | ✅ Pass (coverage: 84%) |
| Security | ✅ Pass |
| Build | ✅ Pass |

@alice @bob — ready for re-review.
```

---

## Failure Output Template

```markdown
## ⚠️ PR Fix Blocked — #{number}

**Completed:** {n}/{total} fixes
**Blocked at:** [Gate name / Step name]
**Reason:** [exact error or blocker]

### Completed Fixes
| # | Priority | Reviewer | Fix Applied | Commit |

### Blocked Findings
| # | Priority | Finding | Blocker | Action Needed |

**Recommended next step:** [user action required]
```

---

## Output Template

```markdown
## 🔧 PR Fix Complete: #{number} — {title}

| Field | Value |
| :--- | :--- |
| Fixes Applied | {count} ({n} humans, {n} bots) |
| Commits | {count} |
| Verification | All gates passed |

### Fix Summary
| # | Priority | Reviewer | File:Line | Fix Applied | Commit |
| :--- | :--- | :--- | :--- | :--- | :--- |

### Verification
| Gate | Status |
| :--- | :--- |
| Lint / Type Check / Tests / Security / Build | Pass/Fail |

**Next**: Wait for re-review. Bots re-analyze automatically on push.
```

---

## Governance

**PROHIBITED:** Modifying unrelated code · pushing without verification · dismissing comments without justification · force-pushing · omitting before/after diffs or reviewer attribution

**REQUIRED:** Read ALL comments before fixing · priority-ordered fixing · atomic commits · full verification before push · detailed summary with attribution and file:line · re-request review

---

## Completion Criteria

- [ ] PR reference validated — PR is open and accessible
- [ ] All review comments fetched: human reviewers AND all bots (Gemini, CodeRabbit, SonarCloud, Dependabot, Actions)
- [ ] Each comment attributed to reviewer with severity classification
- [ ] Fix plan generated with P0→P3 ordering and presented (or `--dry-run` output presented and stopped)
- [ ] PR branch checked out and up to date
- [ ] All fixes implemented in priority order with atomic commits
- [ ] Every commit includes reviewer attribution in message
- [ ] Evidence recorded: before/after state for each fix
- [ ] Verification pipeline passed: all 5 gates (lint, type-check, tests, security, build)
- [ ] Resolution summary posted as PR comment with diffs
- [ ] Human reviewers re-requested for review

---

## Related Resources

- **Skill**: `.agent/skills/pr-toolkit/SKILL.md`
- **Previous**: `/pr-review`
- **Next**: Re-review cycle
- **Related**: `/review` · `/pr`
