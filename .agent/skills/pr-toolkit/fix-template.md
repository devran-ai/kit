# PR Fix Templates

> **Purpose**: Output templates for `/pr-fix` workflow — fix plan, resolution summary, and failure template.

---

## Fix Plan Template (Step 3 output)

```markdown
## Fix Plan — PR #{number}: {title}

**Total findings**: {N} ({h} human · {b} bot)

| # | Priority | Reviewer | File:Line | Finding | Planned Fix |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | P0 CRITICAL | @alice | src/auth.ts:42 | SQL injection via userId | Parameterized query |
| 2 | P1 HIGH | coderabbitai 🟠 | src/api.ts:15 | Missing error handler on async | Add try/catch + 500 response |
| 3 | P1 HIGH | @bob | src/users.ts:88 | N+1 query in list endpoint | Add eager load with relations |
| 4 | P2 MEDIUM | sonarcloud | src/dto.ts:20 | Unused import | Remove |
| 5 | P3 LOW | gemini | src/utils.ts:7 | Rename for clarity | Rename `fn` → `formatDate` |

Proceed? (`--critical-only` to fix only P0, `--dry-run` already applied)
```

---

## Resolution Summary Template (Step 8 PR comment)

```markdown
## ✅ PR Fix Complete — #{number}

**Findings addressed**: {count} ({h} human · {b} bot)
**Commits**: {count}
**Verification**: All 5 gates passed

### Fix Summary
| # | Priority | Reviewer | File:Line | Finding | Fix Applied | Commit |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | P0 CRIT | @alice | auth.ts:42 | SQL injection | Parameterized query | abc1234 |
| 2 | P1 HIGH | CodeRabbit | api.ts:15 | Missing error handler | try/catch added | def5678 |

### Diffs for Critical and High Findings

**Fix #1 — auth.ts:42** (@alice: "SQL injection via userId parameter")
```diff
- const query = `SELECT * FROM users WHERE id = ${userId}`
+ const query = `SELECT * FROM users WHERE id = $1`
+ const result = await db.query(query, [userId])
```

**Fix #2 — api.ts:15** (CodeRabbit: "Missing error handler on async route")
```diff
- router.get('/users', async (req, res) => {
-   const users = await userService.findAll()
-   res.json(users)
- })
+ router.get('/users', async (req, res) => {
+   try {
+     const users = await userService.findAll()
+     res.json(users)
+   } catch (err) {
+     res.status(500).json({ error: 'Internal server error' })
+   }
+ })
```

### Verification
| Gate | Status | Detail |
| :--- | :--- | :--- |
| Lint | ✅ Pass | 0 errors |
| Type Check | ✅ Pass | 0 errors |
| Tests | ✅ Pass | 47 passing, coverage: 84% |
| Security | ✅ Pass | No new CVEs |
| Build | ✅ Pass | Clean exit 0 |

@alice @bob — ready for re-review.
```

---

## Failure / Partial Completion Template

```markdown
## ⚠️ PR Fix Partial — #{number}

**Completed**: {n} / {total} fixes
**Blocked at**: {step name or fix number}

### Completed Fixes
| # | Priority | Reviewer | Fix Applied | Commit |
| :- | :--- | :--- | :--- | :--- |
| 1 | P0 CRIT | @alice | Parameterized query | abc1234 |

### Blocked Finding
**Fix #{N}** — {description}
**Blocker**: {exact error or reason}
**Action required**: {what the user needs to do to unblock}

### Verification Status (at point of failure)
| Gate | Status |
| :--- | :--- |
| Lint | ✅ Pass |
| Tests | ❌ Fail — {error summary} |

**Recommended next step**: {specific user action}
```
