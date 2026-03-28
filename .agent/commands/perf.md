---
description: Profile and optimize performance
invokes: [performance-optimizer]
uses: [performance-profiling]
---

# /perf Command

Analyze and optimize application performance. Invokes the `performance-optimizer` agent. See `.agent/rules/performance.md` for budgets.

## Usage

| Command | Action |
| :--- | :--- |
| `/perf` | Full performance audit |
| `/perf analyze [file]` | Profile specific file or component |
| `/perf bundle` | Analyze and optimize bundle size |
| `/perf web-vitals` | Check Core Web Vitals (LCP/CLS/FID) |
| `/perf api [endpoint]` | Measure API response times |

## Examples

```
/perf
/perf analyze src/pages/Dashboard
/perf bundle
/perf web-vitals
/perf api /api/users
```

## Performance Budgets (from rules/performance.md)

| Metric | Budget | Measurement |
| :--- | :--- | :--- |
| JS Bundle | <200KB gzipped | webpack-bundle-analyzer |
| API p95 | <300ms | load test |
| LCP | <2.5s | Lighthouse |
| CLS | <0.1 | Lighthouse |
| Memory | No leaks | heap profiling |

## Related Commands

`/preflight` — includes D7 performance domain · `/eval` — full metrics including performance · `/review` — Gate 4 includes performance check
