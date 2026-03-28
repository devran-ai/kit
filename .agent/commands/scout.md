---
description: Explore and understand codebase structure
invokes: [explorer-agent]
uses: [project-docs-discovery]
---

# /scout Command

Analyze and document codebase architecture. Use before planning, debugging, or joining a new project.

## Usage

| Command | Action |
| :--- | :--- |
| `/scout` | Full architecture overview |
| `/scout [path]` | Explore specific directory or module |
| `/scout --depth [1-3]` | Control exploration depth (default: 2) |
| `/scout --focus [domain]` | Focus on specific domain (auth, db, api, ui) |

## Examples

```
/scout
/scout src/services
/scout --depth 3 --focus auth
/scout --focus database
```

## Process

1. Detect stack and entry points from config files
2. Map file structure and key components
3. Identify dependencies, patterns, and conventions
4. Produce architecture overview with agent and skill assignments

## Output Preview

```
## Architecture Report

Stack: TypeScript + NestJS + PostgreSQL
Structure:
  src/
  ├── auth/         — JWT + session management
  ├── users/        — user CRUD + profiles
  ├── payments/     — Stripe integration
  └── common/       — shared DTOs, guards, pipes

Key Patterns: Repository pattern, DTO validation, Guard-based auth
External Dependencies: Stripe API, SendGrid, S3
```

## Related Commands

`/ask` — question-answer about specific code · `/plan` — plan work after scouting · `/brainstorm` — explore options after understanding structure
