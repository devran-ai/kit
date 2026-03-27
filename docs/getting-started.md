# Getting Started

Get up and running with Devran AI Kit in **30 seconds**.

---

## ⚡ Quick Start

### Option 1: NPX (Recommended)

```bash
npx @devran-ai/kit init
```

This automatically copies the `.agent/` folder to your project and adds it to `.gitignore`. Done!

> **Note**: `.agent/` is gitignored by default — it's personal dev tooling. For team-wide sharing, use `kit init --shared`.

> **Warning:** `npx @devran-ai/kit init --force` is a **Catastrophic Repair** command. It will overwrite your customizations and session state. Do not use it for regular updates.

---

### 🔄 Updating

AI Agents and Users MUST use `kit update` for standard framework upgrades. This is a non-destructive AST merger.

```bash
kit update             # Non-destructive — preserves your customizations
kit update --dry-run   # Preview changes without applying
```

> **Preservation Contract:** The `kit update` command explicitly protects your customized `.agent/rules/`, `.agent/checklists/`, `session-state.json`, `session-context.md`, `identity.json`, and ADR files.

---

### Option 2: Manual Installation

```bash
# 1. Clone the repository
git clone https://github.com/devran-ai/kit.git

# 2. Copy .agent/ to your project
cp -r kit/.agent/ your-project/.agent/

# 3. Start your session
/project_status
```

---

## ✅ Verify Installation

After installing, validate your setup with the built-in CLI checks:

```bash
kit verify     # Manifest integrity check
kit scan       # Security scan
```

Both should return clean results. If they report issues, refer to the troubleshooting guide or run `kit update` to repair missing core dependencies.

## Safety Guarantees

Devran AI Kit **only** operates within the `.agent/` directory. Your project files — source code, configs, tests, platform files — are **never touched** by `init`, `update`, or any CLI command.

| Your Project Files | Safe? | Details |
|---|---|---|
| Source code (`src/`, `lib/`, `app/`) | Never touched | Init/update only operates on `.agent/` |
| Config files (`.env`, `package.json`) | Never touched | No project config is read or written |
| Documentation (`docs/`, `README.md`) | Never touched | Only `.agent/` docs are managed |
| Tests (`tests/`, `__tests__/`) | Never touched | Kit tests are internal to the package |
| Platform files (`android/`, `ios/`) | Never touched | No platform-specific operations |

### `init --force` Safety Features

- **Auto-backup** — Creates timestamped backup of existing `.agent/` before overwriting
- **Atomic copy** — Uses temp directory + rename to prevent corruption on failure
- **Symlink guard** — Skips symbolic links to prevent path traversal attacks
- **Session warning** — Alerts if active work-in-progress would be destroyed
- **Dry-run preview** — `--dry-run --force` shows exactly which user files would be overwritten

### `update` Preserved Files

- `session-context.md` — Your active session notes
- `session-state.json` — Your session metadata
- `decisions/` — Your Architecture Decision Records
- `contexts/` — Your learning data and plan quality logs
- `rules/` — Your custom governance rules
- `checklists/` — Your custom quality gates

---

## First Session

1. Open your project in your AI-powered IDE (VS Code, Cursor, Windsurf, etc.)
2. Run the status command:

```
/project_status
```

You should see:

```
📊 Session Status
├── Active: Yes
├── Context: Loaded
└── Ready for commands
```

---

## Basic Workflow

### 1. Plan Your Feature

```
/plan Add user authentication
```

The Planner agent creates a validated implementation plan with quality scoring, cross-cutting concerns (security, testing, documentation), and tiered detail based on task complexity.

### 2. Review the Plan

Review the generated plan in your working directory.

### 3. Implement

```
/implement
```

### 4. Verify

```
/verify
```

Runs all quality gates: build, lint, test, coverage.

---

## Session Management

Devran AI Kit includes a **Session Management Architecture** that ensures continuity across work sessions.

| Component                   | Purpose                       | Location                             |
| :-------------------------- | :---------------------------- | :----------------------------------- |
| **Session Context**         | Live session state, resumable | `.agent/session-context.md`          |
| **Session Start Checklist** | Pre-flight verification       | `.agent/checklists/session-start.md` |
| **Session End Checklist**   | Wrap-up and handoff           | `.agent/checklists/session-end.md`   |
| **Pre-Commit Checklist**    | Quality gate before commits   | `.agent/checklists/pre-commit.md`    |

**Starting a session**: Follow the session-start checklist. The AI loads previous context, verifies git status, checks dependencies, and resumes from the last open task.

**Ending a session**: Follow the session-end checklist. The AI updates session-context.md, documents open items, commits changes, and creates handoff notes.

---

## Next Steps

- **[Agents](agents/index.md)** — 23 specialized AI agents
- **[Commands](commands/index.md)** — 37 slash commands
- **[Skills](skills/index.md)** — 34 domain expertise modules
- **[Workflows](workflows/index.md)** — 22 development workflows
- **[Governance](governance/index.md)** — Operating constraints
