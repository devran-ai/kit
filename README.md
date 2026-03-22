# Devran AI Kit

![version](https://img.shields.io/badge/version-4.0.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![AI Agents](https://img.shields.io/badge/AI%20Agents-20-purple)
![Skills](https://img.shields.io/badge/Skills-34-orange)
![tests](https://img.shields.io/badge/tests-349%20passing-brightgreen)
![dependencies](https://img.shields.io/badge/dependencies-0-blue)

Trust-grade AI development framework with a zero-dependency runtime engine for agent orchestration, workflow governance, and skill management.

## Quick Start

```bash
# New project
npx create-kit-app my-project

# Add to existing project
npx @devran-ai/kit init

# Verify installation
kit verify
kit scan
```

## What It Does

Devran AI Kit installs a `.agent/` directory into your project containing agents, skills, workflows, and governance rules that your AI-powered IDE can use. The runtime engine provides workflow enforcement, task governance, agent reputation tracking, self-healing CI, and a skill marketplace — all with zero production dependencies.

## Architecture

| Component | Count | Description |
|-----------|-------|-------------|
| Agents | 20 | Specialized AI agents (planner, architect, security-reviewer, tdd-guide, etc.) |
| Skills | 34 | Domain knowledge modules (API patterns, testing, deployment, security, etc.) |
| Commands | 37 | Slash commands for IDE interaction (`/plan`, `/implement`, `/verify`, `/deploy`) |
| Workflows | 21 | Process templates (PR creation, code review, debugging, quality gates) |
| Rules | 9 | Governance constraints (coding style, security, testing, git workflow) |
| Runtime Modules | 29 | Engine components (workflow state machine, error budget, plugin system) |

### Workflow State Machine

```
IDLE -> EXPLORE -> PLAN -> IMPLEMENT -> VERIFY -> CHECKPOINT -> REVIEW -> DEPLOY
```

Each phase requires explicit developer approval before transitioning. The engine enforces governance rules and tracks session state across restarts.

## CLI Commands

```bash
kit init [--force] [--path <dir>]   # Install .agent/ framework
kit update [--dry-run]               # Non-destructive framework update
kit status                           # Dashboard with capabilities and metrics
kit verify                           # Manifest integrity checks
kit scan                             # Security scan (secrets, injection patterns)
kit plugin <list|install|remove>     # Plugin management
kit market <search|info|install>     # Marketplace integration
kit heal [--file <path>] [--apply]   # CI failure detection and auto-fix
kit health                           # Aggregated health check
```

## Documentation

Full documentation is available at [devran-ai.github.io/kit](https://devran-ai.github.io/kit/).

- [Getting Started](https://devran-ai.github.io/kit/getting-started/)
- [Architecture](https://devran-ai.github.io/kit/architecture/)
- [Extending the Framework](https://devran-ai.github.io/kit/extending/)
- [Contributor Guide](https://devran-ai.github.io/kit/contributor-guide/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, branch strategy, and code standards.

```bash
git clone https://github.com/devran-ai/kit.git
cd kit
npm install
npm test
```

We use [GitFlow](CONTRIBUTING.md): feature branches merge to `dev`, releases merge to `main`.

## License

[MIT](LICENSE)
