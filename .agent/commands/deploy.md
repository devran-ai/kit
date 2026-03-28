---
description: Deploy application to target environment
workflow: deploy
---

# /deploy Command

Deploy application to specified environment with pre-flight checks, health verification, and monitoring. See `.agent/workflows/deploy.md` for full process.

## Usage

| Command | Action |
| :--- | :--- |
| `/deploy` | Interactive — choose environment |
| `/deploy check` | Pre-flight checks only, no deployment |
| `/deploy preview` | Deploy to staging/preview |
| `/deploy production` | Deploy to production (requires confirmation) |
| `/deploy rollback` | Rollback to previous version |
| `/deploy --canary` | Deploy to canary (10% traffic) |
| `/deploy --full` | Force full deployment (skip incremental) |

## Examples

```
/deploy check
/deploy preview
/deploy production
/deploy --canary
/deploy rollback
```

## Pre-Deploy Checklist

Before any deploy, the workflow automatically verifies:
- [ ] All tests passing
- [ ] No CRITICAL security findings
- [ ] Build succeeds
- [ ] Environment variables complete
- [ ] Rollback plan documented

## Platform Auto-Detection

| Platform | Detected By | Command |
| :--- | :--- | :--- |
| Vercel | `vercel.json` / Next.js | `vercel --prod` |
| Railway | `railway.toml` | `railway up` |
| Expo EAS | `eas.json` | `eas build` |

## Output Preview

```
## Deployment Complete ✅

Version: abc1234 → def5678
Environment: production (Vercel)
Health: API ✅ · DB ✅ · Services ✅
Rollback: /deploy rollback → abc1234
```

## Related Commands

`/preflight` — full production readiness check before deploy · `/pr` — merge PR before deploy · `/review` — quality gates before deploy
