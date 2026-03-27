# Architecture

Devran AI Kit v4.6.0 is an engineered framework with a **33-module runtime engine**, 23 agents, 35 skills, 37 commands, and 22 workflows.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DEVRAN AI KIT v4.6.0                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   23 AGENTS     │  │   37 COMMANDS   │  │   35 SKILLS     │      │
│  │                 │  │                 │  │                 │      │
│  │ • Architect     │  │ • /plan         │  │ • api-patterns  │      │
│  │ • Mobile Dev    │  │ • /implement    │  │ • architecture  │      │
│  │ • DevOps        │  │ • /verify       │  │ • clean-code    │      │
│  │ • DB Architect  │  │ • /deploy       │  │ • testing       │      │
│  │ • Security      │  │ • /debug        │  │ • docker        │      │
│  │ • + 18 more     │  │ • + 28 more     │  │ • + 27 more     │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                              │                                       │
│           ┌──────────────────┴──────────────────┐                   │
│           ▼                                      ▼                   │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                    22 WORKFLOWS                          │        │
│  │  /brainstorm • /create • /debug • /deploy • /enhance    │        │
│  │  /orchestrate • /plan • /pr • /preflight • /preview      │        │
│  │  /quality-gate • /retrospective • /review • /project-status │      │
│  │  /test • /ui-ux-pro-max • /upgrade                       │        │
│  └─────────────────────────────────────────────────────────┘        │
│                              │                                       │
│           ┌──────────────────┴──────────────────┐                   │
│           ▼                                      ▼                   │
│  ┌─────────────────┐                   ┌─────────────────┐          │
│  │     RULES       │                   │     HOOKS       │          │
│  │  (Governance)   │                   │  (8 Lifecycle)  │          │
│  └─────────────────┘                   └─────────────────┘          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              RUNTIME ENGINE (33 modules)                 │        │
│  │  workflow-engine • session-manager • task-governance      │        │
│  │  agent-reputation • self-healing • marketplace            │        │
│  │  plugin-system • identity • conflict-detector • + 12      │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Agents (23)

Specialized sub-agents that handle delegated tasks with focused expertise.

- **Core**: Architect, Planner, Code Reviewer, TDD Specialist
- **Domain**: Mobile, Frontend, Backend, Database, DevOps, Security, Performance
- **Support**: Documentation, Build Error Resolver, Refactorer, Explorer, Knowledge
- **Language**: TypeScript Reviewer, Python Reviewer, Go Reviewer
- **Autonomy**: Sprint Orchestrator, Reliability Engineer, PR Reviewer

### Commands (37)

Slash commands for quick execution of common operations.

- **Planning**: /plan, /implement, /project_status, /setup
- **Development**: /build, /fix, /debug, /refactor, /cook
- **Quality**: /verify, /code-review, /security-scan, /perf

### Skills (35)

Domain expertise modules that extend AI capabilities.

- **Operational**: verification-loop, continuous-learning, strategic-compact, eval-harness, context-budget, production-readiness
- **Orchestration**: intelligent-routing, parallel-agents, behavioral-modes, mcp-integration
- **Planning**: plan-writing (tiered quality schema), plan-validation (completeness scoring), brainstorming
- **Domain**: api-patterns, architecture, clean-code, database-design, testing-patterns, pr-toolkit, and 15 more

### Workflows (22)

Complete development lifecycles for multi-step processes.

- /brainstorm, /create, /debug, /deploy, /enhance, /orchestrate
- /plan, /pr, /pr-review, /pr-fix, /pr-merge, /pr-split, /preflight, /preview, /quality-gate, /retrospective, /review
- /project-status, /help-kit, /test, /ui-ux-pro-max, /upgrade

### Runtime Engine (33 Modules)

Node.js runtime modules that enforce governance, manage state, and provide platform features.

| Phase | Modules |
|:---|:---|
| **Phase 1 — Foundation** | `workflow-engine`, `session-manager`, `verify`, `updater`, `error-budget` |
| **Phase 2 — Runtime** | `workflow-persistence`, `agent-registry`, `loading-engine`, `hook-system`, `task-model` |
| **Phase 3 — Collaboration** | `identity`, `task-governance`, `skill-sandbox`, `conflict-detector`, `security-scanner`, `plugin-system` |
| **Phase 4 — Platform** | `agent-reputation`, `engineering-manager`, `self-healing`, `marketplace`, `cli-commands` |

### Rules & Hooks

- **Rules** (10): Modular governance constraints (coding, security, testing, git, docs, sprint, workflow-standards, quality-gate, agent-upgrade-policy, architecture)
- **Hooks** (8): Event-driven automation (session-start, session-end, pre-commit, phase-transition, sprint-checkpoint, secret-detection, plan-complete, task-complete)

---

## Directory Structure

```
.agent/
├── agents/               # 23 specialized agents
├── commands/             # 37 slash commands
├── skills/               # 35 capability modules
├── workflows/            # 22 process templates
├── engine/               # Autonomy Engine configs
├── hooks/                # Event automation
├── rules/                # Governance rules
├── checklists/           # Verification checklists
├── templates/            # Feature templates
└── decisions/            # ADR system

lib/                      # Runtime Engine (33 modules)
├── workflow-engine.js    # State machine enforcement
├── task-governance.js    # Locking, audit trail, decision timeline
├── agent-reputation.js   # Score tracking & rankings
├── self-healing.js       # CI failure detection & patch generation
├── marketplace.js        # Community skill marketplace
└── + 16 more modules     # Identity, plugins, hooks, registry...

tests/                    # 533 tests (39 files)
├── unit/                 # Module tests
├── structural/           # Inventory + schema validation
├── integration/          # Cross-module tests
└── security/             # Injection scan + leakage detection
```
