---
description: Production readiness assessment with weighted scoring across 10 audit domains.
version: 1.0.0
sdlc-phase: verify
skills: [production-readiness, verification-loop, security-practices, project-docs-discovery]
commit-types: [feat, fix, refactor, perf]
---

# /preflight — Production Readiness Assessment

> **Trigger**: `/preflight [domain|flag]`
> **Lifecycle**: Verify — after `/review`, before `/pr`

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Production readiness gate. All critical domains must pass before `/pr` → `/deploy`.

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features must pass production readiness before merge |
| `fix` | Required | Fixes may introduce regressions — verify safety |
| `refactor` | Required | Structural changes need full quality and security rescan |
| `perf` | Required | Performance changes need D3+D7 validation |
| `docs` | Skip | Documentation changes don't affect production readiness |
| `chore` | Optional | Only if dependency updates affect security (D5) |

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
| `/preflight --full` | Full scan + market benchmark comparison |
| `/preflight --quick` | Speed scan — D1, D4, D5, D9 only (~5 min) |
| `/preflight --rescan` | Delta rescan — compare against previous scorecard, report changes only |
| `/preflight --domain [alias]` | Single domain deep scan (e.g., `--domain security`) |

**Domain Alias Table**:

| Domain | Code | Aliases |
| :--- | :--- | :--- |
| Task Tracking | D1 | tasks, roadmap, backlog, milestones, completion |
| User Journeys | D2 | journeys, ux, flows, usability, accessibility |
| Implementation | D3 | implementation, tests, coverage, unit, integration |
| Code Quality | D4 | code, quality, lint, complexity, duplication |
| Security | D5 | security, privacy, auth, owasp, secrets |
| Configuration | D6 | config, env, environment, secrets-config, settings |
| Performance | D7 | performance, perf, speed, vitals, latency |
| Documentation | D8 | docs, documentation, api-docs, readme, changelog |
| Infrastructure | D9 | infra, ci, pipeline, docker, deployment |
| Observability | D10 | observability, monitoring, logging, alerts, tracing |

---

## Steps

// turbo
1. **Project Detection** — detect type, stack, key files, deployment target, applicable domains

// turbo
2. **Domain Scanning** — for each applicable domain:
   - Load production-readiness skill domain section
   - Execute all sub-checks; for each: record evidence (file path, test output, metric)
   - Classify each finding: Critical (blocks deploy) / High (must fix soon) / Medium / Low
   - Assign domain score: (passing sub-checks / total sub-checks) × domain weight
   - D1: feature completeness vs roadmap; D2: user journey coverage; D3: test coverage delta
   - D4: lint violations, cyclomatic complexity, duplication ratio
   - D5: OWASP Top 10 exposure, dependency CVEs, secrets in code
   - D6: env var completeness, no hardcoded config, secrets vault usage
   - D7: Core Web Vitals, API p95, bundle size vs budget
   - D8: API docs current, README accurate, CHANGELOG updated
   - D9: CI passes, Docker builds, deployment scripts validated
   - D10: error tracking configured, alerting thresholds set, structured logging

// turbo
3. **Scoring** — apply blocker rules (any domain=0 → Not Ready, D5<50% → Not Ready, D4<50% → minimum), calculate total, determine verdict (>=85 Ready, 70-84 Conditional, <70 Not Ready)

3.5 **Blocker Rule Precedence** — evaluate in order, stop at first trigger:
   1. **Zero Domain Rule**: Any domain scoring 0/max → verdict = Not Ready regardless of total
   2. **Security Floor**: D5 < 50% → verdict = Not Ready (security non-negotiable)
   3. **Quality Floor**: D4 < 50% → verdict capped at Conditional (cannot be Ready)
   If no blocker fires → use total score for verdict (>=85 Ready, 70-84 Conditional, <70 Not Ready)

4. **Go/No-Go** — present scorecard, highlight critical findings, wait for user decision

---

## Output Template

```markdown
# ✈️ Production Readiness Scorecard

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

**Not Ready / Failure:**
```markdown
# ✈️ Preflight FAILED — [score]/100 · [Not Ready | Conditional]

## Blocker Rules Triggered
| Rule | Status | Impact |
| :--- | :--- | :--- |
| Zero Domain | TRIGGERED / OK | [domain name if triggered] |
| Security Floor (D5≥50%) | TRIGGERED / OK | [D5 score if triggered] |
| Quality Floor (D4≥50%) | TRIGGERED / OK | [D4 score if triggered] |

## Gap Analysis
| Domain | Score | Gap | Priority |
| :--- | :--- | :--- | :--- |

## Remediation Roadmap
1. [Highest priority action — exact file or command]
2. ...

Re-run `/preflight --rescan` after completing remediation.
```

---

## Governance

**PROHIBITED:** Auto-deploying on pass · skipping blocker evaluation · fabricating evidence · modifying project files

**REQUIRED:** Evidence per sub-check · blocker evaluation before score · human approval · severity classification

---

## Completion Criteria

- [ ] Scope Filter evaluated — preflight appropriate for this commit type
- [ ] Project type and applicable domains detected
- [ ] All applicable domains scanned with observable evidence (no assumed passes)
- [ ] Every finding classified: Critical / High / Medium / Low
- [ ] Blocker Rule Precedence evaluated in order (zero-domain → security floor → quality floor)
- [ ] Total score calculated from domain weights
- [ ] Verdict determined: Ready / Conditional / Not Ready
- [ ] Scorecard presented with Critical and High findings highlighted
- [ ] User explicit Go/No-Go decision received
- [ ] If Not Ready: remediation roadmap provided with prioritized action items

---

## Related Resources

- **Previous**: `/review` · **Next**: `/pr`
- **Skills**: `.agent/skills/production-readiness/SKILL.md` · `.agent/skills/verification-loop/SKILL.md`
