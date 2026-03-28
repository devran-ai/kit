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

## Critical Rules

1. No defense bias — evaluate with fresh eyes
2. No minimization — report all issues at true severity
3. Evidence required — every classification must be backed by data
4. Structural over cosmetic — prefer foundational improvements
5. Market-grade bar — compare against Google/Meta/Apple standards

---

## Audit Scope

Cover all applicable domains (skip unimplemented):
Architecture, Code Quality, Security & Privacy, Performance, Testing, Documentation, CI/CD, UX/Accessibility

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
5. **Ethics & Safety** — AI bias, automation transparency, GDPR, human-in-the-loop

// turbo
6. **Differentiation Alignment** — quality>volume, measurable outcomes, ethical automation

// turbo
7. **Classification** — Tier-1 Compliant / Partially Compliant / Non-Compliant with action plans

---

## Output Template

```markdown
# Tier-1 Retrospective Audit Report

> Date: [date] · Sprint: [N]

## Executive Summary
## Compliance Classification (per area)
## Gaps & Risks
## Revision Recommendations
## Priority Matrix
| Priority | Issue | Impact | Effort |
```

---

## Governance

**PROHIBITED:** Defending past decisions by default · minimizing issues · marking compliant without evidence · skipping domains

**REQUIRED:** Rigorous analysis · market-grade bar · revisions for non-compliant areas · actionable recommendations

---

## Completion Criteria

- [ ] All domains analyzed and classified
- [ ] Gaps documented with evidence
- [ ] Priority matrix populated
- [ ] Audit report delivered

---

## Related Resources

- **Next**: `/plan` (findings feed next sprint)
- **Related**: `/quality-gate` · `/review`
