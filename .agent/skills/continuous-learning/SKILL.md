---
name: continuous-learning
description: Extract reusable patterns from sessions and save them as knowledge
triggers: [session-end, manual]
---

# Continuous Learning Skill

> **Purpose**: Learn from development sessions to improve future assistance

---

## Overview

This skill implements the PAAL (Perceive-Analyze-Adapt-Learn) cycle to extract reusable patterns from development sessions.

---

## PAAL Cycle

### 1. Perceive

Monitor session for significant events:

- User corrections
- Repeated patterns
- Error resolutions
- Decision rationale

### 2. Analyze

Identify learning opportunities:

- What went wrong?
- What went right?
- What patterns emerged?
- What knowledge was missing?

### 3. Adapt

Apply learnings immediately:

- Update mental models
- Adjust approach
- Incorporate feedback

### 4. Learn

Persist knowledge for future:

- Document patterns in `decisions/`
- Update knowledge base
- Create reusable templates

---

## Pattern Extraction Format

```markdown
# Pattern: [Name]

## Context

When: [Situation]
Problem: [What problem this solves]

## Solution

[How to apply the pattern]

## Example

[Concrete example]

## Anti-patterns

[What NOT to do]
```

---

## Confidence Scoring

Patterns are scored 0-5 based on reinforcement frequency:

| Score | Label | Criteria |
|-------|-------|----------|
| 1 | Observed | Seen once |
| 2 | Emerging | Confirmed 2-3 times |
| 3 | Established | Confirmed 4-5 times |
| 4 | Proven | Confirmed 6-9 times |
| 5 | Battle-tested | 10+ reinforcements |

Runtime: `lib/learning-engine.js` → `scoreConfidence(reinforcementCount)`

---

## Domain Clustering

Patterns are grouped by `loading-rules.json` domains (security, testing, architecture, frontend, backend, database, devops, performance, reliability, mobile, documentation, planning, debugging, refactoring).

When a cluster reaches 3+ proven patterns (confidence >= 4), recommend promotion to a new skill or rule.

Runtime: `lib/learning-engine.js` → `clusterPatterns(patterns, domainRules)`

---

## Decay Model

Patterns that are not reinforced lose confidence over time:
- Every 10 sessions without reinforcement: -1 confidence
- Confidence reaches 0: pattern is archived (not deleted)
- Archived patterns can be restored if re-observed

This prevents stale patterns from consuming context budget.

Runtime: `lib/learning-engine.js` → `decayPatterns(patterns)`

---

## Pattern Extraction Format

```markdown
# Pattern: [Name]

## Context
When: [Situation]
Problem: [What problem this solves]
Confidence: [1-5]
Keywords: [domain keywords for clustering]

## Solution
[How to apply the pattern]

## Anti-patterns
[What NOT to do]
```

---

## Integration

- Runs at session end via `/learn` or automatically
- Outputs to `decisions/` directory
- Runtime engine: `lib/learning-engine.js` (pure functions, zero I/O)
