---
description: Production readiness assessment with weighted scoring across 10 audit domains.
version: 1.0.0
sdlc-phase: verify
skills: [production-readiness, verification-loop, security-practices]
commit-types: [feat, fix, refactor, perf]
---

# /preflight — Production Readiness Assessment

> **Trigger**: `/preflight [domain|flag]`
> **Lifecycle**: Verify — after `/review`, before `/pr`

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Production readiness gate. All critical domains must pass before `/pr` → `/deploy`.

---

## Critical Rules

1. **Evidence-backed scoring** — every domain score must cite observable proof
2. **Never bypass blockers** — blocker rule violations override total score
3. **Human approval required** — Go/No-Go requires explicit user decision
4. **Non-destructive** — checks do not modify source code
5. **Fail-safe defaults** — unverifiable checks score 0, not assumed pass

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/preflight` | Full scan — all 10 domains |
| `/preflight [domain]` | Single domain focus |
| `/preflight --quick` | Quick scan — D4 + D5 + D6 + D9 |
| `/preflight --rescan` | Re-scan with delta comparison |

**Domain aliases**: D1 tasks/roadmap, D2 journeys/ux, D3 implementation/tests, D4 code/quality/lint, D5 security/privacy, D6 config/env, D7 performance/perf, D8 docs, D9 infra/ci/pipeline, D10 observability/monitoring

---

## Steps

// turbo
1. **Project Detection** — detect type, stack, key files, deployment target, applicable domains

// turbo
2. **Domain Scanning** — for each domain: load skill, execute sub-checks, record evidence, calculate score, classify findings (Critical/High/Medium/Low)

// turbo
3. **Scoring** — apply blocker rules (any domain=0 → Not Ready, D5<50% → Not Ready, D4<50% → minimum), calculate total, determine verdict (>=85 Ready, 70-84 Conditional, <70 Not Ready)

4. **Go/No-Go** — present scorecard, highlight critical findings, wait for user decision

---

## Output Template

```markdown
# Production Readiness Scorecard

> Project: [name] · Date: [date] · Mode: [mode]

| Score | Status | Decision |
| :--- | :--- | :--- |
| [XX/100] | [status] | [recommendation] |

## Domain Scores
| Domain | Score | Status | Key Finding |
| :--- | :--- | :--- | :--- |
| D1-D10 | X/max | [emoji] | [summary] |

## Blocker Check
| Rule | Result |
| :--- | :--- |
| Zero Domain / Security Floor / Quality Floor | PASS/FAIL |

## Findings (Critical → High → Medium)
- [finding with evidence and remediation]

Verdict: [score]/100 — [status]. Run `/preflight --rescan` after fixes.
```

---

## Governance

**PROHIBITED:** Auto-deploying on pass · skipping blocker evaluation · fabricating evidence · modifying project files

**REQUIRED:** Evidence per sub-check · blocker evaluation before score · human approval · severity classification

---

## Completion Criteria

- [ ] Project detected, domains scanned with evidence
- [ ] Blocker rules evaluated, scores calculated
- [ ] Scorecard presented, user made Go/No-Go decision

---

## Related Resources

- **Previous**: `/review` · **Next**: `/pr`
- **Skills**: `.agent/skills/production-readiness/SKILL.md` · `.agent/skills/verification-loop/SKILL.md`
