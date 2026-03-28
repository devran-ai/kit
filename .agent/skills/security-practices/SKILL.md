---
name: security-practices
description: Application security best practices including Zero Trust principles, OAuth 2.0 / OpenID Connect flows, API security, supply chain security, and vulnerability prevention
triggers: [context, security, auth, vulnerability]
---

# Security Practices Skill

> **Purpose**: Apply security best practices to protect applications

## Sub-Resources

| File | Purpose |
| :--- | :--- |
| `owasp-checklist.md` | OWASP Top 10 with detection commands, vulnerable code patterns, fix patterns per item |

---

---

## Core Security Checklist

Apply OWASP Top 10 mitigations on every project: parameterized queries (injection), strong auth + MFA + rate limiting (broken auth), encryption at rest/transit (sensitive data), disable XML external entities (XXE), verify permissions every request (broken access), security headers + remove defaults (misconfig), sanitize output + CSP (XSS), validate input types (insecure deserialization), keep deps updated (components), log security events (logging).

---

## Authentication

- **Passwords**: bcrypt (cost factor 12) or Argon2. Never store plaintext.
- **JWT**: Short-lived access tokens (15min), longer refresh tokens (7d) stored in httpOnly/Secure/SameSite cookies. Access tokens in memory only.
- **MFA**: Require for admin and sensitive operations.

---

## Input Validation & Output Sanitization

- Never trust user input. Use parameterized queries (ORMs, prepared statements).
- Sanitize output with DOMPurify or equivalent. Never `innerHTML = userInput`.
- Validate with schema libraries (Zod, Joi) at API boundaries.

---

## Security Headers

Use `helmet()` middleware or set manually: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (includeSubDomains), `Content-Security-Policy: default-src 'self'`.

---

## Secrets Management

- Never commit secrets. Use environment variables or secret managers (AWS Secrets Manager, HashiCorp Vault).
- `.env.example` with placeholder keys, `.env` in `.gitignore`.
- Rotate secrets on schedule (90d max) and immediately on compromise.

---

## Zero Trust Principles

Apply: never trust/always verify, least privilege (RBAC/ABAC), assume breach (encrypt + segment), micro-segmentation (mTLS between services), continuous validation (short TTL sessions, step-up auth), device trust (compliance checks).

---

## OAuth 2.0 / OpenID Connect — Flow Selection

| Client Type | Flow |
|:---|:---|
| SPA | Authorization Code + PKCE |
| Server web app | Authorization Code |
| Mobile / Desktop | Authorization Code + PKCE |
| Machine-to-Machine | Client Credentials |
| Legacy (avoid) | Implicit (deprecated) |

**Token storage**: Never localStorage (XSS). Refresh tokens in httpOnly/Secure/SameSite cookies. Access tokens in memory. All public clients MUST use PKCE (RFC 7636).

---

## API Security

**Rate limiting**: Per-endpoint (expensive ops), per-user (fair usage), sliding window, token bucket, IP-based (unauthenticated). Use `express-rate-limit` or equivalent.

**API keys**: Rotate 90d max, scope to endpoints/methods/IPs, never in client code, separate per environment, log usage.

**Request signing**: HMAC-SHA256 with timestamp to prevent tampering and replay.

**Versioning**: Deprecate old versions lacking security controls. Same auth on all versions.

---

## Supply Chain Security

- `npm audit --audit-level=high` on every CI build
- Always commit lockfiles; use `npm ci` in CI
- Review lockfile diffs in PRs
- Pin exact versions in production (no `^` or `~`)
- Use Dependabot/Renovate for controlled updates
- Verify package publisher/download counts before installing
- Guard against typosquatting (character swaps, hyphen confusion, scope squatting)
- Consider Socket.dev or Snyk for malicious package detection

---

## Quick Reference

| Practice | Implementation |
|:---------|:-------------|
| Passwords | bcrypt/Argon2 |
| Tokens | Short-lived JWT + refresh |
| SQL | Parameterized queries |
| XSS | Sanitize + CSP |
| HTTPS | TLS 1.3, HSTS |
| Secrets | Env vars, vaults |
| Dependencies | npm audit, pin, Snyk |
| Logging | Audit trail, no PII |
| Zero Trust | Verify every request |
| OAuth 2.0 | Auth Code + PKCE |
| API Keys | Scoped, rotated, logged |
| Supply Chain | Lockfile, pin, audit |
