# Devran AI Kit

<p align="center">
  <a href="https://devran-ai.github.io/kit/">
    <img src="docs/assets/og-image.png" alt="Devran AI Kit — Trust-Grade AI Development Framework" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/devran-ai/kit"><img src="https://img.shields.io/badge/version-5.2.8-blue?style=for-the-badge" alt="Version" height="36" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" height="36" /></a>
  <a href="tests/"><img src="https://img.shields.io/badge/tests-1037%20passing-brightgreen?style=for-the-badge" alt="Tests" height="36" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/dependencies-0-brightgreen?style=for-the-badge" alt="Dependencies" height="36" /></a>
</p>
<p align="center">
  <a href=".agent/agents/"><img src="https://img.shields.io/badge/AI%20Agents-26-7c3aed?style=for-the-badge" alt="AI Agents" height="36" /></a>
  <a href=".agent/skills/"><img src="https://img.shields.io/badge/Skills-39-8b5cf6?style=for-the-badge" alt="Skills" height="36" /></a>
  <a href=".agent/commands/"><img src="https://img.shields.io/badge/Commands-40-6366f1?style=for-the-badge" alt="Commands" height="36" /></a>
  <a href=".agent/workflows/"><img src="https://img.shields.io/badge/Workflows-25-a78bfa?style=for-the-badge" alt="Workflows" height="36" /></a>
  <a href=".agent/rules/"><img src="https://img.shields.io/badge/Rules-15-9333ea?style=for-the-badge" alt="Rules" height="36" /></a>
</p>

> Trust-Grade AI Development Framework — Zero dependencies. 26 agents. 39 skills. 25 workflows. 15 rules. One command.

## Why Devran AI Kit?

- **Not a prompt collection** — 43-module zero-dependency runtime engine with workflow state machine, circuit breaker, error budget, and self-healing CI
- **Trust-grade governance** — 15 governance rules (including Performance, Accessibility, Data Privacy, Market Awareness, Doc Freshness) enforced through a 7-phase SDLC with Scope Filters, Ethics Gates, Rigor Profiles (strict/standard/minimal), and Failure Templates on every workflow
- **Intelligent agent system** — 26 specialized agents with reputation scoring, domain-aware routing, Instinct System (confidence-scored pattern memory), and on-demand loading via keyword matching
- **Project onboarding** — `/greenfield` and `/brownfield` workflows generate master documentation (15 templates), market research, architecture diagrams, and Kit configuration from a single Socratic discovery session
- **Telegram integration** — Control your Claude Code session from your phone. Trigger workflows, review PRs, and deploy — all from a Telegram chat
- **Cross-IDE support** — One `kit init` configures Claude Code, Antigravity, Cursor, OpenCode, and Codex from a single manifest source of truth

## Comparison

| Capability | Prompt Files | Rule Collections | **Devran AI Kit** |
|---|---|---|---|
| Agent orchestration | Manual | Manual | 26 agents with reputation scoring |
| Project onboarding | None | None | `/greenfield` + `/brownfield` with 15 master templates |
| Workflow governance | None | None | 7-phase SDLC state machine |
| Session persistence | None | None | Full state across restarts |
| Self-healing CI | None | None | Auto-diagnoses and patches failures |
| Cross-IDE support | Single IDE | Single IDE | 5 IDEs from one source of truth |
| Plugin marketplace | None | None | Trust-verified skill marketplace |
| Telegram control | None | None | Full IDE control from your phone |
| Test suite | None | None | 1037 tests with security validation |
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
| Agents | 26 | Specialized AI agents with reputation scoring and domain routing |
| Skills | 39 | Domain knowledge modules loaded on demand via keyword matching |
| Commands | 40 | Slash commands for IDE interaction (`/plan`, `/greenfield`, `/deploy`) |
| Workflows | 25 | Process templates with quality gates, scope filters, and phase enforcement |
| Runtime Modules | 43 | Engine components (state machine, circuit breaker, plugin system, command bridge) |
| Rules | 15 | Governance constraints (security, performance, accessibility, market-awareness, and more) |
| Checklists | 4 | Verification checklists (pre-commit, task-complete, session-start, session-end) |
| Hooks | 9 | Lifecycle events (session start/end, phase transition, onboarding complete) |

### Workflow State Machine

```
IDLE -> ONBOARDING -> EXPLORE -> PLAN -> IMPLEMENT -> VERIFY -> CHECKPOINT -> REVIEW -> DEPLOY
         (one-time)
```

Onboarding (`/greenfield` or `/brownfield`) is a one-time pre-SDLC phase. Each subsequent phase requires explicit developer approval before transitioning. The engine enforces governance rules and tracks session state across restarts.

## What's New

See the full **[CHANGELOG](CHANGELOG.md)** for detailed release notes.

**Latest (v5.2.8):** `kit init` and `kit update` now auto-untrack any Kit artifacts that were accidentally committed (`.cursor/commands/`, `.agent/`, bridge files, `dev/null/`). Before, gitignore only blocked new additions — already-tracked files stayed in git. Now Kit actively removes them from the index, so no Kit files ever pollute user repos. Hardened with `execFileSync` (no shell interpolation), a `git check-ignore --no-index` gate, and a new `isSharedMode()` detector that skips the whole gitignore pipeline for teams using `kit init --shared`. 1037 tests passing.

**v5.2.7:** `kit update` now runs the full gitignore pipeline — projects upgraded from older Kit versions get missing `.cursor/commands/`, `.opencode/commands/`, and other bridge entries auto-fixed.

**v5.2.6:** Fixed Claude Code CLI slash command discovery — blanket `.claude/` gitignore narrowed to `.claude/commands/` for proper directory discovery. New `narrowBlanketClaudeIgnore()` migration function. CRLF-safe regex patterns.

**v5.2.5:** Complete gitignore coverage — `kit init` now gitignores all generated artifacts (bridge dirs, IDE configs, `.worktreeinclude`) so `git status` stays clean.

**v5.2.3:** Automatic Worktree Support — `.worktreeinclude` generation for Claude Code, `post-checkout` git hook for manual worktrees. Zero-friction install: bridge files are local-only, `kit init` no longer modifies existing `.gitignore` entries.

**v5.2.0:** Universal Slash Command Bridge Generation — IDE-native `/` command bridges for Claude Code, Cursor, OpenCode, VS Code Copilot, and Windsurf with auto-detection, provenance-based safe overwrite, and 9 security hardening measures.

**v5.1.0:** Onboarding Workflow System — `/greenfield` and `/brownfield` commands for project initialization with Socratic discovery, market research, 15 master templates, Kit auto-configuration.

## Cross-IDE Support

Devran AI Kit provides two layers of IDE integration:

| IDE | Governance Config | Slash Commands | Auto-Detected? |
|---|---|---|---|
| Claude Code / Antigravity | `.agent/rules.md` (native) | `.claude/commands/*.md` | Always |
| Cursor | `.cursor/rules/*.mdc` | `.cursor/commands/*.md` | Yes |
| OpenCode | `.opencode/opencode.json` | `.opencode/commands/*.md` | Yes |
| VS Code Copilot | - | `.github/prompts/*.prompt.md` | Opt-in (`--ide vscode`) |
| Windsurf | - | `.windsurf/workflows/*.md` | Yes |
| Codex | `.codex/config.toml` | - | Yes (config only) |

All generated automatically by `kit init`. See [IDE Support](docs/ide-support.md) for details.

## CLI Reference

| Command | Description | Key Flags |
|---|---|---|
| `kit init` | Install `.agent/` framework + slash command bridges | `--force`, `--path <dir>`, `--ide <list>`, `--skip-commands`, `--skip-worktree` |
| `kit update` | Non-destructive framework update | `--dry-run` |
| `kit status` | Dashboard with capabilities and metrics | — |
| `kit verify` | Manifest integrity and structure checks | — |
| `kit scan` | Security scan (secrets, injection patterns) | — |
| `kit plugin` | Plugin management | `list`, `install`, `remove` |
| `kit market` | Marketplace integration | `search`, `info`, `install` |
| `kit heal` | CI failure detection and auto-fix | `--file <path>`, `--apply` |
| `kit health` | Aggregated health check | — |
| `kit sync-bot-commands` | Sync workflows to Telegram bot menu (all scopes) | `--scope`, `--token`, `--dry-run`, `--clear`, `--limit`, `--source`, `--guard`, `--install-guard` |

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
- `engine/onboarding-state.json` — Your onboarding progress
- `engine/decisions.json` — Your architectural decisions
- `decisions/` — Your Architecture Decision Records
- `contexts/` — Your learning data and plan quality logs
- `rules/` — Your custom governance rules
- `checklists/` — Your custom quality gates
- `staging/` — In-progress document generation

## Agents (26)

| Category | Agents |
|---|---|
| **Onboarding** | Onboarding Specialist, Market Researcher, Codebase Scanner |
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
│   ├── agents/             # 26 specialized agent definitions
│   ├── skills/             # 39 domain knowledge modules
│   ├── commands/           # 40 slash command definitions
│   ├── workflows/          # 25 workflow templates
│   ├── rules/              # 15 governance constraints
│   ├── checklists/         # 4 lifecycle quality gates
│   ├── engine/             # Runtime config (loading-rules, MCP templates)
│   ├── decisions/          # Architecture Decision Records
│   └── manifest.json       # Definitive capability inventory
├── lib/                    # 43 runtime modules (zero dependencies)
│   ├── commands/           # Extracted CLI command handlers
├── bin/kit.js              # CLI entry point
├── create-kit-app/         # Project scaffolder
├── docs/                   # MkDocs documentation site
├── examples/               # Starter examples (minimal, full-stack)
└── tests/                  # 1037 tests (unit, structural, integration, security)
```

## Security

Secret detection covers API keys, tokens, AWS credentials, and private keys. The scanner checks for prompt injection patterns, path traversal attempts, and symlink abuse. Plugins are verified with SHA-256 checksums before installation.

## Telegram Integration

Run your entire development workflow from your phone. Devran AI Kit turns any Telegram chat into a full Claude Code remote control.

```
You (Telegram)  ──>  Bot  ──>  Claude Code  ──>  Bot  ──>  You (Telegram)
```

| What you can do | How |
|---|---|
| Trigger any workflow | Type `/` in the chat — all 25 workflows appear as a native bot menu |
| Plan a feature | `/plan auth system` — bot executes immediately |
| Review a PR | `/pr-review PR #5` — multi-perspective review runs |
| Deploy to production | `/deploy staging` — pre-flight checks + deploy |
| Check project status | `/project-status` — instant overview |
| Debug an issue | `/debug login page crashes on mobile` |

**Smart argument handling** — Send `/plan` alone and the bot asks what you need. Send `/plan auth system` and it executes directly. No extra steps.

**Menu guard** — The bot menu auto-restores on every session. Your 25 workflows are always one tap away.

### Get started

```bash
kit sync-bot-commands                  # Push workflows to bot menu
kit sync-bot-commands --install-guard  # Keep menu persistent across sessions
```

**[Full setup guide](docs/telegram-setup.md)** — Create a bot, install the plugin, pair your account, and start using workflows from Telegram in under 5 minutes.

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
