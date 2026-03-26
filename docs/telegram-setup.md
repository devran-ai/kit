# Telegram Channel Setup

Control your Claude Code session from Telegram. Send messages, trigger workflows, and receive responses — all from your phone.

```
You (Telegram) --> Bot --> Claude Code --> Bot --> You (Telegram)
```

---

## Before you begin

You need three things:

| Requirement | Check |
|:--|:--|
| Claude Code v2.1.80 or later | `claude --version` |
| Bun runtime (any version) | `bun --version` |
| A Telegram account | Open Telegram on your phone |

**Install Bun** (if not installed):

```bash
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

---

## Step 1: Create a Telegram bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot`
3. Choose a display name (e.g., "My Dev Bot")
4. Choose a username ending in `bot` (e.g., `mydev_bot`)
5. Copy the token BotFather gives you

> Keep your token private. Anyone with the token can control your bot.

---

## Step 2: Install the Telegram plugin

Run these three commands inside a Claude Code session:

```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install telegram@claude-plugins-official
/reload-plugins
```

---

## Step 3: Save your bot token

```
/telegram:configure <YOUR_TOKEN>
```

Replace `<YOUR_TOKEN>` with the token from Step 1. This saves it to `~/.claude/channels/telegram/.env`.

---

## Step 4: Start Claude Code with Telegram

Close your current session and restart with the `--channels` flag:

```bash
claude --channels plugin:telegram@claude-plugins-official
```

You should see:

```
Listening for channel messages from: plugin:telegram@claude-plugins-official
```

---

## Step 5: Pair your Telegram account

1. Send any message to your bot in Telegram
2. The bot replies with a **6-digit pairing code**
3. In Claude Code, run:

```
/telegram:access pair <CODE>
```

4. Lock access to your account only:

```
/telegram:access policy allowlist
```

Your bot now responds only to you.

---

## Verify it works

Send "hello" to your bot in Telegram. You should receive a response from Claude Code within a few seconds.

| Command | What it does |
|:--|:--|
| `/telegram:access status` | Show pairing status and allowed users |
| `/telegram:access allow <ID>` | Allow another Telegram user |
| `/telegram:access remove <ID>` | Remove a user |

> To find your Telegram ID, message [@userinfobot](https://t.me/userinfobot).

---

## Starting sessions

The `--channels` flag is required every time you start a session. Without it, the bot won't respond.

```bash
claude --channels plugin:telegram@claude-plugins-official
```

**Create a shortcut** so you don't have to type it every time:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias claude-tg='claude --channels plugin:telegram@claude-plugins-official'
```

**Windows (PowerShell)** — add to your profile (`$PROFILE`):

```powershell
function Start-ClaudeTG {
    param([string]$Project)
    $Channel = "plugin:telegram@claude-plugins-official"
    if ($Project) { Set-Location "~\ClaudeProjects\$Project" }
    claude --channels $Channel
}
Set-Alias -Name claude-tg -Value Start-ClaudeTG
```

Usage:

```bash
claude-tg                # Start in current directory
claude-tg my-project     # Start in a specific project (Windows)
```

---

## Permissions

For the bot to respond without manual approval in your terminal, allow the Telegram plugin tools in `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__plugin_telegram_telegram__*"
    ]
  }
}
```

This allows the bot to send replies. Add other tools (Bash, Edit, Read, etc.) as needed for your workflow.

---

## Add Devran Kit workflows to the bot menu

If you use [Devran AI Kit](https://github.com/devran-ai/kit), you can sync all workflows to the Telegram bot menu so they appear when you type `/` in the chat.

### Sync workflows

```bash
kit sync-bot-commands
```

This scans `.agent/workflows/` and pushes them to the Telegram bot menu across all scopes (private chats, groups, admin chats).

### Install the menu guard

The Telegram plugin resets the bot menu on every session start. The guard automatically restores your workflows:

```bash
kit sync-bot-commands --install-guard
```

After this one-time setup, your workflow menu survives every session restart.

### Available commands

| Flag | What it does |
|:--|:--|
| `--dry-run` | Preview without pushing |
| `--guard` | Restore menu from cache |
| `--install-guard` | Install auto-restore hook |
| `--scope <type>` | Target a specific scope |
| `--clear` | Remove all commands |

---

## Troubleshooting

**Bot doesn't respond**

| Cause | Fix |
|:--|:--|
| Missing `--channels` flag | Restart with `claude --channels plugin:telegram@...` |
| Permission prompt blocking | Add tools to `permissions.allow` in settings.json |
| Session is busy | Wait for the current task to finish, or start a new session |
| Context window full | Run `/clear` or start a new session |
| Bun not installed | Run `bun --version` — install if missing |

**Pairing issues**

| Cause | Fix |
|:--|:--|
| No pairing code received | Restart session with `--channels`, then message the bot |
| Wrong code | Codes expire — send a new message to get a fresh code |
| "Not on allowlist" | Run `/telegram:access allow <YOUR_ID>` |

**Menu not showing workflows**

| Cause | Fix |
|:--|:--|
| Never synced | Run `kit sync-bot-commands` |
| Plugin overwrote menu | Run `kit sync-bot-commands --guard` |
| Guard not installed | Run `kit sync-bot-commands --install-guard` |

---

## File locations

| File | Path | Purpose |
|:--|:--|:--|
| Bot token | `~/.claude/channels/telegram/.env` | API token |
| Access policy | `~/.claude/channels/telegram/access.json` | Allowlist and DM policy |
| Menu cache | `~/.claude/channels/telegram/bot-menu-cache.json` | Cached workflow commands |
| Settings | `~/.claude/settings.json` | Permissions and hooks |

---

## Important notes

- The bot only responds while a Claude Code session is running
- One bot token = one active session at a time
- Telegram limits bot file downloads to 20 MB
- The `--channels` flag is required every session start
- Keep your bot token secret — rotate it via [@BotFather](https://t.me/BotFather) if compromised
