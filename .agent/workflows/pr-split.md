---
description: Guide splitting large PRs into focused sub-PRs by concern category with dependency-ordered merge plan.
version: 1.0.0
sdlc-phase: build
skills: [pr-toolkit, git-workflow]
commit-types: [chore]
---

# /pr-split — Pull Request Split Workflow

> **Trigger**: `/pr-split` (current branch) · `/pr-split #<number>` (existing PR)
> **Lifecycle**: Build — remediation for oversized PRs

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Uses `git cherry-pick` and selective checkout — does NOT rewrite commits. Original branch preserved until user closes it.

---

## Critical Rules

1. Never delete or force-push the original branch
2. Analyze full diff before proposing split
3. Each sub-PR must independently pass `/review`
4. Include dependency ordering in split plan
5. Use cherry-pick or selective checkout — preserve all commits
6. Each sub-PR must be independently mergeable and testable

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/pr-split` | Analyze current branch |
| `/pr-split #<number>` | Analyze existing PR |
| `/pr-split --dry-run` | Show plan only |
| `/pr-split --auto` | Auto-split by file category |

---

## Steps

### Step 1: Analyze Diff
// turbo
Classify PR size. If XS/S/M → **STOP** (splitting not needed). If L/XL → proceed.

### Step 2: Categorize Files
// turbo
Group changed files by concern: Feature Code, Tests, Configuration, Dependencies, Documentation.

### Step 3: Propose Split Plan
// turbo
Generate plan with merge ordering. Present for user approval. If `--dry-run` → **STOP**.

```markdown
| # | Sub-PR | Branch | Files | Type | Depends On |
| :--- | :--- | :--- | :--- | :--- | :--- |
```

### Step 4: Create Sub-Branches
For each sub-PR: checkout target, create `split/<original>-<category>`, selectively checkout files from original branch, commit.

### Step 5: Verify Each Sub-Branch
// turbo
Run `/review` pipeline per sub-branch. Each must independently build and test.

### Step 6: Create Sub-PRs
Follow `/pr` workflow for each sub-PR. Include in body: split context, dependency declarations, merge order.

### Step 7: Update Original PR
Post comment linking all sub-PRs with merge order.

---

## Output Template

```markdown
## PR Split Complete

| Field | Value |
| :--- | :--- |
| Original | #{number} |
| Sub-PRs | {count} |
| Verification | All pass /review |

### Sub-PRs
| # | PR | Title | Size | Status |

**Next**: Review and merge in order.
```

---

## Governance

**PROHIBITED:** Deleting original branch · sub-PRs that can't build independently · circular dependencies · proceeding without user approval

**REQUIRED:** Full diff analysis · user approval of plan · each sub-PR passes `/review` · dependency ordering · original PR updated with links

---

## Completion Criteria

- [ ] PR analyzed, files categorized
- [ ] Split plan approved by user
- [ ] Sub-branches created and verified
- [ ] Sub-PRs created with dependency declarations
- [ ] Original PR updated

---

## Related Resources

- **Skill**: `.agent/skills/pr-toolkit/SKILL.md`
- **Previous**: `/pr` (XL warning triggered)
- **Next**: `/pr-review` · `/pr-merge`
