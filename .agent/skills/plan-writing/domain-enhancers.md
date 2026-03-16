# Domain-Specific Plan Enhancers

> When the loading engine matches specific domains for a task, the planner
> MUST include the corresponding domain-specific sections below.
> These sections are additive to the base plan schema (Tier 1 + Tier 2).

---

## Frontend Domain

**Triggered when**: `frontend` domain matched (keywords: react, next.js, component, css, ui, ux, etc.)

Include in plan:

- **Accessibility (WCAG 2.1 AA)**: Identify components requiring ARIA labels, keyboard navigation, screen reader support, color contrast compliance
- **Responsive Design**: Specify breakpoints to test (mobile 375px, tablet 768px, desktop 1280px), identify layout changes per breakpoint
- **Bundle Size Impact**: Estimate size of new dependencies, identify tree-shaking opportunities, consider code splitting for new routes
- **Core Web Vitals**: Assess impact on LCP (largest contentful paint), CLS (cumulative layout shift), INP (interaction to next paint)
- **Component Composition**: Specify component hierarchy, prop interfaces, state management approach (local vs. global)

---

## Backend Domain

**Triggered when**: `backend` domain matched (keywords: api, server, node, express, middleware, endpoint, etc.)

Include in plan:

- **API Contract**: Define request/response schemas (Zod validation), HTTP methods, status codes, error response format
- **Error Handling**: Specify error response structure, error codes, client-facing messages vs. internal logging
- **Rate Limiting**: Identify endpoints requiring rate limits, specify limits (requests/minute/user), throttling strategy
- **Middleware Chain**: Document new middleware additions, execution order, impact on existing middleware stack
- **Database Interaction**: Query patterns (parameterized), transaction boundaries, connection pooling impact

---

## Database Domain

**Triggered when**: `database` domain matched (keywords: database, sql, migration, schema, query, orm, etc.)

Include in plan:

- **Migration Rollback**: Write both up and down migrations, test rollback procedure before deploying
- **Index Impact Analysis**: Identify queries affected by schema changes, recommend index additions/removals, estimate query performance impact
- **Data Integrity**: Define constraints (foreign keys, unique, not null, check), cascade behavior for deletions
- **Backup Verification**: Verify backup exists before destructive migrations, test restore procedure for critical tables
- **Query Performance**: Benchmark key queries before and after changes, set acceptable latency thresholds

---

## DevOps Domain

**Triggered when**: `devops` domain matched (keywords: deploy, ci, cd, docker, kubernetes, pipeline, etc.)

Include in plan:

- **Infrastructure Changes**: Specify IaC modifications (Dockerfile, docker-compose, CI config), environment variable additions
- **Monitoring & Alerting**: Define new metrics to track, alerting thresholds, dashboard updates
- **Progressive Rollout**: Strategy for deployment (canary → staged → full), rollback triggers, health check endpoints
- **Runbook Updates**: Document operational procedures for the new functionality, incident response steps
- **Environment Parity**: Verify changes work across dev, staging, and production environments

---

## Security Domain

**Triggered when**: `security` domain matched (keywords or implicit triggers: auth, login, signup, form, payment, etc.)

Include in plan (in addition to mandatory security considerations):

- **Threat Model (STRIDE)**: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege — assess each for the change
- **Authentication Flow Impact**: How the change affects login, session management, token lifecycle
- **Data Classification**: Identify data sensitivity levels (public, internal, confidential, restricted), storage and transmission requirements
- **Compliance Requirements**: GDPR/CCPA implications (data minimization, consent, right to erasure)
- **Secret Management**: New secrets required, rotation policy, storage mechanism (environment variables only)

---

## Performance Domain

**Triggered when**: `performance` domain matched (keywords: slow, optimize, speed, bundle, lighthouse, cache, etc.)

Include in plan:

- **Performance Budget**: Define acceptable thresholds (page load time, API response time, memory usage)
- **Profiling Strategy**: Tools and methods to measure before/after (Lighthouse, Chrome DevTools, load testing)
- **Caching Strategy**: Cache layers (browser, CDN, application, database), TTL values, invalidation approach
- **Lazy Loading**: Identify resources for deferred loading, intersection observer patterns, dynamic imports
- **Benchmarking**: Define benchmark suite, baseline measurements, regression detection

---

## Mobile Domain

**Triggered when**: `mobile` domain matched (keywords: mobile, react native, expo, ios, android, etc.)

Include in plan:

- **Platform Parity**: Identify iOS vs. Android differences in behavior, UI, or API access
- **Offline Support**: Define offline behavior, data sync strategy, conflict resolution
- **App Store Guidelines**: Compliance with Apple/Google review guidelines for the feature
- **Native Modules**: Bridge requirements, native module dependencies, build configuration changes
- **Device Testing**: Target device matrix, screen size variations, OS version compatibility

---

## Usage

The planner reads this file when domain-specific sections are needed:

1. Loading engine returns `matchedDomains` array
2. For each matched domain, include the corresponding enhancer section
3. Domain sections are added AFTER the base plan schema sections
4. Multiple domains can be active simultaneously (e.g., frontend + backend for a full-stack feature)
