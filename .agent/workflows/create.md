---
description: Create new features, components, or modules from scratch.
args: component or feature name
version: 2.1.0
sdlc-phase: build
skills: [app-builder, clean-code]
commit-types: [feat]
---

# /create — Scaffold New Features

> **Trigger**: `/create [description]`
> **Lifecycle**: Build — after `/plan` approval

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. Follow existing patterns — scan codebase before writing
2. No orphan code — every file must be imported/referenced/routed
3. Tests required for all new features
4. Stack-agnostic detection from config files
5. User approval for scaffolds creating >5 files
6. Document all exported public APIs

---

## Steps

// turbo
1. **Clarify Requirements** — component type, acceptance criteria, constraints

// turbo
2. **Detect Stack** — auto-detect from config files, identify framework/conventions

// turbo
3. **Analyze Patterns** — find similar modules, naming conventions, import patterns, reusable utils

4. **Present Plan** (for >5 files) — show file structure, integration points. Wait for approval.

5. **Implement** — follow detected conventions, SOLID principles, wire up imports/routes

6. **Add Tests** — unit, integration, E2E as applicable

7. **Document** — JSDoc/docstrings, README updates, usage examples

---

## Output Template

```markdown
## Create: [Feature]

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

- [ ] Stack detected, patterns analyzed
- [ ] Files created and integrated
- [ ] Tests written and passing
- [ ] Documentation added

---

## Related Resources

- **Previous**: `/plan` · **Next**: `/test` · `/preview`
- **Skill**: `.agent/skills/app-builder/SKILL.md`
