---
description: Fix PR issues from review comments. Fetch findings, prioritize by severity, implement fixes with evidence, verify, push, and post resolution summary with reviewer attribution.
version: 1.1.0
sdlc-phase: build
skills: [pr-toolkit, verification-loop]
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

1. **REVIEWER ATTRIBUTION** — every fix MUST credit the reviewer who flagged it (stated once, applies to all steps and output)
2. Fetch ALL review comments (humans AND bots) before implementing any fix
3. Prioritize fixes: CRITICAL → HIGH → MEDIUM → LOW — never skip severity levels
4. Run `/review` pipeline after all fixes before pushing — never push broken code
5. Never modify code unrelated to review findings — stay scoped
6. Atomic commits — one fix per commit referencing the finding (exception: related doc fixes in same file)

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

**Bot parsing**: Gemini → `Medium/High Priority` labels + `Suggested change` blocks. CodeRabbit → severity badges. SonarCloud → quality gate issues.

### Step 3: Categorize and Prioritize

| Priority | Category | Examples |
| :--- | :--- | :--- |
| P0 | CRITICAL | Security, data loss, crashes |
| P1 | HIGH | Broken functionality, test failures |
| P2 | MEDIUM | Doc inconsistencies, naming |
| P3 | LOW/NIT | Suggestions, preferences |

Generate fix plan table: `# | Priority | Reviewer | File:Line | Finding | Planned Fix`

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

Run `/review` pipeline (lint → type-check → tests → security → build). Record per-gate status. Max 3 retry cycles on failure.

### Step 7: Push Fixes

```bash
git push origin <head-branch>
```

### Step 8: Post Resolution Summary

Post comment on PR with fixes table, before/after diffs, verification results, and disposition. Re-request review from human reviewers via `gh pr edit --add-reviewer`.

---

## Output Template

```markdown
## PR Fix Complete: #{number} — {title}

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

- [ ] All review comments fetched and attributed
- [ ] Fix plan generated with priority ordering
- [ ] Fixes implemented with before/after evidence
- [ ] Verification pipeline passed
- [ ] Summary comment posted with attribution and diffs
- [ ] Re-review requested

---

## Related Resources

- **Skill**: `.agent/skills/pr-toolkit/SKILL.md`
- **Previous**: `/pr-review`
- **Next**: Re-review cycle
- **Related**: `/review` · `/pr`
