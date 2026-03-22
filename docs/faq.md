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

A trust-grade AI development framework with 23 specialized agents, 34 skills, 21 workflows, and a 31-module zero-dependency runtime engine. It transforms your IDE into a virtual engineering team.

**How is it different from prompt collections?**

Kit includes a full runtime engine (workflow state machine, agent reputation scoring, circuit breaker, error budget, self-healing CI) — not just markdown files. It enforces professional standards through immutable operating constraints.

**Does it have any dependencies?**

Zero production dependencies. The entire runtime (8,000+ LOC) is built with native Node.js APIs.

---

## Installation

**How do I install it?**

```bash
npx @devran-ai/kit init
```

**Can I add it to an existing project?**

Yes. Run `kit init` in your project root. It creates a `.agent/` directory without modifying your existing code.

**How do I update?**

```bash
kit update
```

This is non-destructive — your session data, decisions, and custom rules are preserved.

---

## IDE Support

**Which IDEs are supported?**

Claude Code, Antigravity, Cursor, OpenCode, and Codex. All configured automatically by `kit init`.

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
