---
description: Pre-task research and validation protocol. Market research, gap analysis, and ethics review before implementation.
version: 2.1.0
sdlc-phase: discover
skills: [brainstorming]
commit-types: [docs, chore]
---

# /quality-gate — Pre-Task Research & Validation

> **Trigger**: `/quality-gate` — before implementation of new features or refactors
> **Lifecycle**: Before `/plan` — research informs planning

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. No implementation without validated research
2. All claims backed by market data or competitor analysis
3. Ethics gate — privacy, bias, automation risks evaluated
4. Approval required before proceeding

---

## Scope Filter

Required for `feat()` and `refactor()`. Skip for fix, chore, docs, test.

---

## Steps

// turbo
1. **Market Research** — survey 5+ market leaders for the feature domain

// turbo
2. **Comparative Analysis** — produce comparison table (approach, AI/ML, UX, automation, privacy)

// turbo
3. **Gap Detection** — where product meets/exceeds/falls-below market. Reject harmful/deceptive patterns.

// turbo
4. **Enhancement Strategy** — how product improves on baseline (transparency, ethics, user-centric, data sovereignty, accuracy)

// turbo
5. **Ethics & Safety** — GDPR, AI bias, automation safety, user autonomy, mitigations

// turbo
6. **Research Summary** — compile key insights, risks, proposed solution, dependencies

7. **Present for Approval** — implementation blocked until explicit approval. Then proceed to `/plan`.

---

## Rejection Triggers

Reject if: no market research, harmful patterns, below market standard, unmitigated risks, no research justification.

---

## Output Template

```markdown
# Quality Gate Report: [Feature]

## Market Research (5+ competitors)
| Competitor | Approach | AI/ML | UX | Automation | Privacy |

## Gap Analysis
| Area | Current | Market Standard | Gap? |

## Enhancement Strategy
## Ethics & Safety Review
## Verdict: Approved / Rejected — [reasoning]

After approval: proceed to `/plan`.
```

---

## Governance

**PROHIBITED:** Implementing without research · skipping competitors · ignoring ethics · proceeding without approval

**REQUIRED:** 5+ competitors analyzed · enhancement documented · risks mitigated · approval received

---

## Completion Criteria

- [ ] Market research completed (5+ competitors)
- [ ] Gap analysis and enhancement strategy defined
- [ ] Ethics review completed
- [ ] Approved by Product Owner

---

## Related Resources

- **Previous**: `/brainstorm` · **Next**: `/plan`
- **Skill**: `.agent/skills/brainstorming/SKILL.md`
