---
name: market-intelligence
description: "Competitor analysis, weighted scoring matrix, feature gap framework, evidence hierarchy, stealth mode protocol, and graceful degradation"
triggers: [research, competitor, market, analysis, tech stack]
---

# Market Intelligence Skill

> **Purpose**: Evidence-based market research and competitive analysis for onboarding

---

## Evidence Hierarchy (T1-T5)

All research claims must cite their evidence tier.

| Tier | Source Type | Trust | Usage Rule |
|------|-----------|-------|------------|
| T1 | Official docs, specs, RFCs | Highest | Always prefer |
| T2 | Published benchmarks, conference papers | High | Strong support |
| T3 | Stack Overflow accepted, high-engagement GitHub | Medium | Supplementary |
| T4 | Blog posts, tutorials | Low | Context only |
| T5 | AI-generated, marketing material | Lowest | Must cross-reference |

### Rules

- Minimum 3 sources per technology recommendation
- T4/T5 claims MUST be cross-referenced with T1-T2 sources
- Prefer sources < 12 months old
- State confidence level explicitly: **High** (T1-T2 majority), **Medium** (T2-T3), **Low** (T4-T5)

---

## Competitor Analysis Framework

### Minimum Requirements

- **5+ competitors** for meaningful analysis
- Each competitor scored on 7 dimensions (0-10)
- Weighted scoring matrix with configurable weights

### Scoring Dimensions

| Dimension | Weight | What to Evaluate |
|-----------|--------|-----------------|
| Market Presence | 0.15 | Market share, brand recognition, user base |
| Feature Set | 0.25 | Breadth and depth of features |
| Technical Quality | 0.20 | Performance, reliability, architecture |
| Pricing | 0.15 | Pricing model, value for money |
| Community Support | 0.10 | Community size, responsiveness |
| Documentation | 0.10 | Quality, completeness, freshness |
| Scalability | 0.05 | Proven scale, architecture for growth |

### Counter-Evidence Requirement

For every positive recommendation, actively search for:
- Known issues or limitations
- Cases where the technology failed at scale
- Migration stories away from the technology
- Security incidents or vulnerabilities

Present both sides — the developer decides.

---

## Feature Gap Framework

For each competitor, map features to your project's requirements:

```
| Feature       | Your Project | Competitor A | Competitor B | Gap/Opportunity |
|--------------|-------------|-------------|-------------|-----------------|
| Feature X    | Planned     | Exists      | Missing     | Parity needed   |
| Feature Y    | Not planned | Exists      | Exists      | Opportunity     |
```

Classify gaps as:
- **Critical Gap** — Competitors have it, users expect it
- **Opportunity** — No competitor has it, could differentiate
- **Nice-to-Have** — Some competitors have it, low user impact

---

## Tech Stack Evaluation

### Process

1. List technology options per category
2. Evaluate each against project constraints:
   - Team experience (can the team learn this in time?)
   - Scale requirements (will it handle projected load?)
   - Budget (licensing, hosting costs)
   - Timeline (development speed impact)
3. Provide comparison table with pros/cons/evidence
4. Recommend with explicit rationale

### Categories to Evaluate

Frontend, Backend, Database, Hosting, Auth, Payments, Analytics, CI/CD, Testing, Monitoring

---

## Stealth Mode Protocol

When project is confidential:

### Query Anonymization

```
BEFORE: "MatchMaker dating app real-time messaging competitors"
AFTER:  "dating market analysis best practices trends"
```

### Decision Anonymization

```
BEFORE: "Chose Socket.IO for MatchMaker real-time chat"
AFTER:  "[dating] Chose Socket.IO for [REDACTED] real-time chat"
```

### Rules

- Never include project name in web queries
- Use generic category terms only
- Decision records use anonymized descriptions
- Research results stored locally, never shared externally

---

## Graceful Degradation Protocol

### Retry Strategy

1. First failure → retry after 1s
2. Second failure → retry after 2s
3. Third failure → mark as degraded

### Degradation Behavior

When research is unavailable:
- Set `researchDegraded: true` in onboarding state
- Insert placeholder: `[Market research unavailable — manual review needed]`
- Continue onboarding — NEVER block on research failures
- Log failed queries for audit trail
- Suggest `/research` command for post-onboarding data collection

---

## Quality Scoring Integration

Research quality contributes to the overall quality score:

| Metric | Impact |
|--------|--------|
| Evidence confidence < 50% | -5 completeness points |
| < 3 competitors found | -5 completeness points |
| Research degraded | -10 completeness points |
| Missing tech stack categories | -2 per gap |
