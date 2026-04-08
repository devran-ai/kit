# Cross-IDE Setup

Devran AI Kit generates native configurations for 5 IDEs from a single `manifest.json` source of truth.

## Supported IDEs

| IDE | Config Location | Format | Auto-Generated |
|-----|----------------|--------|---------------|
| Claude Code | `.agent/` | Markdown | Yes (native) |
| Antigravity | `.agent/` | Markdown | Yes (native) |
| Cursor | `.cursor/rules/kit-governance.mdc` | YAML frontmatter + MD | Yes |
| OpenCode | `.opencode/opencode.json` | JSON | Yes |
| Codex | `.codex/config.toml` | TOML | Yes |

---

## Automatic Setup

All IDE configurations are generated automatically when you run:

```bash
kit init
```

To regenerate for a specific IDE:

```bash
kit init --ide cursor --force
```

To skip IDE generation:

```bash
kit init --skip-ide
```

---

## Claude Code

Claude Code uses `.agent/` directly — no additional configuration needed. The framework's `rules.md` file is loaded automatically as the system prompt.

## Antigravity

Antigravity uses the same `.agent/` format as Claude Code. Full compatibility is maintained.

## Cursor

Kit generates `.cursor/rules/kit-governance.mdc` with YAML frontmatter:

```yaml
---
description: "Devran AI Kit - Trust-Grade AI governance"
alwaysApply: true
---
```

This file contains condensed governance rules that Cursor applies to all conversations.

## OpenCode

Kit generates `.opencode/opencode.json` with model configuration and agent definitions:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "instructions": [".agent/rules.md"],
  "agent": { }
}
```

## Codex

Kit generates `.codex/config.toml` with approval policy and agent definitions:

```toml
approval_policy = "suggest"
sandbox_mode = "workspace-write"

[agents.planner]
description = "Implementation planning specialist"
```

---

## Slash Command Bridges

In addition to governance configs, Kit v5.2.0+ generates **slash command bridge files** that enable IDE-native `/` autocomplete for all 25 workflows.

See [IDE Support](ide-support.md) for the full cross-IDE slash command matrix, auto-detection behavior, provenance protection, and security details.

---

## Customization

Generated IDE configs can be customized after generation. They will not be overwritten by `kit update` unless you use `--force`.

To regenerate IDE configs after modifying agents or rules, re-run `kit init --force` (this preserves your session data via automatic backup).

Slash command bridge files include a provenance header. `kit update` only overwrites Kit-generated bridges, never user-created custom commands.
