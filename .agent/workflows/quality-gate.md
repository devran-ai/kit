---
description: Pre-task research and validation protocol. Market research, gap analysis, and ethics review before implementation.
args: feature name
version: 2.1.0
sdlc-phase: discover
skills: [brainstorming, project-docs-discovery]
commit-types: [docs, chore]
---

# /quality-gate — Pre-Task Research & Validation

> **Trigger**: `/quality-gate` — before implementation of new features or refactors
> **Lifecycle**: Before `/plan` — research informs planning

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. No implementation without validated research — review project `ROADMAP.md` and architecture docs for alignment
2. All claims backed by market data or competitor analysis
3. Ethics gate — privacy, bias, automation risks evaluated
4. Approval required before proceeding

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features need competitive research |
| `refactor` | Required | Architecture changes need validation |
| `fix` | Optional | Only if fix changes architecture or introduces new patterns |
| `docs` | Skip | Documentation doesn't need quality gate |
| `chore` | Skip | Tooling changes don't need research |

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/quality-gate` | Full research and validation for current task |
| `/quality-gate [feature]` | Quality gate for specific feature description |
| `/quality-gate --ethics-only` | Run Ethics Gate only (step 5) |
| `/quality-gate --dry-run` | Show research plan without generating full analysis |

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
5. **Ethics & Safety Review**
   - **AI Bias Assessment**: Does the proposed approach introduce algorithmic bias or unfair treatment?
   - **GDPR/Privacy Implications**: Does the approach handle user data? If yes, verify data minimization, consent, erasure capability
   - **Automation Safety**: Could the approach cause harm if it fails silently? Add monitoring/alerting
   - **User Autonomy**: Does the user retain meaningful control? No dark patterns, no forced flows
   - **Human-in-the-Loop**: For consequential decisions (payments, deletions, access changes), require explicit human confirmation

// turbo
6. **Research Summary** — compile key insights, risks, proposed solution, dependencies

7. **Present for Approval** — implementation blocked until explicit approval. Then proceed to `/plan`.

> [!TIP]
> Research must yield differentiation, not copy. If competitors already solve this well, the recommendation must explain how Devran's approach improves upon or meaningfully differs from existing solutions.

---

## Rejection Triggers

The following conditions trigger automatic REJECT — do not proceed to implementation:

1. **Harmful patterns detected**: Deceptive UX, manipulative flows, accessibility barriers by design
2. **Missing research**: No competitive analysis performed, no evidence gathered
3. **Privacy violation**: Proposed approach collects unnecessary PII or lacks consent mechanism
4. **Accessibility failure**: Proposed UI approach cannot meet WCAG 2.1 AA minimum
5. **Security regression**: Proposed approach weakens existing security posture without documented justification

> If any trigger fires → STOP, document the trigger, recommend alternative approach, present to user.

---

## Output Template

```markdown
# 🔬 Quality Gate Report: [Feature]

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

**PROHIBITED:** Implementing without research · skipping competitors · ignoring ethics · proceeding without approval · recommending without competitive research · proceeding when rejection trigger fires · replicating competitor features without differentiation

**REQUIRED:** 5+ competitors analyzed · enhancement strategy documented · risks mitigated · ethics review completed · rejection triggers evaluated · approval received

---

## Completion Criteria

- [ ] Market research conducted with 5+ competitor/alternative analysis
- [ ] Technology evaluation matrix created with weighted criteria
- [ ] Gap analysis identifies where product meets/exceeds/falls-below market
- [ ] Enhancement strategy addresses differentiation, not just parity
- [ ] Ethics and safety review completed (AI bias, GDPR, automation safety)
- [ ] No rejection triggers fired (or justified override documented)
- [ ] Recommendations backed by evidence with source attribution
- [ ] User reviewed and approved — proceed to `/plan`

---

## Failure Output

> Use when: approval denied, rejection trigger fired, or research yields insufficient evidence.

```markdown
## Quality Gate — NOT APPROVED

**Decision**: BLOCKED
**Reason**: [Rejection trigger / approval denial / insufficient evidence]

### Blockers

| # | Issue | Category | Required Action |
| :- | :---- | :------- | :-------------- |
| 1 | [issue] | [ethics / evidence / safety / scope] | [action] |

### Remediation

1. Address blocker(s) above
2. Re-run `/quality-gate` with updated research
3. If ethics concern: consult team before proceeding

**Do not proceed to `/plan` until all blockers resolved.**
```

---

## Related Resources

- **Previous**: `/brainstorm` · **Next**: `/plan`
- **Skill**: `.agent/skills/brainstorming/SKILL.md`
