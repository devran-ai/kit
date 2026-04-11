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
| `--path <dir>` | Install to a specific directory (must resolve within cwd) |
| `--dry-run` | Preview changes without writing |
| `--quiet` | Suppress banner output |
| `--shared` | Team mode — do **not** add `.agent/` to `.gitignore` (commit framework with team) |
| `--ide <name>` | Generate config for specific IDE(s) — comma-separated or `all` (`claude`, `cursor`, `opencode`, `codex`, `vscode`, `windsurf`) |
| `--skip-ide` | Skip IDE config generation |
| `--skip-commands` | Skip slash command bridge generation |
| `--skip-worktree` | Skip `.worktreeinclude` and `post-checkout` hook generation |

**Gitignore pipeline (v5.2.6+):** After writing `.agent/` and bridge files, `kit init` runs a four-step gitignore pipeline:

1. **Narrow** — blanket `.claude/` entries become `.claude/commands/` (preserves Claude CLI directory discovery)
2. **Cleanup** — legacy Kit v5.2.0 `.claude/*` + `!.claude/commands/` patterns are removed
3. **Add** — missing entries for detected IDE bridge dirs, IDE configs, and `.worktreeinclude` are appended
4. **Untrack** (v5.2.8+) — any Kit artifacts accidentally committed before gitignore was configured are removed from the git index via `git rm -r --cached` while keeping working-tree files intact. Two-gate safety net: `git check-ignore --no-index` confirms the path is actually in `.gitignore` before touching it, and `git ls-files` confirms the path is tracked before running `git rm`. Invoked internally with `execFileSync` (no shell interpolation) for defense-in-depth.

---

#### Slash Command Bridges

`kit init` automatically detects which IDEs are present and generates slash command bridge files that connect each IDE's native `/` command system to `.agent/workflows/*.md`.

| IDE | Bridge Location | Auto-Detected? |
|-----|----------------|---------------|
| Claude Code / Antigravity | `.claude/commands/*.md` | Always generated |
| Cursor | `.cursor/commands/*.md` | When `.cursor/` exists |
| OpenCode | `.opencode/commands/*.md` | When `.opencode/` exists |
| VS Code Copilot | `.github/prompts/*.prompt.md` | Explicit opt-in (`--ide vscode`) |
| Windsurf | `.windsurf/workflows/*.md` | When `.windsurf/` exists |

Bridge files include a provenance header (`<!-- devran-kit-bridge ... -->`) so `kit update` can safely regenerate them without overwriting user-created custom commands.

To generate bridges for all IDEs regardless of detection:

```bash
kit init --ide all
```

See [IDE Support](ide-support.md) for full details.

---

### kit update

Non-destructive framework update. Preserves session data, decisions, and custom rules.

```bash
kit update [--dry-run]
```

Like `kit init`, runs the full gitignore pipeline (narrow → cleanup → add → untrack) so projects upgraded from older Kit versions automatically get missing entries added and any accidentally-committed Kit artifacts untracked from the git index.

**Shared mode short-circuit (v5.2.8+):** If `kit update` detects shared mode — `.agent/` is tracked in git AND not listed in `.gitignore` (the signature of `kit init --shared` team setups) — the entire gitignore pipeline is skipped so team workflows are preserved intact.

Preserved on every update:

- `session-context.md`, `session-state.json`
- `engine/identity.json`, `engine/onboarding-state.json`, `engine/decisions.json`
- `decisions/`, `contexts/`, `checklists/`, `rules/`, `staging/`

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
| `--scope <type>` | Target single scope: `default`, `all_private_chats`, `all_group_chats`, `all_chat_administrators`. Omit to push to all scopes |
| `--clear` | Delete commands from scope(s) instead of pushing |
| `--guard` | Restore cached commands to `all_private_chats` scope (lightweight re-sync) |
| `--install-guard` | Install SessionStart hook in `~/.claude/settings.json` for automatic menu restoration |

Reads frontmatter `description` from each workflow/command markdown file and formats them as Telegram bot menu commands. Priority tiers (critical, high, medium, low) determine ordering when the limit is reached.

When a workflow frontmatter includes an `args` field (e.g., `args: "PR #"`), the args hint is appended to the Telegram description: `Review PR (+ PR #)`. This helps users know which commands accept arguments.

#### Menu Guard System

The Telegram plugin overwrites bot menu commands on every session start with its own defaults (`/start`, `/help`, `/status`). The guard system solves this permanently:

```bash
kit sync-bot-commands                  # Sync workflows + create cache
kit sync-bot-commands --install-guard  # Install SessionStart hook (one-time)
```

After installation, the guard runs automatically on every new Claude Code session:

1. SessionStart hook fires `lib/telegram-menu-guard.js`
2. Guard spawns a detached child process (non-blocking)
3. Child waits 8 seconds for the plugin to finish connecting
4. Reads cached commands from `~/.claude/channels/telegram/bot-menu-cache.json`
5. Pushes the full menu (workflows + plugin base commands) to `all_private_chats` scope

The cache is auto-created on every successful `sync-bot-commands` run and merges plugin base commands (`/start`, `/help`) so they remain accessible.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (check stderr for details) |
