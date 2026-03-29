---
description: Setup project with kit configuration
uses: [project-docs-discovery]
---

# /setup Command

Initialize or configure the AI kit and project tooling. Detects existing config and only adds missing pieces.

> **Note**: If you ran `/greenfield`, Kit configuration was already performed. Use `/setup` for additional tooling configuration (ESLint, Git hooks, etc.).

## Usage

| Command | Action |
| :--- | :--- |
| `/setup` | Full setup — detect gaps and fill them |
| `/setup [component]` | Setup specific component only |
| `/setup --dry-run` | Show what would be configured without changing files |

## Examples

```
/setup
/setup TypeScript
/setup Git hooks
/setup CI/CD
/setup --dry-run
```

## Setup Components

| Component | What's Configured |
| :--- | :--- |
| TypeScript | `tsconfig.json` with strict mode |
| ESLint/Prettier | Opinionated config for project stack |
| Git hooks | Pre-commit: lint + type-check + secrets scan |
| Testing | Jest/Vitest/Pytest config + coverage thresholds |
| CI/CD | GitHub Actions workflow templates |
| Environment | `.env.example` with all required vars |

## Related Commands

`/scout` — explore existing setup before configuring · `/preflight` — verify setup is production-ready
