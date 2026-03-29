# Market Awareness Rule

> **Scope**: Cross-cutting — loaded via `defaultLoad` for ALL sessions
> **Priority**: ADVISORY — presents evidence, developer decides

---

## Purpose

During development, proactively check market leaders for better approaches when making technology or architecture decisions. This rule ensures Kit-assisted projects benefit from current industry best practices.

---

## When to Activate

- Developer adds a new dependency or library
- Architecture pattern is being chosen or changed
- A feature implementation has multiple viable approaches
- Performance optimization is being considered
- Security approach is being selected

---

## Protocol

### 1. Detect Decision Moment

When a significant technology or architecture choice is being made, flag it:

```
[Market Awareness] Decision detected: {description}
Checking market leaders for relevant approaches...
```

### 2. Research (if research tools available)

- Check how market leaders solve the same problem
- Look for published benchmarks or case studies
- Find any known issues with the proposed approach

### 3. Present Evidence

Present findings in this format:

```
[Market Awareness] Alternative approaches found:

| Approach | Used By | Evidence | Tier |
|----------|---------|----------|------|
| Current choice | — | — | — |
| Alternative 1 | Company X | benchmark link | T2 |
| Alternative 2 | Company Y | blog post | T4 |

Recommendation: {brief recommendation with rationale}
```

### 4. Record Decision

Whether the developer accepts or rejects the recommendation:
- Record in `.agent/engine/decisions.json`
- Include: recommendation, developer choice, rationale
- If stealth mode: use anonymized descriptions

---

## Rules

- **Non-dictatorial**: ALWAYS present evidence and let the developer decide
- **Evidence-based**: Every recommendation must cite at least one source
- **Non-blocking**: Never block development on research
- **Respect decisions**: Once a decision is made and recorded, don't re-raise unless new evidence emerges
- **Stealth-aware**: In stealth mode, use generic category terms for any external queries

---

## Integration

- Decision records are stored in `.agent/engine/decisions.json`
- Queryable via `/decisions` command
- High-confidence decisions extracted as instinct candidates during `onboarding-complete` hook
- Stale decisions flagged during `/brownfield` refresh mode
