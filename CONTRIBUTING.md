# Contributing to Devran AI Kit

Thank you for your interest in contributing to **Devran AI Kit**!

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/kit.git
   cd kit
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Run tests** to verify everything works:
   ```bash
   npm test
   ```

## GitHub Flow

We use **GitHub Flow** — all changes go through pull requests to `main`.

```
feature/xxx  →  PR  →  main
                 ↑
           CI + Review
```

### Branch Rules

| Branch Type | Base | Target | Example |
|:---|:---|:---|:---|
| `feat/*` | `main` | `main` | `feat/add-python-agent` |
| `fix/*` | `main` | `main` | `fix/cli-init-error` |
| `refactor/*` | `main` | `main` | `refactor/loading-engine` |
| `docs/*` | `main` | `main` | `docs/update-readme` |
| `chore/*` | `main` | `main` | `chore/bump-deps` |

### Branch Protection

- `main` is protected: **no direct pushes**, PRs required
- `main` cannot be deleted or force-pushed
- Feature branches are deleted after merge

### Creating a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

## Development Workflow

1. **Sync `main`**: `git checkout main && git pull origin main`
2. **Create branch**: `git checkout -b feat/your-feature-name`
3. **Make changes** and commit with conventional messages
4. **Run tests**: `npm test`
5. **Push** your branch: `git push -u origin feat/your-feature-name`
6. **Create PR** targeting `main`
7. **Wait** for CI checks and reviewer approval
8. **Squash-merge** after approval

### Commit Messages

We follow **Conventional Commits**:

```
feat(agents): add python-specialist agent
fix(cli): handle missing .agent directory gracefully
docs(readme): update skills count to 35
test(security): add injection scan for new patterns
chore(deps): update vitest to 3.x
```

### Running Tests

```bash
npm test                           # Run all tests
npx vitest run --reporter=verbose  # Verbose output
npx vitest watch                   # Watch mode
```

Test suites:
- **Unit tests** (`tests/unit/`) — CLI command tests
- **Structural tests** (`tests/structural/`) — Inventory + schema validation
- **Security tests** (`tests/security/`) — Injection scan + leakage detection

### Quality Checks

Before submitting a PR, ensure:
- [ ] All tests pass (`npm test`)
- [ ] No hardcoded secrets
- [ ] Counts are synchronized (manifest, README, CLI)
- [ ] New agents/skills include YAML frontmatter
- [ ] PR title uses conventional commit format

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
3. Update count in `README.md` and `bin/kit.js`
4. Run `npm test` to verify structural integrity

### Adding a Skill

1. Create `.agent/skills/your-skill/SKILL.md` with frontmatter
2. Add entry to `.agent/manifest.json`
3. Update counts (see Adding an Agent, step 3)
4. Run `npm test`

### Adding a Workflow

1. Create `.agent/workflows/your-workflow.md` with frontmatter
2. Add entry to `.agent/manifest.json`
3. Update counts
4. Run `npm test`

## Release Process

1. All features merged into `main` via PRs
2. Tag: `git tag vX.Y.Z`
3. Publish: `npm publish`

## Code Standards

- **Zero dependencies** — the core kit uses only Node.js built-ins
- **Immutable patterns** — spread, filter, map — never mutate
- **Structured logging** — use `createLogger` in all catch blocks
- **Strict type safety** — use JSDoc annotations for all functions
- **Descriptive names** — no abbreviations
- **Max file length** — 800 lines per file, 50 lines per function

## Questions?

Open an [issue](https://github.com/devran-ai/kit/issues) or start a [discussion](https://github.com/devran-ai/kit/discussions).
