---
description: Create implementation plan. Invokes planner agent for structured task breakdown.
args: feature or task description
version: 2.2.0
sdlc-phase: plan
agents: [planner]
skills: [plan-writing, brainstorming, plan-validation, project-docs-discovery]
commit-types: [docs]
---

# /plan — Implementation Planning

> **Trigger**: `/plan [task description]`
> **Lifecycle**: Plan — first step of SDLC after discovery

> Standards: See `rules/workflow-standards.md`

> [!IMPORTANT]
> This workflow creates plans, NOT code. No implementation during planning. All plans require user approval before execution.

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
   - Consult mandatory rules (security, testing, coding-style, documentation, git-workflow)
   - Classify task: Trivial (1-2 files), Medium (3-10), Large (10+)
   - Break down into steps with exact file paths and verification criteria
   - Include cross-cutting concerns (security, testing, docs) for ALL sizes
   - For Medium/Large: invoke specialist synthesis (security-reviewer, tdd-guide, architect)
   - Save to `docs/PLAN-{task-slug}.md`

// turbo
3.5. **Validate Plan** — verify schema compliance, cross-cutting sections populated, file paths in every step. Score >= 70% → present. Below → revise (max 2 cycles).

4. **Present for Approval** — show plan with quality score, wait for approval.

---

## Output Template

```markdown
## Plan: [Task Name]

### Scope
[Coverage and exclusions]

### Tasks
1. [ ] [Task] — **Verify**: [done criteria]

### Agent Assignments (if multi-domain)
| Task | Agent | Domain |

### Risks & Considerations

Plan saved: `docs/PLAN-{slug}.md`
Approve to start with `/create` or `/enhance`.
```

---

## Governance

**PROHIBITED:** Writing code during planning · proceeding without approval · vague tasks · skipping Socratic gate

**REQUIRED:** 3+ clarifying questions · mandatory rule consultation · verification criteria per task · cross-cutting concerns · plan validation · user approval · plan saved in `docs/`

---

## Post-Implementation Retrospective

After implementation reaches VERIFY phase, compare plan against `git diff --name-only`. Run plan-retrospective protocol, append to `.agent/contexts/plan-quality-log.md`. Non-blocking.

---

## Completion Criteria

- [ ] Requirements clarified, codebase explored
- [ ] Plan created with verifiable tasks and file paths
- [ ] Plan validated (score >= 70%)
- [ ] User approved

---

## Related Resources

- **Previous**: `/brainstorm` · `/quality-gate`
- **Next**: `/create` · `/enhance`
- **Skill**: `.agent/skills/plan-writing/SKILL.md`
- **Agent**: `planner`
