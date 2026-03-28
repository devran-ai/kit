---
description: Research technologies, best practices, or solutions
invokes: [knowledge-agent]
uses: [research-methodology]
---

# /research Command

Conduct thorough, evidence-based research on a topic for informed decisions. Uses the research-methodology skill for multi-source analysis. See `.agent/skills/research-methodology/SKILL.md`.

## Usage

| Command | Action |
| :--- | :--- |
| `/research [topic]` | Research a technology or approach |
| `/research --compare [A vs B]` | Side-by-side comparison of two options |
| `/research --depth [quick|full]` | Quick (3 sources) or full (5+ sources) research |

## Examples

```
/research React vs Vue for our use case
/research --compare PostgreSQL vs MongoDB for high-write workloads
/research best authentication patterns for mobile --depth full
/research --compare Stripe vs Braintree for payment processing
```

## Process

1. Multi-source evidence gathering (docs, community, benchmarks)
2. Comparative analysis with weighted evaluation matrix
3. Trade-off assessment for project context
4. Evidence-based recommendation with confidence level

## Output Preview

```
## Research: React vs Vue

| Criteria | React | Vue | Weight |
| :--- | :--- | :--- | :--- |
| Ecosystem | ★★★★★ | ★★★★☆ | High |
| Learning Curve | ★★★☆☆ | ★★★★☆ | Medium |
| Performance | ★★★★☆ | ★★★★★ | Medium |

Recommendation: React (confidence: 85%) — existing team expertise
Sources: [dated, attributed]
```

## Related Commands

`/brainstorm` — explore design options · `/quality-gate` — market research for features · `/adr` — record the decision after research
