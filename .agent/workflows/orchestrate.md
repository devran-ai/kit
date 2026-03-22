---
description: Multi-agent orchestration for complex tasks requiring multiple specialists.
version: 2.1.0
sdlc-phase: reactive
agents: [planner, explorer-agent]
skills: [parallel-agents, intelligent-routing]
commit-types: [feat, refactor, fix]
---

# /orchestrate — Multi-Agent Coordination

> **Trigger**: `/orchestrate [task description]`
> **Lifecycle**: Reactive — complex multi-domain tasks at any SDLC phase

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Coordinates multiple agents on same codebase. Ensure clear domain boundaries. Phase 2 requires explicit user approval.

---

## Critical Rules

1. **2-Phase protocol** — always plan before implementing
2. User approval gate between phases
3. Every subagent receives full context (request, decisions, prior work)
4. No agent conflicts — separate files or delineated domains
5. Verification required after all agents complete

---

## Steps

### PHASE 1: Planning (Sequential)

// turbo
1. **Analyze Domains** — identify all domains, map needed agents

// turbo
2. **Create Plan** — structured breakdown with execution order and dependencies

3. **User Approval** — present plan, wait for explicit approval

### PHASE 2: Implementation (After Approval)

4. **Execute in Groups** — Foundation (data, security) → Core (app logic) → Quality (tests) → Operations (infra)

5. **Context Passing** — every subagent gets: original request, decisions, prior agent work, plan state

// turbo
6. **Verification** — tests, lint, type-check, build

---

## Agent Selection

| Domain | Agent(s) |
| :--- | :--- |
| Architecture | `architect`, `planner` |
| Backend/DB | `backend-specialist`, `database-architect` |
| Frontend | `frontend-specialist` |
| Mobile | `mobile-developer` |
| Security | `security-reviewer` |
| Testing | `tdd-guide`, `e2e-runner` |
| DevOps | `devops-engineer` |
| Performance | `performance-optimizer` |
| Code Quality | `refactor-cleaner`, `code-reviewer` |

---

## Output Template

```markdown
## Orchestration Complete

### Agents Invoked
| Agent | Domain | Summary |

### Deliverables
| Action | File | Agent |

### Verification
Tests / Build / Lint: status
```

---

## Governance

**PROHIBITED:** Skipping Phase 1 · Phase 2 without approval · agents without context · overlapping files · skipping verification

**REQUIRED:** 2-Phase protocol · full context passing · domain boundaries · verification after completion

---

## Completion Criteria

- [ ] Domains analyzed, plan approved
- [ ] Agents executed with context
- [ ] Verification passed

---

## Related Resources

- **Skills**: `.agent/skills/parallel-agents/SKILL.md` · `.agent/skills/intelligent-routing/SKILL.md`
