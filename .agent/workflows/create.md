---
description: Create new features, components, or modules from scratch.
args: component or feature name
version: 2.1.0
sdlc-phase: build
skills: [app-builder, clean-code, project-docs-discovery]
commit-types: [feat]
---

# /create — Scaffold New Features

> **Trigger**: `/create [description]`
> **Lifecycle**: Build — after `/plan` approval

> Standards: See `rules/workflow-standards.md`

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features need scaffolding and integration |
| `refactor` | Optional | Only when creating new modules during restructure |
| `fix` | Skip | Fixes don't require new scaffolding |
| `docs` | Skip | Documentation doesn't need create workflow |

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/create [description]` | Scaffold new feature or component from description |
| `/create [description] --scaffold-only` | Generate file structure plan only, no implementation |
| `/create [description] --stack [name]` | Override auto-detected stack (e.g., `--stack nextjs`) |
| `/create [description] --dry-run` | Show scaffold plan for approval without creating files |

---

## Critical Rules

1. Follow existing patterns — scan codebase and project design system docs before writing
2. No orphan code — every file must be imported/referenced/routed
3. Tests required for all new features
4. Stack-agnostic detection from config files
5. User approval for scaffolds creating >5 files — present file structure plan first
6. Document all exported public APIs
7. **SOLID by default** — Single Responsibility (one reason to change), Open/Closed (extend not modify), Dependency Inversion (depend on abstractions)
8. **No framework-specific code in wrong stack** — never use React hooks in Node services, never use NestJS decorators in frontend

---

## Steps

// turbo
1. **Clarify Requirements** — component type, acceptance criteria, constraints

// turbo
2. **Detect Stack** — auto-detect from config files, identify framework/conventions

// turbo
3. **Analyze Patterns** — find similar modules, naming conventions, import patterns, reusable utils

// turbo
3.5. **Consult Project Docs** — scan `docs/` for design system, architecture, and guidelines. Reference discovered constraints (tokens, components, screen specs) when scaffolding.

4. **Present Scaffold Plan** (for >5 files) — present before writing any code:
   ```
   Files to create:
   - src/modules/[name]/[name].service.ts — business logic
   - src/modules/[name]/[name].controller.ts — API layer
   - src/modules/[name]/[name].module.ts — DI container
   - src/modules/[name]/dto/[name].dto.ts — data shapes
   - src/modules/[name]/[name].service.spec.ts — unit tests
   Integration: imported in AppModule, routes registered at /[name]
   ```
   Wait for approval before proceeding.

5. **Implement** — follow detected conventions, SOLID principles, wire up imports/routes

6. **Add Tests** — unit, integration, E2E as applicable

7. **Document** — JSDoc/docstrings, README updates, usage examples

---

## Output Template

```markdown
## ✨ Create: [Feature]

- **Stack**: [language] + [framework]
- **Files Created**: [list with purposes]
- **Integration**: [how it connects]
- **Tests**: [what's covered]

**Next**: `/test` or `/preview`
```

---

## Governance

**PROHIBITED:** Creating without checking patterns · wrong-stack scaffolding · orphan files · skipping tests

**REQUIRED:** Stack detection · pattern analysis · user approval for >5 files · test coverage · integration

---

## Completion Criteria

- [ ] Scope Filter evaluated
- [ ] Stack detected, patterns and conventions analyzed
- [ ] Scaffold plan presented and approved (if >5 files)
- [ ] Files created with SOLID principles applied
- [ ] No orphan files — all created files are imported/routed
- [ ] No framework cross-contamination
- [ ] Tests written and passing
- [ ] All exported public APIs documented

---

## Failure Output

> Use when: scaffold plan rejected, stack detection fails, or file creation blocked.

```markdown
## Create — BLOCKED

**Status**: BLOCKED
**Reason**: [Plan rejected / stack unknown / orphan file risk / framework contamination]

### Issues

| Issue | Severity | Resolution |
| :---- | :------- | :--------- |
| [issue] | HIGH / MEDIUM | [required action] |

### Revised Scaffold Plan

[Re-present updated plan after addressing rejection reasons]

**Requires explicit approval before proceeding.**
```

---

## Related Resources

- **Previous**: `/plan` · **Next**: `/test` · `/preview`
- **Skill**: `.agent/skills/app-builder/SKILL.md`
