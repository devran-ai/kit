---
description: Query and manage architectural decision memory
uses: [onboarding-engine]
---

# /decisions Command

Query the decision memory to review past architectural and technology decisions made during onboarding and development.

## Usage

| Command | Action |
|:--------|:-------|
| `/decisions` | List all recorded decisions |
| `/decisions <keyword>` | Filter decisions by keyword (e.g., `auth`, `database`, `frontend`) |
| `/decisions <id>` | Show specific decision with full context (e.g., `ADR-003`) |
| `/decisions --stale` | Show decisions flagged as stale after profile changes |
| `/decisions --domain <domain>` | Filter by domain (e.g., `frontend`, `backend`, `security`) |

## Examples

```
/decisions
/decisions auth
/decisions ADR-003
/decisions --stale
/decisions --domain frontend
```

## Decision Entry Schema

Each decision in `.agent/engine/decisions.json` contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `ADR-001`) |
| `title` | string | Short decision title |
| `domain` | string | Domain area (frontend, backend, security, etc.) |
| `date` | string | ISO date when the decision was made |
| `status` | string | `proposed` / `accepted` / `superseded` / `stale` |
| `keywords` | string[] | Searchable keywords |
| `kitRecommendation` | string | What Kit recommended |
| `developerChoice` | string | What the developer decided |
| `rationale` | string | Why this choice was made |
| `file` | string | Which document this relates to |

## Output Format

### List View

```
Decisions (5 total):

  ADR-001  [accepted]  Frontend framework selection        frontend
  ADR-002  [accepted]  Database choice                     database
  ADR-003  [proposed]  Authentication strategy             security
  ADR-004  [stale]     Hosting provider                    devops
  ADR-005  [accepted]  State management approach           frontend
```

### Detail View

```
ADR-003: Authentication strategy
  Domain:     security
  Date:       2026-03-29
  Status:     proposed
  Kit says:   JWT with refresh tokens via httpOnly cookies
  Developer:  (pending)
  Rationale:  Balances security (no localStorage) with UX (auto-refresh)
  Related:    SECURITY-POLICY.md
  Keywords:   auth, jwt, cookies, security
```

## Stealth Mode

When the project has `stealthMode: true`, decision descriptions are anonymized. The `/decisions` command shows the anonymized versions. Original descriptions are not stored.

## Integration

- Decisions are recorded during onboarding by the `market-researcher` and `onboarding-specialist` agents
- The `market-awareness` rule records decisions during development sessions
- Stale decisions are flagged during `/brownfield` refresh mode
- High-confidence decisions are extracted as instinct candidates during `onboarding-complete` hook
