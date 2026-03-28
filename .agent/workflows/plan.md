---
description: Create implementation plan. Invokes planner agent for structured task breakdown.
args: feature or task description
version: 2.2.0
sdlc-phase: plan
agents: [planner]
skills: [plan-writing, brainstorming, plan-validation, project-docs-discovery]
commit-types: [feat, fix, refactor, docs]
---

# /plan — Implementation Planning

> **Trigger**: `/plan [task description]`
> **Lifecycle**: Plan — first step of SDLC after discovery

> Standards: See `rules/workflow-standards.md`

> [!IMPORTANT]
> This workflow creates plans, NOT code. No implementation during planning. All plans require user approval before execution.

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | **Required** | New features always need a plan before implementation |
| `fix` | **Required** | Non-trivial fixes need scope definition to avoid regressions |
| `refactor` | **Required** | Structural changes need architectural planning |
| `docs` | Conditional | Required only if docs change involves architectural decisions |
| `chore` | Skip | Dependency bumps and tooling don't need planning |
| `test` | Skip | Test-only changes don't require a plan |

---

## Critical Rules

1. **No code writing** — plans only
2. **Socratic gate** — ask at least 3 clarifying questions before planning
3. **Dynamic naming** — `PLAN-{task-slug}.md`
4. **Verification criteria** — every task must have clear "done" criteria
5. **User approval required** — never implement without explicit approval

---

## Steps

// turbo
1. **Clarify Requirements** — ask 3+ clarifying questions about purpose, scope, constraints. Confirm acceptance criteria and edge cases.

// turbo
2. **Explore Codebase** — scan structure, identify relevant files, patterns, dependencies.

2.5. **Consult Project Docs** — scan `docs/` for architecture, design system, and guidelines. Reference discovered constraints in plan sections. If no project docs found, skip.

3. **Create Plan**
   - The loading engine provides `matchedDomains` and `mandatoryRules` — pass these to the planner agent
   - Consult mandatory rules using the **Rule Extraction Algorithm**: for each rule in `planningMandates.alwaysLoadRules`, read the rule file, extract requirements applicable to this task, include as plan constraints
   - Classify task: Trivial (1-2 files), Medium (3-10), Large (10+)
   - Break down into steps with exact file paths and verification criteria
   - Include cross-cutting concerns (security, testing, docs) for ALL sizes
   - For Medium/Large: invoke **Specialist Synthesis Protocol** — consult `security-reviewer` (threat assessment), `tdd-guide` (test strategy), `architect` (architecture impact) per `planningMandates.specialistContributors` in loading-rules.json
   - Include domain-specific sections based on `matchedDomains` (see `domain-enhancers.md`)
   - Save to `docs/PLAN-{task-slug}.md`

// turbo
3.5. **Validate Plan Quality**
   The planner performs self-validation using the `plan-validation` skill:
   1. Classify task size from file count and effort estimate
   2. Schema compliance: verify all required Tier sections present and populated (Tier 1 always, Tier 2 for Medium/Large)
   3. Cross-cutting verification: Security, Testing, Documentation sections non-empty (or explicit "N/A — [reason]")
   4. Specificity audit: every implementation step includes a file path
   5. Rubric scoring against `plan-schema.md`
   6. Domain scoring: +2 bonus per matched domain with enhancer section present, -2 penalty per missing

   **Verdict**: Score >= 70% of tier max → PASS (present with score). Below → REVISE (max 2 cycles, then present with warnings).

4. **Present for Approval** — show plan with quality score, wait for approval.

---

## Output Template

```markdown
## 📋 Plan: [Task Name]

### Scope
[Coverage and exclusions]

### Tasks
1. [ ] [Task] — **Verify**: [done criteria]

### Agent Assignments (if multi-domain)
| Task | Agent | Domain |

### Risks & Considerations

Plan saved: `docs/PLAN-{slug}.md`
Approve to start with `/create`, `/enhance`, or `/implement`.
```

## Naming Convention

| Request | Plan File |
| :--- | :--- |
| `/plan e-commerce cart` | `docs/PLAN-ecommerce-cart.md` |
| `/plan user authentication` | `docs/PLAN-user-auth.md` |
| `/plan mobile app redesign` | `docs/PLAN-mobile-redesign.md` |

---

## Governance

**PROHIBITED:** Writing code during planning · proceeding without approval · vague tasks · skipping Socratic gate

**REQUIRED:** 3+ clarifying questions · mandatory rule consultation · verification criteria per task · cross-cutting concerns · plan validation · user approval · plan saved in `docs/`

---

## Post-Implementation Retrospective

After implementation reaches VERIFY phase, the `plan-complete` hook triggers:

1. **Data Source**: Compare `docs/PLAN-{slug}.md` against `git diff --name-only` from plan start
2. **Execution**: Run plan-retrospective protocol (`.agent/skills/plan-writing/plan-retrospective.md`)
3. **Output**: Append one row to `.agent/contexts/plan-quality-log.md`
4. **Feedback Loop**: Planner reads the quality log at planning time (Step 1) to:
   - Adjust estimates based on historical drift
   - Predict surprise files for similar task types
   - Weight risk categories based on materialization history

Non-blocking (severity: medium, onFailure: log).

---

## Completion Criteria

- [ ] Clarifying questions asked and answered (Socratic gate)
- [ ] Codebase explored for relevant context
- [ ] Project docs consulted (if available)
- [ ] Mandatory rules consulted (security, testing, coding-style, documentation, performance, accessibility, data-privacy)
- [ ] Plan created with verifiable tasks and exact file paths
- [ ] Cross-cutting concerns addressed (security, testing, documentation)
- [ ] Domain-specific sections included for all matched domains
- [ ] Plan validated against quality schema (score >= 70% of tier max)
- [ ] Plan saved to `docs/PLAN-{slug}.md`
- [ ] User has reviewed and approved the plan
- [ ] After implementation: retrospective logged to plan-quality-log.md

---

## Related Resources

- **Previous**: `/brainstorm` · `/quality-gate`
- **Next**: `/create` · `/enhance` · `/implement`
- **Skill**: `.agent/skills/plan-writing/SKILL.md`
- **Schema**: `.agent/skills/plan-writing/plan-schema.md`
- **Domains**: `.agent/skills/plan-writing/domain-enhancers.md`
- **Validation**: `.agent/skills/plan-validation/SKILL.md`
- **Agent**: `planner`
