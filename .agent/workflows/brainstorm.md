---
description: Structured brainstorming. Explore options before committing to implementation.
version: 2.1.0
sdlc-phase: discover
skills: [brainstorming]
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

## Steps

// turbo
1. **Gather Context** — problem, target user, constraints, what's been tried

// turbo
2. **Research** — existing patterns in codebase, industry best practices, architectural constraints

3. **Generate Options** — 3+ distinct approaches with pros, cons, effort, risk

4. **Compare & Recommend** — comparison table, clear recommendation with reasoning, ask user direction

---

## Output Template

```markdown
## Brainstorm: [Topic]

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

- [ ] 3+ options with tradeoffs
- [ ] Comparison matrix included
- [ ] User selected direction

---

## Related Resources

- **Next**: `/quality-gate` · `/plan`
- **Skill**: `.agent/skills/brainstorming/SKILL.md`
