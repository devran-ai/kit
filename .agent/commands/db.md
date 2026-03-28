---
description: Database schema design and migrations
invokes: [database-architect]
uses: [database-design]
---

# /db Command

Design, modify, or migrate database schemas. Uses the `database-architect` agent. Follows `.agent/rules/data-privacy.md` for PII handling.

## Usage

| Command | Action |
| :--- | :--- |
| `/db design [entity]` | Design new schema entity with relations |
| `/db migrate [description]` | Create and apply migration |
| `/db seed [description]` | Create seed data scripts |
| `/db analyze` | Analyze current schema for issues |
| `/db rollback` | Rollback last migration |

## Examples

```
/db design User entity with profile and preferences
/db migrate add email verification fields to users
/db seed create 10 test users with orders
/db analyze
/db rollback
```

## Output

| Sub-command | Output |
| :--- | :--- |
| `design` | Schema definition with indexes, constraints, relations |
| `migrate` | Migration file + rollback SQL |
| `seed` | Seed scripts with realistic data |
| `analyze` | N+1 risks, missing indexes, PII without encryption |

## Data Privacy Compliance

Schema design automatically checks `.agent/rules/data-privacy.md`:
- PII fields flagged for encryption at rest
- Retention policies recommended
- Audit trail for sensitive data changes

## Related Commands

`/plan` — plan schema changes for complex migrations · `/security-scan` — check for PII exposure risks
