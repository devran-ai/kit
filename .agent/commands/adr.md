---
description: Create an Architecture Decision Record
invokes: [doc-updater]
---

# /adr Command

Document an architecture decision in `docs/decisions/`. ADRs preserve why decisions were made, preventing future re-debate.

## Usage

| Command | Action |
| :--- | :--- |
| `/adr [decision]` | Create new ADR |
| `/adr list` | List all existing ADRs |
| `/adr deprecate [N]` | Mark ADR-N as deprecated |

## Examples

```
/adr Use PostgreSQL over MySQL for primary storage
/adr Adopt NestJS for backend API layer
/adr Choose React Query over Redux for server state
/adr list
```

## ADR Format

Saved to `docs/decisions/ADR-{NNN}-{slug}.md`:

| Field | Content |
| :--- | :--- |
| Title | Decision name (imperative) |
| Status | Proposed / Accepted / Deprecated / Superseded |
| Context | Why this decision is needed now |
| Decision | What we decided and key rationale |
| Consequences | Positive and negative implications |
| Alternatives Considered | Options that were evaluated but rejected |

## Output Preview

```markdown
# ADR-042: Use PostgreSQL over MySQL for Primary Storage

**Status**: Accepted
**Date**: 2026-03-28

## Context

We need a primary relational database. The project requires JSONB support, full-text search, and row-level security.

## Decision

Use **PostgreSQL 16** as the primary database.

Rationale: JSONB native support eliminates need for separate document store; RLS enables multi-tenant security at DB layer; better extension ecosystem (pgvector, timescaledb).

## Consequences

**Positive**: Native JSONB, RLS, pgvector support. Strong Prisma/Drizzle ORM compatibility.
**Negative**: Higher operational complexity than MySQL. Team needs PostgreSQL-specific knowledge.

## Alternatives Considered

- **MySQL 8**: Rejected — limited JSONB support, no native RLS
- **SQLite**: Rejected — not suitable for multi-instance production deployments
```

## Related Commands

`/brainstorm` — explore options before recording decision · `/research` — gather evidence for the decision
