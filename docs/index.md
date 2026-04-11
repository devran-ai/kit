# Devran AI Kit

<p align="center">
  <img src="assets/og-image.png" alt="Devran AI Kit — Trust-Grade AI Development Framework" width="800" />
</p>

Welcome to the **Devran AI Kit** documentation — a Trust-Grade AI development framework.

---

## What is Devran AI Kit?

Devran AI Kit transforms your IDE into a **virtual engineering team** with:

| Feature           | Count | Description                                                            |
| :---------------- | :---- | :--------------------------------------------------------------------- |
| 🤖 **AI Agents**  | 26    | Specialized roles (Mobile, DevOps, Database, Security, PR Review...)   |
| 🛠️ **Skills**     | 39    | Domain knowledge modules (API, Testing, PR Toolkit, Docker, Research Methodology...) |
| ⌨️ **Commands**   | 40    | Slash commands for every development workflow                          |
| 🔄 **Workflows**  | 25    | Process templates (/create, /debug, /deploy, /implement, /pr, /pr-merge...) |
| ✅ **Checklists** | 4     | Quality gates (session-start, session-end, pre-commit, task-complete)  |
| 🔗 **Hooks**      | 9     | Event-driven automation (runtime + git-hook enforcement)               |
| ⚙️ **Runtime**    | 43    | Runtime engine modules (governance, reputation, self-healing, command bridge...) |
| ⚖️ **Rules**      | 15    | Governance constraints (security, performance, accessibility, data-privacy, testing, git, docs, and more) |

---

## Quick Links

<div class="grid cards" markdown>

- :rocket: **[Getting Started](getting-started.md)**

  NPX install in 30 seconds

- :robot: **[Agents](agents/index.md)**

  26 specialized agents for delegation

- :keyboard: **[Commands](commands/index.md)**

  40 slash commands for quick execution

- :gear: **[Skills](skills/index.md)**

  39 domain expertise modules

- :arrows_counterclockwise: **[Workflows](workflows/index.md)**

  25 full development workflows

- :scales: **[Governance](governance/index.md)**

  Trust-Grade operating constraints

- :gear: **[Runtime Engine](#runtime-engine)**

  43 modules powering the runtime

- :speech_balloon: **[Telegram Setup](telegram-setup.md)**

  Control Claude Code from your phone

- :book: **[Contributor Guide](contributor-guide.md)**

  End-to-end project lifecycle

- :desktop_computer: **[Cross-IDE Setup](cross-ide-setup.md)**

  7 IDEs from one manifest

</div>

---

## Core Philosophy

!!! quote "Trust > Optimization. Safety > Growth. Explainability > Performance."

This isn't just a collection of prompts. It's an **engineered framework** that enforces professional standards through immutable operating constraints.

---

## Key Features

- **🔒 Trust-Grade Governance** — 15 rules (Performance, Accessibility, Data Privacy + 12 more) with Rigor Profiles (strict/standard/minimal), Scope Filters, and Ethics Gates across all 25 workflows
- **🤖 Multi-Agent System** — 26 specialized agents with Instinct System (confidence-scored pattern memory, auto-applied at ≥70 confidence)
- **⚙️ Runtime Engine** — 43 modules enforcing workflow transitions, task governance, agent reputation, and self-healing
- **📦 Context as Artifact** — Persistent markdown files for plans, specs, and decisions
- **🔄 Continuous Learning** — PAAL cycle extracts patterns from every session; Instinct System makes them permanent
- **🛡️ Security First** — Built-in secret detection, OWASP Top 10 checklist, vulnerability scanning, and compliance checks
- **🖥️ Cross-IDE Support** — Governance configs for Claude Code, Antigravity, Cursor, OpenCode, and Codex; slash command bridges for Claude Code, Cursor, OpenCode, VS Code Copilot, and Windsurf

---

## Release History

**Latest (v5.2.8):** `kit init` and `kit update` now auto-untrack any Kit artifacts that were accidentally committed (`.cursor/commands/`, `.agent/`, bridge files, `dev/null/`). Gitignore only blocks new additions — already-tracked files stayed in git. Now Kit actively removes them from the index via `git rm -r --cached` while keeping working-tree files intact. A two-gate safety net (`git check-ignore --no-index` + explicit shared-mode detection) prevents touching user-authored configs or breaking `kit init --shared` team workflows. 1037 tests passing.

**v5.2.7:** `kit update` now runs the full gitignore pipeline — projects upgraded from older Kit versions get missing `.cursor/commands/`, `.opencode/commands/`, and other bridge entries auto-fixed.

**v5.2.6:** Fixed Claude Code CLI slash command discovery — blanket `.claude/` gitignore narrowed to `.claude/commands/` for proper directory discovery. New `narrowBlanketClaudeIgnore()` migration function.

**v5.2.3:** Automatic Worktree Support — `.worktreeinclude` generation for Claude Code, `post-checkout` git hook for manual worktrees.

**v5.2.0:** Universal Slash Command Bridge Generation — IDE-native `/` command bridges for Claude Code, Cursor, OpenCode, VS Code Copilot, and Windsurf with auto-detection and provenance-based safe overwrite.

See the full **[CHANGELOG](https://github.com/devran-ai/kit/blob/main/CHANGELOG.md)** for detailed release notes.
