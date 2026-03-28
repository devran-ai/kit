---
name: pr-toolkit
description: Pull request lifecycle domain knowledge — branch strategy detection, PR size classification, confidence-scored review, git-aware context, PR analytics, dependency management, and split/merge/describe operations.
version: 2.0.0
triggers: [pr, pull-request, review, merge, branch, code-review]
allowed-tools: Read, Grep, Bash
---

# PR Toolkit Skill

> **Purpose**: Domain knowledge for complete PR lifecycle — creation, review, remediation, merge, split, describe, analytics, and dependency management.

## Sub-Resources

| File | Purpose |
| :--- | :--- |
| `bot-parsers.md` | Per-bot parsing rules (Gemini, CodeRabbit, SonarCloud, Dependabot, GitHub Actions) |
| `review-template.md` | Full 6-perspective review output template with finding format rules |
| `fix-template.md` | Fix plan, resolution summary, and failure output templates |

---

---

## 1. Branch Strategy Detection

Detect branching model before any PR operation.

```bash
git branch -r | grep -E 'origin/(dev|develop)$'
git branch -r | grep -E 'origin/release/'
```

| Indicator | Strategy |
|:---|:---|
| `dev`/`develop` exists | GitFlow — features merge to dev, dev merges to main at release |
| Only `main`/`master` | Trunk-Based — short-lived branches merge to main |
| `release/*` branches | GitFlow (full) with release branch phase |

### GitFlow Target Validation

| Source | Valid Target | Invalid → Action |
|:---|:---|:---|
| `feature/*`, `bugfix/*`, `chore/*`, `docs/*` | `dev`/`develop` | `main` → **BLOCK**, redirect to dev |
| `hotfix/*` | `main`/`master` | Proceed (emergency) |
| `release/*`, `dev` | `main`/`master` | Proceed |

Trunk-based: any short-lived branch → `main`/`master`.

---

## 2. PR Size Classification

| Label | Files | Lines | Review Time | Action |
|:---|:---|:---|:---|:---|
| **XS** | 1-5 | <100 | <15 min | Fast-track |
| **S** | 6-15 | 100-300 | 15-30 min | Standard |
| **M** | 16-30 | 300-700 | 30-60 min | Thorough |
| **L** | 31-50 | 700-1500 | 1-2 hrs | Consider splitting |
| **XL** | 50+ | 1500+ | 2+ hrs | **MUST split** — block |

### Scope Coherence

A PR must relate to ONE logical change. Violations (mixed feature+tooling, mixed feature+deps, multiple unrelated features) → split into focused PRs by type (`feat:`, `chore:`, `chore(deps):`, `docs:`).

---

## 3. Title Format

Format: `type(scope): description` — conventional commits, lowercase, imperative mood, no period, <72 chars.

**Branch parsing**: `feature/ABC-123-add-user-auth` → strip type prefix (`feature/`→`feat`) → strip ticket (`ABC-123-`) → first segment as scope → remaining as description → `feat(user): add user auth`. Fallback: first commit subject.

---

## 4. Review Framework

### 6 Perspectives (sequential)

1. **PR Hygiene**: title, body, size, scope coherence
2. **Branch Strategy**: correct target, naming convention
3. **Code Quality**: functions <50 lines, files <800, no deep nesting, error handling
4. **Security**: secrets, input validation, injection, XSS, auth
5. **Testing**: new code has tests, edge cases, coverage maintained
6. **Architecture**: follows patterns, SOLID, clean dependencies

### Severity Levels

| Severity | Blocks Merge? |
|:---|:---|
| **CRITICAL** :red_circle: | Yes — security, data loss, crash |
| **HIGH** :orange_circle: | Yes if 3+ — broken functionality |
| **MEDIUM** :yellow_circle: | No — improvement suggestion |
| **LOW** :blue_circle: | No — optional improvement |
| **NIT** :white_circle: | No — style preference |

**Verdict**: 0 CRITICAL + 0 HIGH → APPROVE | 0 CRITICAL + 1-2 HIGH → COMMENT | Any CRITICAL or 3+ HIGH → REQUEST_CHANGES

---

## 5. Fix Prioritization

Priority: CRITICAL → HIGH → MEDIUM → LOW/NIT. Commit convention: `fix(review): address <finding>` or squash to `fix(review): address PR #N review findings`.

After each fix: run affected tests, verify concern addressed. After all fixes: run full review pipeline, push, re-request review, summarize changes on PR.

---

## 6. PR Body Checklist

Required: Summary (1-3 sentences), Changes (categorized list), Test Plan, Checklist. When applicable: Breaking Changes, Related Issues (`Closes #N`), Screenshots (UI changes).

---

## 7. Repository Health Signals

Check: branch protection rules, PR template (`.github/pull_request_template.md`), CODEOWNERS, CI pipeline, auto-delete branches, default branch alignment.

---

## 8. Confidence Scoring

Every finding gets confidence 0-100. Default threshold: 70 (High+Certain). `--strict`: 50. `--relaxed`: 90.

| Score | Label | Action |
|:---|:---|:---|
| 90-100 | Certain | Always report |
| 70-89 | High | Report (default threshold) |
| 50-69 | Moderate | Suppress by default |
| 0-49 | Low/Noise | Suppress |

**Adjustments**: +30 OWASP match, +20 PR-introduced code, +15 file:line evidence, -15 existing codebase pattern, -20 style-only, -25 test/generated code.

---

## 9. PR Analytics

Core metrics: Coding Time (<2d), Pickup Time (<4h), Review Time (<24h), Cycle Time (<3d), Merge Frequency (3-5/dev/week), Review Rounds (<2), PR Size median (100-300 LOC).

DORA alignment: Deployment Frequency ↔ merge frequency, Lead Time ↔ cycle time, Change Failure Rate ↔ revert rate, MTTR ↔ hotfix cycle time.

Staleness: <3d fresh, 3-7d aging (nudge), 7-14d stale (escalate), 14d+ abandoned (consider close).

---

## 10. Dependency Management

`Depends-On: #42` in PR body. Rules: block merge on unmerged deps, cross-repo support, cycle detection (block both), transitive deps.

---

## 11. Split Strategy

| Category | Detection | Sub-PR Type |
|:---|:---|:---|
| Feature code | `src/`, `lib/`, `app/` | `feat:` |
| Tests | `tests/`, `*.test.*` | `test:` |
| Config | `.agent/`, `.github/`, config | `chore:` |
| Dependencies | `package.json`, lockfiles | `chore(deps):` |
| Docs | `*.md`, `docs/` | `docs:` |
| Styling | CSS/SCSS, themes | `style:` |
| Infrastructure | Dockerfile, CI, terraform | `ci:`/`chore:` |

Merge order: deps → config → feature → tests → docs.

---

## 12. Auto-Description

Algorithm: title from branch (section 3) or commits → summary from commit aggregation → changes grouped by type → labels from file patterns → related issues from commit messages.

Label mapping: `src/`→feature/bugfix, `tests/`→testing, `docs/`→documentation, CSS→styling, `.github/`→infrastructure, `package.json`→dependencies. Size labels: XS/S/M/L/XL per section 2.

---

## 13. Reviewer Comment Engagement

Fetch from all 3 GitHub endpoints: `/pulls/{n}/reviews`, `/pulls/{n}/comments`, `/issues/{n}/comments`.

Bots: `gemini-code-assist` (priority labels + suggested changes), `coderabbitai` (severity badges), `github-actions[bot]` (CI results), `sonarcloud[bot]` (quality gates), `dependabot[bot]` (CVEs).

**Rules**: Valid+open → agree with attribution. Valid+fixed → acknowledge with SHA. Invalid → challenge with evidence. Duplicate → reference theirs. Missed → amplify.

**Cross-file checks**: count headings vs items, category consistency, version strings, feature counts vs filesystem.
