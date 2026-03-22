---
description: Code review workflow. Sequential quality gate pipeline — lint, type-check, test, security scan, and build verification.
version: 2.1.0
sdlc-phase: verify
skills: [verification-loop]
commit-types: [fix, refactor]
---

# /review — Code Review Quality Gate

> **Trigger**: `/review` (full) · `/review lint` · `/review tests` · `/review security` · `/review build`
> **Lifecycle**: After implementation, before `/pr`

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Sequential gate pipeline — each step must pass before proceeding. No overrides.

---

## Scope Filter

Full review for feat, fix, refactor. Gate 3 only for test. Skip docs, chore.

---

## Critical Rules

1. Sequential — each gate must pass before next
2. Stop on failure — show error + fix suggestion
3. No overrides — failed gates block merge
4. Full-stack scanning

---

## Pipeline Gates

Execute IN ORDER. Stop at first failure.

### Gate 1: Lint
// turbo
```bash
npm run lint  # or ruff check . / cargo clippy
```

### Gate 2: Type Check
// turbo
```bash
npx tsc --noEmit  # or mypy .
```

### Gate 3: Tests
// turbo
```bash
npm test  # or pytest / cargo test
```

### Gate 4: Security Scan
// turbo
```bash
npm audit --audit-level=moderate  # or pip-audit / cargo audit
```

### Gate 5: Build
// turbo
```bash
npm run build  # or python -m build / cargo build --release
```

---

## Output Template

```markdown
## Review Complete

| Gate | Status | Duration |
| :--- | :--- | :--- |
| Lint / Type Check / Tests / Security / Build | Pass/Fail | {time} |

**Verdict**: Ready for commit / Failed at Gate {N}
```

---

## Governance

**PROHIBITED:** Skipping gates · overriding failures · merging without all passing

**REQUIRED:** All gates for merge-ready code · document results · fix before re-run

---

## Completion Criteria

- [ ] All gates executed, zero failures
- [ ] Results documented

---

## Related Resources

- **Previous**: `/test` · **Next**: `/preflight` · `/pr`
- **Skill**: `.agent/skills/verification-loop/SKILL.md`
