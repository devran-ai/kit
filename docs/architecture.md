# Architecture

Antigravity AI Kit v3.5.3 is an engineered framework with a **29-module runtime engine**, 19 agents, 32 skills, 31 commands, and 15 workflows.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ANTIGRAVITY AI KIT v3.5.0                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   19 AGENTS     │  │   31 COMMANDS   │  │   32 SKILLS     │      │
│  │                 │  │                 │  │                 │      │
│  │ • Architect     │  │ • /plan         │  │ • api-patterns  │      │
│  │ • Mobile Dev    │  │ • /implement    │  │ • architecture  │      │
│  │ • DevOps        │  │ • /verify       │  │ • clean-code    │      │
│  │ • DB Architect  │  │ • /deploy       │  │ • testing       │      │
│  │ • Security      │  │ • /debug        │  │ • docker        │      │
│  │ • + 14 more     │  │ • + 26 more     │  │ • + 26 more     │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                              │                                       │
│           ┌──────────────────┴──────────────────┐                   │
│           ▼                                      ▼                   │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                    15 WORKFLOWS                          │        │
│  │  /brainstorm • /create • /debug • /deploy • /enhance    │        │
│  │  /orchestrate • /plan • /pr • /preview • /quality-gate   │        │
│  │  /retrospective • /review • /status • /test              │        │
│  │  /ui-ux-pro-max                                          │        │
│  └─────────────────────────────────────────────────────────┘        │
│                              │                                       │
│           ┌──────────────────┴──────────────────┐                   │
│           ▼                                      ▼                   │
│  ┌─────────────────┐                   ┌─────────────────┐          │
│  │     RULES       │                   │     HOOKS       │          │
│  │  (Governance)   │                   │  (7 Lifecycle)  │          │
│  └─────────────────┘                   └─────────────────┘          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              RUNTIME ENGINE (29 modules)                 │        │
│  │  workflow-engine • session-manager • task-governance      │        │
│  │  agent-reputation • self-healing • marketplace            │        │
│  │  plugin-system • identity • conflict-detector • + 12      │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Agents (19)

Specialized sub-agents that handle delegated tasks with focused expertise.

- **Core**: Architect, Planner, Code Reviewer, TDD Specialist
- **Domain**: Mobile, Frontend, Backend, Database, DevOps, Security, Performance
- **Support**: Documentation, Build Error Resolver, Refactorer, Explorer, Knowledge
- **Autonomy**: Sprint Orchestrator, Reliability Engineer

### Commands (31)

Slash commands for quick execution of common operations.

- **Planning**: /plan, /implement, /status, /setup
- **Development**: /build, /fix, /debug, /refactor, /cook
- **Quality**: /verify, /code-review, /security-scan, /perf

### Skills (32)

Domain expertise modules that extend AI capabilities.

- **Operational**: verification-loop, continuous-learning, strategic-compact, eval-harness, context-budget
- **Orchestration**: intelligent-routing, parallel-agents, behavioral-modes, mcp-integration
- **Planning**: plan-writing (tiered quality schema), plan-validation (completeness scoring), brainstorming
- **Domain**: api-patterns, architecture, clean-code, database-design, testing-patterns, and 15 more

### Workflows (15)

Complete development lifecycles for multi-step processes.

- /brainstorm, /create, /debug, /deploy, /enhance, /orchestrate
- /plan, /pr, /preview, /quality-gate, /retrospective, /review
- /status, /test, /ui-ux-pro-max

### Runtime Engine (29 Modules)

Node.js runtime modules that enforce governance, manage state, and provide platform features.

| Phase | Modules |
|:---|:---|
| **Phase 1 — Foundation** | `workflow-engine`, `session-manager`, `verify`, `updater`, `error-budget` |
| **Phase 2 — Runtime** | `workflow-persistence`, `agent-registry`, `loading-engine`, `hook-system`, `task-model` |
| **Phase 3 — Collaboration** | `identity`, `task-governance`, `skill-sandbox`, `conflict-detector`, `security-scanner`, `plugin-system` |
| **Phase 4 — Platform** | `agent-reputation`, `engineering-manager`, `self-healing`, `marketplace`, `cli-commands` |

### Rules & Hooks

- **Rules** (8): Modular governance constraints (coding, security, testing, git, docs, sprint + 2 architecture files)
- **Hooks** (7): Event-driven automation (session-start, session-end, pre-commit, phase-transition, sprint-checkpoint, secret-detection, plan-complete)

---

## Directory Structure

```
.agent/
├── agents/               # 19 specialized agents
├── commands/             # 31 slash commands
├── skills/               # 32 capability modules
├── workflows/            # 15 process templates
├── engine/               # Autonomy Engine configs
├── hooks/                # Event automation
├── rules/                # Governance rules
├── checklists/           # Verification checklists
├── templates/            # Feature templates
└── decisions/            # ADR system

lib/                      # Runtime Engine (29 modules)
├── workflow-engine.js    # State machine enforcement
├── task-governance.js    # Locking, audit trail, decision timeline
├── agent-reputation.js   # Score tracking & rankings
├── self-healing.js       # CI failure detection & patch generation
├── marketplace.js        # Community skill marketplace
└── + 16 more modules     # Identity, plugins, hooks, registry...

tests/                    # 327 tests (32 files)
├── unit/                 # 21 module tests
├── structural/           # Inventory + schema validation
└── security/             # Injection scan + leakage detection
```
