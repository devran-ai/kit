---
description: Run security audit and vulnerability scan
invokes: [security-reviewer]
uses: [security-practices]
---

# /security-scan Command

Scan codebase for security vulnerabilities using the `security-reviewer` agent. Covers dependencies, code patterns, secrets, and OWASP Top 10 compliance. See `.agent/rules/security.md` for standards.

## Usage

| Command | Action |
| :--- | :--- |
| `/security-scan` | Full security audit (all categories) |
| `/security-scan deps` | Dependency vulnerability scan only |
| `/security-scan code` | Code vulnerability patterns only |
| `/security-scan secrets` | Secret/credential detection only |
| `/security-scan --owasp` | Full OWASP Top 10 checklist |
| `/security-scan --strict` | Treat MEDIUM as blocking (CI-grade) |

## Examples

```
/security-scan
/security-scan deps
/security-scan secrets
/security-scan --owasp
/security-scan --strict
```

## Checks Performed

| Category | What's Scanned |
| :--- | :--- |
| Dependencies | CVEs via `npm audit` / `pip-audit` / `cargo audit` |
| Secrets | Hardcoded keys, tokens, passwords in code and git history |
| Injection | SQL, command injection, path traversal risks |
| XSS | Unescaped output, unsafe innerHTML, `dangerouslySetInnerHTML` |
| Auth/AuthZ | Broken access control, missing auth guards, JWT weaknesses |
| Data Exposure | Unencrypted PII, sensitive data in logs, response over-exposure |
| OWASP Top 10 | All 10 categories checked when `--owasp` flag used |

## Output Preview

```
## Security Scan Results

| Severity | Count | Category |
| :--- | :--- | :--- |
| CRITICAL | 1 | Hardcoded API key in src/config/api.ts:12 |
| HIGH | 2 | Missing input validation on /api/users POST |
| MEDIUM | 3 | Dependency CVEs (lodash 4.17.20) |
| LOW | 5 | Minor code patterns |

CRITICAL findings must be resolved before commit.
```

## Related Commands

`/review` — includes security as Gate 4 · `/preflight` — includes D5 security domain · `/pr-fix` — fix security findings from review
