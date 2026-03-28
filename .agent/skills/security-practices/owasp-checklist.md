# OWASP Top 10 Checklist

> **Purpose**: Per-item detection commands, vulnerable code patterns, and fix patterns for OWASP Top 10 (2021). Used by `/security-scan --owasp`.

---

## A01: Broken Access Control

**Detection**:
```bash
grep -r "role\|permission\|isAdmin\|canAccess" src/ --include="*.ts"
grep -r "req.user\|@Guard\|@Roles" src/ --include="*.ts"
```

**Vulnerable pattern**: Missing authorization on route handlers, checking roles client-side only, IDOR (direct object references without ownership check).

**Fix pattern**: Apply `@UseGuards(AuthGuard, RolesGuard)` on every protected endpoint. Verify resource ownership: `if (resource.userId !== req.user.id) throw new ForbiddenException()`.

---

## A02: Cryptographic Failures

**Detection**:
```bash
grep -r "MD5\|SHA1\|AES-ECB\|password.*=.*plain\|base64.*password" src/
grep -r "http://" src/ --include="*.ts" # non-HTTPS URLs
```

**Vulnerable pattern**: MD5/SHA1 for passwords, storing sensitive data unencrypted, HTTP instead of HTTPS, symmetric keys in code.

**Fix pattern**: Use `bcrypt` (cost 12) or `argon2` for passwords. AES-256-GCM for data at rest. TLS 1.3 for transit. Store keys in secrets manager.

---

## A03: Injection

**Detection**:
```bash
grep -r "query.*\`\|raw.*\${" src/ --include="*.ts"  # template literal SQL
grep -r "exec\|execSync\|spawn.*req\." src/  # command injection
```

**Vulnerable pattern**:
```typescript
// VULNERABLE
const user = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)
```

**Fix pattern**:
```typescript
// SAFE — parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
// Or use ORM: prisma.user.findUnique({ where: { id: userId } })
```

---

## A04: Insecure Design

**Detection**: Design review — no automated detection tool. Check during `/plan` and architecture review.

**Patterns to flag**: No rate limiting on login, no account lockout, unlimited file upload, no CSRF protection on state-changing forms.

**Fix**: Rate limiting on auth endpoints (`express-rate-limit`). Account lockout after N failures. CSRF tokens on form submissions.

---

## A05: Security Misconfiguration

**Detection**:
```bash
grep -r "DEBUG\|NODE_ENV.*development" src/ --include="*.ts"
grep -r "cors.*origin.*\*" src/  # wildcard CORS
grep -r "x-powered-by\|express.default" src/  # exposing tech stack
```

**Fix pattern**: Use `helmet()`. Remove `X-Powered-By`. Restrict CORS to known origins. Disable stack traces in production error responses.

---

## A06: Vulnerable and Outdated Components

**Detection**:
```bash
npm audit --audit-level=high
npx audit-ci --high  # CI version
```

**Fix pattern**: Run `npm audit fix` for non-breaking fixes. For breaking: evaluate upgrade path. Pin versions in production. Set up Dependabot for automated PRs.

---

## A07: Identification and Authentication Failures

**Detection**:
```bash
grep -r "expiresIn.*[0-9]d\|expiresIn.*[0-9]m" src/  # token expiry
grep -r "localStorage.*token\|sessionStorage.*token" src/  # token storage
```

**Vulnerable pattern**: Long-lived tokens (>24h access), tokens in localStorage (XSS exposure), no refresh token rotation.

**Fix pattern**: Access tokens: 15min. Refresh tokens: 7d, httpOnly/Secure/SameSite=Strict cookie. Implement refresh token rotation (one-time use).

---

## A08: Software and Data Integrity Failures

**Detection**:
```bash
# Check for unverified external scripts
grep -r "cdn\|unpkg\|jsdelivr" src/ --include="*.html"
# Check for missing SRI hashes
grep -r "<script src" --include="*.html" | grep -v "integrity="
```

**Fix pattern**: Add `integrity` attribute to all external scripts. Use lockfiles (`package-lock.json`). Verify dependency checksums in CI.

---

## A09: Security Logging and Monitoring Failures

**Detection**:
```bash
grep -r "console.log\|console.error" src/ --include="*.ts" | grep -i "password\|token\|secret"
grep -r "catch.*{}" src/ --include="*.ts"  # swallowed errors
```

**Vulnerable pattern**: Logging sensitive data, swallowing errors silently, no audit trail for auth events.

**Fix pattern**: Structured logging (no PII). Log auth events: login success/failure, token refresh, permission denied. Alert on repeated failures.

---

## A10: Server-Side Request Forgery (SSRF)

**Detection**:
```bash
grep -r "fetch\|axios\|got\|request" src/ --include="*.ts" | grep "req\.\|body\.\|params\."
```

**Vulnerable pattern**:
```typescript
// VULNERABLE — user-controlled URL
const data = await fetch(req.body.webhookUrl)
```

**Fix pattern**: Allowlist valid domains. Block private IP ranges (127.x, 10.x, 172.16-31.x, 192.168.x). Use `dns.lookup()` to verify resolved IPs before request.
