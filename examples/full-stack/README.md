# Devran AI Kit: Full-Stack Example

> A comprehensive example showing how Devran AI Kit orchestrates a complete full-stack development workflow.

## What This Example Shows

This example demonstrates the **full power** of Devran AI Kit in a realistic project setting:

1. All 11 workflows in action
2. Session management (start/end protocols with handoff notes)
3. Sprint orchestration (autonomous planning + retrospective)
4. Multi-agent routing (security, backend, frontend specialists)
5. Quality gates (pre-commit hook + CI pipeline)

## Scenario: Building a User Authentication System

This walkthrough shows how you would use Devran AI Kit to build a complete auth system from scratch.

### Phase 1: Explore & Plan

```
You: /plan add JWT authentication with Google OAuth

AI (planner agent):
  Before we implement, let me ask some clarifying questions:
  1. Should we support refresh tokens?
  2. What user data should be stored in the JWT payload?
  3. Do you need role-based access control?
  
You: Yes to refresh tokens, store userId + email + role, and yes RBAC with admin/user roles

AI (planner agent):
  Here's the implementation plan:
  
  ## Authentication System
  1. Install dependencies (jsonwebtoken, passport-google-oauth20, bcrypt)
  2. Create auth middleware (JWT verification + role checking)
  3. Create auth routes (login, register, refresh, google-callback)
  4. Create user model (id, email, passwordHash, role, refreshToken)
  5. Add environment variables (JWT_SECRET, GOOGLE_CLIENT_ID, etc.)
  6. Write tests (unit + integration)
  
  Approve this plan? [y/n]
```

### Phase 2: Implement

```
You: /create authentication system

AI routes to: backend-specialist + security-reviewer + tdd-guide

AI (backend-specialist):
  Creating auth middleware with JWT verification...
  Creating auth routes with proper error handling...
  
AI (security-reviewer):
  ⚠️ Security review: 
  - JWT secret must be ≥256 bits → using env variable ✅
  - Refresh tokens must be stored hashed → using bcrypt ✅
  - Rate limiting on login endpoints → added express-rate-limit ✅
  
AI (tdd-guide):
  Writing tests first for auth middleware...
  3 unit tests created, all passing ✅
```

### Phase 3: Verify & Review

```
You: /verify

AI (reliability-engineer):
  Running quality gates...
  ✅ Tests: 14 passed, 0 failed
  ✅ Build: Compiled successfully
  ✅ Lint: No issues
  ✅ Type check: Clean
  ✅ Security: No vulnerabilities
  ⚠️ Coverage: 78% (target: 80%)
  
  Recommendation: Add 1 more test for edge case in refresh token rotation.
```

### Phase 4: Deploy

```
You: /deploy check

AI (devops-engineer):
  Pre-deployment checklist:
  ✅ All tests pass
  ✅ No critical vulnerabilities
  ✅ Environment variables documented
  ✅ Migration script ready
  ⚠️ CHANGELOG not updated
  
  Updating CHANGELOG...done.
  Ready for deployment.
```

## Directory Structure

This example would create:

```
full-stack-app/
├── .agent/                    # Devran AI Kit (installed via npx)
├── src/
│   ├── middleware/
│   │   ├── auth.js            # JWT verification middleware
│   │   └── rbac.js            # Role-based access control
│   ├── routes/
│   │   └── auth.js            # Login, register, refresh, OAuth
│   ├── models/
│   │   └── user.js            # User model with password hashing
│   └── config/
│       └── passport.js        # Google OAuth strategy
├── tests/
│   ├── unit/
│   │   ├── auth.test.js       # Auth middleware tests
│   │   └── rbac.test.js       # RBAC tests
│   └── integration/
│       └── auth-flow.test.js  # Full auth flow test
├── docs/
│   └── ROADMAP.md             # Sprint tracking
└── .env.example               # Required environment variables
```

## Key Takeaways

1. **Agent routing is automatic** — you don't manually select agents, the kit routes to the right specialists
2. **Quality gates are enforced** — the `reliability-engineer` blocks deploys that don't pass all checks
3. **Session context persists** — handoff notes ensure the AI remembers context between sessions
4. **Sprint tracking is autonomous** — the `sprint-orchestrator` monitors progress and suggests next steps
