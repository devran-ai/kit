---
name: verification-loop
description: Comprehensive verification running all quality gates
triggers: [manual, pre-commit]
---

# Verification Loop Skill

> **Purpose**: Continuous quality assurance through automated verification

## Sub-Resources

| File | Purpose |
| :--- | :--- |
| `gate-config.md` | Gate definitions, thresholds, skip conditions, rigor profile integration |

---

---

## Overview

The verification loop runs all quality gates to ensure code meets professional standards before committing or deploying.

---

## Workflow

### 1. Build Check

```bash
npm run build
```

**Pass Criteria**: Exit code 0, no TypeScript errors

### 2. Lint Check

```bash
npm run lint
```

**Pass Criteria**: No errors (warnings acceptable)

### 3. Type Check

```bash
npx tsc --noEmit
```

**Pass Criteria**: Zero type errors

### 4. Unit Tests

```bash
npm run test
```

**Pass Criteria**: All tests pass

### 5. Coverage Check

```bash
npm run test:coverage
```

**Pass Criteria**: ≥80% coverage

### 6. Security Scan

```bash
npm audit --audit-level=high
```

**Pass Criteria**: No high/critical vulnerabilities

---

## Configuration

```json
{
  "verification": {
    "coverageThreshold": 80,
    "allowWarnings": true,
    "securityLevel": "high"
  }
}
```

---

## Integration

- Invoked by `/verify` command
- Can be used as pre-commit hook
- Reports to Code Reviewer agent
