---
name: doc-generation
description: "Two-tier template syntax, cross-document consistency rules, ADR generation, quality scoring rubric, and Mermaid diagram generation guide"
triggers: [document, generate, template, doc, onboarding]
---

# Document Generation Skill

> **Purpose**: Structured document generation with templates, validation, and quality scoring

---

## Two-Tier Template Syntax

### Tier 1: Variable Substitution

Replace `{{key.path}}` with resolved values from the project profile.

```markdown
# {{name}} — Architecture Document

**Platforms:** {{platforms}}
**Team:** {{team.size}} ({{team.experienceLevel}})
```

Rules:
- Keys use dot notation for nested access: `{{auth.method}}`
- Arrays are joined with comma: `{{platforms}}` → `web, api`
- Missing keys resolve to empty string
- Only alphanumeric characters and dots allowed in keys

### Tier 2: Section Conditionals

Include or exclude entire sections based on boolean flags.

```markdown
<!-- IF:hasAuth -->
## Authentication
Auth method: {{auth.method}}
<!-- ENDIF:hasAuth -->
```

Rules:
- Flags are resolved from the profile or explicit condition map
- No nesting — one level only
- Flag names are alphanumeric only (`\w+`)
- If flag is false, entire block between IF/ENDIF is removed

### Available Condition Flags

| Flag | True When |
|------|----------|
| `hasMobile` | platforms includes ios or android |
| `hasWeb` | platforms includes web |
| `hasApi` | platforms includes api |
| `hasCli` | platforms includes cli |
| `hasDesktop` | platforms includes desktop |
| `hasLibrary` | platforms includes library |
| `hasAuth` | auth.method has entries |
| `hasIntegrations` | integrations has entries |
| `hasCompliance` | auth.compliance has entries |
| `isBeginnerTeam` | team.experienceLevel is beginner |
| `isExpertTeam` | team.experienceLevel is expert |
| `isSolo` | team.size is solo |
| `hasDesigns` | existingAssets.designs is true |
| `hasBrand` | existingAssets.brand is true |
| `stealthMode` | stealthMode is true |

---

## Cross-Document Consistency Rules

### 4 Post-Generation Validation Checks

| # | Check | Severity | Rule |
|---|-------|----------|------|
| 1 | Remaining `{{` tokens | ERROR | All variables must resolve. Unresolved tokens indicate missing profile data. |
| 2 | Empty sections | WARNING | A header with no content before the next header. May indicate inapplicable conditional. |
| 3 | Broken cross-references | ERROR | `See X.md` where X.md is not in the generated document set. |
| 4 | Inconsistent project names | ERROR | Document title must contain the project name from the profile. |

### Cross-Reference Format

Use these patterns for inter-document references:
- `See ARCHITECTURE.md` or `Refer to PRD.md`
- Only reference documents that are in the generation queue
- The validator checks: `See`, `see`, `Refer to`, `refer to`, `defined in`, `Details in`

---

## ADR Generation

Architectural Decision Records are captured during onboarding.

### ADR Format

```markdown
# ADR-{number}: {Title}

## Status
Proposed | Accepted | Superseded

## Context
{Why this decision was needed}

## Decision
{What was decided}

## Alternatives Considered
{What else was evaluated, with trade-offs}

## Consequences
{Positive and negative impacts}

## Evidence
{T1-T5 sources supporting the decision}
```

### When to Generate ADRs

- Technology selection (frontend, backend, database, etc.)
- Architecture pattern choice
- Authentication strategy
- Hosting/deployment approach
- Any decision with 3+ viable alternatives

---

## Quality Scoring Rubric (0-100)

### Completeness (0-25)

| Deduction | Condition |
|-----------|----------|
| -2 | Per missing applicable template |
| -1 | Per remaining `{{` token |
| -1 | Per empty section |

### Consistency (0-25)

| Deduction | Condition |
|-----------|----------|
| -5 | Per inconsistent project name |
| -3 | Per broken cross-reference |
| -2 | Per conflicting tech stack mention |

### Depth (0-25)

| Metric | Scoring |
|--------|---------|
| Avg section length vs 500-char minimum | Up to 15 pts |
| Mermaid diagrams present | +5 pts bonus |
| Non-bullet-only content (prose) | +5 pts bonus |
| Bullet-only sections (>70%) | Penalty |

### Actionability (0-25)

| Metric | Points |
|--------|--------|
| Next steps present | +2 per document |
| Success criteria defined | +3 per document |
| Estimations / story points included | +2 per document |

### Score Interpretation

| Score | Quality | Action |
|-------|---------|--------|
| 80-100 | Excellent | Proceed to Kit configuration |
| 60-79 | Good | Proceed with minor warnings |
| 40-59 | Fair | Review flagged issues |
| 0-39 | Poor | Re-run generation or manual review |

---

## Mermaid Diagram Generation Guide

### C4 Context Diagram (ARCHITECTURE.md)

```
C4Context
  title {ProjectName} — System Context Diagram
  Person(user, "User", "End user")
  System(system, "{ProjectName}", "Main application")
  System_Ext(ext, "External Service", "Third party")
  Rel(user, system, "Uses")
  Rel(system, ext, "Integrates with")
```

### Data Flow Diagram (ARCHITECTURE.md)

```
flowchart LR
  User --> Frontend --> Backend --> Database
  Backend --> AuthService
  Backend --> ExternalAPIs
```

### Deployment Topology (ARCHITECTURE.md)

```
flowchart TB
  subgraph "Deployment"
    CDN --> WebServer --> APIServer --> Database
    MobileApp --> APIServer
  end
```

### Rules

- Always use Mermaid fenced code blocks: ` ```mermaid ... ``` `
- Keep diagrams focused — max 10-12 nodes
- Use descriptive labels, not abbreviations
- Include relationships with verb labels
