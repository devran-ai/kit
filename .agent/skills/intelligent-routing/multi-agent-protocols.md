# Multi-Agent Collaboration Protocols

> **Purpose**: Patterns for agent orchestration — sequential, parallel, and consensus modes. Conflict resolution and handoff format.

---

## Execution Patterns

### Sequential Protocol

Use when: output of Agent A is input to Agent B.

```
[Agent A] → output → [Agent B] → output → [Agent C] → synthesis
```

**Example**: planner → security-reviewer (reviews plan) → tdd-guide (adds test strategy to plan)

**Rules**:
- Each agent receives prior agent's output in context brief
- Stop on agent failure — don't continue with incomplete input
- Maintain audit trail: which agent produced which output

---

### Parallel Protocol

Use when: agents work on independent domains simultaneously.

```
[security-reviewer] ─┐
[tdd-guide]         ─┤→ [synthesis]
[architect]         ─┘
```

**Example**: Specialist synthesis during planning — security + testing + architecture assessed independently.

**Rules**:
- No two agents touch the same file without sequential ordering
- Each agent's scope must be explicitly bounded in context brief
- Synthesis step required: aggregate outputs, resolve any conflicts

---

### Consensus Protocol

Use when: a decision requires multiple expert perspectives.

```
[Agent A opinion] ─┐
[Agent B opinion] ─┤→ [weighted synthesis]
[Agent C opinion] ─┘
```

**Example**: Architecture decision — architect (scalability weight: 3), security-reviewer (security weight: 3), backend-specialist (implementation weight: 2).

**Rules**:
- Define weights before soliciting opinions
- Conflicts: Security constraints > Architecture preferences > Implementation ease
- Document dissenting opinions in ADR

---

## Context Passing Format (Structured Agent Brief)

Every subagent receives this brief before starting work:

```json
{
  "original_request": "verbatim user request",
  "plan_reference": "docs/PLAN-{slug}.md or null",
  "plan_phase": "Foundation | Core | Quality | Operations",
  "decisions_made": [
    {"topic": "database", "decision": "PostgreSQL", "rationale": "existing infra"},
    {"topic": "auth", "decision": "JWT + refresh tokens", "rationale": "stateless API"}
  ],
  "prior_agents": [
    {"agent": "planner", "summary": "5-task plan created, see plan file"},
    {"agent": "security-reviewer", "summary": "STRIDE assessment: 2 high risks mitigated in plan"}
  ],
  "your_scope": {
    "files": ["src/auth/auth.service.ts", "src/auth/auth.module.ts"],
    "domains": ["authentication", "JWT"],
    "tasks": ["Implement JWT service", "Add refresh token rotation"]
  },
  "do_not_touch": ["src/users/", "src/database/"],
  "constraints": ["No external auth providers", "Must support existing UserEntity schema"]
}
```

---

## Conflict Resolution

| Conflict Type | Resolution |
| :--- | :--- |
| Security vs Architecture | Security wins — always |
| Security vs Performance | Security wins — always |
| Architecture vs Testing | Architecture first, then testing adapts |
| Two agents want same file | Sequence them — earlier agent commits first, later agent rebases |
| Agent outputs contradict | Escalate to user with both options + tradeoffs |

**Priority order**: Security constraints > Privacy requirements > Testing requirements > Architectural preferences > Implementation convenience

---

## Handoff Format

When one agent completes and hands off to the next:

```markdown
## Agent Handoff: {agent-name} → {next-agent-name}

### Completed
- [x] {task 1} — `{file}` modified
- [x] {task 2} — `{file}` created

### Output for Next Agent
{What the next agent needs to know, specific to their scope}

### Decisions Made (Affects Next Agent)
- {decision}: {rationale} → {implication for next agent}

### Files Modified (Do Not Re-Touch)
- `{file}` — {brief description of changes}
```
