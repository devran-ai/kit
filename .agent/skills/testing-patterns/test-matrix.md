# Test Selection Matrix

> **Purpose**: Which test types to write for each file type, coverage strategy, and edge case catalog by domain.

---

## Test Type Selection Matrix

| File Type | Unit | Integration | E2E | Reason |
| :--- | :--- | :--- | :--- | :--- |
| Service / business logic | ✅ Required | ✅ Required | ❌ Skip | Core logic needs unit isolation + DB integration |
| Controller / API handler | ⚠️ Optional | ✅ Required | ✅ For critical flows | Integration tests cover realistic request/response |
| Repository / data access | ❌ Skip | ✅ Required | ❌ Skip | Test against real DB schema, not mocked queries |
| Utility / pure function | ✅ Required | ❌ Skip | ❌ Skip | Pure functions = unit test only |
| React component (display) | ✅ Required | ❌ Skip | ⚠️ Optional | Render + interaction unit tests sufficient |
| React component (with state/API) | ✅ Required | ✅ Recommended | ⚠️ Optional | Test state transitions + API calls |
| Auth middleware / guard | ✅ Required | ✅ Required | ❌ Skip | Unit: logic; Integration: real token validation |
| Database migration | ❌ Skip | ✅ Required | ❌ Skip | Run against test DB, verify schema changes |
| CLI / script | ✅ Required | ⚠️ Optional | ❌ Skip | Unit test command parsing + logic |
| Critical user flow (checkout, auth) | ❌ Skip | ⚠️ Optional | ✅ Required | E2E validates full user journey |

---

## Coverage Strategy by File Type

| File Type | Target | Minimum | Priority Areas |
| :--- | :--- | :--- | :--- |
| Business logic service | 90%+ | 80% | All branches, error paths, null cases |
| API controller | 85%+ | 75% | All status codes, validation failures |
| Utility functions | 95%+ | 90% | All branches (usually easy to achieve) |
| React component | 80%+ | 70% | User interactions, conditional renders |
| Auth/security code | 95%+ | 90% | All auth failure modes |
| Migration | N/A | N/A | Functional test, not line coverage |

---

## Edge Case Catalog by Domain

### Authentication
- ✅ Valid credentials → success
- ✅ Wrong password → 401 (not 500)
- ✅ Non-existent user → 401 (same as wrong password — no user enumeration)
- ✅ Expired token → 401 with specific error code
- ✅ Malformed JWT → 401
- ✅ Token for deleted user → 401
- ✅ Concurrent login sessions
- ✅ Refresh token rotation — old token rejected after use

### Data Validation
- ✅ Empty string where required
- ✅ Null/undefined input
- ✅ Max length exceeded
- ✅ Invalid type (number where string expected)
- ✅ Special characters: `<>'"&\;`
- ✅ Unicode edge cases: emoji, RTL text
- ✅ Whitespace-only input

### Database Operations
- ✅ Record not found → 404 (not 500)
- ✅ Duplicate constraint violation → 409
- ✅ Foreign key violation → 400 with helpful message
- ✅ Transaction rollback on partial failure
- ✅ Concurrent write conflicts

### API Endpoints
- ✅ Missing required fields → 400 with field names
- ✅ Extra unknown fields → ignored (not 400)
- ✅ Correct content-type → success
- ✅ Wrong content-type → 415 or graceful handling
- ✅ Rate limit exceeded → 429
- ✅ Large payload (>max size) → 413

### File Operations
- ✅ File not found → clear error
- ✅ Permission denied
- ✅ Disk full
- ✅ Invalid file type (if validated)
- ✅ Zero-byte file

### Async Operations
- ✅ Success case
- ✅ Timeout
- ✅ Network error
- ✅ Partial success (some items in batch fail)
- ✅ Retry after failure

---

## Boundary Conditions (Always Test)

| Type | Values to Test |
| :--- | :--- |
| Numeric | 0, 1, -1, MAX_INT, MIN_INT, NaN, Infinity |
| String | "", " ", very long string (>1000 chars), null, undefined |
| Array | [], [single item], [many items], null |
| Date | epoch 0, far future, invalid date string, timezone edges |
| Boolean | true, false, truthy non-boolean, falsy non-boolean |
