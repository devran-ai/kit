---
description: Write and run tests systematically.
version: 2.1.0
sdlc-phase: verify
skills: [testing-patterns, webapp-testing]
commit-types: [test]
---

# /test — Systematic Test Writing & Execution

> **Trigger**: `/test [scope]`
> **Lifecycle**: Verify — after implementation, before `/review`

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. **AAA pattern** — Arrange-Act-Assert for all tests
2. **Coverage >=80%** on new code
3. No `skip`/`xit`/`xdescribe` in committed code
4. Descriptive names: "should [behavior] when [condition]"
5. Always test edge cases, null/undefined, error paths
6. Stack-agnostic — detect project stack, use appropriate framework

---

## Scope Filter

Run tests for feat, fix, refactor, test. Skip docs, chore.

---

## Steps

// turbo
1. **Identify Scope** — what to test, test type, critical paths

// turbo
2. **Detect Framework** — scan for jest/vitest/pytest/cargo config

// turbo
3. **Analyze Coverage** — run report, identify gaps, prioritize

4. **Write Tests** — AAA pattern, descriptive names, happy + edge + error paths, mock externals

// turbo
5. **Run & Verify** — execute suite, verify all pass, check >=80% coverage

---

## Multi-Stack Commands

| Stack | Test | Coverage |
| :--- | :--- | :--- |
| Node/Jest | `npm test` | `npm run test:coverage` |
| Node/Vitest | `npx vitest` | `npx vitest --coverage` |
| Python | `pytest` | `pytest --cov` |
| Rust | `cargo test` | `cargo tarpaulin` |
| Go | `go test ./...` | `go test -coverprofile=cover.out` |

---

## Output Template

```markdown
## Test Results: [Scope]

| Metric | Value |
| :--- | :--- |
| Total / Passing / Failing / Coverage | [values] |

**Next**: `/review` for quality gates.
```

---

## Governance

**PROHIBITED:** Committed skip annotations · below 80% without justification · happy-path-only testing

**REQUIRED:** AAA pattern · coverage report · descriptive names · stack-appropriate framework

---

## Completion Criteria

- [ ] Tests written (AAA, descriptive names)
- [ ] All passing, coverage >=80%
- [ ] Edge cases and error paths covered

---

## Related Resources

- **Next**: `/review`
- **Skills**: `.agent/skills/testing-patterns/SKILL.md` · `.agent/skills/webapp-testing/SKILL.md`
