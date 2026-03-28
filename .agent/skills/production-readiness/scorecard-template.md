# Production Readiness Scorecard Template

> **Purpose**: Output template for `/preflight` — full scorecard, delta comparison, and executive summary formats.

---

## Full Scorecard (Pass)

```markdown
# Production Readiness Scorecard

> Project: {name} · Date: {date} · Mode: {full|quick|rescan} · Profile: {strict|standard}

## Executive Summary

| Score | Verdict | Decision |
| :--- | :--- | :--- |
| {XX}/100 | ✅ Production Ready / ⚠️ Conditional / ❌ Not Ready | {Proceed / Fix and rescan / Block} |

**Blocker Rules**: Zero Domain: OK · Security Floor (D5≥50%): OK · Quality Floor (D4≥50%): OK

## Domain Scores

| Domain | Score | Status | Key Finding |
| :--- | :--- | :--- | :--- |
| D1: Task Completeness | {X}/8 | ✅/⚠️/❌ | {top finding or "All checks passing"} |
| D2: User Journey | {X}/10 | ✅/⚠️/❌ | {top finding} |
| D3: Implementation | {X}/10 | ✅/⚠️/❌ | {top finding} |
| D4: Code Quality | {X}/15 | ✅/⚠️/❌ | {top finding} |
| D5: Security & Privacy | {X}/18 | ✅/⚠️/❌ | {top finding} |
| D6: Configuration | {X}/8 | ✅/⚠️/❌ | {top finding} |
| D7: Performance | {X}/8 | ✅/⚠️/❌ | {top finding} |
| D8: Documentation | {X}/5 | ✅/⚠️/❌ | {top finding} |
| D9: Infrastructure | {X}/10 | ✅/⚠️/❌ | {top finding} |
| D10: Observability | {X}/8 | ✅/⚠️/❌ | {top finding} |
| **TOTAL** | **{XX}/100** | | |

## Findings

### 🔴 Critical (blocks production)
{numbered list with domain, file/evidence, exact issue, recommended fix}

### 🟠 High (fix before launch)
{numbered list}

### 🟡 Medium (fix in next sprint)
{numbered list}

### 🔵 Low (backlog)
{numbered list}

**Next**: Run `/preflight --rescan` after addressing Critical and High findings.
```

---

## Delta Comparison (`--rescan`)

```markdown
# Preflight Rescan — Delta Report

> Previous: {date} ({prev_score}/100) · Current: {date} ({curr_score}/100)

## Score Delta

| Domain | Previous | Current | Delta |
| :--- | :--- | :--- | :--- |
| D1: Task Completeness | {X}/8 | {X}/8 | {+/-N} |
| D5: Security & Privacy | {X}/18 | {X}/18 | {+/-N} ⚠️ REGRESSION if negative |
| **TOTAL** | **{prev}/100** | **{curr}/100** | **{+/-N}** |

## Regressions (⚠️ New issues since last scan)
{list of domains/findings that got worse}

## Improvements (✅ Issues resolved)
{list of previously failing checks now passing}

## Verdict Change
{Previous verdict} → {Current verdict}
```

---

## Evidence Types Reference

| Evidence Type | Example | Valid For |
| :--- | :--- | :--- |
| File path | `src/auth/auth.service.ts` | Any finding |
| Command output | `npm audit: 0 vulnerabilities` | D4, D5 |
| Test output | `Tests: 47 passed, coverage: 84%` | D3, D4 |
| Metric | `LCP: 1.8s (budget: 2.5s)` | D7 |
| Config check | `DB_URL present in .env.example` | D6 |
| Observation | `README has setup, config, API sections` | D8 |
| N/A justification | `N/A — D2: no user-facing UI in this service` | Any domain |
