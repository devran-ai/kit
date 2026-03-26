---
description: Production deployment with pre-flight checks, execution, and verification.
args: environment
version: 2.1.0
sdlc-phase: ship
skills: [deployment-procedures]
commit-types: [chore, fix]
---

# /deploy — Production Deployment

> **Trigger**: `/deploy [sub-command]`
> **Lifecycle**: Ship — after `/pr` is merged

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Deployment impacts production users and consumes platform credits. Never deploy untested code.

---

## Critical Rules

1. Rollback plan required before deploying
2. No test deploys to production — use preview/staging
3. Pre-flight must pass before deployment
4. Health check mandatory after deployment
5. No secrets in deployment logs

---

## Scope Filter

Deploy only production-impacting changes: `apps/`, `docker/`, infra config. Never deploy docs-only or `.agent/` changes.

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/deploy` | Interactive wizard |
| `/deploy check` | Pre-flight only |
| `/deploy preview` | Deploy to staging |
| `/deploy production` | Deploy to production |
| `/deploy rollback` | Rollback to previous |

---

## Steps

// turbo
1. **Pre-Flight** — tsc, lint, tests, security audit, build, environment check

// turbo
2. **Scope Verification** — check changed files against scope filter

3. **Rollback Plan** — document current version, verify rollback command, check migration reversibility

4. **Deploy** — build, deploy to target, monitor progress

// turbo
5. **Health Check** — API responding, database connected, services healthy, no error spikes

6. **Post-Deploy** — document version/SHA, update tracking, notify stakeholders

---

## Platform Support

| Platform | Command | Auto-detect |
| :--- | :--- | :--- |
| Vercel | `vercel --prod` | Next.js |
| Railway | `railway up` | NestJS, API |
| Expo EAS | `eas build` | React Native |

---

## Output Template

```markdown
## Deployment Complete

- **Version**: [SHA/tag]
- **Environment**: [target]
- **Health**: All checks passing
- **Rollback**: `/deploy rollback` to [previous]

**Next**: `/status` for monitoring.
```

---

## Governance

**PROHIBITED:** Deploying without `/review` · production for testing · docs-only deploys · skipping rollback plan

**REQUIRED:** Pre-flight passing · scope verification · rollback plan · health check · cost-conscious batching

---

## Completion Criteria

- [ ] Pre-flight passed, scope verified
- [ ] Rollback plan documented
- [ ] Deployed, health check passed
- [ ] Version documented

---

## Related Resources

- **Previous**: `/pr` (merged) · `/preflight`
- **Next**: `/status`
- **Skill**: `.agent/skills/deployment-procedures/SKILL.md`
