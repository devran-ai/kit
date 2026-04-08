# Planner Agent

> Multi-agent plan synthesis with tiered quality schema, specialist coordination, and adaptive learning.

---

## Purpose

The Planner agent orchestrates a **multi-agent plan synthesis pipeline** that produces validated, industry-standard implementation plans. It coordinates specialist agents, enforces cross-cutting concerns, validates against a quality schema, and learns from past plan accuracy.

### Core Capabilities

- **Tiered Quality Schema** — Plans scale to task complexity (Trivial/Medium/Large)
- **Specialist Synthesis** — Architect, Security-Reviewer, and TDD-Guide contribute domain expertise
- **Mandatory Cross-Cutting Concerns** — Security, testing, and documentation are always addressed
- **Rule Consultation** — Every plan references applicable governance rules
- **Domain Enhancement** — Frontend, backend, database, DevOps, and security sections injected based on detected domains
- **Quality Scoring** — Completeness scoring with 80% pass threshold
- **Adaptive Learning** — Retrospective feedback loop improves future plans

---

## Invocation

```
/plan <feature description>
```

**Example:**

```
/plan Add user authentication with JWT tokens
```

---

## Pipeline Stages

The planner follows a structured synthesis pipeline:

### 1. Requirements Analysis

- Gather task description and constraints
- Read `plan-quality-log.md` for historical learnings (estimate drift, blind spots)
- Classify task size: **Trivial** (1-2 files), **Medium** (3-10 files), **Large** (10+ files)

### 2. Socratic Gate

- Ask 3+ clarifying questions about scope, constraints, and acceptance criteria
- Establish clear boundaries before planning begins

### 3. Rule Consultation (Mandatory)

Before creating any plan, review ALL mandatory governance rules:

| Rule File | Extract |
|-----------|---------|
| `rules/security.md` | Applicable security requirements |
| `rules/testing.md` | Required test types, coverage targets |
| `rules/coding-style.md` | File size limits, naming conventions |
| `rules/documentation.md` | Docs that need updating |
| `rules/git-workflow.md` | Commit/branch conventions |

Each rule is assessed for applicability using a structured extraction algorithm.

### 4. Codebase Analysis

- Scan project structure and identify affected files
- Detect patterns, dependencies, and integration points
- Receive `matchedDomains` and `mandatoryRules` from the loading engine

### 5. Specialist Synthesis (Medium/Large Tasks)

For tasks beyond trivial complexity, specialist agents contribute structured analysis:

| Specialist | Contribution | Output |
|-----------|-------------|--------|
| **Architect** | Component impact, design patterns, scalability | Architecture Impact section |
| **Security-Reviewer** | Threat model (STRIDE), auth/data requirements | Security Considerations section |
| **TDD-Guide** | Test strategy, coverage targets, edge cases | Testing Strategy section |

**Conflict Resolution Priority**: Security constraints > Testing requirements > Architectural preferences

> For **Trivial** tasks, cross-cutting sections (security, testing) are still required via rule consultation, but full specialist invocation is skipped.

### 6. Domain Enhancement

Based on matched domains from the loading engine, inject domain-specific sections:

- **Frontend**: Accessibility (WCAG 2.1 AA), responsive breakpoints, bundle size, Core Web Vitals
- **Backend**: API contracts, error formats, rate limiting, middleware chain impact
- **Database**: Migration rollback, index analysis, data integrity, query benchmarks
- **DevOps**: IaC changes, monitoring/alerting, progressive rollout, runbook updates
- **Security**: Threat model, auth flow, data classification, compliance (GDPR/CCPA)

### 7. Plan Validation Gate

The planner self-validates against the `plan-validation` skill before presenting:

1. **Schema Compliance** — All required tier sections present
2. **Cross-Cutting Verification** — Security, testing, documentation addressed
3. **Specificity Audit** — All steps include file paths (no vague descriptions)
4. **Domain Enhancement Scoring** — +2 bonus per matched domain section, -2 penalty per missing
5. **Completeness Scoring** — Calculate score against tier maximum
6. **Verdict** — PASS (≥80%) or REVISE (max 2 revision cycles)

### 8. User Approval

Present the validated plan with quality score and wait for explicit approval.

---

## Plan Output Format

Plans follow a tiered structure based on task size:

### Tier 1 — Always Required (all tasks)

| Section | Scoring Weight |
|---------|----------------|
| Context & Problem Statement | 10 pts |
| Goals & Non-Goals | 10 pts |
| Implementation Steps | 10 pts |
| Testing Strategy | 10 pts |
| Security Considerations | 10 pts |
| Risks & Mitigations | 5 pts |
| Success Criteria | 5 pts |

### Tier 2 — Required for Medium/Large Tasks

| Section | Scoring Weight |
|---------|----------------|
| Architecture Impact | 4 pts |
| API / Data Model Changes | 3 pts |
| Rollback Strategy | 3 pts |
| Observability | 2 pts |
| Performance Impact | 2 pts |
| Documentation Updates | 2 pts |
| Dependencies | 2 pts |
| Alternatives Considered | 2 pts |

### Scoring Thresholds

| Task Tier | Max Score | Pass Threshold (80%) |
|-----------|-----------|---------------------|
| **Trivial** | 60 pts | 48 pts |
| **Medium** | 80 pts | 64 pts |
| **Large** | 80+ pts (with domain bonus) | 64+ pts |

---

## Adaptive Learning

After implementation reaches the VERIFY phase, a **plan retrospective** compares the plan against actual outcomes:

- **File Prediction Accuracy** — Predicted vs. actually modified files
- **Task Completeness** — Planned vs. surprise tasks discovered during implementation
- **Estimate Drift** — Predicted vs. actual effort
- **Risk Prediction** — Identified risks that materialized vs. surprise risks

Results are logged to `plan-quality-log.md` and read by the planner at the start of each future planning session to adjust estimates, predict blind spots, and weight risk categories.

---

## Related Resources

- **[Plan Writing Skill](../skills/index.md)** — Plan schema, domain enhancers, retrospective protocol
- **[Plan Validation Skill](../skills/index.md)** — Quality gate with completeness scoring
- **[/plan Workflow](../workflows/index.md)** — Full workflow lifecycle

---

## Best Practices

- Be specific in your feature description — vague requests produce vague plans
- Review the plan quality score before approving
- For large features, expect specialist synthesis to add security and testing depth
- Update the plan if requirements change mid-implementation
- Check `plan-quality-log.md` to see how past plans performed
