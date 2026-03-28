---
description: Generate or update documentation
invokes: [doc-updater]
---

# /doc Command

Create comprehensive documentation for code, APIs, and features. Uses the `doc-updater` agent. Enforces `.agent/rules/documentation.md` standards.

## Usage

| Command | Action |
| :--- | :--- |
| `/doc [path]` | Document a file or directory |
| `/doc api` | Generate API reference documentation |
| `/doc readme` | Update README with current state |
| `/doc changelog` | Update CHANGELOG (alias for `/changelog`) |
| `/doc --check` | Audit documentation coverage without changes |

## Examples

```
/doc src/services/user.service.ts
/doc api
/doc readme
/doc src/auth/ --check
```

## Documentation Types

| Type | What's Generated |
| :--- | :--- |
| Inline (JSDoc/docstring) | Function/class docs with params, returns, examples |
| API reference | Endpoint docs with request/response schemas |
| README | Installation, usage, configuration, contributing |
| Architecture | Component map, data flow, decision rationale |

## Standards

All public API functions require:
- Description of what the function does
- `@param` for each parameter with type and description
- `@returns` with type and description
- `@example` usage example
- `@throws` for thrown errors

## Related Commands

`/changelog` — update CHANGELOG · `/adr` — document architectural decisions · `doc-updater` agent — full doc sync
