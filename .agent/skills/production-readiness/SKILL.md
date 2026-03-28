---
name: production-readiness
description: Production readiness audit domains, weighted scoring criteria, and check specifications for the /preflight workflow.
version: 1.0.0
triggers: [pre-deploy, pre-launch, milestone, production-readiness]
allowed-tools: Read, Grep, Bash
---

# Production Readiness

> **Purpose**: Assess project readiness for production across 10 audit domains

## Sub-Resources

| File | Purpose |
| :--- | :--- |
| `scorecard-template.md` | 10-domain scorecard output template, delta comparison, executive summary, evidence types |

---
> **Invoked by**: `/preflight` | **Reusable by**: `/retrospective`, `/deploy`

---

## Principles

1. **Evidence over assertion** — every score backed by observable proof
2. **Non-destructive** — checks don't modify source; verification commands may run
3. **Fail-safe defaults** — unverifiable checks score 0
4. **Domain independence** — each domain scored independently
5. **Blocker precedence** — blocker rules override total score

---

## Domain Definitions

### D1: Task Completeness (8 pts) — Skill: `plan-writing`

ROADMAP/task tracker exists and current (2) | All milestone tasks complete (3) | No undocumented features (2) | No scope drift (1)

### D2: User Journey Validation (10 pts) — Skills: `webapp-testing`, `testing-patterns`

Critical flows identified, >=3 (2) | Happy path verified (3) | Error/edge handling (3) | Accessibility baseline (2)

### D3: Implementation Correctness (10 pts) — Skills: `verification-loop`, `testing-patterns`

Test suite passes (4) | Coverage >= target or 60% (2) | No dead code (2) | Features match specs (2)

### D4: Code Quality (15 pts) — Skills: `verification-loop`, `clean-code` — Delegates to `/review`

Lint passes (3) | Type check strict (3) | Build succeeds (3) | Style compliance (3) | Dependency health (3)

### D5: Security & Privacy (18 pts) — Skill: `security-practices` — **Highest weight**

No hardcoded secrets (4) | Dependency vuln scan (3) | Auth/authz audit (3) | Input validation all endpoints (3) | HTTPS + security headers (3) | Privacy/PII compliance (2)

### D6: Configuration Readiness (8 pts) — Skills: `deployment-procedures`, `shell-conventions`

Env vars documented (2) | No dev values in prod (2) | Secrets management defined (2) | Env-specific configs separated (2)

### D7: Performance Baseline (8 pts) — Skill: `performance-profiling`

Bundle size within budget (2) | No perf anti-patterns (2) | Core Web Vitals baseline (2) | API p95 <500ms (2)

### D8: Documentation (5 pts) — Skill: `plan-writing`

README with setup (2) | API docs (1) | Runbook (1) | CHANGELOG current (1)

### D9: Infrastructure & CI/CD (10 pts) — Skills: `deployment-procedures`, `docker-patterns`

CI passes (3) | Deploy strategy defined (2) | Rollback capability (3) | Health check endpoint (2)

### D10: Observability & Monitoring (8 pts) — Skill: `deployment-procedures`

Error tracking configured (3) | Structured logging (2) | Alerting for critical paths (2) | No PII in logs (1)

---

## Scoring Model

| Domain | Weight | Max |
|:---|:---|:---|
| D1: Task Completeness | 8% | 8 |
| D2: User Journey | 10% | 10 |
| D3: Implementation | 10% | 10 |
| D4: Code Quality | 15% | 15 |
| D5: Security & Privacy | 18% | 18 |
| D6: Configuration | 8% | 8 |
| D7: Performance | 8% | 8 |
| D8: Documentation | 5% | 5 |
| D9: Infrastructure | 10% | 10 |
| D10: Observability | 8% | 8 |
| **Total** | **100%** | **100** |

---

## Go/No-Go Thresholds

| Score | Status | Action |
|:---|:---|:---|
| >= 85 | Production Ready | Proceed to `/pr` -> `/deploy` |
| 70-84 | Conditionally Ready | Fix medium issues, `--rescan` |
| < 70 | Not Ready | Fix critical/high, `--rescan` |

---

## Blocker Rules (override total score)

Evaluated BEFORE total score. Precedence: Zero Domain > Security Floor > Quality Floor > Total Score.

| Rule | Condition | Override |
|:---|:---|:---|
| Zero Domain | Any domain scores 0 | Not Ready |
| Security Floor | D5 < 50% (<9/18) | Not Ready |
| Quality Floor | D4 < 50% (<=7/15) | Caps at Conditionally Ready |

---

## Evidence Requirements

Every sub-check score must have: **file evidence** (path), **command output**, **observation** (specific detail), or **N/A justification**. Unsupported scores default to 0.

---

## Delta Comparison (`--rescan`)

Load previous scorecard -> run full D1-D10 -> generate delta table (domain, previous, current, delta) -> highlight regressions with WARNING -> summary with updated verdict.

---

## Integration

- **Primary**: `/preflight` workflow (Verify phase)
- **Reusable**: `/retrospective` (sprint audit), `/deploy` (can reference D5, D6, D9)
- **References**: 8 existing skills via delegation map
