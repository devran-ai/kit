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

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/debug` | Interactive — ask for issue description |
| `/debug [issue description]` | Debug the described issue immediately |
| `/debug [error message]` | Debug by exact error string |
| `/debug --trace [stack trace]` | Debug from paste-in stack trace |

---

## Critical Rules

1. Root cause required — never fix without understanding why
2. No guessing — form hypotheses, test systematically
3. Prevention mandatory — every fix includes recurrence prevention
4. Preserve evidence before changing anything — check project `ARCHITECTURE.md` for system design context
5. Minimal changes — fix only what's broken

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `fix` | Required | All fixes start with systematic root cause investigation |
| `feat` | Optional | When implementing features with unexpected behavior |
| `test` | Optional | When test failures need root cause investigation |
| `refactor` | Optional | When refactors introduce regressions |
| `docs` | Skip | Documentation doesn't need debugging workflow |
| `chore` | Skip | Tooling changes use vendor-specific debugging |

---

## Steps

// turbo
1. **Gather Info** — exact error/stack trace, reproduction steps, expected vs actual

// turbo
2. **Environment Diagnostics** — collect all context before hypothesizing:
   - OS and runtime versions (`node -v`, `python --version`, etc.)
   - Recent `git log --oneline -10` — what changed in last 10 commits?
   - Dependency diffs — did lockfile change recently? (`git diff package-lock.json HEAD~5`)
   - Config and env vars — any missing, wrong, or recently changed values?

// turbo
3. **Hypotheses** — list 3+ causes ordered by likelihood

// turbo
4. **Investigate** — for each hypothesis (highest likelihood first):
   - Test with minimal reproduction case
   - Check logs, data state, network calls for supporting evidence
   - **Elimination method**: explicitly rule out each hypothesis with evidence — "Eliminated: X is not the cause because [specific evidence]"
   - **Definitive ruling**: a hypothesis is only eliminated when contradicting evidence is found, not when it "seems unlikely"

5. **Fix** — minimal fix for root cause, verify resolution, confirm no regressions

6. **Prevent** — add tests, validation, guardrails, document root cause

---

## Output Template

**Success:**
```markdown
## 🐛 Debug: [Issue]

### Investigation Summary
1. **Symptom**: [exact error/behavior observed]
2. **Environment**: [OS, runtime, relevant versions]
3. **Hypotheses Tested**:
   - H1: [description] — **ELIMINATED**: [evidence]
   - H2: [description] — **ELIMINATED**: [evidence]
   - H3: [description] — **ROOT CAUSE** ✅
4. **Root Cause**: [precise explanation]
5. **Fix Applied**: [files changed, what changed]
6. **Prevention**: [tests added, guardrails, documentation]

**Verification**: Tests pass ✅ · No regressions ✅
**Next**: `/test` for full regression check.
```

**Escalation (root cause not found after 3 cycles):**
```markdown
## 🐛 Debug Escalation Required — [Issue]

**Cycles exhausted**: 3 investigation cycles completed, root cause not confirmed.

### Investigated and Eliminated
- [hypothesis 1] — eliminated because [evidence]
- [hypothesis 2] — eliminated because [evidence]

### Remaining Candidates
- [hypothesis] — inconclusive: [what evidence is missing]

### Data Needed
[List of logs, metrics, access, or reproduction steps that would resolve ambiguity]

**Recommended next step**: [specific action for user]
```

---

## Governance

**PROHIBITED:** Fixing without root cause · random guessing · modifying production without rollback

**REQUIRED:** Hypothesis testing · root cause documentation · prevention measures · regression verification

---

## Completion Criteria

- [ ] Issue description gathered (symptom, reproduction steps, expected vs actual)
- [ ] Environment diagnostics collected (OS, runtime, recent changes, config)
- [ ] 3+ hypotheses listed and ranked by likelihood
- [ ] Each hypothesis tested with explicit evidence-based elimination
- [ ] Root cause confirmed definitively (not assumed)
- [ ] Minimal fix applied targeting root cause only
- [ ] Fix verified: issue no longer reproducible
- [ ] No regressions introduced
- [ ] Prevention measures added (tests, validation, or guardrails)
- [ ] Root cause documented for future reference

---

## Related Resources

- **Next**: `/test`
- **Skill**: `.agent/skills/debugging-strategies/SKILL.md`
