# Devran AI Kit

[![Version](https://img.shields.io/badge/version-4.1.0-blue.svg)](https://github.com/devran-ai/kit)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-382%20passing-brightgreen.svg)](tests/)
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
| Test suite | None | None | 382+ tests with security validation |
| Runtime dependencies | Varies | Varies | **Zero** |

## Quick Start

```bash
npx @devran-ai/kit init        # Install framework
kit status                      # View dashboard
kit verify                      # Check integrity
```

Or scaffold a new project:

```bash
npx create-kit-app my-project
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

## What's New in v4.1.0

| Change | Details |
|---|---|
| Cross-IDE support | Cursor, OpenCode, Codex, Antigravity — all from one manifest |
| Multi-language reviewers | TypeScript, Python, Go dedicated review agents |
| Continuous learning | Confidence scoring with time-based decay model |
| MCP server templates | GitHub, Supabase, Vercel, PostgreSQL, Filesystem |
| Test coverage | 382 tests (up from 348) across 36 test suites |

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

## License

[MIT](LICENSE)
