---
name: research-methodology
description: Multi-source evidence research protocol for technology evaluation, competitive analysis, and decision support. Used by /research command and /quality-gate workflow.
version: 1.0.0
triggers: [research, compare, evaluate, technology-choice, quality-gate]
allowed-tools: Read, Grep, WebSearch, WebFetch
---

# Research Methodology Skill

> **Purpose**: Structured protocol for evidence-based research — technology evaluation, competitive analysis, and decision support. Ensures claims are backed by data, not assumption.

---

## Evidence Hierarchy

Apply in order. Higher-tier evidence takes precedence over lower:

| Tier | Source Type | Validity |
| :--- | :--- | :--- |
| T1 | Official documentation, RFC, specification | Authoritative |
| T2 | Peer-reviewed benchmarks, academic papers | High |
| T3 | Widely-cited technical blog posts (<12 months) | Medium |
| T4 | Community discussions, Stack Overflow | Low (corroborate with T1-T3) |
| T5 | AI-generated content, unsourced claims | Do not use without verification |

**Rule**: Every claim must cite source tier + date. Prefer T1-T2. Cross-reference with T3+ for real-world validation.

---

## Research Protocol

### Step 1: Define Research Question

State exactly what's being compared or evaluated:
- Decision to make: [specific choice]
- Evaluation criteria: [list weighted criteria]
- Constraints: [project-specific constraints that affect choice]
- Non-goals: [what this research is NOT trying to answer]

### Step 2: Multi-Source Evidence Gathering

For each option, gather from at minimum:
- Official documentation (T1)
- Benchmark or performance data (T2)
- Recent community experience, 2+ sources (T3-T4)
- Project-specific codebase context (existing patterns, dependencies)

### Step 3: Competitive Analysis (5+ options)

For `/quality-gate` market research: survey minimum 5 market leaders.

```markdown
| Competitor | Approach | AI/ML Usage | UX Pattern | Automation | Privacy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Leader A | [how they solve it] | [yes/no + detail] | [UX pattern] | [automation level] | [privacy posture] |
```

### Step 4: Technology Evaluation Matrix

Weighted scoring for decisions:

| Criteria | Weight | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- | :--- |
| Project alignment | 3x | /5 | /5 | /5 |
| Team expertise | 2x | /5 | /5 | /5 |
| Maintainability | 2x | /5 | /5 | /5 |
| Performance | 1x | /5 | /5 | /5 |
| Community support | 1x | /5 | /5 | /5 |
| **Weighted total** | | **[score]** | **[score]** | **[score]** |

### Step 5: Recommendation

```markdown
## Recommendation: [Option]
**Confidence**: [percentage]%
**Rationale**: [2-3 sentences referencing highest-weighted criteria]
**Key trade-off**: [what we're accepting by choosing this]
**Sources**: [T1 source, T2 source, T3 source with dates]
```

---

## Quality Rules

1. Every claim needs a source (tier + date)
2. Prefer sources < 12 months old for fast-moving domains (JS ecosystem, LLMs, cloud services)
3. Cross-reference: don't trust a single source for CRITICAL decisions
4. No confirmation bias: actively seek counter-evidence for the preferred option
5. State confidence explicitly — acknowledge uncertainty rather than overstating certainty

---

## Integration

- **Used by**: `/research` command, `/quality-gate` workflow (market research step)
- **Feeds into**: `/brainstorm` (options generation), `/adr` (decision recording), `/plan` (constraint identification)
