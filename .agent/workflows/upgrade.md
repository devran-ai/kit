---
description: Non-destructive Devran AI Kit framework upgrade with preservation verification.
version: 1.0.0
sdlc-phase: maintenance
skills: [verification-loop]
commit-types: [chore]
---

# /upgrade — Framework Upgrade

> **Trigger**: `/upgrade [sub-command]`
> **Lifecycle**: Maintenance — when new kit version available

> Standards: See `rules/workflow-standards.md`

> [!CAUTION]
> Upgrades modify `.agent/` files. Preservation Contract protects user state. Always verify after upgrade.

---

## Critical Rules

1. Non-destructive only — use `kit update`, never `init --force`
2. Preservation Contract — user state (rules, checklists, sessions, decisions, contexts, identity) must survive
3. Always run `kit verify` post-upgrade
4. Human confirmation required before executing upgrade

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/upgrade` | Interactive — detect, preview, apply, verify |
| `/upgrade --dry-run` | Preview only |
| `/upgrade --verify-only` | Post-upgrade verification only |

---

## Steps

// turbo
1. **Pre-Upgrade** — check current version, verify clean working tree, record HEAD for rollback

// turbo
2. **Preservation Snapshot** — verify all protected items exist, record checksums

3. **Execute Upgrade** — `kit update` (requires user approval)

// turbo
4. **Verify Integrity** — `kit verify`, confirm preserved items intact

// turbo
5. **Report** — version change, new capabilities, preservation compliance

---

## Output Template

```markdown
## Upgrade Complete

| Field | Value |
| :--- | :--- |
| Previous / New Version | [versions] |
| Preservation Contract | Intact |
| Manifest Verify | Passed |

### New Capabilities
| Type | Added | Details |

**Next**: `/project_status` for health check.
```

---

## Governance

**PROHIBITED:** `init --force` for routine upgrades · modifying preserved files · skipping verification · auto-executing without confirmation

**REQUIRED:** Clean working tree · preservation snapshot · `kit verify` after upgrade · human approval

---

## Completion Criteria

- [ ] Version identified, working tree clean
- [ ] Preservation snapshot taken
- [ ] Upgrade executed, `kit verify` passed
- [ ] All preserved items intact, report delivered

---

## Related Resources

- **Rule**: `.agent/rules/agent-upgrade-policy.md`
- **Next**: `/status`
