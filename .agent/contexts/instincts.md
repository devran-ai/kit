# Instincts

> **Purpose**: Living document recording learned patterns with confidence scores. Read by the planner at Step 1 — patterns ≥70 confidence are auto-applied as plan constraints.
>
> Format: each row = one learned instinct. Updated by `/learn --instinct` or retrospective discoveries.

---

## Schema

| Field | Description |
| :--- | :--- |
| Pattern | What to do (imperative rule) |
| Trigger | When this applies (domain/context) |
| Confidence | 0-100 (≥70 = planner auto-applies) |
| Domain | Affected domain(s) |
| Source | How it was learned |
| Last Applied | Date last used |

---

## Instincts

| Pattern | Trigger | Confidence | Domain | Source | Last Applied |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Always parameterize database queries — never use string interpolation | SQL query construction | 100 | security, database | OWASP A03 | - |
| Run tests before AND after refactoring — not just after | Any refactor operation | 95 | testing | VERIFY-APPLY-VERIFY pattern | - |
| Validate JWT tokens on every request — don't trust cached auth state | Auth middleware, protected routes | 95 | security, auth | Zero Trust principle | - |
| Create service abstraction layer for all third-party integrations — never call SDK directly in business logic | External service integration | 90 | architecture | Maintainability + testability | - |
| Write the test for the edge case first when fixing a bug — confirms root cause and prevents regression | Bug fix workflow | 85 | testing | TDD principle applied to debugging | - |

---

## Adding Instincts

Use `/learn --instinct "[pattern]"` to record a new high-confidence instinct during a session.

Auto-recording: When a retrospective identifies a recurring issue (same category appears in 2+ plan-quality-log entries), the planner may record it as a new instinct with confidence 70.

Confidence decay: Instincts not applied for 6 months drop 10 confidence points per review cycle. Below 50 → archived.
