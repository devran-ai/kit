# FAQ

## Git & Teams

**Should I commit `.agent/` to git?**

By default, no. `kit init` adds `.agent/` to `.gitignore` automatically. The framework is personal dev tooling — your teammates who don't use it are unaffected. Anyone who wants it runs `npx @devran-ai/kit init`. For teams that agree to share it, use `kit init --shared`.

**Will it conflict with my project's CLAUDE.md?**

No. Your `CLAUDE.md` remains the single source of truth for team rules. The kit's `.agent/rules.md` provides additional governance for AI agents but does not override or duplicate your project-specific rules.

**Does it affect CI/CD?**

No. Since `.agent/` is gitignored by default, CI pipelines never see it. The kit is developer tooling, not build infrastructure.

---

## General

**What is Devran AI Kit?**

A trust-grade AI development framework with 26 specialized agents, 39 skills, 40 commands, 25 workflows, 15 governance rules, and a 43-module zero-dependency runtime engine. It transforms your IDE into a virtual engineering team.

**How is it different from prompt collections?**

Kit includes a full runtime engine (workflow state machine, agent reputation scoring, circuit breaker, error budget, self-healing CI) — not just markdown files. It enforces professional standards through immutable operating constraints.

**Does it have any dependencies?**

Zero production dependencies. The entire runtime (8,000+ LOC) is built with native Node.js APIs.

---

## IDE Support

**Which IDEs are supported?**

Claude Code, Antigravity, Cursor, OpenCode, Codex, VS Code Copilot, and Windsurf. All configured automatically by `kit init` with IDE auto-detection and slash command bridge generation.

**Do I need to configure each IDE separately?**

No. `kit init` generates native configs for all supported IDEs from a single `manifest.json` source of truth.

**Can I skip IDE config generation?**

Yes: `kit init --skip-ide`

**Can I generate for a single IDE?**

Yes: `kit init --ide cursor`

---

## Customization

**Can I add custom agents?**

Yes. Create a `.md` file in `.agent/agents/` following the agent specification format. Custom agents inherit the operating constraints from `rules.md`.

**Can I modify governance rules?**

Rules in `.agent/rules/` are preserved across updates. You can add or modify rules without losing them.

**Are plugins supported?**

Yes. Kit has a plugin marketplace with trust-verified skills. Use `kit market search` to browse.

---

## Troubleshooting

**`kit verify` reports missing files**

Run `kit update` to restore framework files without overwriting your customizations.

**Tests are failing after update**

Run `npm test` to identify the specific failures. If structural tests fail, check that manifest.json counts match the actual file count.

**Git shows `.cursor/commands/` or `.agent/` as modified after `kit init` or `kit update`**

This is the auto-untrack feature (v5.2.8+) doing its job. If Kit artifacts were accidentally committed to your repo before `.gitignore` was configured, `kit init` and `kit update` now actively remove them from the git index while keeping the working-tree files intact. Review the changes with `git status` and commit them to finalize the cleanup — the files themselves are not deleted.

**Claude Code slash commands stopped appearing after I added `.claude/` to `.gitignore`**

Blanket `.claude/` in `.gitignore` breaks Claude CLI's directory discovery. Run `kit update` — Kit v5.2.6+ automatically narrows blanket `.claude/` to `.claude/commands/`, which keeps bridge files local while letting the CLI discover the directory.

---

For installation instructions, see **[Getting Started](getting-started.md)**.
