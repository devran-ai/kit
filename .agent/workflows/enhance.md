---
description: Add or update features in existing application. Iterative development.
args: feature description
version: 2.1.0
sdlc-phase: build
skills: [clean-code, testing-patterns, project-docs-discovery]
commit-types: [feat, refactor]
---

# /enhance — Iterative Feature Development

> **Trigger**: `/enhance [description]`
> **Lifecycle**: Build — after `/plan` or ad-hoc for minor updates

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. Preserve existing functionality — never break what works
2. Regression check mandatory after every change
3. User approval for changes affecting >5 files
4. Incremental approach — small, verifiable changes
5. Follow existing conventions — consult project architecture and design system docs before modifying
6. Document user-facing changes

---

## Steps

// turbo
1. **Understand State** — explore structure, review features/stack/conventions, identify relevant files

// turbo
2. **Impact Analysis** — affected files, dependencies, regression risk, breaking changes

// turbo
2.5. **Consult Project Docs** — scan `docs/` for architecture and design system docs. Reference constraints before modifying existing code.

3. **Present Plan** (for >5 files) — show scope, affected areas, risk level. Wait for approval.

4. **Implement** — follow existing patterns, apply incrementally

// turbo
5. **Regression Check** — tests, build, lint, type-check

6. **Document** — update inline docs, README if user-facing, changelog if applicable

---

## Output Template

```markdown
## Enhancement: [Feature]

| Action | File | Description |
| :--- | :--- | :--- |
| Modified/Created | `path` | [what] |

- **Risk**: Low/Medium/High
- **Regression**: tests/build/lint passing

**Next**: `/test` or `/preview`
```

---

## Governance

**PROHIBITED:** Breaking existing functionality · large changes without impact analysis · skipping regression checks

**REQUIRED:** Impact analysis · user approval for >5 files · regression check · documentation updates

---

## Completion Criteria

- [ ] Impact analysis complete
- [ ] Changes implemented following patterns
- [ ] Regression check passed
- [ ] Documentation updated

---

## Related Resources

- **Previous**: `/plan` · **Next**: `/test` · `/preview`
- **Skill**: `.agent/skills/clean-code/SKILL.md`
