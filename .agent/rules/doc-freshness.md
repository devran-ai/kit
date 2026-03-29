# Document Freshness Rule

> **Scope**: Cross-cutting — loaded via `defaultLoad` for ALL sessions
> **Priority**: HIGH — prevents documentation drift

---

## Purpose

After code changes that affect documented architecture, features, or technical decisions, flag the corresponding documents as potentially stale. This rule ensures living documentation stays accurate.

---

## Trigger Matrix

| Code Change | Documents to Flag |
|------------|------------------|
| Architecture changes (new layers, patterns, major refactoring) | `ARCHITECTURE.md` |
| New features added or existing features modified | `PRD.md`, `ROADMAP.md` |
| Tech stack changes (new deps, framework upgrades, migrations) | `TECH-STACK-ANALYSIS.md` |
| Database schema changes (new tables, migrations, column changes) | `DB-SCHEMA.md` |
| API endpoint changes (new routes, modified contracts) | `API-SPEC.md` |
| Auth or security changes | `SECURITY-POLICY.md`, `COMPLIANCE.md` |
| UI/UX changes (new screens, navigation, design tokens) | `DESIGN-SYSTEM.md`, `SCREENS-INVENTORY.md`, `USER-JOURNEY-MAP.md` |
| Sprint completion or new sprint | `SPRINT-PLAN.md` |
| Any significant change | `CLAUDE.md` (Kit-Generated Context section) |

---

## Detection Protocol

### Automatic Detection

After file edits, check if the changes fall into any trigger category:

1. **Dependency changes**: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod` modified → flag TECH-STACK-ANALYSIS.md
2. **Migration files**: New migration created → flag DB-SCHEMA.md
3. **Route files**: API route files modified → flag API-SPEC.md
4. **Auth middleware**: Auth-related files modified → flag SECURITY-POLICY.md
5. **Component files**: New UI components created → flag DESIGN-SYSTEM.md, SCREENS-INVENTORY.md

### Flagging Format

```
[Doc Freshness] The following documents may need updating:
- ARCHITECTURE.md — reason: new service layer added
- API-SPEC.md — reason: 3 new endpoints created

Run /update-docs to review and update flagged documents.
```

---

## Integration

- Works with `doc-updater` agent for automated updates
- Integrates with `onboarding-complete` hook for initial freshness baseline
- Supports `/brownfield` refresh mode for re-evaluation
- Flags are advisory — developer decides whether to update

---

## Rules

- **Non-blocking**: Flag documents but never prevent development
- **Specific**: Always state WHY a document was flagged
- **Actionable**: Suggest which section needs review
- **Cumulative**: Multiple flags for the same document are consolidated
- **Dismissible**: Developer can acknowledge and dismiss flags
