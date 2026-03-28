---
description: Build a new feature or module from scratch
workflow: create
---

# /build Command

Scaffold and build a new feature or module. Dispatches to the `/create` workflow. For 3+ files, auto-invokes the planner first. See `.agent/workflows/create.md` for full process.

## Usage

| Command | Action |
| :--- | :--- |
| `/build [feature description]` | Build a new feature (auto-detects stack) |
| `/build [feature] --stack [stack]` | Force specific stack (node, react, python, etc.) |
| `/build [feature] --scaffold-only` | Generate file structure without implementation |

## Examples

```
/build user authentication with JWT
/build product catalog with search and filtering
/build payment integration with Stripe --stack node
/build dashboard layout --scaffold-only
```

## Process (see workflow for full detail)

1. Detect project stack from config files
2. Analyze existing patterns and conventions
3. For 3+ files: auto-run `/plan` — wait for approval before building
4. Scaffold file structure (present plan for >5 files, require approval)
5. Implement with SOLID principles, following detected conventions
6. Add tests, wire up imports/routes, document public APIs

## Output Preview

```
## Build: user-authentication

Stack: TypeScript + NestJS
Files Created:
- src/auth/auth.service.ts — JWT logic
- src/auth/auth.controller.ts — REST endpoints
- src/auth/auth.module.ts — DI config
- src/auth/dto/login.dto.ts — request shapes
- src/auth/auth.service.spec.ts — unit tests

Integration: Registered in AppModule, routes at /auth
Tests: 12 passing, 89% coverage
```

## Related Commands

`/plan` — plan before building · `/implement` — build from existing plan · `/cook` — full lifecycle · `/enhance` — modify existing features
