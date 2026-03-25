# CLI Reference

## Installation

```bash
npm install -g @devran-ai/kit    # Global install
npx @devran-ai/kit <command>     # Or use npx
```

---

## Commands

### kit init

Install the `.agent/` framework into your project.

```bash
kit init [options]
```

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing `.agent/` (creates backup) |
| `--path <dir>` | Install to a specific directory |
| `--dry-run` | Preview changes without writing |
| `--quiet` | Suppress banner output |
| `--ide <name>` | Generate config for single IDE (`cursor`, `opencode`, `codex`) |
| `--skip-ide` | Skip IDE config generation |

---

### kit update

Non-destructive framework update. Preserves session data, decisions, and custom rules.

```bash
kit update [--dry-run]
```

---

### kit status

Display project dashboard with agent counts, workflow state, and health metrics.

```bash
kit status
```

Alias: `kit dashboard`

---

### kit verify

Validate manifest integrity — checks that all referenced files exist and counts match.

```bash
kit verify
```

---

### kit scan

Run security scanner on `.agent/` files. Detects injection patterns, hardcoded secrets, and anomalies.

```bash
kit scan
```

---

### kit plugin

Manage third-party plugins.

```bash
kit plugin list              # List installed plugins
kit plugin install <path>    # Install plugin from directory
kit plugin remove <name>     # Remove installed plugin
```

---

### kit market

Browse and install from the skill marketplace.

```bash
kit market search <query>    # Search marketplace plugins
kit market info <name>       # View plugin details
kit market install <name>    # Install from marketplace
kit market update            # Refresh registry index
```

---

### kit heal

Auto-diagnose and generate fix patches for CI failures.

```bash
kit heal [--file <path>] [--apply]
```

| Flag | Description |
|------|-------------|
| `--file <path>` | Path to CI log file |
| `--apply` | Apply patches (default is dry-run) |

---

### kit health

Aggregated health check across all subsystems (error budget, plugin integrity, config validation, self-healing).

```bash
kit health
```

---

### kit sync-bot-commands

Sync `.agent/workflows/` and `.agent/commands/` descriptions to the Telegram Bot API menu.

```bash
kit sync-bot-commands [options]
```

| Flag | Description |
|------|-------------|
| `--token <BOT_TOKEN>` | Telegram bot token (or set `TELEGRAM_BOT_TOKEN` env var) |
| `--dry-run` | Preview commands without pushing to Telegram |
| `--limit <N>` | Max commands to sync (1–100, default: all) |
| `--source <type>` | Source to scan: `workflows` (default), `commands`, or `both` |

Reads frontmatter `description` from each workflow/command markdown file and formats them as Telegram bot menu commands. Priority tiers (critical, high, medium, low) determine ordering when the limit is reached.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (check stderr for details) |
