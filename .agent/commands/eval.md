---
description: Run evaluation metrics on code quality and performance
uses: [eval-harness]
---

# /eval Command

Evaluate and measure code quality, performance, and project health metrics. Uses the `eval-harness` skill.

## Usage

| Command | Action |
| :--- | :--- |
| `/eval` | Full evaluation — all metrics |
| `/eval [metric]` | Evaluate specific metric |
| `/eval --compare` | Compare against previous evaluation |

## Examples

```
/eval
/eval code quality
/eval test coverage
/eval --compare
```

## Metrics

| Metric | Tool | Target |
| :--- | :--- | :--- |
| Test Coverage | jest/pytest | ≥80% |
| Cyclomatic Complexity | eslint/radon | <10 per function |
| Bundle Size | webpack-bundle-analyzer | <200KB gz |
| API Response Time | load test | p95 <300ms |
| Type Safety | tsc strict | 0 errors |
| Code Duplication | jscpd | <5% |

## Related Commands

`/preflight` — production readiness scoring · `/review` — quality gate pipeline · `/perf` — performance-specific analysis
