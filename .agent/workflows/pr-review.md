---
description: Review pull requests with Senior Staff Engineer expertise. Multi-perspective analysis covering PR hygiene, branch strategy, code quality, security, testing, and architecture.
version: 1.0.0
sdlc-phase: verify
skills: [pr-toolkit, verification-loop]
commit-types: []
---

# /pr-review — Pull Request Review Workflow

> **Trigger**: `/pr-review <url>` · `/pr-review <owner/repo>#<number>` · `/pr-review #<number>`
> **Lifecycle**: Verify — peer review before merge, independent of local development

> [!CAUTION]
> This workflow posts reviews to GitHub that are visible to the entire team. Ensure findings are accurate, constructive, and properly prioritized before submitting. Every review reflects engineering standards.

> [!TIP]
> This workflow leverages the **pr-toolkit** skill for review patterns and the **pr-reviewer** agent for multi-perspective analysis. Read `.agent/skills/pr-toolkit/SKILL.md` for review framework details.

---

## Critical Rules

1. **ALWAYS** fetch the full PR diff before reviewing — never review from title/description alone
2. **ALWAYS** detect the project's branch strategy before assessing target branch compliance
3. **ALWAYS** include a concrete fix suggestion for every finding — no criticism without remedy
4. **NEVER** post a review with only NITs — if everything is clean, APPROVE explicitly
5. **NEVER** approve a PR with known CRITICAL findings — no social-pressure approvals
6. **EVIDENCE-BASED** — cite file:line references, project conventions, or industry standards for every finding

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/pr-review <url>` | Review PR at the given GitHub URL |
| `/pr-review <owner/repo>#<number>` | Review PR by owner/repo and number |
| `/pr-review #<number>` | Review PR in current repo by number |
| `/pr-review #<number> --post` | Review and post to GitHub (default) |
| `/pr-review #<number> --local` | Review locally only — do not post to GitHub |
| `/pr-review #<number> --focus security` | Focus review on security perspective only |
| `/pr-review #<number> --focus quality` | Focus review on code quality perspective only |

---

## Steps

Execute IN ORDER. Stop at first failure.

### Step 1: Parse PR Reference

// turbo

Parse the user-provided PR reference to extract:

- **Repository**: `owner/repo` (from URL or current repo via `gh repo view --json nameWithOwner`)
- **PR Number**: extracted from URL path or `#N` argument

```bash
# If URL provided, extract owner/repo and number from URL path
# If #N provided, get current repo
gh repo view --json nameWithOwner --jq .nameWithOwner
```

Validate the PR exists and is open:

```bash
gh pr view <number> --repo <owner/repo> --json state,title --jq '.state'
```

- If PR not found → **STOP** with error: "PR not found"
- If PR is closed/merged → **WARN**: "PR is already {state} — review will be informational only"

### Step 2: Fetch PR Data

// turbo

Retrieve comprehensive PR metadata:

```bash
# PR metadata
gh pr view <number> --repo <owner/repo> \
  --json title,body,state,baseRefName,headRefName,author,files,additions,deletions,changedFiles,commits,labels,url,reviews,reviewRequests

# PR diff
gh pr diff <number> --repo <owner/repo>

# Existing reviews (to avoid duplicating findings)
gh api repos/<owner>/<repo>/pulls/<number>/reviews

# CI status
gh pr checks <number> --repo <owner/repo>
```

Extract and document:

- Title, author, branch direction (head → base)
- File count, additions, deletions
- Existing reviews and their verdicts
- CI check results

### Step 3: Analyze PR Hygiene

// turbo

Apply PR Hygiene perspective from pr-toolkit:

**3a. Title Format Validation**
- Check conventional commits format: `type(scope): description`
- Verify type is valid: feat, fix, docs, style, refactor, test, chore, perf, ci
- Verify description is imperative mood, under 72 characters

**3b. Body Completeness**
- Check for required sections: Summary, Changes, Test Plan
- Check for Breaking Changes section (if applicable)
- Check for Related Issues references

**3c. PR Size Classification**
- Classify as XS/S/M/L/XL per pr-toolkit size matrix
- If XL (50+ files or 1500+ LOC) → finding: CRITICAL — recommend splitting

**3d. Scope Coherence**
- Analyze changed file paths for unrelated concerns
- Detect mixed feature + tooling, mixed feature + dependency upgrades
- If scope violation detected → finding: HIGH — recommend focused PRs

### Step 4: Analyze Branch Strategy

// turbo

**4a. Detect Branch Strategy**
- Check for `dev`/`develop` remote branch existence
- Classify as GitFlow or Trunk-Based

**4b. Validate Target Branch**
- Apply target validation rules from pr-toolkit
- GitFlow: `feature/*` → `dev` (not `main`)
- Trunk-Based: any → `main`
- If invalid target → finding: CRITICAL — wrong base branch

**4c. Branch Naming**
- Verify branch follows naming convention: `type/[ticket-]description`
- If non-standard naming → finding: LOW

### Step 5: Multi-Perspective Code Review

Read each changed file and apply perspectives 3-6 from the pr-toolkit review framework.

**5a. Code Quality Review**

For each changed file, check:
- Function size (> 50 lines → HIGH)
- File size (> 800 lines → HIGH)
- Nesting depth (> 4 levels → HIGH)
- Error handling (missing try/catch → MEDIUM)
- Debug artifacts (console.log, debugger → MEDIUM)
- Naming quality (single-letter vars, generic names → LOW)
- Immutability patterns (mutation → MEDIUM)

**5b. Security Review**

For each changed file, check:
- Hardcoded secrets (API keys, passwords, tokens → CRITICAL)
- Input validation (missing validation on user input → HIGH)
- Injection risks (string concatenation in queries → CRITICAL)
- XSS vectors (unescaped user content in HTML → CRITICAL)
- Auth/authz (missing guards on protected resources → HIGH)
- Sensitive data exposure (PII in logs → HIGH)

**5c. Testing Review**

Check the PR diff for:
- New functions/components without corresponding tests → HIGH
- Test file changes that reduce coverage → MEDIUM
- Flaky test patterns (timeouts, sleep, race conditions) → MEDIUM
- Missing edge case coverage → LOW

**5d. Architecture Review**

Assess structural changes:
- Pattern consistency with existing codebase → MEDIUM
- Separation of concerns violations → HIGH
- Circular dependency introduction → HIGH
- Over-engineering / premature abstraction → MEDIUM
- API design consistency → MEDIUM

### Step 6: Generate Review Report

// turbo

Compile all findings into the structured review format:

1. Group findings by severity (CRITICAL → HIGH → MEDIUM → LOW → NIT)
2. Calculate verdict per decision table
3. Generate assessment summary with per-perspective status
4. Format inline comments for GitHub posting

### Step 7: Post Review to GitHub

**Skip this step if `--local` flag was used.**

Post the review using the `gh` CLI:

```bash
# Post review with verdict
gh pr review <number> --repo <owner/repo> \
  --{approve|request-changes|comment} \
  --body "<review body>"
```

For inline findings, post as review comments:

```bash
gh api repos/<owner>/<repo>/pulls/<number>/comments \
  --method POST \
  -f body="<finding detail>" \
  -f commit_id="<latest commit sha>" \
  -f path="<file path>" \
  -F line=<line number> \
  -f side="RIGHT"
```

- If posting fails → display review locally as fallback
- Confirm review was posted successfully

---

## Output Template

### Review Complete

```markdown
## PR Review Complete: #{number}

| Field | Value |
| :--- | :--- |
| PR | #{number} — {title} |
| Branch | {head} → {base} |
| Size | {label} ({files} files, +{additions}/-{deletions}) |
| Verdict | {APPROVE / REQUEST_CHANGES / COMMENT} |

### Assessment Summary

| Perspective | Status |
| :--- | :--- |
| PR Hygiene | {status} |
| Branch Strategy | {status} |
| Code Quality | {status} |
| Security | {status} |
| Testing | {status} |
| Architecture | {status} |

**Findings**: {critical} Critical, {high} High, {medium} Medium, {low} Low

**Review posted**: {Yes — link / No — local only}
```

### Review Failed

```markdown
## PR Review Failed at Step {N}

### Error
{error description}

### Resolution
1. {fix steps}
2. Re-run: `/pr-review <reference>`
```

---

## Governance

**PROHIBITED:**
- Approving PRs with known CRITICAL findings
- Posting reviews without reading the full diff
- Making findings without file:line evidence
- Reviewing without detecting the branch strategy first
- Social-pressure approvals ("LGTM" without analysis)
- Posting duplicate reviews (check existing reviews first)

**REQUIRED:**
- Full diff analysis before any verdict
- Concrete fix suggestion for every finding
- Severity-prioritized findings (CRITICAL first)
- Branch strategy detection before target validation
- Evidence-based findings with file:line references
- Constructive tone — teach, don't criticize

---

## Completion Criteria

- [ ] PR reference parsed and validated
- [ ] Full PR data fetched (metadata, diff, reviews, CI)
- [ ] PR hygiene assessed (title, body, size, scope)
- [ ] Branch strategy detected and target validated
- [ ] Code quality, security, testing, architecture reviewed
- [ ] Findings compiled with severity and fix suggestions
- [ ] Verdict rendered per decision table
- [ ] Review posted to GitHub (unless `--local`)

---

## Related Resources

- **Skill**: `.agent/skills/pr-toolkit/SKILL.md` — review patterns, severity levels, size classification
- **Agent**: `.agent/agents/pr-reviewer.md` — Senior Staff Engineer review specialist
- **Related**: `/pr` (create PRs) · `/pr-fix` (fix review findings) · `/review` (local quality gates)
- **Rule**: `.agent/rules/git-workflow.md` — branching and commit conventions
