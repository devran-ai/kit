---
description: Structured brainstorming. Explore options before committing to implementation.
args: topic
version: 2.1.0
sdlc-phase: discover
skills: [brainstorming, project-docs-discovery]
commit-types: [docs]
---

# /brainstorm — Structured Idea Exploration

> **Trigger**: `/brainstorm [topic]`
> **Lifecycle**: Discover — before `/quality-gate` or `/plan`

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. No code — produce ideas, analysis only
2. Minimum 3 options with pros/cons
3. Evidence-based recommendations
4. Socratic exploration — clarify before generating
5. Honest tradeoffs — never hide complexity
6. User decides — present and recommend, don't choose

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features need ideation before quality-gate |
| `refactor` | Optional | Architecture decisions with multiple viable approaches |
| `fix` | Skip | Bug fixes don't require brainstorming |
| `docs` | Skip | Documentation doesn't need brainstorming workflow |
| `chore` | Skip | Tooling choices use vendor-specific evaluation, not brainstorming |

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/brainstorm` | Interactive — ask for topic |
| `/brainstorm [topic]` | Brainstorm on given topic immediately |
| `/brainstorm [topic] --quick` | 3-option rapid pass, no full evaluation matrix |
| `/brainstorm [topic] --compare` | Include competitor analysis in divergent phase |

---

## Steps

// turbo
1. **Gather Context** — problem, target user, constraints, what's been tried

// turbo
2. **Research** — existing patterns in codebase, industry best practices, architectural constraints

3. **Divergent Phase — Generate Options** — produce 5+ distinct approaches BEFORE evaluating any of them. Forbidden from filtering during this phase. Each option needs: description, core insight, pros, cons, estimated effort (S/M/L/XL), risk level.

4. **Convergent Phase — Compare & Recommend** — evaluation matrix with weighted criteria:

   | Option | Effort | Risk | Scalability | Maintainability | Alignment | Score |
   | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

   Scoring: 1-5 per criterion (5=best). Weight: Alignment×3, Maintainability×2, others×1.

   State clear recommendation with reasoning. If decision has architectural significance → recommend creating an ADR in `docs/decisions/`.

5. **User Confirmation** — present recommendation, wait for user direction before proceeding to `/quality-gate` or `/plan`

---

## Output Template

```markdown
## 🧠 Brainstorm: [Topic]

### Context
[Problem and constraints]

### Options
**Option A/B/C**: [description, pros, cons, effort, risk]

### Comparison
| Criteria | A | B | C |
| :--- | :--- | :--- | :--- |
| Effort / Risk / Scalability / Maintainability | ... |

### Recommendation
**Option [X]** because [reasoning].

**Next**: `/quality-gate` or `/plan`
```

---

## Governance

**PROHIBITED:** Writing code · fewer than 3 options · hiding complexity

**REQUIRED:** Clarifying questions · evidence-based reasoning · comparison matrix · user confirmation

---

## Completion Criteria

- [ ] Context gathered: problem, target users, constraints, prior attempts
- [ ] 5+ options generated in divergent phase (no premature filtering)
- [ ] Weighted comparison matrix completed
- [ ] Clear recommendation with reasoning stated
- [ ] ADR recommendation made if architecturally significant
- [ ] User confirmed direction before proceeding

---

## Failure Output

> Use when: fewer than 3 viable options generated, or decision cannot be reached.

```markdown
## Brainstorm — INCONCLUSIVE

**Status**: INCONCLUSIVE
**Reason**: [Insufficient viable options / contradictory constraints / scope too broad]

### Options Generated So Far

| Option | Score | Why Insufficient |
| :----- | :---- | :--------------- |
| [option] | [score] | [reason] |

### Blockers

- [Missing information needed to generate more options]
- [Constraint conflict that needs resolution]

### Next Steps

1. Resolve constraints listed above
2. Re-run `/brainstorm` with narrower scope
3. Or proceed to `/quality-gate` with best available option and document risk

**Minimum 3 viable options required before proceeding.**
```

---

## Related Resources

- **Next**: `/quality-gate` · `/plan`
- **Skill**: `.agent/skills/brainstorming/SKILL.md`
