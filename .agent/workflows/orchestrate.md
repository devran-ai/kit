---
description: Multi-agent orchestration for complex tasks requiring multiple specialists.
args: task description
version: 2.1.0
sdlc-phase: reactive
agents: [planner, explorer-agent]
skills: [parallel-agents, intelligent-routing, project-docs-discovery]
commit-types: [feat, refactor, fix]
---

# /orchestrate — Multi-Agent Coordination

> **Trigger**: `/orchestrate [task description]`
> **Lifecycle**: Reactive — complex multi-domain tasks at any SDLC phase

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Coordinates multiple agents on same codebase. Ensure clear domain boundaries. Phase 2 requires explicit user approval.

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features spanning multiple domains need orchestrated delivery |
| `refactor` | Required | Cross-cutting refactors risk agent conflicts without coordination |
| `fix` | Optional | Only when bug spans multiple domains (auth + DB + API) |
| `docs` | Skip | Documentation doesn't need multi-agent orchestration |
| `chore` | Skip | Tooling changes are single-domain |

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/orchestrate [task description]` | Full orchestration — Phase 1 planning + Phase 2 implementation |
| `/orchestrate [task] --plan-only` | Phase 1 planning only — stop after user approval gate |
| `/orchestrate [task] --agents [list]` | Override auto-selected agents with explicit comma-separated list |
| `/orchestrate [task] --dry-run` | Show orchestration plan without invoking any agents |

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

4. **Execute in Groups** — Run agents in dependency order:
   - **Foundation** (data models, security setup) — must complete before Core
   - **Core** (application logic, API endpoints) — depends on Foundation
   - **Quality** (tests, coverage, lint) — depends on Core output
   - **Operations** (infra, CI/CD, deployment config) — can run in parallel with Quality
   - Rule: no two agents modify the same file without explicit sequential ordering

5. **Context Passing** — every subagent receives a structured brief:
   ```
   original_request: [verbatim user request]
   plan_phase: [current phase name]
   decisions_made: [list of architectural/design decisions from Phase 1]
   prior_agent_output: [summary of changes made by previous agents]
   your_scope: [exact files/domains this agent owns]
   do_not_touch: [files owned by other agents]
   ```

// turbo
6. **Verification** — tests, lint, type-check, build

---

## Agent Selection

| Domain | Agent(s) | When Needed |
| :--- | :--- | :--- |
| Architecture | `architect`, `planner` | System design changes, cross-domain impact analysis |
| Backend/DB | `backend-specialist`, `database-architect` | API changes, schema migrations, query optimization |
| Frontend | `frontend-specialist` | UI components, state management, React/Next.js |
| Mobile | `mobile-developer` | React Native, Expo, native integrations |
| Security | `security-reviewer` | Auth changes, data handling, external APIs |
| Testing | `tdd-guide`, `e2e-runner` | New features, regression prevention, E2E flows |
| DevOps | `devops-engineer` | CI/CD pipelines, Docker, environment configuration |
| Performance | `performance-optimizer` | Core Web Vitals, API latency, bundle size |
| Code Quality | `refactor-cleaner`, `code-reviewer` | Dead code, complexity reduction, review gate |

---

## Failure Handling

| Scenario | Action |
| :--- | :--- |
| One agent fails mid-group | Isolate failure, complete remaining agents in group, report partial results |
| Agent conflict detected (same file) | Stop both agents, re-sequence with explicit ordering, resume |
| Verification fails after all agents | Identify which agent's output caused failure, re-run that agent only |
| User cancels mid-orchestration | Commit completed work as WIP, document rollback instructions |

---

## Output Template

**Success:**
```markdown
## 🎭 Orchestration Complete

### Agents Invoked
| Agent | Domain | Status | Summary |

### Deliverables
| Action | File | Agent |

### Verification
Tests: ✅ | Build: ✅ | Lint: ✅ | Type-check: ✅
```

**Partial Completion:**
```markdown
## 🎭 Orchestration Partial — [reason]

### Completed
| Agent | Domain | Output |

### Blocked
| Agent | Reason | Next Step |

### Rollback Instructions
[Steps to revert completed work if needed]
```

---

## Governance

**PROHIBITED:** Skipping Phase 1 · Phase 2 without approval · agents without context · overlapping files · skipping verification

**REQUIRED:** 2-Phase protocol · full context passing · domain boundaries · verification after completion

---

## Completion Criteria

- [ ] Scope Filter evaluated — orchestration is appropriate for this commit type
- [ ] All domains identified and mapped to specific agents
- [ ] Phase 1 plan presented with execution groups and dependency order
- [ ] User explicit approval received before Phase 2
- [ ] All agents executed with full structured context brief
- [ ] No file ownership conflicts — each file assigned to exactly one agent
- [ ] Verification passed (tests, lint, type-check, build) after all agents complete

---

## Related Resources

- **Skills**: `.agent/skills/parallel-agents/SKILL.md` · `.agent/skills/intelligent-routing/SKILL.md`
