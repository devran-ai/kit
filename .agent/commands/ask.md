---
description: Ask questions about the codebase
invokes: [explorer-agent, knowledge-agent]
---

# /ask Command

Ask natural language questions about code, architecture, or patterns. The `explorer-agent` and `knowledge-agent` answer with codebase evidence.

## Usage

| Command | Action |
| :--- | :--- |
| `/ask [question]` | Ask any question about the codebase |
| `/ask --trace [symbol]` | Trace a function/variable across the codebase |
| `/ask --explain [file]` | Deep explanation of a specific file |

## Examples

```
/ask How does authentication work?
/ask What's the database schema for users?
/ask Where is payment processing handled?
/ask --trace handleRefreshToken
/ask --explain src/auth/auth.service.ts
```

## Capabilities

| Capability | Description |
| :--- | :--- |
| Code explanation | Explain what code does and why |
| Architecture overview | Map how components connect |
| Pattern identification | Find recurring patterns and conventions |
| Dependency tracing | Follow imports and call chains |
| "Where is X" queries | Locate specific logic or feature |

## Related Commands

`/scout` — structured architecture report · `/debug` — investigate issues · `/plan` — plan work after understanding codebase
