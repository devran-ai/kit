---
description: Refactor code for better quality
workflow: enhance
---

# /refactor Command

Refactor code to improve quality, maintainability, and structure without changing behavior. Dispatches to the `/enhance` workflow. See `.agent/workflows/enhance.md` for full process.

## Usage

| Command | Action |
| :--- | :--- |
| `/refactor [file]` | Refactor a specific file |
| `/refactor extract [description]` | Extract function/component/module |
| `/refactor rename [old → new]` | Rename symbol with all references updated |
| `/refactor cleanup [scope]` | Remove dead code, unused imports, stale patterns |
| `/refactor --dry-run [description]` | Show impact analysis without making changes |

## Examples

```
/refactor src/services/user.service.ts
/refactor extract common validation logic from auth and user controllers
/refactor rename UserDto → CreateUserDto
/refactor cleanup unused imports in utils/
/refactor --dry-run extract payment logic from checkout.ts
```

## Execution Cycle

VERIFY → APPLY → VERIFY → COMMIT:
1. **Verify before**: run tests — confirm baseline is green
2. **Apply refactor**: minimal targeted change
3. **Verify after**: run tests + lint + type-check — confirm no regressions
4. **Commit**: atomic commit per refactor operation

> No refactoring without green tests before AND after.

## Process (see workflow for full detail)

1. Analyze current state and impact (affected files, dependencies, regression risk)
2. If `--dry-run`: present impact analysis and stop
3. Implement refactor incrementally
4. Run regression check after each change (test → lint → type-check)
5. Document any API changes

## Output Preview

```
## Refactor: Extract validation logic

| Action | File | Description | Risk |
| :--- | :--- | :--- | :--- |
| Created | src/utils/validation.ts | Common validation functions | Low |
| Modified | src/auth/auth.service.ts | Import from validation util | Low |
| Modified | src/users/user.service.ts | Import from validation util | Low |

Breaking Changes: No
Regression: Tests ✅ · Lint ✅ · Types ✅
```

## Related Commands

`/fix` — fix specific lint/type errors · `/enhance` — add new functionality · `refactor-cleaner` agent — dead code removal
