---
description: Devran AI Kit framework overview, capabilities, and workflow guide.
version: 1.0.0
sdlc-phase: cross-cutting
commit-types: [chore]
---

# /help_kit — Devran AI Kit Quick Reference

> **Trigger**: `/help_kit`
> **Lifecycle**: Cross-cutting — any SDLC phase

---

## Steps

// turbo
1. **Read manifest** — Load `.agent/manifest.json` for live capability counts

// turbo
2. **Display framework overview** using the template below

---

## Output Template

```markdown
## Devran AI Kit

Trust-Grade AI Development Framework — zero dependencies.

### Capabilities

| Component | Count |
|:----------|:------|
| Agents    | [from manifest] |
| Skills    | [from manifest] |
| Commands  | [from manifest] |
| Workflows | [from manifest] |

### Workflow Quick Reference

| Workflow | What it does |
|:---------|:-------------|
| `/plan`  | Create implementation plan with planner agent |
| `/create` | Scaffold new features, components, or modules |
| `/debug` | Systematic debugging with DEBUG mode |
| `/test`  | Write and run tests (TDD workflow) |
| `/review` | Code review — lint, type-check, test, security |
| `/pr`    | Production-grade PR creation with pre-flight checks |
| `/pr_review` | Multi-perspective PR review |
| `/pr_fix` | Fix PR issues from review comments |
| `/pr_merge` | Safe merge with CI verification |
| `/deploy` | Production deployment with pre-flight checks |
| `/enhance` | Add or update features iteratively |
| `/brainstorm` | Structured brainstorming before implementation |
| `/orchestrate` | Multi-agent orchestration for complex tasks |
| `/project_status` | Project and progress overview |
| `/preflight` | Production readiness assessment |
| `/retrospective` | Full product and architecture audit |
| `/quality_gate` | Research and validation before implementation |
| `/ui_ux_pro_max` | Premium UI/UX design workflow |
| `/preview` | Dev server management |
| `/upgrade` | Non-destructive framework upgrade |

### How Workflows Work

1. Type `/` in Telegram or your IDE to see all available workflows
2. Select a workflow or type it with arguments: `/plan auth system`
3. The workflow activates specialized agents and follows a structured process
4. Each workflow has quality gates — it won't skip steps

### SDLC Phases

```
IDLE → EXPLORE → PLAN → IMPLEMENT → VERIFY → CHECKPOINT → REVIEW → DEPLOY
```

Each phase requires approval before transitioning. The engine tracks state across sessions.

### Key Commands

| Command | Purpose |
|:--------|:--------|
| `kit init` | Install framework into your project |
| `kit update` | Non-destructive upgrade |
| `kit verify` | Manifest integrity check |
| `kit scan` | Security scan |
| `kit sync-bot-commands` | Sync workflows to Telegram menu |

### Telegram Integration

All workflows are available from your Telegram bot menu. Type `/` to see them.
To sync: `kit sync-bot-commands`
To guard menu: `kit sync-bot-commands --install-guard`

### Documentation

Full docs: https://devran-ai.github.io/kit/
```

---

## Governance

**PROHIBITED:** Modifying files — this is a read-only informational workflow

**REQUIRED:** Show live counts from manifest — accurate capability numbers

---

## Completion Criteria

- [ ] Framework overview displayed with accurate counts
