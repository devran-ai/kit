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

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/enhance` | Interactive — ask for enhancement description |
| `/enhance [description]` | Enhance based on description |
| `/enhance --dry-run [description]` | Show impact analysis only, no changes |

---

## Critical Rules

1. Preserve existing functionality — never break what works
2. Regression check mandatory after every change
3. User approval for changes affecting >5 files
4. Incremental approach — small, verifiable changes
5. Follow existing conventions — consult project architecture and design system docs before modifying
6. Document user-facing changes

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | Iterative feature development uses the enhancement workflow |
| `refactor` | Required | Structural improvements are a class of enhancement |
| `fix` | Optional | Only when fix extends or modifies feature behavior |
| `docs` | Skip | Documentation updates don't use enhancement workflow |
| `chore` | Skip | Tooling changes are out of scope |

---

## Steps

// turbo
1. **Understand State** — explore structure, review features/stack/conventions, identify relevant files

// turbo
2. **Impact Analysis** — produce 4-point assessment:
   | Dimension | Assessment |
   | :--- | :--- |
   | Affected Files | [list each file and why it's touched] |
   | Dependencies | [upstream consumers that may break] |
   | Regression Risk | Low / Medium / High with rationale |
   | Breaking Changes | Yes/No — if yes, list what breaks and migration path |

   If `--dry-run` → present this table and **STOP**.

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
## 🔧 Enhancement: [Feature]

| Action | File | Description | Risk Level |
| :--- | :--- | :--- | :--- |
| Modified/Created | `path` | [what changed] | Low/Med/High |

**Breaking Changes**: [Yes — migration path / No]
**Regression**: tests ✅ · build ✅ · lint ✅ · type-check ✅

**Next**: `/test` or `/preview`
```

---

## Governance

**PROHIBITED:** Breaking existing functionality · large changes without impact analysis · skipping regression checks

**REQUIRED:** Impact analysis · user approval for >5 files · regression check · documentation updates

---

## Completion Criteria

- [ ] Impact analysis complete: affected files, dependencies, regression risk, breaking changes
- [ ] Breaking changes identified with migration path (or confirmed none)
- [ ] User approval received if >5 files affected
- [ ] Changes implemented following existing patterns
- [ ] Regression check passed: tests, build, lint, type-check
- [ ] Documentation updated for user-facing and API changes

---

## Failure Output

> Use when: high regression risk detected, breaking changes unresolved, or plan rejected.

```markdown
## Enhance — BLOCKED

**Status**: BLOCKED
**Reason**: [High regression risk / breaking changes without migration / plan rejected]

### Risk Assessment

| Change | Risk Level | Issue | Required Action |
| :----- | :--------- | :---- | :-------------- |
| [change] | HIGH | [issue] | [action] |

### Breaking Changes Requiring Resolution

[List any breaking changes with proposed migration path]

**Do not implement until risk assessment approved.**
```

---

## Related Resources

- **Previous**: `/plan` · **Next**: `/test` · `/preview`
- **Skill**: `.agent/skills/clean-code/SKILL.md`
