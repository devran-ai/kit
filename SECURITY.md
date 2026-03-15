# Security Policy

## Supported Versions

| Version | Supported          |
| :------ | :----------------- |
| 2.1.x   | ✅ Yes             |
| 2.0.x   | ⚠️ Security fixes only |
| < 2.0   | ❌ No              |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public issue
2. Email: **info.emredursun@gmail.com** with subject: `[SECURITY] antigravity-ai-kit`
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix**: Within 30 days for critical issues

## Security Measures in the Kit

- Secret detection pre-commit hook (`.githooks/pre-commit`)
- Security scan test suite (`tests/security/injection-scan.test.js`)
- Prompt injection detection
- No runtime dependencies (reduced attack surface)
- No network calls from the kit itself

## Scope

This policy covers:
- The `antigravity-ai-kit` npm package
- The `create-antigravity-app` scaffolder
- GitHub Actions workflows in this repository

This policy does **not** cover:
- Third-party MCP servers
- User-created agents, skills, or commands
- IDE extensions that consume the kit
