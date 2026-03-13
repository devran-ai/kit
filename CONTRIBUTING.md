# Contributing to Antigravity AI Kit

Thank you for your interest in contributing to **Antigravity AI Kit**! 🚀

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/antigravity-ai-kit.git
   cd antigravity-ai-kit
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Run tests** to verify everything works:
   ```bash
   npm test
   ```

## Development Workflow

### Branch Naming

Use conventional branch names:

```
feat/add-python-agent
fix/cli-init-error
docs/update-readme
```

### Commit Messages

We follow **Conventional Commits**:

```
feat(agents): add python-specialist agent
fix(cli): handle missing .agent directory gracefully
docs(readme): update skills count to 28
test(security): add injection scan for new patterns
chore(deps): update vitest to 3.x
```

### Running Tests

```bash
npm test                    # Run all 43 tests
npx vitest run --reporter=verbose  # Verbose output
npx vitest watch            # Watch mode
```

Test suites:
- **Unit tests** (`tests/unit/`) — CLI command tests
- **Structural tests** (`tests/structural/`) — Inventory + schema validation
- **Security tests** (`tests/security/`) — Injection scan + leakage detection

### Quality Checks

Before submitting a PR, ensure:
- [ ] All tests pass (`npm test`)
- [ ] No hardcoded secrets
- [ ] No BeSync-specific language
- [ ] Counts are synchronized (manifest, README, rules.md, CLI)
- [ ] New agents/skills include YAML frontmatter

## Adding New Components

### Adding an Agent

1. Create `.agent/agents/your-agent.md` with frontmatter:
   ```markdown
   ---
   name: your-agent
   description: What this agent does
   triggers: [keyword1, keyword2]
   ---
   # Your Agent
   Instructions...
   ```
2. Add entry to `.agent/manifest.json`
3. Update count in `README.md`, `.agent/rules.md`, `bin/ag-kit.js`
4. Run `npm test` to verify structural integrity

### Adding a Skill

1. Create `.agent/skills/your-skill/SKILL.md` with frontmatter:
   ```markdown
   ---
   name: your-skill
   description: What this skill does
   triggers: [keyword1, keyword2]
   ---
   # Your Skill
   ## Overview
   ...
   ```
2. Add entry to `.agent/manifest.json`
3. Update counts everywhere (see Adding an Agent, step 3)
4. Run `npm test`

### Adding a Workflow

1. Create `.agent/workflows/your-workflow.md` with frontmatter:
   ```markdown
   ---
   description: What this workflow does
   ---
   # Steps...
   ```
2. Add entry to `.agent/manifest.json`
3. Update counts
4. Run `npm test`

## Code Standards

- **Zero dependencies** — the core kit uses only Node.js built-ins
- **Strict type safety** — use JSDoc annotations for all functions
- **Descriptive names** — no abbreviations
- **Max file length** — 800 lines per file, 50 lines per function

## Pull Request Process

1. Create a PR against `main`
2. Describe what changed and why
3. Ensure all CI checks pass
4. Request review

## Questions?

Open an [issue](https://github.com/besync-labs/antigravity-ai-kit/issues) or start a [discussion](https://github.com/besync-labs/antigravity-ai-kit/discussions).

---

**Thank you for helping make Antigravity AI Kit better!** 💜
