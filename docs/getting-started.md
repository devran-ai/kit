# Getting Started

Get up and running with Antigravity AI Kit in **30 seconds**.

---

## ⚡ Quick Start

### Option 1: NPX (Recommended)

```bash
npx antigravity-ai-kit init
```

This automatically copies the `.agent/` folder to your project. Done!

> **Warning:** `npx antigravity-ai-kit init --force` is a **Catastrophic Repair** command. It will overwrite your customizations and session state. Do not use it for regular updates.

---

### 🔄 Updating

AI Agents and Users MUST use `ag-kit update` for standard framework upgrades. This is a non-destructive AST merger.

```bash
ag-kit update             # Non-destructive — preserves your customizations
ag-kit update --dry-run   # Preview changes without applying
```

> **Preservation Contract:** The `ag-kit update` command explicitly protects your customized `.agent/rules/`, `.agent/checklists/`, `session-state.json`, `session-context.md`, `identity.json`, and ADR files.

---

### Option 2: Manual Installation

```bash
# 1. Clone the repository
git clone https://github.com/devran-ai/kit.git

# 2. Copy .agent/ to your project
cp -r antigravity-ai-kit/.agent/ your-project/.agent/

# 3. Start your session
/status
```

---

## ✅ Verify Installation

After installing, validate your setup with the built-in CLI checks:

```bash
ag-kit verify     # Manifest integrity check
ag-kit scan       # Security scan
```

Both should return clean results. If they report issues, refer to the troubleshooting guide or run `ag-kit update` to repair missing core dependencies.

## 🛡️ Safety Guarantees

Antigravity AI Kit **only** operates within the `.agent/` directory. Your project files — source code, configs, tests, platform files — are **never touched** by `init`, `update`, or any CLI command.

---

## First Session

1. Open your project in your AI-powered IDE (VS Code, Cursor, Windsurf, etc.)
2. Run the status command:

```
/status
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

## Next Steps

- **[Agents](agents/index.md)** — 20 specialized AI agents
- **[Commands](commands/index.md)** — 37 slash commands
- **[Skills](skills/index.md)** — 34 domain expertise modules
- **[Workflows](workflows/index.md)** — 21 development workflows
- **[Session Management](session-management.md)** — Never lose context
- **[Governance](governance/index.md)** — Operating constraints
