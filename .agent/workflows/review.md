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

| Commit Type | Gates Required | Rationale |
| :--- | :--- | :--- |
| `feat` | All 5 gates | New features need full pipeline |
| `fix` | All 5 gates | Fixes must not introduce regressions |
| `refactor` | All 5 gates | Structural changes need full validation |
| `perf` | Gates 1, 2, 5 | Performance changes need lint + types + build |
| `test` | Gate 3 only | Test-only changes need test verification |
| `docs` | Skip | Documentation doesn't need code review gates |
| `chore` | Skip | Tooling changes don't need review pipeline |

---

## Critical Rules

1. Sequential — each gate must pass before next
2. Stop on failure — show error + fix suggestion
3. No overrides — failed gates block merge
4. Full-stack scanning

---

## Pipeline Gates

Execute IN ORDER. Stop at first failure. Each gate: run command → record pass/fail → on failure: show exact error + concrete fix suggestion.

| Gate | Command | Pass Condition | Failure Action |
| :--- | :--- | :--- | :--- |
| G1: Lint | `npm run lint` / `ruff check .` / `cargo clippy` | Zero errors | Show errors + file:line + fix → stop |
| G2: Type Check | `npx tsc --noEmit` / `mypy .` | Zero type errors | Show type errors → stop |
| G3: Tests | `npm test` / `pytest` / `cargo test` | All pass, coverage ≥ 80% | Show failures + coverage delta → stop |
| G4: Security | `npm audit --audit-level=moderate` / `pip-audit` | No new CRITICAL/HIGH | Show CVEs + affected packages → stop |
| G5: Build | `npm run build` / `cargo build --release` | Exit code 0 | Show build errors → stop |

> **Cached results**: If `/test` ran immediately before `/review` (same session, no file changes since), Gate 3 may use cached results — note in output.

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
## 🔍 Review Complete

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

- [ ] Scope Filter evaluated — correct set of gates for this commit type
- [ ] All required gates executed in order
- [ ] Each gate: command run, result recorded
- [ ] On failure: exact error shown with concrete fix suggestion
- [ ] All gates passed (or scope-excluded gates documented as skipped)
- [ ] Cached results noted if Gate 3 used prior `/test` results

---

## Failure Output

> Use when: a gate fails and cannot be immediately remediated.

```markdown
## Review — GATE FAILURE

**Failed Gate**: G{N} — {Gate Name}
**Commit Type**: {type} | **Rigor Profile**: {strict/standard/minimal}

### Error Details

```
{exact command output — never truncated}
```

### Concrete Fix

{file:line reference with specific fix instruction}

### Gates Remaining

| Gate | Status |
| :--- | :----- |
| G1 Lint | {Pass / Not Run} |
| G2 Type Check | {Pass / Not Run} |
| G3 Tests | {Pass / Not Run} |
| G4 Security | {Pass / Not Run} |
| G5 Build | {Pass / Not Run} |

**Re-run**: `/review` after fix applied to resume from failed gate.
```

---

## Related Resources

- **Previous**: `/test` · **Next**: `/preflight` · `/pr`
- **Skill**: `.agent/skills/verification-loop/SKILL.md`
