---
description: Fix linting, type errors, or compilation issues
uses: [verification-loop]
---

# /fix Command

Automatically identify and fix code quality issues. Runs diagnostic tools, applies auto-fixes, and handles remaining issues with targeted edits.

## Usage

| Command | Action |
| :--- | :--- |
| `/fix` | Fix all issues in current scope |
| `/fix [path]` | Fix issues in specific file or directory |
| `/fix lint` | Fix linting errors only |
| `/fix types` | Fix TypeScript/type errors only |
| `/fix all` | Fix lint + types + compilation |
| `/fix --auto` | Apply all safe auto-fixes without confirmation |

## Examples

```
/fix
/fix src/services/user.service.ts
/fix lint
/fix types
/fix all --auto
```

## Diagnostic Flow

1. Run tool (`eslint --fix` / `tsc --noEmit` / `ruff --fix`)
2. Classify: auto-fixable vs requires-manual-edit
3. Apply auto-fixes first
4. For remaining: show exact error + file:line + concrete fix
5. Verify zero errors after all fixes

## Output Preview

```
## Fix Results: src/services/

Auto-fixed: 12 issues (unused imports, formatting)
Manual fixes: 2 issues
  - user.service.ts:45 — TS2345: Argument of type 'string' not assignable
    Fix: Change param type from string to string | null
  - auth.service.ts:78 — no-explicit-any: Replace 'any' with UserPayload

Verification: ✅ Zero errors
```

## Related Commands

`/review` — full quality gate pipeline · `/debug` — for runtime errors · `build-error-resolver` agent — for complex build failures
