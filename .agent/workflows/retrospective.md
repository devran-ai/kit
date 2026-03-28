---
description: Tier-1 Retrospective Quality Audit — full product, architecture, and pipeline review against market standards
version: 2.1.0
sdlc-phase: evaluate
skills: [verification-loop, project-docs-discovery]
commit-types: [docs, chore]
---

# /retrospective — Tier-1 Retrospective Quality Audit

> **Trigger**: `/retrospective` or `/tier1-audit`
> **Lifecycle**: After sprint/milestone completion — feeds next sprint's `/plan`

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Do NOT defend previous decisions by default, minimize issues, or optimize for speed over correctness.

---

## When to Execute

- **Sprint boundary**: After completing a sprint/milestone
- **Pre-launch**: Before any production deployment
- **Regression discovery**: When previously working features break
- **Plan completion**: After a planned task reaches VERIFY phase (via `plan-complete` hook)
- **Manual trigger**: User runs `/retrospective` on completed work

---

## Critical Rules

1. No defense bias — evaluate with fresh eyes
2. No minimization — report all issues at true severity
3. Evidence required — every classification must be backed by data
4. Structural over cosmetic — prefer foundational improvements
5. Market-grade bar — compare against Google/Meta/Apple standards

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Optional | After major feature milestones or sprint completion |
| `fix` | Optional | Only when fix reveals systemic quality or process issues |
| `refactor` | Optional | After major restructuring to assess outcomes |
| `docs` | Conditional | Sprint/milestone documentation reviews |
| `chore` | Skip | Tooling changes don't warrant retrospectives |

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/retrospective` | Full audit — all 8 domains |
| `/retrospective [domain]` | Audit specific domain (e.g., `security`, `testing`, `process`) |
| `/retrospective --sprint [N]` | Retrospective for specific sprint number |
| `/retrospective --quick` | Rapid 3-domain pass (delivery, quality, process) |

---

## Audit Scope

| Domain | Audit Focus |
| :--- | :--- |
| Task Delivery | Plan accuracy, estimate drift, surprise files/tasks |
| Code Quality | Lint violations, type errors, complexity growth |
| Testing | Coverage delta, flaky tests, missing edge cases |
| Security | New vulnerability exposure, dependency risks |
| Performance | Bundle size delta, API latency changes, memory usage |
| Documentation | Stale docs, missing API docs, CHANGELOG gaps |
| Process | Workflow adherence, skipped gates, unapproved deviations |
| Ethics | AI bias introduction, privacy compliance, accessibility |

> Skip domains not applicable to the project. Document reason for skipping.

---

## Steps

// turbo
1. **Inventory** — catalog project docs, task tracking, git log, ADRs, feature specs

// turbo
2. **Market Benchmark** — evaluate each feature against market leaders

// turbo
3. **Outdated Pattern Detection** — legacy assumptions, deprecated libraries, anti-patterns

// turbo
4. **Tier-1 Validation** — would it pass Google/Meta/Apple review? Shortcuts? Missing edge cases?

// turbo
5. **Ethics & Safety**
   - **AI Bias Check**: Did any implemented feature introduce algorithmic bias or unfair treatment?
   - **Automation Transparency**: Are automated decisions explainable to end users?
   - **GDPR Compliance**: Is user data handled per data minimization and consent requirements?
   - **Human-in-the-Loop**: Are automated decisions appropriately gated with human review?

// turbo
6. **Differentiation Alignment** — quality>volume, measurable outcomes, ethical automation; verify features align with explainability>opacity principles

// turbo
7. **Classification** — Tier-1 Compliant / Partially Compliant / Non-Compliant with action plans

---

## Output Template

```markdown
# 📊 Tier-1 Retrospective Audit Report

> Date: [date] · Sprint: [N]

## Executive Summary
## Compliance Classification (per area)
## Gaps & Risks
## Revision Recommendations
## Priority Matrix
| Priority | Issue | Impact | Effort |
```

> [!IMPORTANT]
> If no gaps found, explicitly state WHY — the absence of findings must be justified with evidence, not assumed.

---

## Revision Rules

1. **No defense bias**: Review with fresh eyes — do not minimize findings to protect prior decisions
2. **Market-grade bar**: Compare against industry leaders (Google, Meta, Apple, Stripe) for applicable domains
3. **Actionable output**: Every finding must include a concrete next action, not just observation

---

## Governance

**PROHIBITED:** Defending past decisions by default · minimizing issues · marking compliant without evidence · skipping domains

**REQUIRED:** Rigorous analysis · market-grade bar · revisions for non-compliant areas · actionable recommendations

---

## Completion Criteria

- [ ] All applicable audit domains assessed with evidence
- [ ] Plan accuracy measured (predicted vs actual files, estimate drift)
- [ ] Key learning captured as one actionable sentence
- [ ] Ethics and differentiation review completed
- [ ] No defense bias in findings (fresh eyes approach)
- [ ] Findings include market-grade comparison where applicable
- [ ] Action items assigned with owners and deadlines
- [ ] Results appended to plan-quality-log.md (if plan-based retrospective)

---

## Failure Output

> Use when: retrospective cannot be completed (insufficient data, blocked access, or scope conflict).

```markdown
## Retrospective — INCOMPLETE

**Status**: BLOCKED
**Reason**: [Missing data / access denied / scope conflict]

### What Was Completed

| Domain | Status | Notes |
| :----- | :----- | :---- |
| [D1-D8] | Partial / Skipped | [reason] |

### Blockers

- [Blocker 1: what data/access is needed]
- [Blocker 2]

### Partial Findings

[Any findings gathered before blocker — do not discard]

**Resume**: Re-run `/retrospective` after resolving blockers above.
```

---

## Related Resources

- **Next**: `/plan` (findings feed next sprint)
- **Related**: `/quality-gate` · `/review`
