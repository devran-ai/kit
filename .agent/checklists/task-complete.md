# Task-Complete Checkpoint

> **Framework**: Devran AI Kit
> **Purpose**: Decision gate after task completion — present options before commit/push
> **Principle**: Human-in-the-loop governance

---

## 🎯 Trigger Condition

This checkpoint activates when:
- Implementation work is complete AND quality gates have passed (VERIFY → CHECKPOINT transition)
- The agent has made code changes that are ready for commit

This checkpoint does NOT activate when:
- The developer has explicitly enabled "skip checkpoint" mode for the session
- The change is docs-only or config-only (handled by commit-type scoping)

---

## 📋 Decision Prompt

Present these options to the developer:

| # | Action | Command | When to Recommend |
|:--|:-------|:--------|:-----------------|
| 1 | 🔍 Quality Review | `/review` | ✅ Always (if not already run) |
| 2 | 🛡️ Retrospective Audit | `/retrospective` | Sprint-end or milestone |
| 3 | 📋 Update Tracking | Manual | ✅ Always |
| 4 | 📦 Commit & Push | `git commit + push` | After review passes |
| 5 | 🔀 Pull Request | `/pr` | Feature branch with commits |
| 6 | 🔚 Session-End | Protocol | End of work session |
| 7 | 🚀 Deploy | `/deploy` | Production-impacting changes |
| 8 | 📝 Continue Working | Skip commit | Batching multiple changes |
| 9 | ⏭️ Skip Checkpoint | Session flag | Rapid iteration mode |

**Prompt format:**

```
How should we proceed?

1. 🔍 /review — Run quality gates (lint, type-check, test, security, build)
2. 🛡️ /retrospective — Tier-1 audit (architecture, market benchmark, ethics)
3. 📋 Update tracking — Sync ROADMAP.md, session-context.md, session-state.json
4. 📦 Commit & push — Stage, commit (conventional), push to remote
5. 🔀 /pr — Create pull request with pre-flight checks and CI verification
6. 🔚 Session-end protocol — Preserve context and prepare for handoff
7. 🚀 /deploy — Production deployment with pre-flight checks
8. 📝 Continue working — Proceed to next task without committing
9. ⏭️ Skip checkpoint — Disable checkpoint for remainder of session

> Choose options (e.g., "1, 3, 4" or "1 through 5"):
```

---

## ✅ Prerequisite Gate

Verify before offering downstream options:

| Option | Prerequisite | Check |
| :----- | :----------- | :---- |
| `/pr` | Tests passing + review approved | `git status` clean, last test run green |
| `/deploy` | PR merged + CI passing | Check GitHub Actions status |
| `/review` | Build succeeds | `npm run build` exit 0 |
| `/retrospective` | Sprint boundary reached | Check ROADMAP.md sprint dates |

> If prerequisite not met — show ⚠️ warning next to option, do not disable it.

---

## 🧠 Recommendation Intelligence

Dynamically adjust recommendations based on:

- [ ] **Sprint boundary**: If ROADMAP shows sprint ending → recommend `/retrospective`
- [ ] **Production files**: If `apps/api/**` or `apps/web/**` changed → recommend `/deploy`
- [ ] **Session duration**: If >2 hours of work → recommend session-end
- [ ] **File count**: If >5 files changed → recommend atomic commit review
- [ ] **New code without tests**: Flag with ⚠️ if test coverage gap detected
- [ ] **Security-sensitive**: If auth/crypto/token files changed → recommend `/review security`
- [ ] **Feature branch**: If on feature branch with unpushed commits → recommend `/pr`

---

## 🔒 Governance

**PROHIBITED:**
- Committing or pushing without presenting this checkpoint
- Auto-selecting options without developer input
- Skipping this checkpoint for session-end commits

**REQUIRED:**
- Present decision prompt after every task completion
- Wait for explicit developer response
- Log the developer's choice for session audit trail
