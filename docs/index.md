# Devran AI Kit

Welcome to the **Devran AI Kit** documentation — a Trust-Grade AI development framework.

---

## What is Devran AI Kit?

Devran AI Kit transforms your IDE into a **virtual engineering team** with:

| Feature           | Count | Description                                                            |
| :---------------- | :---- | :--------------------------------------------------------------------- |
| 🤖 **AI Agents**  | 23    | Specialized roles (Mobile, DevOps, Database, Security, PR Review...)   |
| 🛠️ **Skills**     | 34    | Domain knowledge modules (API, Testing, PR Toolkit, Docker...)         |
| ⌨️ **Commands**   | 37    | Slash commands for every development workflow                          |
| 🔄 **Workflows**  | 21    | Process templates (/create, /debug, /deploy, /pr, /pr-merge...)        |
| ✅ **Checklists** | 4     | Quality gates (session-start, session-end, pre-commit, task-complete)  |
| 🔗 **Hooks**      | 8     | Event-driven automation (runtime + git-hook enforcement)               |
| ⚙️ **Runtime**    | 29    | Runtime engine modules (governance, reputation, self-healing...)       |
| ⚖️ **Rules**      | 9     | Modular governance constraints (coding, security, testing, git, docs, sprint)  |

---

## Quick Links

<div class="grid cards" markdown>

- :rocket: **[Getting Started](getting-started.md)**

  NPX install in 30 seconds

- :robot: **[Agents](agents/index.md)**

  23 specialized agents for delegation

- :keyboard: **[Commands](commands/index.md)**

  37 slash commands for quick execution

- :gear: **[Skills](skills/index.md)**

  34 domain expertise modules

- :arrows_counterclockwise: **[Workflows](workflows/index.md)**

  21 full development workflows

- :repeat: **[Session Management](session-management.md)**

  Never lose context between sessions

- :scales: **[Governance](governance/index.md)**

  Trust-Grade operating constraints

- :gear: **[Runtime Engine](#runtime-engine)**

  29 modules powering the runtime

- :book: **[Contributor Guide](contributor-guide.md)**

  End-to-end project lifecycle

- :desktop_computer: **[Cross-IDE Setup](cross-ide-setup.md)**

  5 IDEs from one manifest

</div>

---

## Core Philosophy

!!! quote "Trust > Optimization. Safety > Growth. Explainability > Performance."

This isn't just a collection of prompts. It's an **engineered framework** that enforces professional standards through immutable operating constraints.

---

## Key Features

- **🔒 Trust-Grade Governance** — `/explore → /plan → /work → /review` — Each iteration builds context
- **🤖 Multi-Agent System** — 23 specialized agents that collaborate (Mobile Developer, DevOps, PR Reviewer...)
- **⚙️ Runtime Engine** — 29 modules enforcing workflow transitions, task governance, agent reputation, and self-healing
- **📦 Context as Artifact** — Persistent markdown files for plans, specs, and decisions
- **🔄 Continuous Learning** — PAAL cycle extracts patterns from every session
- **🛡️ Security First** — Built-in secret detection, vulnerability scanning, and compliance checks

---

## What's New in v4.2.1

- **Untrack hint** — Detects tracked `.agent/` and prints the `git rm --cached` command
- **Documentation fixes** — Updated release notes, stale test counts corrected

## What's New in v4.2.0

- **Gitignore by default** — `kit init` adds `.agent/` to `.gitignore` automatically. Personal dev tooling stays local.
- **`--shared` flag** — Opt-in for teams that want to commit `.agent/` to the repo
- **Cross-IDE Support** — Native config generation for Claude Code, Antigravity, Cursor, OpenCode, and Codex
- **3 Language Reviewers** — TypeScript, Python, Go specialized code review agents
- **388 tests** — 37 test suites across unit, structural, and security
