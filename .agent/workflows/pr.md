---
description: Production-grade PR creation with branch strategy validation, size/scope guards, pre-flight checks, and CI verification.
args: branch name
version: 3.0.0
sdlc-phase: ship
skills: [git-workflow, pr-toolkit, verification-loop]
commit-types: [feat, fix, refactor, perf, chore, docs, test]
---

# /pr — Production-Grade Pull Request Workflow

> **Trigger**: `/pr [target]` (default: `main`) · `/pr --draft [target]`
> **Lifecycle**: Ship — after `/preflight` readiness passes, before `/deploy`

> Standards: See `rules/workflow-standards.md` (artifact discipline, conventional commits, branch strategy, governance)

> [!CAUTION]
> PR creation pushes code to remote and triggers CI pipelines. Run `/review` locally first. Never create PRs with unresolved conflicts or failing tests.

---

## Scope Filter

| Commit Type | PR Mode | Gates Skipped |
| :--- | :--- | :--- |
| `feat`, `fix`, `refactor`, `perf` | Full (8 steps) | None |
| `chore` | Lightweight | Step 3 (pre-flight) |
| `docs` | Lightweight | Steps 3, 7 (pre-flight, CI) |
| `test` | Lightweight | Step 3 runs test gate only |

---

## Critical Rules

1. Detect branch strategy before validating target
2. Sync with target branch before creating PR
3. Run pre-flight `/review` locally before pushing
4. Never create PR from `main`/`production` branches
5. Never create PR with known conflicts — resolve first
6. Atomic PRs — one logical unit of work per PR
7. Size guard — XL (50+ files/1500+ LOC) must be split

---

## Steps

### Step 1: Verify Branch State & Detect Strategy

// turbo

- If on `main`/`production` → **STOP**
- If dirty working tree → prompt to commit or stash
- Detect GitFlow vs Trunk-Based (check for `dev`/`develop` remote)
- Validate target branch per strategy rules

### Step 2: Sync with Target Branch

// turbo

```bash
git fetch origin <target> && git merge origin/<target> --no-edit
```

If conflicts → resolve, commit as `merge: resolve conflicts with <target>`, re-run Step 3.

### Step 2.5: Size & Scope Guard

// turbo

- Classify PR size (XS-M proceed, L warn, XL block)
- Check scope coherence — detect mixed concerns and recommend splitting

### Step 3: Run Pre-Flight Checks

// turbo

- Check `/preflight` scorecard (for feat/fix/refactor/perf)
- Run `/review` pipeline (scope-filtered by commit type)
- Fix any failures before proceeding

### Step 4: Push to Remote

```bash
git push origin HEAD
```

### Step 5: Generate & Validate PR Title & Body

// turbo

**Title**: Parse from branch name → `type(scope): description`. Validate conventional format, imperative mood, <72 chars.

**Body**: Populate from `git log` and `git diff --stat`. Include Summary, Changes, Test Plan, Breaking Changes, Related Issues sections.

### Step 6: Create PR

Pre-check for existing open PR on current branch.

**2-tier fallback**:
1. `gh pr create --title "<title>" --body "<body>" --base <target> [--draft]`
2. If fails → provide pre-formatted title + body for manual browser paste

### Step 7: Verify CI Pipeline

Poll CI status via `gh pr checks`. Report each check. Note draft PRs may not trigger CI.

### Step 8: Handle Results

- All green → offer to assign reviewers, link issues
- Any fail → read logs, suggest fix, re-run from Step 3

---

## PR Body Template

```markdown
## Summary
[One-line from branch name and commits]

## Changes
### [Category from commit types]
- [Change descriptions]

## Test Plan
- [x] Pre-flight `/review` passed locally
- [x] Branch synced with `{target}` — no conflicts
- [x] No secrets or PII in diff

## Breaking Changes
[None / list]

## Related Issues
[Closes #N]
```

---

## Output Template

```markdown
## PR Created Successfully

| Field | Value |
| :--- | :--- |
| PR | #[N] |
| Title | [type(scope): description] |
| Branch | [source] → [target] |
| Status | [draft / ready] |
| URL | [link] |

### CI Status
| Check | Status |
| :--- | :--- |
| [name] | Pass / Pending / Fail |

**Next**: Wait for CI → `/deploy` when ready.
```

---

## Governance

**PROHIBITED:** PRs from `main`/`production` · wrong target per strategy · unresolved conflicts · XL PRs without splitting · pushing without `/review` · non-conventional titles

**REQUIRED:** Branch strategy detection · target validation · size/scope check · branch sync · local pre-flight · conventional title · structured body · CI verification

---

## Completion Criteria

- [ ] Branch strategy detected and target validated
- [ ] Working tree clean, target synced
- [ ] Size classified, scope verified
- [ ] Pre-flight passed (scope-filtered)
- [ ] Pushed, PR created with structured body
- [ ] CI monitored

---

## Related Resources

- **Previous**: `/preflight` · `/review`
- **Next**: `/deploy`
- **Skills**: `.agent/skills/pr-toolkit/SKILL.md` · `.agent/skills/git-workflow/SKILL.md`
- **Related**: `/pr-review` · `/pr-fix` · `/status`
