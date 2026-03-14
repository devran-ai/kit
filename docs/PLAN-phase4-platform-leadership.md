## 📋 Plan: Phase 4 — Platform Leadership (Final — 3-Pass Audit)

> **Version**: v2.4.0  
> **Audit**: Tier-1 Final (22 findings across 3 passes)  
> **Constraint**: Zero new npm dependencies — `git` CLI assumed present

---

### Scope

**Covers**: 5 of 8 deliverables — reputation scoring, decision timeline, engineering manager, self-healing pipeline, marketplace MVP.

**Deferred**: Enterprise SSO (4.6), Multi-IDE (4.7), Real-Time Collab (4.8).

### Order: 4.4 → 4.2 → 4.1 → 4.3 → 4.5

---

### Tasks

#### 4.4 Agent Reputation Scoring
1. [ ] `lib/agent-reputation.js` — `recordOutcome()`, `getReputation()`, `getRankings()`, `decayScores()`
   - Score clamped `[0, 1000]`, cold-start bonus 250, 30-day decay
2. [ ] `tests/unit/agent-reputation.test.js`

#### 4.2 Decision Timeline
3. [ ] **Extend** `lib/task-governance.js` — `recordDecision()`, `getTimeline()`, `getDecisionsByActor()`, `getDecisionSummary()`
   - Backward compat + 500-entry rotation
4. [ ] `tests/unit/decision-timeline.test.js`

#### 4.1 Engineering Manager
5. [ ] `lib/engineering-manager.js` — `generateSprintPlan()`, `autoAssignTask()`, `suggestNextTask()`, `getSprintMetrics()`
   - Powers sprint-orchestrator agent, advisory-only
6. [ ] `tests/unit/engineering-manager.test.js`

#### 4.3 Self-Healing Pipeline
7. [ ] `lib/self-healing.js` — `detectFailure(ciOutput)`, `diagnoseFailure()`, `generateFixPatch()`, `applyFixWithConfirmation()`, `getHealingReport()`
   - JSON patch format, dry-run default, 3 input modes
8. [ ] `tests/unit/self-healing.test.js`

#### 4.5 Marketplace + CLI
9. [ ] `lib/marketplace.js` — `searchMarket()`, `getMarketInfo()`, `installFromMarket()`, `updateRegistryIndex()`
10. [ ] Harden `lib/plugin-system.js` — path traversal defense-in-depth
11. [ ] `.agent/engine/marketplace-index.json` — 3 sample entries
12. [ ] `lib/cli-commands.js` — extracted command handlers (keeps ag-kit.js < 800 lines)
13. [ ] Update `bin/ag-kit.js` — delegate + 3 dashboard sections (Reputation, Sprint, Health)
14. [ ] `tests/unit/marketplace.test.js`

---

### File Summary

| Action | File | Deliverable |
|:---|:---|:---|
| [NEW] | `lib/agent-reputation.js` | 4.4 |
| [MODIFY] | `lib/task-governance.js` | 4.2 |
| [NEW] | `lib/engineering-manager.js` | 4.1 |
| [NEW] | `lib/self-healing.js` | 4.3 |
| [NEW] | `lib/marketplace.js` | 4.5 |
| [NEW] | `lib/cli-commands.js` | 4.3 + 4.5 |
| [MODIFY] | `lib/plugin-system.js` | 4.5 |
| [NEW] | `.agent/engine/marketplace-index.json` | 4.5 |
| [NEW] | 5 test files | all |
| [MODIFY] | `bin/ag-kit.js` | CLI + dashboard |
| **Total** | **6 new + 3 modified + 5 tests + 1 config** | |
