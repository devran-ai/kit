---
description: Debug issues systematically
workflow: debug
---

# /debug Command

Systematically debug and fix issues using hypothesis-driven investigation. See `.agent/workflows/debug.md` for full process.

## Usage

| Command | Action |
| :--- | :--- |
| `/debug` | Interactive — ask for issue description |
| `/debug [issue description]` | Debug the described issue |
| `/debug [error message]` | Debug from exact error string |
| `/debug --trace [stack trace]` | Debug from paste-in stack trace |

## Examples

```
/debug login fails with 401 after password reset
/debug TypeError: Cannot read property 'id' of undefined at UserService:42
/debug --trace [paste stack trace here]
```

## Process (see workflow for full detail)

1. Gather exact symptom: error, reproduction steps, expected vs actual
2. Diagnose environment: OS, runtime, recent changes, config
3. Form 3+ hypotheses ranked by likelihood
4. Test and eliminate each hypothesis with evidence
5. Apply minimal fix for confirmed root cause
6. Add prevention tests/guardrails

## Output Preview

```
## Debug: TypeError at UserService:42

1. Symptom: undefined user when accessing profile
2. Root Cause: JWT token parsed but user lookup not awaited
3. Fix: Added await to findById call (auth.service.ts:67)
4. Prevention: Added test for async token validation path

Verification: Tests pass ✅
```

## Related Commands

`/fix` — for lint/type errors · `/test` — regression check · `/review` — quality gates
