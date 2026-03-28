---
name: performance
description: Performance budgets, regression prevention, and optimization mandates
---

# Performance Rules

> **Priority**: HIGH — Applied to all tasks affecting runtime behavior

---

## Performance Budgets

| Metric | Target | Hard Limit | Measurement |
| :--- | :--- | :--- | :--- |
| JavaScript bundle (initial) | < 150KB gzipped | < 200KB gzipped | `npx bundlesize` or build output |
| API response (read, p95) | < 200ms | < 300ms | Load testing or APM |
| API response (write, p95) | < 400ms | < 500ms | Load testing or APM |
| Largest Contentful Paint | < 2.0s | < 2.5s | Lighthouse or Web Vitals |
| Cumulative Layout Shift | < 0.05 | < 0.1 | Lighthouse or Web Vitals |
| Interaction to Next Paint | < 150ms | < 200ms | Lighthouse or Web Vitals |
| Page load (full) | < 2.5s | < 3.0s | Lighthouse or DevTools |
| Memory per process | < 256MB | < 512MB | Runtime profiling |

---

## Regression Prevention

- **CI gate**: Bundle size delta must be checked in CI — reject PRs that exceed budget without justification
- **Baseline requirement**: Measure performance BEFORE and AFTER changes — never ship without comparison
- **Lighthouse budget**: Maintain Lighthouse performance score >= 90 for user-facing pages
- **No premature optimization**: Profile first, optimize second — never optimize without measurement data

---

## Query & Data Performance

- **N+1 prevention**: Flag any loop containing a database query — use batch/join instead
- **Index mandate**: Every WHERE/ORDER BY/JOIN column must have an index or documented exception
- **Connection pooling**: Required for all database connections — no ad-hoc connections in hot paths
- **Pagination required**: All list endpoints must support pagination (limit + offset or cursor-based)

---

## Frontend Performance

- **Lazy loading**: Routes and heavy components must use dynamic imports / code splitting
- **Image optimization**: Use responsive images (srcset), next-gen formats (WebP/AVIF), lazy loading for below-fold
- **Caching strategy**: Set Cache-Control headers for static assets (immutable for hashed files, max-age for others)
- **Tree-shaking**: Import only what's needed — no barrel file re-exports of entire modules in hot paths

---

## Memory & Resource Management

- **Memory leak prevention**: Cleanup event listeners, intervals, subscriptions in component teardown
- **Resource budgets**: Monitor and limit concurrent connections, open file handles, active timers
- **Streaming for large data**: Use streams (not buffers) for files > 10MB — never load entire large files into memory

---

## Cross-References

- **Agent**: `performance-optimizer` — invoked for performance-sensitive tasks
- **Skill**: `.agent/skills/performance-profiling/SKILL.md`
- **Domain enhancer**: `.agent/skills/plan-writing/domain-enhancers.md` (Performance Domain section)
