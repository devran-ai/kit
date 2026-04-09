# Architecture

Devran AI Kit v5.2.4 is an engineered framework with a **43-module runtime engine**, 26 agents, 39 skills, 40 commands, 25 workflows, and 15 governance rules.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DEVRAN AI KIT v5.2.4                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   26 AGENTS     │  │   40 COMMANDS   │  │   39 SKILLS     │      │
│  │                 │  │                 │  │                 │      │
│  │ • Architect     │  │ • /plan         │  │ • api-patterns  │      │
│  │ • Mobile Dev    │  │ • /implement    │  │ • architecture  │      │
│  │ • DevOps        │  │ • /verify       │  │ • clean-code    │      │
│  │ • DB Architect  │  │ • /deploy       │  │ • testing       │      │
│  │ • Security      │  │ • /debug        │  │ • docker        │      │
│  │ • + 21 more     │  │ • + 35 more     │  │ • + 34 more     │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                              │                                       │
│           ┌──────────────────┴──────────────────┐                   │
│           ▼                                      ▼                   │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                    25 WORKFLOWS                          │        │
│  │  /brainstorm • /create • /debug • /deploy • /enhance    │        │
│  │  /implement • /orchestrate • /plan • /pr • /preflight    │        │
│  │  /preview • /quality-gate • /retrospective • /review     │        │
│  │  /project-status • /test • /ui-ux-pro-max • /upgrade     │        │
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
│  │              RUNTIME ENGINE (43 modules)                 │        │
│  │  workflow-engine • session-manager • task-governance      │        │
│  │  agent-reputation • self-healing • marketplace            │        │
│  │  plugin-system • identity • conflict-detector • + 12      │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Agents (26)

Specialized sub-agents that handle delegated tasks with focused expertise.

- **Core**: Architect, Planner, Code Reviewer, TDD Specialist
- **Domain**: Mobile, Frontend, Backend, Database, DevOps, Security, Performance
- **Support**: Documentation, Build Error Resolver, Refactorer, Explorer, Knowledge
- **Language**: TypeScript Reviewer, Python Reviewer, Go Reviewer
- **Autonomy**: Sprint Orchestrator, Reliability Engineer, PR Reviewer

### Commands (40)

Slash commands for quick execution of common operations.

- **Planning**: /plan, /implement, /project_status, /setup
- **Development**: /build, /fix, /debug, /refactor, /cook
- **Quality**: /verify, /code-review, /security-scan, /perf

### Skills (39)

Domain expertise modules that extend AI capabilities.

- **Operational**: verification-loop, continuous-learning, strategic-compact, eval-harness, context-budget, production-readiness, project-docs-discovery
- **Orchestration**: intelligent-routing, parallel-agents, behavioral-modes, mcp-integration
- **Planning**: plan-writing (tiered quality schema), plan-validation (completeness scoring), brainstorming, **research-methodology** (multi-source evidence protocol, competitive analysis)
- **Domain**: api-patterns, architecture, clean-code, database-design, testing-patterns, pr-toolkit, security-practices, and 14 more

### Workflows (25)

Complete development lifecycles for multi-step processes.

- /brainstorm, /create, /debug, /deploy, /enhance, /implement, /orchestrate
- /plan, /pr, /pr-review, /pr-fix, /pr-merge, /pr-split, /preflight, /preview, /quality-gate, /retrospective, /review
- /project-status, /help-kit, /test, /ui-ux-pro-max, /upgrade

All 25 workflows include Scope Filter tables, Argument Parsing, Failure Output templates, and measurable Completion Criteria.

### Runtime Engine (43 Modules)

Node.js runtime modules that enforce governance, manage state, and provide platform features.

| Phase | Modules |
|:---|:---|
| **Phase 1 — Foundation** | `workflow-engine`, `session-manager`, `verify`, `updater`, `error-budget` |
| **Phase 2 — Runtime** | `workflow-persistence`, `agent-registry`, `loading-engine`, `hook-system`, `task-model` |
| **Phase 3 — Collaboration** | `identity`, `task-governance`, `skill-sandbox`, `conflict-detector`, `security-scanner`, `plugin-system` |
| **Phase 4 — Platform** | `agent-reputation`, `engineering-manager`, `self-healing`, `marketplace`, `cli-commands` |

### Rules & Hooks

- **Rules** (15): Governance constraints — security, coding-style, testing, git-workflow, documentation, architecture, performance, accessibility, data-privacy, sprint-tracking, workflow-standards, quality-gate, agent-upgrade-policy, market-awareness, doc-freshness
- **Hooks** (9): Event-driven automation (session-start, session-end, pre-commit, phase-transition, sprint-checkpoint, secret-detection, plan-complete, task-complete, onboarding-complete)

---

## Directory Structure

```
.agent/
├── agents/               # 26 specialized agents
├── commands/             # 40 slash commands
├── skills/               # 39 capability modules
├── workflows/            # 25 process templates
├── engine/               # Autonomy Engine configs
├── hooks/                # Event automation
├── rules/                # Governance rules
├── checklists/           # Verification checklists
├── templates/            # Feature templates
└── decisions/            # ADR system

lib/                      # Runtime Engine (43 modules)
├── workflow-engine.js    # State machine enforcement
├── task-governance.js    # Locking, audit trail, decision timeline
├── agent-reputation.js   # Score tracking & rankings
├── self-healing.js       # CI failure detection & patch generation
├── marketplace.js        # Community skill marketplace
└── + 17 more modules     # Identity, plugins, hooks, registry...

tests/                    # 568 tests (39 files)
├── unit/                 # Module tests
├── structural/           # Inventory + schema validation
├── integration/          # Cross-module tests
└── security/             # Injection scan + leakage detection
```
