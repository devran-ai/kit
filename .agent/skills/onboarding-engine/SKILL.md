---
name: onboarding-engine
description: "Discovery protocol, project profile schema, template applicability matrix, document generation sequence, Kit config mapping, and adaptive guidance rules"
triggers: [onboard, greenfield, brownfield, new project, initialize, setup project]
---

# Onboarding Engine Skill

> **Purpose**: Structured project onboarding with checkpoint-based state machine

---

## Discovery Protocol

### Question Framework

Ask questions in this order. Skip any already answered. Adapt depth to team experience level.

| # | Topic | Key Question | Follow-ups |
|---|-------|-------------|------------|
| 1 | Vision | What are you building and what problem does it solve? | Unique value proposition? |
| 2 | Users | Who are your target users? B2C, B2B, or B2B2C? | Geographic scope? |
| 3 | Platforms | Which platforms? (Web / iOS / Android / Desktop / API / CLI / Library) | Primary platform? |
| 4 | Scale | Expected users at launch? In 12 months? | Concurrent users estimate? |
| 5 | Auth | Authentication methods? User roles? Compliance needs? | SSO? MFA? |
| 6 | Integrations | Payments, analytics, or third-party services? | Webhooks needed? |
| 7 | Team | Solo or team? What's the team's experience level? | Frontend/backend split? |
| 8 | Timeline | MVP deadline? Full launch target? | Hard or soft deadlines? |
| 9 | Assets | Existing designs, brand guidelines, APIs, or PRDs? | Design system started? |
| 10 | Budget | Hosting preference? Vendor lock-in tolerance? | Open source preference? |
| 11 | Stealth | Is this project confidential? | Can we use the project name in research? |

### Adaptive Guidance by Experience Level

| Level | Question Style | Doc Verbosity | Defaults |
|-------|---------------|---------------|----------|
| Beginner | Explain terms, offer examples | Detailed with explanations | Conservative, well-documented |
| Intermediate | Direct questions, light context | Standard | Balanced |
| Expert | Concise, skip basics | Minimal, reference-heavy | Advanced patterns |

---

## Project Profile Schema

### Required Fields

```
name: string           — Project name
description: string    — One-line description
problemStatement: string — Problem being solved
platforms: string[]    — Target platforms (web, ios, android, desktop, api, cli, library)
```

### Optional Fields

```
targetUsers: { type: B2C|B2B|B2B2C, geoScope: string }
scale: { launchUsers: number, yearOneUsers: number }
auth: { method: string[], roles: string[], compliance: string[] }
integrations: string[]
team: { size: solo|small|medium|large, experienceLevel: beginner|intermediate|expert }
timeline: { mvpDeadline: date?, fullLaunch: date? }
existingAssets: { designs: boolean, brand: boolean, apis: boolean, prds: boolean }
budget: { hostingPreference: string?, vendorLockInTolerance: low|medium|high }
stealthMode: boolean
```

### Brownfield Additions

```
detectedStack: { languages: string[], frameworks: string[], buildTools: string[] }
monorepoType: none|lerna|pnpm|turbo|nx|other
existingDocs: { status: EXISTS_COMPLETE|EXISTS_PARTIAL|MISSING, files: string[] }
```

---

## Template Applicability Matrix

| Template | Always | Web | Mobile | API | CLI | Library |
|----------|--------|-----|--------|-----|-----|---------|
| TECH-STACK-ANALYSIS | Y | Y | Y | Y | Y | Y |
| COMPETITOR-ANALYSIS | | Y | Y | Y | | |
| PRD | Y | Y | Y | Y | | Y |
| ARCHITECTURE | Y | Y | Y | Y | Y | Y |
| DB-SCHEMA | | Y | Y | Y | | |
| API-SPEC | | Y | Y | Y | | |
| SECURITY-POLICY | | Y | Y | Y | | |
| DESIGN-SYSTEM | | Y | Y | | | |
| SCREENS-INVENTORY | | Y | Y | | | |
| USER-JOURNEY-MAP | | Y | Y | | | |
| ROADMAP | Y | Y | Y | Y | Y | Y |
| SPRINT-PLAN | Y | Y | Y | Y | Y | Y |
| COMPLIANCE | | Y | Y | Y | | |
| ONBOARDING-GUIDE | Y | Y | Y | Y | Y | Y |
| CLAUDE.md | Y | Y | Y | Y | Y | Y |

---

## Kit Configuration Mapping

### Platform → Domain → Agent/Skill/Rule

| Platform | Domains | Agents | Skills | Rules |
|----------|---------|--------|--------|-------|
| web | frontend, backend, database, testing, devops | frontend-specialist, backend-specialist, database-architect, tdd-guide, devops-engineer | frontend-patterns, api-patterns, database-design, testing-patterns, docker-patterns | accessibility, security |
| ios/android | mobile, frontend, testing | mobile-developer, tdd-guide | mobile-design, testing-patterns | accessibility |
| api | backend, database, testing, security, devops | backend-specialist, database-architect, security-reviewer, tdd-guide | api-patterns, database-design, security-practices, testing-patterns | security, data-privacy |
| cli | backend, testing | backend-specialist, tdd-guide | testing-patterns | — |
| library | testing, architecture | tdd-guide, architect | testing-patterns, architecture | — |

---

## Interaction Mode Handling

| Step | Interactive (IDE) | Telegram | CI/Headless |
|------|------------------|----------|-------------|
| Discovery | Full Socratic Q&A | Inline keyboard buttons | Accept from config |
| Research | Present findings, await confirm | Summary + confirm button | Auto-proceed, flag "unreviewed" |
| Generation | Review each document | Summary only | Auto-proceed |
| Configuration | Confirm selections | Auto | Auto |
| Completion | Full quality report | Done notification | CI artifact |
