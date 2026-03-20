---
description: Fix pull request issues based on review comments. Fetch findings, prioritize by severity, implement fixes, verify, and push resolution.
version: 1.0.0
sdlc-phase: build
skills: [pr-toolkit, verification-loop]
commit-types: [fix]
---

# /pr-fix — Pull Request Fix Workflow

> **Trigger**: `/pr-fix <url>` · `/pr-fix <owner/repo>#<number>` · `/pr-fix #<number>`
> **Lifecycle**: Build — remediation phase after review findings, before re-review

> [!CAUTION]
> This workflow modifies code and pushes to the PR branch. Ensure you have write access to the branch and that no other contributors are actively pushing to it. Coordinate with the PR author if you are not the author.

> [!TIP]
> This workflow leverages the **pr-toolkit** skill for fix prioritization and the **verification-loop** skill for post-fix validation. Read `.agent/skills/pr-toolkit/SKILL.md` for the fix prioritization framework.

---

## Scope Filter

| Commit Type | Behavior | Rationale |
| :--- | :--- | :--- |
| `fix()` | Full workflow (all steps) | Fix commits from review findings |

> This workflow always produces `fix` commits. The scope filter applies to the PR's original commit type for context only.

---

## Critical Rules

1. **ALWAYS** fetch and read ALL review comments before implementing any fix — understand the full picture first
2. **ALWAYS** prioritize fixes: CRITICAL → HIGH → MEDIUM → LOW (never skip severity levels)
3. **ALWAYS** run `/review` pipeline after all fixes before pushing — never push broken code
4. **NEVER** modify code unrelated to review findings — stay scoped to the review
5. **NEVER** dismiss or resolve review comments without implementing the fix or providing justification
6. **ATOMIC** commits — one fix per commit with descriptive message referencing the finding

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/pr-fix <url>` | Fix PR at the given GitHub URL |
| `/pr-fix <owner/repo>#<number>` | Fix PR by owner/repo and number |
| `/pr-fix #<number>` | Fix PR in current repo by number |
| `/pr-fix #<number> --critical-only` | Fix only CRITICAL findings |
| `/pr-fix #<number> --dry-run` | Show fix plan without implementing |

---

## Steps

Execute IN ORDER. Stop at first failure.

### Step 1: Parse PR Reference and Validate

// turbo

Parse the PR reference (same as `/pr-review` Step 1):

```bash
# Get repo if not specified
gh repo view --json nameWithOwner --jq .nameWithOwner

# Validate PR exists and is open
gh pr view <number> --repo <owner/repo> --json state,title,headRefName --jq '{state,title,headRefName}'
```

- If PR is closed/merged → **STOP**: "Cannot fix a closed/merged PR"
- If PR is open → proceed

### Step 2: Fetch Review Comments

// turbo

Retrieve all review comments and requested changes:

```bash
# Fetch PR reviews with comments
gh api repos/<owner>/<repo>/pulls/<number>/reviews

# Fetch inline review comments
gh api repos/<owner>/<repo>/pulls/<number>/comments

# Fetch issue-level comments (may contain fix requests)
gh api repos/<owner>/<repo>/issues/<number>/comments

# Get PR diff for context
gh pr diff <number> --repo <owner/repo>
```

Extract and categorize:
- Review verdicts (REQUEST_CHANGES, COMMENT, APPROVE)
- Inline comments with file:line references
- Issue-level comments with fix requests
- Already-resolved comments (skip these)

### Step 3: Categorize and Prioritize Fixes

// turbo

Apply the pr-toolkit fix prioritization framework:

| Priority | Category | Examples |
| :--- | :--- | :--- |
| P0 | CRITICAL | Security vulnerabilities, data loss, crashes |
| P1 | HIGH | Broken functionality, failed tests, code quality blockers |
| P2 | MEDIUM | Style issues, naming, documentation gaps |
| P3 | LOW/NIT | Suggestions, preferences, nice-to-haves |

Generate a fix plan:

```markdown
## Fix Plan for PR #{number}

| # | Priority | File:Line | Finding | Planned Fix |
| :--- | :--- | :--- | :--- | :--- |
| 1 | P0 | src/auth.ts:42 | Hardcoded API key | Move to env var |
| 2 | P1 | src/api/user.ts:15 | Missing input validation | Add Zod schema |
| ... | ... | ... | ... | ... |

**Total**: {p0} P0, {p1} P1, {p2} P2, {p3} P3
```

If `--dry-run` flag → display fix plan and **STOP**
If `--critical-only` flag → filter to P0 only

### Step 4: Checkout PR Branch

```bash
# Fetch the PR branch
git fetch origin pull/<number>/head:<branch-name>
# Or if you have push access:
git fetch origin <head-branch>
git checkout <head-branch>

# Ensure branch is up to date
git pull origin <head-branch>
```

- If checkout fails → **STOP**: "Cannot checkout PR branch — check access permissions"
- If branch has conflicts with base → resolve conflicts first per `/pr` conflict resolution protocol

### Step 5: Implement Fixes

Implement fixes in priority order (P0 → P1 → P2 → P3):

For each fix:

1. **Read** the affected file and understand the context
2. **Implement** the fix addressing the reviewer's specific concern
3. **Verify** the fix resolves the issue (run affected tests if applicable)
4. **Commit** with descriptive message:

```bash
git add <fixed-files>
git commit -m "fix(review): <description of fix>

Addresses review comment: <summary of reviewer's finding>"
```

**Fix Guidelines:**
- Address the reviewer's exact concern — do not over-fix or refactor adjacent code
- If a finding requires a larger change than expected, document the scope and confirm with user
- If a finding is incorrect or not applicable, prepare a justification comment instead of a code change

### Step 6: Run Verification

// turbo

After all fixes are implemented, run the full verification pipeline:

```bash
# Delegate to /review pipeline
# Gates: lint → type-check → tests → security → build
```

- If any gate fails → fix the failure, re-run verification
- If all gates pass → proceed to push

### Step 7: Push Fixes

```bash
git push origin <head-branch>
```

- If push rejected → pull latest, resolve conflicts, re-verify, retry push
- If push succeeds → proceed to comment

### Step 8: Comment Resolution

Post a summary comment on the PR documenting all fixes made:

```bash
gh pr comment <number> --repo <owner/repo> --body "## Review Fixes Applied

| # | Finding | Fix Applied | Commit |
| :--- | :--- | :--- | :--- |
| 1 | {finding summary} | {fix description} | {short sha} |
| ... | ... | ... | ... |

**Verification**: All gates passed (lint, types, tests, security, build)

Ready for re-review."
```

Re-request review from the original reviewer:

```bash
gh pr edit <number> --repo <owner/repo> --add-reviewer <reviewer>
```

---

## Output Template

### Fixes Applied Successfully

```markdown
## PR Fix Complete: #{number}

| Field | Value |
| :--- | :--- |
| PR | #{number} — {title} |
| Branch | {head-branch} |
| Fixes Applied | {count} |
| Commits | {commit count} |
| Verification | All gates passed |

### Fix Summary

| Priority | Count | Status |
| :--- | :--- | :--- |
| P0 (Critical) | {n} | {all fixed / partial} |
| P1 (High) | {n} | {all fixed / partial} |
| P2 (Medium) | {n} | {all fixed / skipped} |
| P3 (Low) | {n} | {all fixed / skipped} |

**Next**: Wait for re-review from @{reviewer}
```

### Fix Failed

```markdown
## PR Fix Failed at Step {N}

### Error
{error description}

### Resolution
1. {fix steps}
2. Re-run: `/pr-fix <reference>`

### Partial Progress
{list of fixes already applied}
```

---

## Governance

**PROHIBITED:**
- Modifying code unrelated to review findings
- Pushing without running full verification pipeline
- Dismissing review comments without justification
- Force-pushing over the PR branch (use regular push only)
- Skipping CRITICAL or HIGH findings (unless `--critical-only` is used)
- Resolving review threads without implementing the fix

**REQUIRED:**
- Read ALL review comments before implementing any fix
- Priority-ordered fixing (P0 → P1 → P2 → P3)
- Atomic commits — one fix per commit with review reference
- Full `/review` pipeline pass before push
- Summary comment documenting all fixes
- Re-request review from original reviewer

---

## Completion Criteria

- [ ] PR reference parsed and validated (open PR)
- [ ] All review comments fetched and categorized
- [ ] Fix plan generated with priority ordering
- [ ] PR branch checked out and up to date
- [ ] All applicable fixes implemented (by priority level)
- [ ] Each fix committed with descriptive message
- [ ] Full verification pipeline passed
- [ ] Fixes pushed to PR branch
- [ ] Summary comment posted on PR
- [ ] Re-review requested from original reviewer

---

## Related Resources

- **Skill**: `.agent/skills/pr-toolkit/SKILL.md` — fix prioritization framework, commit conventions
- **Previous**: `/pr-review` (review findings that drive fixes)
- **Next**: Re-review cycle → `/pr-review` or manual reviewer re-check
- **Related**: `/review` (local verification pipeline) · `/pr` (PR creation)
- **Rule**: `.agent/rules/git-workflow.md` — commit conventions
