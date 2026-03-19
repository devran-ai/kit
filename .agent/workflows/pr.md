---
description: Production-grade PR creation with pre-flight checks, branch sync, and CI verification.
version: 2.1.0
sdlc-phase: ship
skills: [git-workflow, verification-loop]
commit-types: [feat, fix, refactor, perf, chore, docs, test]
---

# /pr — Production-Grade Pull Request Workflow

> **Trigger**: `/pr [target]` (default: `main`) · `/pr --draft [target]`
> **Lifecycle**: Ship — after `/preflight` readiness passes, before `/deploy`

> [!CAUTION]
> PR creation pushes code to remote and triggers CI pipelines. Always run local pre-flight checks via `/review` before pushing. Never create PRs with unresolved conflicts or failing tests. Every CI run consumes pipeline credits.

> [!TIP]
> This workflow leverages the **git-workflow** skill. Read `.agent/skills/git-workflow/SKILL.md` for extended guidance on branching, conventional commits, and PR templates.

---

## Scope Filter

| Commit Type | PR Mode | Gates Skipped |
| :---------- | :------ | :------------ |
| `feat()` — new features | ✅ Full (8 steps) | None |
| `fix()` — bug fixes | ✅ Full (8 steps) | None |
| `refactor()` — structural | ✅ Full (8 steps) | None |
| `perf()` — performance | ✅ Full (8 steps) | None |
| `chore()` — maintenance | ⚠️ Lightweight | Step 3 (pre-flight) |
| `docs()` — documentation | ⚠️ Lightweight | Steps 3, 7 (pre-flight, CI) |
| `test()` — test additions | ⚠️ Lightweight | Step 3 runs test gate only |

---

## Critical Rules

1. **ALWAYS** sync with target branch before creating PR — prevents merge conflicts
2. **ALWAYS** run pre-flight `/review` locally before pushing — catches issues pre-CI
3. **NEVER** create a PR from `main` or `production` branches
4. **NEVER** create a PR with known conflicts — resolve first
5. **NEVER** merge without all CI checks passing
6. **ATOMIC** PRs — one logical unit of work per PR, not multi-sprint kitchen sinks
7. **CONVENTIONAL** titles — `type(scope): description` format

---

## Argument Parsing

| Command | Action |
| :---------------------- | :--------------------------------------------------- |
| `/pr` | Create PR targeting default branch (`main`) |
| `/pr [target]` | Create PR targeting specified branch (e.g., `/pr dev`) |
| `/pr --draft` | Create PR as draft (may not trigger CI) |
| `/pr --draft [target]` | Create draft PR targeting specified branch |

---

## Steps

Execute IN ORDER. Stop at first failure.

### Step 1: Verify Branch State

// turbo

```powershell
git branch --show-current
git status --porcelain
```

- If on `main` or `production` → **STOP**, instruct user to create feature branch
- If working tree dirty → prompt to commit or stash

### Step 2: Sync with Target Branch

// turbo

```powershell
git fetch origin <target>
git merge origin/<target> --no-edit
```

- If conflicts detected → invoke **Conflict Resolution Protocol** (see below)
- If clean merge → proceed to Step 3

> [!WARNING]
> If the branch has diverged significantly from the target, expect conflicts in shared files like `.gitignore`, `package.json`, or lock files. Always check `git diff --name-only origin/<target>..HEAD` before creating the PR.

### Step 3: Run Pre-Flight Checks

Delegate to `/review` pipeline (Gates 1-5: lint, type-check, test, security, build).

- Scope filter applies:
  - `docs()` → skip all gates
  - `chore()` → skip test + build gates
  - `test()` → run test gate only
  - All others → full pipeline
- If any gate fails → stop, fix, re-run

> [!CAUTION]
> If ANY pre-flight check fails, fix it BEFORE proceeding. Do NOT rely on CI to catch issues — that wastes pipeline credits and delays the team.

### Step 4: Push to Remote

```powershell
git push origin HEAD
```

- If rejected (upstream diverged) → re-run Step 2, then retry push
- If authentication error → guide user to configure credentials

### Step 5: Generate PR Title & Body

// turbo

**Title generation:**
- Parse branch name: `feature/ABC-123-add-user-auth` → `feat(auth): add user auth`
- Fallback: use first commit message subject line
- Format: `type(scope): description` (conventional commits)

**Body generation:**
- Populate from `git log origin/<target>..HEAD --oneline` and `git diff --stat origin/<target>..HEAD`
- Use **PR Body Template** (see below)

### Step 6: Create PR

**Pre-check:** Query existing PRs for current branch. If open PR exists → offer to update title/body instead of creating new.

**MCP-first 3-tier fallback:**
1. Attempt `mcp_github-mcp-server_create_pull_request` with title, body, `is_draft`, base, head
2. If MCP fails → attempt `gh pr create --title "<title>" --body "<body>" --base <target> [--draft]`
3. If `gh` fails → provide pre-formatted title + body for manual browser copy-paste

### Step 7: Verify CI Pipeline

- Poll via `mcp_github-mcp-server_pull_request_read` (method: `get_status`)
- Report each check as it resolves
- If draft PR → note: "Draft PRs may not trigger CI on some repositories. Convert to ready-for-review via MCP `update_pull_request` if CI doesn't appear."

> [!NOTE]
> If CI checks do NOT appear, check:
> 1. **Merge conflicts** — `mergeable_state: dirty` blocks CI entirely
> 2. **Workflow file** — `.github/workflows/` must contain CI config on the target branch
> 3. **Branch targeting** — CI may only trigger on PRs targeting specific branches

### Step 8: Handle Results

- ✅ All green → offer to assign reviewers via `update_pull_request`, link issues with `Closes #N`
- ❌ Any fail → read failure logs, suggest fix, re-run from Step 3
- ⏳ Timeout → provide manual check instructions

---

## PR Body Template

```markdown
## Summary
[One-line description derived from branch name and commits]

## Changes

### [Category — derived from commit types]
- [Change description from commit messages]

## Test Plan
- [x] Pre-flight `/review` passed locally (lint, type-check, test, security, build)
- [x] Branch synced with `{target}` — no conflicts
- [x] No secrets or PII in diff

## Breaking Changes
[None / List any breaking changes — derived from `BREAKING CHANGE:` commit footers]

## Related Issues
[Closes #N — derived from commit messages or branch name pattern]
```

---

## Conflict Resolution Protocol

When merge conflicts are detected in Step 2:

```powershell
# 1. Check conflicted files
git diff --name-only --diff-filter=U

# 2. Resolve each conflict manually
#    - .gitignore: combine both versions, prefer more restrictive
#    - Package manifests (package.json, pubspec.yaml): merge dependencies carefully
#    - Source files: understand both changes, merge logically

# 3. Mark resolved and commit
git add <resolved-files>
git commit -m "merge: resolve conflicts with <target>"

# 4. Re-run pre-flight checks (Step 3)
# Invoke /review to verify merge didn't break anything

# 5. Resume from Step 4 (Push)
```

---

## Output Template

### ✅ PR Created Successfully

```markdown
## ✅ PR Created Successfully

| Field | Value |
| :--- | :--- |
| PR | #[N] |
| Title | [type(scope): description] |
| Branch | [source] → [target] |
| Status | [draft / ready for review] |
| URL | [link] |

### CI Status
| Check | Status |
| :--- | :--- |
| [name] | ✅ Pass / ⏳ Pending / ❌ Fail |

**Next**: Wait for CI → `/deploy` when ready.
```

### ❌ PR Creation Failed

```markdown
## ❌ PR Creation Failed at Step [N]

### Error
[Error description]

### Resolution
1. [Fix steps]
2. Re-run: `/pr [target]`

### Fallback
[Manual instructions if MCP + CLI both failed]
```

---

## Governance

**PROHIBITED:**
- Creating PRs from `main` or `production` branches
- Creating PRs with unresolved merge conflicts
- Pushing without local pre-flight `/review` passing
- Merging PRs with failing CI checks
- Including generated files, PII, secrets, or `.env` in diff
- Multi-sprint mega-PRs — keep PRs focused and reviewable
- Using `// turbo` on state-mutating steps (push, create, merge)
- Skipping failed steps · proceeding without resolution

**REQUIRED:**
- Branch sync with target before every PR
- Local pre-flight via `/review` before push
- Conventional commit PR title format
- Structured PR body using template
- CI verification after PR creation
- Human approval before push and PR creation (non-turbo)
- MCP-first with graceful fallback strategy
- Conflict resolution before push

---

## Completion Criteria

- [ ] On feature branch (not `main`/`production`)
- [ ] Working tree clean (committed or stashed)
- [ ] Target branch synced (no conflicts)
- [ ] Pre-flight `/review` passes (scope-filtered)
- [ ] Pushed to remote
- [ ] PR created with conventional title and structured body
- [ ] CI checks monitored and passed (or draft acknowledged)
- [ ] Review requested (if applicable)
- [ ] After CI passes: proceed to `/deploy` when ready

---

## Related Resources

- **Previous**: `/preflight` (production readiness verified) · `/review` (code quality gates)
- **Next**: `/deploy` (deployment after PR is merged)
- **Skills**: `.agent/skills/git-workflow/SKILL.md` · `.agent/skills/verification-loop/SKILL.md`
- **Global Rule**: Production Merge Discipline (see global rules)
- **Related**: `/status` (check PR and CI status)
- **Note**: PR body template supersedes the basic template in `git-workflow` skill
