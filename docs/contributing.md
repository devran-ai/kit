# Contributing

We welcome contributions! Here's how to get started.

---

## Git Workflow (GitHub Flow)

This project uses **GitHub Flow** — all changes go through pull requests to `main`.

```
feature/xxx  →  PR  →  main
                 ↑
           CI + Review
```

### For Contributors

1. **Fork** the repository
2. **Create** a feature branch from `main`: `git checkout -b feat/my-feature`
3. **Make** your changes (small, focused commits)
4. **Run** verification: `npm test` and `/verify`
5. **Push** and open a PR against `main`

### For Maintainers

1. **Create** a branch from `main`: `git checkout -b feat/my-feature`
2. **Develop** with conventional commits
3. **Push** the branch: `git push -u origin feat/my-feature`
4. **Open PR** against `main` — CI runs automatically
5. **Merge** via GitHub (squash or merge commit)
6. **Delete** the feature branch after merge

### Branch Naming

| Type | Pattern | Example |
|:-----|:--------|:--------|
| Feature | `feat/description` | `feat/agent-scheduling` |
| Bug fix | `fix/description` | `fix/circuit-breaker-reset` |
| Refactor | `refactor/description` | `refactor/immutable-state` |
| Docs | `docs/description` | `docs/telegram-guide` |
| Chore | `chore/description` | `chore/update-deps` |

### Branch Protection

- `main` is protected: **no direct pushes**, PRs required
- `main` cannot be deleted or force-pushed
- Feature branches are deleted after merge

---

## Guidelines

### Code Quality

- Follow existing patterns and conventions
- Use immutable data patterns (spread, filter, map — never mutate)
- Add structured logging to all catch blocks (`createLogger`)
- Validate all public function parameters
- Document complex logic with JSDoc

### Commits

Use conventional commit format:

```
feat: add new mobile-patterns skill
fix: resolve agent routing issue
docs: update getting-started guide
```

### Pull Requests

- Clear description of changes
- Reference any related issues
- Include verification results
- Update documentation if needed

---

## Adding New Components

### New Agent

1. Create `.agent/agents/agent-name.md`
2. Follow the agent template
3. Add triggers and capabilities
4. Test with relevant workflows

### New Skill

1. Create `.agent/skills/skill-name/SKILL.md`
2. Document patterns and usage
3. Include code examples
4. Test activation keywords

### New Command

1. Create `.agent/commands/command-name.md`
2. Document usage and examples
3. Link to relevant agents/skills
4. Test in development

### New Workflow

1. Create `.agent/workflows/workflow-name.md`
2. Define step-by-step process
3. Include verification steps
4. Test complete lifecycle

---

## Verification

Before submitting, run:

```
/verify
```

This checks:

- ✅ Build passes
- ✅ Lint passes
- ✅ Tests pass
- ✅ No security issues

---

## Questions?

- Open an [issue](https://github.com/devran-ai/kit/issues)
- Check existing discussions
- Review the [documentation](https://devran-ai.github.io/kit)
