---
description: Systematic debugging workflow. Activates DEBUG mode for problem investigation.
args: error or issue description
version: 2.1.0
sdlc-phase: reactive
skills: [debugging-strategies, project-docs-discovery]
commit-types: [fix]
---

# /debug — Systematic Problem Investigation

> **Trigger**: `/debug [issue description]`
> **Lifecycle**: Reactive — any SDLC phase

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. Root cause required — never fix without understanding why
2. No guessing — form hypotheses, test systematically
3. Prevention mandatory — every fix includes recurrence prevention
4. Preserve evidence before changing anything — check project `ARCHITECTURE.md` for system design context
5. Minimal changes — fix only what's broken

---

## Steps

// turbo
1. **Gather Info** — exact error/stack trace, reproduction steps, expected vs actual

// turbo
2. **Environment** — OS, runtime versions, recent git changes, deps, config

// turbo
3. **Hypotheses** — list 3+ causes ordered by likelihood

// turbo
4. **Investigate** — test each hypothesis, check logs/data/state, eliminate definitively

5. **Fix** — minimal fix for root cause, verify resolution, confirm no regressions

6. **Prevent** — add tests, validation, guardrails, document root cause

---

## Output Template

```markdown
## Debug: [Issue]

1. **Symptom**: [error/behavior]
2. **Root Cause**: [explanation]
3. **Fix**: [changes applied]
4. **Prevention**: [tests/guardrails added]

**Next**: `/test` for regression check.
```

---

## Governance

**PROHIBITED:** Fixing without root cause · random guessing · modifying production without rollback

**REQUIRED:** Hypothesis testing · root cause documentation · prevention measures · regression verification

---

## Completion Criteria

- [ ] Issue reproduced and documented
- [ ] Root cause identified with evidence
- [ ] Fix applied and verified
- [ ] Prevention measures implemented

---

## Related Resources

- **Next**: `/test`
- **Skill**: `.agent/skills/debugging-strategies/SKILL.md`
