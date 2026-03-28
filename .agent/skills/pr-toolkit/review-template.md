# PR Review Output Template

> **Purpose**: Standard output format for the `/pr-review` workflow. Every finding follows this structure.

---

## Review Report Structure

```markdown
## PR #{number} Review — {2-5 word content summary}

| Field | Value |
| :--- | :--- |
| PR | #{number} — {title} |
| Branch | {head} → {base} |
| Size | {XS/S/M/L/XL} ({files} files, +{add}/-{del} LOC) |
| Round | {Round 1 / Round N — X of Y prior findings addressed} |
| Verdict | {APPROVE / REQUEST_CHANGES / COMMENT} |

### Existing Reviewer Comments
| Reviewer | Type | Comments | Response |
| :--- | :--- | :--- | :--- |
| @reviewer | Human | N findings | Agreed/Challenged/Acknowledged |
| coderabbitai | Bot | N findings | Referenced/Amplified |

### Assessment Summary
| Perspective | Status | Findings |
| :--- | :--- | :--- |
| PR Hygiene | ✅/⚠️/❌ | N |
| Branch Strategy | ✅/⚠️/❌ | N |
| Code Quality | ✅/⚠️/❌ | N |
| Security | ✅/⚠️/❌ | N |
| Testing | ✅/⚠️/❌ | N |
| Architecture | ✅/⚠️/❌ | N |

---

### 🔴 CRITICAL (blocks merge)
**[N]. {Title}** — `{file}:{line}`
> {quoted code that has the issue}

**Why**: {precise impact explanation — data loss / security risk / crash scenario}
**Fix**: {concrete fix with code example if applicable}

---

### 🟠 HIGH (should fix)
**[N]. {Title}** — `{file}:{line}`
> {quoted code}

**Why**: {impact}
**Fix**: {concrete fix}

---

### 🟡 MEDIUM (consider fixing)
**[N]. {Title}** — `{file}:{line}`
**Why**: {impact}
**Fix**: {concrete suggestion}

---

### 🔵 LOW / NIT
- `{file}:{line}` — {brief observation}

---

### ✅ What's Good
- **{Title}** (`{file}:{line}`) — {specific positive observation}
- **{Title}** (`{file}`) — {specific positive observation}
- **{Title}** — {specific positive observation}

(Minimum 3 observations with file paths for non-trivial PRs)

---

## Verdict: {APPROVE / REQUEST_CHANGES / COMMENT}

{1-2 sentence justification referencing specific findings or absence thereof}
```

---

## Finding Format Rules

1. **Title**: Imperative, specific (not "Code Issue" but "Missing null check on user.id before DB query")
2. **File:line**: Always exact — `src/auth/auth.service.ts:42`
3. **Quoted code**: 1-3 lines max, the exact problematic code
4. **Why**: Impact, not just description — "This allows SQL injection if userId comes from user input"
5. **Fix**: Actionable — code snippet preferred, description acceptable for complex fixes
6. **No severity-by-perspective**: Group ALL CRITICAL together, not "Security CRITICAL" separate from "Code Quality CRITICAL"

---

## Verdict Decision Table

| Condition | Verdict |
| :--- | :--- |
| 0 CRITICAL + 0 HIGH | APPROVE |
| 0 CRITICAL + 1-2 HIGH | COMMENT (request consideration) |
| Any CRITICAL OR 3+ HIGH | REQUEST_CHANGES |
| Clean PR, nothing to flag | APPROVE with "What's Good" only |
