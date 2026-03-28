---
description: Display project and progress status. Current state overview.
version: 2.1.0
sdlc-phase: cross-cutting
skills: [verification-loop]
commit-types: [chore]
---

# /project-status — Project Status Overview

> **Trigger**: `/project-status [sub-command]`
> **Lifecycle**: Cross-cutting — any SDLC phase

> Standards: See `rules/workflow-standards.md`

> [!NOTE]
> Read-only workflow. Gathers and displays data without modifying anything.

---

## Critical Rules

1. Accurate live data — never cached
2. Always include health checks
3. Non-destructive — never modify files or state

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/project-status` | Full report |
| `/project-status brief` | One-line summary |
| `/project-status health` | Build, tests, server only |
| `/project-status git` | Branch, changes, commits only |

---

## Steps

// turbo
1. **Project** — name, path, type, stack

// turbo
2. **Git** — branch, last commit, uncommitted changes, ahead/behind

// turbo
3. **Progress** — read ROADMAP/tasks, count completed/in-progress/pending

// turbo
4. **Health** — build status, test status, server status

// turbo
5. **Statistics** — files created/modified, recent changes

---

## Output Template

```markdown
## 📈 Project Status

- **Project**: [name] · [stack]
- **Branch**: [name] · [changes]
- **Health**: Build/Tests/Server status
- **Progress**: [completed]/[total] tasks
```

---

## Governance

**PROHIBITED:** Modifying files · reporting stale data · skipping health checks

**REQUIRED:** Live data · health checks · accurate progress

---

## Completion Criteria

- [ ] Project type and stack identified (source: config files — `package.json`, `Cargo.toml`, etc.)
- [ ] Git state captured: branch name, HEAD commit SHA, uncommitted file count, ahead/behind remote (source: `git status`, `git log`)
- [ ] Health checks executed: build exit code, test pass/fail, server reachable (source: live commands — never cached)
- [ ] Task progress counted: completed/in-progress/pending with totals (source: ROADMAP.md or task tracking file)
- [ ] Statistics gathered: files created/modified in current branch (source: `git diff --stat`)

---

## Related Resources

- **Cross-cutting**: Available at any phase
- **Related**: `/retrospective` · `/deploy`
