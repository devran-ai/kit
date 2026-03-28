---
description: Git operations and commit management
uses: [git-workflow]
---

# /git Command

Execute Git operations following conventional commits and project git workflow. See `.agent/rules/git-workflow.md` for standards.

## Usage

| Command | Action |
| :--- | :--- |
| `/git status` | Show repository status |
| `/git commit "[msg]"` | Commit with conventional message format |
| `/git branch [name]` | Create feature branch with naming convention |
| `/git sync` | Fetch and rebase on main/develop |
| `/git log` | Show recent commit history |

## Examples

```
/git status
/git commit "feat(auth): add JWT refresh token rotation"
/git branch feature/ABC-123-user-profile
/git sync
```

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

Types: feat, fix, docs, style, refactor, test, chore, perf
Scope: module or domain (auth, users, payments)
Description: imperative, lowercase, no period
```

## Branch Naming Convention

| Type | Pattern | Example |
| :--- | :--- | :--- |
| Feature | `feature/{ticket}-{slug}` | `feature/ABC-42-user-auth` |
| Fix | `fix/{ticket}-{slug}` | `fix/ABC-99-login-error` |
| Release | `release/v{semver}` | `release/v1.2.0` |

## Related Commands

`/checkpoint` — git tag save points · `/pr` — open pull request · `/changelog` — generate from git history
