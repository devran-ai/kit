# Plugin Architecture Guide

> How to extend Antigravity AI Kit with custom agents, skills, and workflows.

## Architecture Principles

Antigravity AI Kit uses a **file-based plugin architecture**. Every capability is defined by a markdown file with YAML frontmatter. This means:

1. **No compilation** — plugins are plain text files
2. **No dependencies** — no npm packages to install for plugins
3. **Instant activation** — drop a file, it's live
4. **Version controlled** — all plugins tracked in git
5. **IDE-agnostic** — works with any AI-powered IDE

## Plugin Types

### 1. Agents

Agents are role-based specialists that handle specific domains.

**Location**: `.agent/agents/<name>.md`

**Structure**:
```markdown
---
name: python-specialist
description: Python development with FastAPI, SQLAlchemy, and type hints
triggers: [python, fastapi, sqlalchemy, pip, pytest]
---

# Python Specialist Agent

## Role
You are a Python specialist with deep expertise in...

## Core Responsibilities
1. Write idiomatic, type-hinted Python code
2. Follow PEP 8 and PEP 257 conventions
3. Use Pydantic models for data validation

## Technology Stack
- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0 with async
- **Testing**: pytest + pytest-asyncio
- **Type Checking**: mypy --strict

## Patterns
### API Endpoint Pattern
```python
@router.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, db: AsyncSession = Depends(get_db)) -> ItemResponse:
    ...
```
```

**Registration**: Add entry to `.agent/manifest.json`:
```json
{ "name": "python-specialist", "file": "agents/python-specialist.md", "domain": "Python, FastAPI, SQLAlchemy" }
```

### 2. Skills

Skills are domain knowledge modules loaded on-demand.

**Location**: `.agent/skills/<name>/SKILL.md`

**Structure**:
```markdown
---
name: graphql-patterns
description: GraphQL schema design, resolvers, and performance optimization
version: 1.0.0
triggers: [graphql, schema, resolver, query, mutation]
---

# GraphQL Patterns Skill

## Overview
Best practices for GraphQL API design...

## Schema Design
### Type-First Approach
```graphql
type User {
  id: ID!
  email: String!
  posts: [Post!]! @connection
}
```

## Performance
### DataLoader Pattern
...

## Security
### Query Depth Limiting
...
```

**Registration**: Add entry to `.agent/manifest.json`:
```json
{ "name": "graphql-patterns", "directory": "skills/graphql-patterns/" }
```

### 3. Workflows

Workflows are step-by-step process templates.

**Location**: `.agent/workflows/<name>.md`

**Structure**:
```markdown
---
description: Database migration workflow with safety checks
---

## Pre-Migration
1. Backup current schema
2. Review migration SQL
3. Check for destructive changes

## Migration
// turbo
4. Run migration on staging
5. Verify staging data integrity
// turbo
6. Run migration on production

## Post-Migration
7. Verify production data
8. Update schema documentation
9. Commit migration files
```

**Registration**: Add entry to `.agent/manifest.json`:
```json
{ "name": "db-migrate", "file": "workflows/db-migrate.md" }
```

### 4. Commands

Commands are slash-invokable actions.

**Location**: `.agent/commands/<name>.md`

**Structure**:
```markdown
---
description: Generate API documentation from route definitions
---

# /api-docs

## Usage
```
/api-docs [--format openapi|markdown] [--output <path>]
```

## Steps
1. Scan route definitions
2. Extract endpoint metadata
3. Generate documentation
4. Write to output path
```

## Loading Rules Integration

For advanced plugins, register them in `engine/loading-rules.json` so the intelligent router knows when to load them:

```json
{
  "domain": "python-development",
  "keywords": ["python", "fastapi", "django", "flask", "pip"],
  "loadAgents": ["python-specialist"],
  "loadSkills": ["api-patterns", "testing-patterns"],
  "contextBudget": {
    "maxAgents": 2,
    "maxSkills": 4
  }
}
```

## Manifest Integrity

After adding any plugin, update these files to maintain integrity:

| File | What to Update |
|:-----|:---------------|
| `.agent/manifest.json` | Add entry + increment count |
| `README.md` | Update badge + section count |
| `.agent/rules.md` | Update section heading count + table |
| `bin/ag-kit.js` | Update CLI banner count |

Then run `npm test` — the structural integrity tests will verify consistency.

## Best Practices

1. **One concern per plugin** — each agent/skill should handle one domain
2. **Rich frontmatter** — include name, description, version, and trigger keywords
3. **Examples over theory** — show code patterns, not just principles
4. **Version your plugins** — use semver in frontmatter for tracking
5. **Test integration** — run `npm test` after adding any plugin
