# Devran AI Kit

[![Version](https://img.shields.io/badge/version-4.3.0-blue.svg)](https://github.com/devran-ai/kit)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-388%20passing-brightgreen.svg)](tests/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![AI Agents](https://img.shields.io/badge/AI%20Agents-23-purple.svg)](.agent/agents/)
[![Skills](https://img.shields.io/badge/Skills-34-orange.svg)](.agent/skills/)

> Trust-Grade AI Development Framework — Zero dependencies. 23 agents. 34 skills. 21 workflows. One command.

## Why Devran AI Kit?

- **Not a prompt collection** — 31-module zero-dependency runtime engine with workflow state machine, circuit breaker, error budget, and self-healing CI
- **Trust-grade governance** — Immutable operating constraints enforced through a 7-phase SDLC (IDLE > EXPLORE > PLAN > IMPLEMENT > VERIFY > CHECKPOINT > REVIEW > DEPLOY)
- **Intelligent agent system** — 23 specialized agents with reputation scoring, domain-aware routing, and on-demand loading via keyword matching
- **Cross-IDE support** — One `kit init` configures Claude Code, Antigravity, Cursor, OpenCode, and Codex from a single manifest source of truth

## Comparison

| Capability | Prompt Files | Rule Collections | **Devran AI Kit** |
|---|---|---|---|
| Agent orchestration | Manual | Manual | 23 agents with reputation scoring |
| Workflow governance | None | None | 7-phase SDLC state machine |
| Session persistence | None | None | Full state across restarts |
| Self-healing CI | None | None | Auto-diagnoses and patches failures |
| Cross-IDE support | Single IDE | Single IDE | 5 IDEs from one source of truth |
| Plugin marketplace | None | None | Trust-verified skill marketplace |
| Test suite | None | None | 388+ tests with security validation |
| Runtime dependencies | Varies | Varies | **Zero** |

## Quick Start

### Option 1: Create New Project (Recommended)

```bash
npx create-kit-app my-project
npx create-kit-app my-api --template node-api
npx create-kit-app my-app --template nextjs
```

Creates a new project with `.agent/` pre-configured. Templates: `minimal`, `node-api`, `nextjs`.

### Option 2: Add to Existing Project

```bash
npx @devran-ai/kit init
```

## How It Works in Teams

Devran AI Kit is **personal developer tooling** — like your IDE settings. `kit init` adds `.agent/` to `.gitignore` by default so it stays local.

| Mode | Command | Behavior |
|------|---------|----------|
| Personal (default) | `kit init` | `.agent/` gitignored — local only |
| Team (opt-in) | `kit init --shared` | `.agent/` committed — shared with team |

Your project's `CLAUDE.md` remains the single source of truth. The kit enhances your personal workflow without affecting teammates. Anyone who wants it runs `npx @devran-ai/kit init`.

### Updating

```bash
kit update              # Non-destructive — preserves your customizations
kit update --dry-run    # Preview changes without applying
```

> Prefer `kit update` over `kit init --force`. The update command preserves your session data, ADRs, learning contexts, and customizations. Use `init --force` only for clean reinstalls.

### Verify Installation

```bash
kit verify    # Manifest integrity check
kit scan      # Security scan
```

## Architecture

| Component | Count | Purpose |
|---|---|---|
| Agents | 23 | Specialized AI agents with reputation scoring and domain routing |
| Skills | 34 | Domain knowledge modules loaded on demand via keyword matching |
| Commands | 37 | Slash commands for IDE interaction (`/plan`, `/implement`, `/verify`) |
| Workflows | 21 | Process templates with quality gates and phase enforcement |
| Runtime Modules | 31 | Engine components (state machine, circuit breaker, plugin system) |
| Rules | 10 | Governance constraints (security, coding style, testing, git) |
| Checklists | 4 | Verification checklists (pre-commit, deployment, review, release) |
| Hooks | 8 | Lifecycle events (session start/end, phase transition, task complete) |

### Workflow State Machine

```
IDLE -> EXPLORE -> PLAN -> IMPLEMENT -> VERIFY -> CHECKPOINT -> REVIEW -> DEPLOY
```

Each phase requires explicit developer approval before transitioning. The engine enforces governance rules and tracks session state across restarts.

## What's New

### v4.2.1

| Change | Details |
|---|---|
| Untrack hint | Detects tracked `.agent/` and prints `git rm --cached` command |
| Documentation fixes | Updated release notes, stale test counts corrected |

### v4.2.0

| Change | Details |
|---|---|
| Gitignore by default | `kit init` adds `.agent/` to `.gitignore` — personal dev tooling |
| `--shared` flag | Opt-in to commit `.agent/` for team sharing |
| 388 tests | 37 test suites across unit, structural, and security |

### v4.1.0

| Change | Details |
|---|---|
| Cross-IDE support | Cursor, OpenCode, Codex, Antigravity — all from one manifest |
| Multi-language reviewers | TypeScript, Python, Go dedicated review agents |
| Continuous learning | Confidence scoring with time-based decay model |
| MCP server templates | GitHub, Supabase, Vercel, PostgreSQL, Filesystem |

## Cross-IDE Support

| IDE | Config Path | Format |
|---|---|---|
| Claude Code | `.agent/` | Native |
| Antigravity | `.agent/` | Native |
| Cursor | `.cursor/rules/` | YAML frontmatter + Markdown |
| OpenCode | `.opencode/` | JSON |
| Codex | `.codex/` | TOML |

All generated automatically by `kit init`.

## CLI Reference

| Command | Description | Key Flags |
|---|---|---|
| `kit init` | Install `.agent/` framework into project | `--force`, `--path <dir>` |
| `kit update` | Non-destructive framework update | `--dry-run` |
| `kit status` | Dashboard with capabilities and metrics | — |
| `kit verify` | Manifest integrity and structure checks | — |
| `kit scan` | Security scan (secrets, injection patterns) | — |
| `kit plugin` | Plugin management | `list`, `install`, `remove` |
| `kit market` | Marketplace integration | `search`, `info`, `install` |
| `kit heal` | CI failure detection and auto-fix | `--file <path>`, `--apply` |
| `kit health` | Aggregated health check | — |

## Safety Guarantees

Devran AI Kit is designed to **never touch your project files**. All operations are scoped to the `.agent/` directory.

| Your Project Files | Safe? | Details |
|---|---|---|
| Source code (`src/`, `lib/`, `app/`) | Never touched | Init/update only operates on `.agent/` |
| Config files (`.env`, `package.json`) | Never touched | No project config is read or written |
| Documentation (`docs/`, `README.md`) | Never touched | Only `.agent/` docs are managed |
| Tests (`tests/`, `__tests__/`) | Never touched | Kit tests are internal to the package |
| Platform files (`android/`, `ios/`) | Never touched | No platform-specific operations |

`init --force` safety features:

- **Auto-backup** — Creates timestamped backup of existing `.agent/` before overwriting
- **Atomic copy** — Uses temp directory + rename to prevent corruption on failure
- **Symlink guard** — Skips symbolic links to prevent path traversal attacks
- **Session warning** — Alerts if active work-in-progress would be destroyed
- **Dry-run preview** — `--dry-run --force` shows exactly which user files would be overwritten

`update` preserved files:

- `session-context.md` — Your active session notes
- `session-state.json` — Your session metadata
- `decisions/` — Your Architecture Decision Records
- `contexts/` — Your learning data and plan quality logs
- `rules/` — Your custom governance rules
- `checklists/` — Your custom quality gates

## Agents (23)

| Category | Agents |
|---|---|
| **Core Development** | Architect, Code Reviewer, TDD Guide, Planner |
| **Language Reviewers** | TypeScript Reviewer, Python Reviewer, Go Reviewer |
| **Domain Specialists** | Frontend Specialist, Backend Specialist, Mobile Developer, Database Architect, DevOps Engineer |
| **Quality & Security** | Security Reviewer, E2E Runner, Performance Optimizer, Reliability Engineer |
| **Support & Intelligence** | Doc Updater, Build Error Resolver, Refactor Cleaner, Explorer Agent, Knowledge Agent |
| **Autonomy** | PR Reviewer, Sprint Orchestrator |

## Operating Constraints

| Principle | Description |
|---|---|
| Trust > Optimization | User trust is never sacrificed for metrics |
| Safety > Growth | User safety overrides business goals |
| Explainability > Performance | Understandable AI beats faster AI |
| Completion > Suggestion | Finish current work before proposing new |
| Consistency > Speed | All affected files updated, not just target |

## Repository Structure

```
kit/
├── .agent/                 # Framework directory (installed to projects)
│   ├── agents/             # 23 specialized agent definitions
│   ├── skills/             # 34 domain knowledge modules
│   ├── commands/           # 37 slash command definitions
│   ├── workflows/          # 21 workflow templates
│   ├── rules/              # 10 governance constraints
│   ├── checklists/         # 4 lifecycle quality gates
│   ├── engine/             # Runtime config (loading-rules, MCP templates)
│   ├── decisions/          # Architecture Decision Records
│   └── manifest.json       # Definitive capability inventory
├── lib/                    # 31 runtime modules (zero dependencies)
├── bin/kit.js              # CLI entry point
├── create-kit-app/         # Project scaffolder
├── docs/                   # MkDocs documentation site
├── examples/               # Starter examples (minimal, full-stack)
└── tests/                  # 388 tests (unit, structural, security)
```

## Security

Secret detection covers API keys, tokens, AWS credentials, and private keys. The scanner checks for prompt injection patterns, path traversal attempts, and symlink abuse. Plugins are verified with SHA-256 checksums before installation.

## Documentation

Full documentation: [devran-ai.github.io/kit](https://devran-ai.github.io/kit/)

## Contributing

Fork the repo, create a feature branch, add tests, and open a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy and code standards.

```bash
git clone https://github.com/devran-ai/kit.git
cd kit && npm install && npm test
```

## Author

**Emre Dursun** — [LinkedIn](https://www.linkedin.com/in/emre-dursun-nl/) · [GitHub](https://github.com/emredursun)

## License

[MIT](LICENSE)
