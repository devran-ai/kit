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

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New features need deployment to reach users |
| `fix` | Required | Bug fixes must be deployed to resolve issues |
| `perf` | Required | Performance improvements need production validation |
| `refactor` | Optional | Only if refactor changes runtime behavior |
| `chore` | Optional | Only for dependency updates affecting production build |
| `docs` | Skip | Documentation changes don't need deployment |

> Never deploy `.agent/` directory changes — they are development-only artifacts.

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
5. **Health Check** — verify all critical signals within 5 minutes of deploy:
   - API: key endpoint returns HTTP 200
   - Database: connection pool healthy, no timeout errors
   - Services: all background workers running
   - Errors: error rate ≤ pre-deploy baseline + 0.1% (warn >0.1%, critical >1%)
   - Performance: p95 latency ≤ pre-deploy baseline + 20ms (warn if p99 >200ms, critical if >500ms)

6. **Post-Deploy Monitoring** — 15-minute observation window:
   - Watch error tracking dashboard for spike
   - Confirm no latency regression
   - If metrics degrade: trigger rollback immediately (don't wait)

7. **Completion** — document version/SHA, update tracking, notify stakeholders

---

## Platform Support

| Platform | Command | Auto-detect |
| :--- | :--- | :--- |
| Vercel | `vercel --prod` | Next.js |
| Railway | `railway up` | NestJS, API |
| Expo EAS | `eas build` | React Native |

---

## Output Template

**Success:**
```markdown
## 🚀 Deployment Complete ✅

| Field | Value |
| :--- | :--- |
| Version | [SHA/tag] |
| Environment | [target] |
| Platform | [Vercel / Railway / EAS] |
| Health Check | ✅ All passing |
| Rollback | `/deploy rollback` → [previous SHA] |

**Monitoring**: 15-minute window active.
**Next**: `/project-status` for ongoing monitoring.
```

**Failure / Rollback:**
```markdown
## 🚀 Deployment Failed ⚠️ — Rollback Initiated

| Field | Value |
| :--- | :--- |
| Failed Step | [step name] |
| Error | [error message] |
| Action Taken | [rolled back to SHA / manual intervention required] |

**Immediate action required**: [specific next step]
```

---

## Governance

**PROHIBITED:** Deploying without `/review` · production for testing · docs-only deploys · skipping rollback plan

**REQUIRED:** Pre-flight passing · scope verification · rollback plan · health check · cost-conscious batching

---

## Completion Criteria

- [ ] Scope Filter evaluated — change requires deployment
- [ ] Pre-flight checks passed (tsc, lint, tests, security, build)
- [ ] Scope verified: no docs-only or `.agent/` changes being deployed
- [ ] Rollback plan documented with exact rollback command and previous version SHA
- [ ] Deployment executed on correct target (preview vs production)
- [ ] Health checks passed: API, database, services, error rate, latency
- [ ] 15-minute post-deploy monitoring window observed without degradation
- [ ] Version/SHA and deployment timestamp documented

---

## Related Resources

- **Previous**: `/pr` (merged) · `/preflight`
- **Next**: `/status`
- **Skill**: `.agent/skills/deployment-procedures/SKILL.md`
