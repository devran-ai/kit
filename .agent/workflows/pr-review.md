---
description: Review pull requests with Senior Staff Engineer expertise. Multi-perspective analysis covering PR hygiene, branch strategy, code quality, security, testing, and architecture. Engages with existing reviewer comments (bots and humans) and tracks review rounds.
version: 1.1.0
sdlc-phase: verify
skills: [pr-toolkit, verification-loop]
commit-types: []
---

# /pr-review — Pull Request Review Workflow

> **Trigger**: `/pr-review <url>` · `/pr-review <owner/repo>#<number>` · `/pr-review #<number>`
> **Lifecycle**: Verify — peer review before merge

> Standards: See `rules/workflow-standards.md` (artifact discipline, evidence standard, governance)

> [!CAUTION]
> This workflow posts reviews to GitHub visible to the entire team. Ensure findings are accurate, constructive, and properly prioritized.

---

## Critical Rules

1. **EVIDENCE MANDATE** — every finding MUST include `file:line` reference with concrete fix suggestion. Generic statements are not findings. This applies globally to ALL steps below
2. Fetch full PR diff before reviewing — never review from title/description alone
3. Detect branch strategy before assessing target branch compliance
4. Never post review with only NITs — if clean, APPROVE explicitly
5. Never approve with known CRITICAL findings
6. Engage with ALL existing reviews/comments (bots and humans) — acknowledge, challenge, or reference
7. Track review rounds — for follow-ups, report which prior findings were addressed
8. Review title: `PR #{number} Review — {content-specific summary}` (no agent branding)

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/pr-review <url>` | Review PR at GitHub URL |
| `/pr-review #<number>` | Review PR in current repo |
| `/pr-review #<number> --local` | Review locally only — do not post |
| `/pr-review #<number> --focus security` | Focus on security perspective only |

---

## Steps

### Step 1: Parse PR Reference

// turbo

Extract `owner/repo` and PR number. Validate PR exists and is open via `gh pr view`.

### Step 2: Fetch PR Data & Existing Comments

```bash
gh pr view <number> --repo <owner/repo> \
  --json title,body,state,baseRefName,headRefName,author,files,additions,deletions,changedFiles,commits,labels,url,reviews,reviewRequests
gh pr diff <number> --repo <owner/repo>
gh api repos/<owner>/<repo>/pulls/<number>/reviews
gh api repos/<owner>/<repo>/pulls/<number>/comments
gh api repos/<owner>/<repo>/issues/<number>/comments
gh pr checks <number> --repo <owner/repo>
```

### Step 3: Review Round & Existing Comment Analysis

**3a. Round Detection**: Count prior substantive reviews. If Round N+1, cross-reference current diff against previous findings to track addressed vs unaddressed items.

**3b. Existing Comment Engagement**: For each comment from any reviewer (human or bot):
- Classify finding severity and assess validity
- Valid + open → reference and build on it
- Valid + addressed → acknowledge resolution
- Invalid → challenge constructively with evidence
- Duplicate of your finding → skip yours, reference theirs

### Step 4: PR Hygiene

// turbo

- **Title**: conventional commits format, imperative mood, <72 chars
- **Body**: Summary, Changes, Test Plan sections present
- **Size**: XS/S/M/L/XL per pr-toolkit matrix. XL (50+ files/1500+ LOC) → CRITICAL (exception: automated vendor upgrades)
- **Scope**: detect mixed concerns → HIGH

### Step 5: Branch Strategy

// turbo

- Detect GitFlow vs Trunk-Based (check for `dev`/`develop` remote branch)
- Validate target branch per strategy rules
- Check branch naming convention

### Step 6: Multi-Perspective Code Review

Read each changed file. For every finding include: `file:line`, quoted code, impact explanation, concrete fix.

**Cross-file consistency**: verify counts, references, categorizations match across related files.

**6a. Code Quality** — function size (>50 lines), file size (>800 lines), nesting (>4 levels), error handling, debug artifacts, naming, immutability

**6b. Security** — hardcoded secrets, input validation, injection risks, XSS, auth/authz, PII exposure

**6c. Testing** — untested new code, coverage reduction, flaky patterns, missing edge cases

**6d. Architecture** — pattern consistency, separation of concerns, circular deps, over-engineering, API consistency

### Step 7: Generate Review Report

1. Title: `PR #{number} Review — {2-5 word summary}`
2. Round indicator with prior findings tracker (if Round 2+)
3. Existing reviewer engagement summary
4. **Group findings by severity** (CRITICAL → HIGH → MEDIUM → LOW → NIT) — mandatory
5. "What's Good" section: 3+ specific positive observations with file paths
6. Verdict per decision table

### Step 8: Post Review to GitHub

Skip if `--local`. Post via `gh pr review` with verdict. Post inline findings via `gh api`. Fallback to local display on failure.

---

## Output Template

```markdown
## PR #{number} Review — {summary}

| Field | Value |
| :--- | :--- |
| PR | #{number} — {title} |
| Branch | {head} → {base} |
| Size | {label} ({files} files, +{add}/-{del}) |
| Round | {Round N — X/Y prior findings addressed} |
| Verdict | {APPROVE / REQUEST_CHANGES / COMMENT} |

### Existing Reviewer Comments
| Reviewer | Comments | Agreed | Challenged | Addressed |
| :--- | :--- | :--- | :--- | :--- |

### Assessment Summary
| Perspective | Status | Findings |
| :--- | :--- | :--- |
| PR Hygiene / Branch / Code Quality / Security / Testing / Architecture | {status} | {count} |

### Must Fix / High / Medium / Low
{numbered findings with file:line, impact, fix suggestion}

### What's Good
- {3+ specific positive observations with file paths}

## Verdict: {verdict} — {justification}
```

---

## Governance

**PROHIBITED:** Approving with CRITICAL findings · reviewing without full diff · findings without `file:line` · ignoring existing reviewer comments · agent branding in titles · severity-by-perspective grouping

**REQUIRED:** Full diff analysis · concrete fix per finding · severity-first ordering · branch strategy detection · "What's Good" section · existing comment engagement · round tracking · cross-file consistency

---

## Completion Criteria

- [ ] PR data, diff, and all existing comments fetched
- [ ] Review round detected; existing comments analyzed
- [ ] All 6 perspectives reviewed with file:line evidence
- [ ] Findings grouped by severity with fix suggestions
- [ ] "What's Good" section with 3+ observations
- [ ] Verdict rendered and review posted (unless `--local`)

---

## Related Resources

- **Skill**: `.agent/skills/pr-toolkit/SKILL.md`
- **Agent**: `.agent/agents/pr-reviewer.md`
- **Related**: `/pr` · `/pr-fix` · `/review`
