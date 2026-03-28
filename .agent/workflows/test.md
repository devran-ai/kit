---
description: Write and run tests systematically.
args: file or feature
version: 2.1.0
sdlc-phase: verify
skills: [testing-patterns, webapp-testing, project-docs-discovery]
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

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features must have test coverage |
| `fix` | Required | Bug fixes must add regression test |
| `refactor` | Required | Refactors must not reduce existing coverage |
| `test` | Required | Test-only commits must be verified to pass |
| `perf` | Optional | Add benchmark tests for measurable changes |
| `docs` | Skip | Documentation doesn't need test coverage |
| `chore` | Skip | Tooling changes don't need tests |

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/test` | Run full test suite with coverage report |
| `/test [file or feature]` | Test specific file, module, or feature |
| `/test --coverage` | Run with coverage report, enforce ≥80% threshold |
| `/test --watch` | Watch mode — re-run on file changes |
| `/test --ci` | CI mode — fail fast, no watch, structured output for pipelines |

---

## Steps

// turbo
1. **Identify Scope** — what to test, test type, critical paths

// turbo
2. **Detect Framework** — scan for jest/vitest/pytest/cargo config

// turbo
3. **Analyze Coverage** — run existing coverage report, identify:
   - Files below 80% coverage → prioritize these
   - Critical business logic with no tests → highest priority
   - Functions/branches not covered → fill gaps systematically

4. **Write Tests** — for each test:
   - AAA pattern: Arrange (setup) → Act (call) → Assert (verify)
   - Descriptive name: `should [expected behavior] when [condition]`
   - Mandatory paths: happy path + at least one edge case + one error path
   - Boundary conditions: null/undefined, empty arrays, max values, zero
   - Mock all external dependencies (network, DB, filesystem)
   > No `test.skip()`, `xit()`, `xdescribe()` or `@pytest.mark.skip` in committed code

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
## 🧪 Test Results: [Scope]

| Metric | Value |
| :--- | :--- |
| Tests Total | [N] |
| Passing | [N] ✅ |
| Failing | [N] ❌ |
| Coverage (new code) | [N]% |
| Coverage (overall) | [N]% |

### New Tests Written
| File | Test Count | Coverage | Edge Cases |
| :--- | :--- | :--- | :--- |

> Note: If `/test` ran before `/review`, Gate 3 (coverage) may use cached results.

**Next**: `/review` for quality gates.
```

---

## Governance

**PROHIBITED:** Committed skip annotations · below 80% without justification · happy-path-only testing

**REQUIRED:** AAA pattern · coverage report · descriptive names · stack-appropriate framework

---

## Completion Criteria

- [ ] Scope Filter evaluated — tests required for this commit type
- [ ] Test scope identified and test framework detected
- [ ] Coverage report analyzed, gaps prioritized
- [ ] Tests written: AAA pattern, descriptive names
- [ ] All mandatory paths covered: happy path, edge cases, error paths
- [ ] Boundary conditions tested (null, empty, max, zero)
- [ ] No skip annotations (`test.skip`, `xit`, `xdescribe`, `pytest.mark.skip`) in committed code
- [ ] All tests passing
- [ ] Coverage ≥ 80% on new code (or documented justification if below)

---

## Failure Output

> Use when: tests fail, coverage is insufficient, or test environment is broken.

```markdown
## Test — FAILED

**Status**: BLOCKED
**Reason**: [Failing tests / coverage below threshold / environment error]

### Failing Tests

| Test | File | Error | Type |
| :--- | :--- | :---- | :--- |
| [test name] | [file:line] | [error message] | unit / integration / e2e |

### Coverage Shortfall

| File | Current | Target | Delta |
| :--- | :------ | :----- | :---- |
| [file] | [%] | 80% | [-X%] |

### Next Steps

1. Fix failing tests (do NOT comment out or skip)
2. Add tests for uncovered paths
3. Re-run `/test` to verify green

**Do not proceed to `/review` until all tests pass and coverage ≥ 80%.**
```

---

## Related Resources

- **Next**: `/review`
- **Skills**: `.agent/skills/testing-patterns/SKILL.md` · `.agent/skills/webapp-testing/SKILL.md`
