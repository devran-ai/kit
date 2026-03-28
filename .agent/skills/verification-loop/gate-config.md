# Verification Gate Configuration

> **Purpose**: Gate definitions, thresholds, skip conditions, and rigor profile integration for the verification loop.

---

## Gate Definitions

| Gate | ID | Command(s) | Pass Condition | Failure Behavior |
| :--- | :--- | :--- | :--- | :--- |
| Lint | G1 | `npm run lint` / `ruff check .` / `cargo clippy` / `golangci-lint run` | 0 errors (warnings OK) | Show file:line + fix, stop pipeline |
| Type Check | G2 | `npx tsc --noEmit` / `mypy .` / `pyright .` | 0 type errors | Show errors + fix, stop pipeline |
| Tests | G3 | `npm test` / `pytest` / `cargo test` / `go test ./...` | All pass, coverage ≥ threshold | Show failures + coverage delta, stop |
| Security | G4 | `npm audit --audit-level=moderate` / `pip-audit` / `cargo audit` | No new CRITICAL or HIGH | Show CVEs + packages, stop pipeline |
| Build | G5 | `npm run build` / `python -m build` / `cargo build --release` / `go build ./...` | Exit code 0 | Show build errors, stop pipeline |

---

## Coverage Thresholds

| Rigor Profile | Threshold | Behavior |
| :--- | :--- | :--- |
| strict | ≥80% enforced | Below 80% = gate failure |
| standard (default) | ≥80% target, ≥60% minimum | 60-79% = warning; below 60% = gate failure |
| minimal | Not checked | Gate 3 = tests pass only, no coverage check |

---

## Rigor Profiles

| Profile | Context | Gates Active | Coverage | Security Level |
| :--- | :--- | :--- | :--- | :--- |
| **strict** | Production, security-sensitive, pre-deploy | G1-G5, all mandatory | 80%+ enforced | Any CRITICAL/HIGH = block |
| **standard** | Normal development (default) | G1-G5 | 80% target, 60% minimum | CRITICAL = block, HIGH = warn |
| **minimal** | Prototyping, spikes, exploration | G1 (lint) + G5 (build) | Skipped | Secrets scan only |

Profile is selected per session context. Default: **standard**. Automatically elevated to **strict** when:
- Branch target is `main`/`master`/`production`
- `/preflight` or `/deploy` workflow active
- Files containing auth, payment, or PII handling are modified

---

## Skip Conditions

| Condition | Gates Skippable | Reason |
| :--- | :--- | :--- |
| `commit-type: docs` | G1-G5 (all) | Documentation changes don't need code gates |
| `commit-type: chore` | G2, G3, G5 | Tooling changes skip type-check, tests, build |
| `commit-type: test` | G1, G2, G4, G5 | Test-only → run G3 (tests) only |
| Files: only `*.md`, `docs/` | G1-G5 (all) | Markdown-only changes skip pipeline |
| `/preflight --quick` | G2, G3, G5 | Quick scan skips type-check, tests, build |

Skipped gates must be documented in output: "Gate G2 (Type Check): Skipped — commit type: docs"

---

## Cached Results

If `/test` ran within the same session before `/review`:
- Gate G3 (Tests) may use cached results
- Cache valid for: same file set, no new changes since test run
- Always note in output: "Gate G3: Using cached results from [timestamp]"
- Cache invalidated when: any source file modified after last test run
