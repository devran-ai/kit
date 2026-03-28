---
description: Integrate third-party services or APIs
invokes: [backend-specialist]
---

# /integrate Command

Integrate external services and APIs with proper abstraction, error handling, and security. Uses the `backend-specialist` agent.

## Usage

| Command | Action |
| :--- | :--- |
| `/integrate [service]` | Full integration of a service |
| `/integrate [service] --dry-run` | Show integration plan without implementing |

## Examples

```
/integrate Stripe for payments
/integrate SendGrid for transactional emails
/integrate AWS S3 for file storage
/integrate Firebase for push notifications
```

## Integration Checklist

For every integration:
- [ ] Service abstraction layer (not direct SDK calls in business logic)
- [ ] Environment variables for all credentials (never hardcoded)
- [ ] Error handling with retry logic and fallback
- [ ] Timeout and circuit breaker where appropriate
- [ ] Unit tests with mocked service client
- [ ] Integration test with sandbox/test credentials

## Process

1. Research service SDK/API requirements
2. Add to environment variables (`.env.example`)
3. Create service abstraction (`src/services/{name}.service.ts`)
4. Implement with error handling and retries
5. Write tests (unit with mock + integration with sandbox)

## Related Commands

`/plan` — plan complex integrations first · `/security-scan` — verify no leaked credentials · `/test` — validate integration tests
