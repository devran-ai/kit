## 📋 Plan: Phase 3 — Collaboration & Security

> **Version**: v2.3.0  
> **Scope**: 7 deliverables extending the v2.2.0 runtime engine  
> **Constraint**: Zero new production dependencies — all modules use Node.js built-ins + JSON file persistence  
> **Architecture**: CommonJS `lib/` modules, consistent with Phase 1–2 patterns

---

### Scope

**Covers**: Developer identity, task governance with locking/audit trail, skill sandboxing, agent conflict detection, enriched CLI dashboard, full plugin system (skills + agents + workflows + hooks + engine configs), and enhanced runtime security scanning.

**Does NOT cover**: Web-based dashboard (Next.js deferred to separate project), GitHub OAuth (deferred to enterprise phase), database persistence (SQLite/PostgreSQL deferred).

---

### Dependency Map

```
3.1 Developer Identity ──────┐
                              ├──→ 3.2 Task Governance (needs identity for locking/assignment)
3.4 Agent Conflict Detection ─┘
3.3 Skill Sandboxing ── standalone
3.5 CLI Dashboard Enhancement ── depends on all modules
3.6 Plugin System ── depends on 3.1 (identity for authorship)
3.7 Enhanced Security Scanning ── standalone
```

**Implementation order**: 3.1 → 3.3 → 3.4 → 3.7 → 3.2 → 3.6 → 3.5

---

### Tasks

#### 3.1 Developer Identity System

1. [ ] Create `lib/identity.js` — **Verify**: Module exports `getCurrentIdentity()`, `registerIdentity()`, `validateIdentity()`
   - Stores developer profile in `.agent/engine/identity.json`
   - Fields: `id` (UUID), `name`, `email`, `role` (owner/contributor), `registeredAt`, `lastActiveAt`
   - Auto-detects from `git config user.name` and `git config user.email` via `child_process.execSync`
   - Supports multiple identities for multi-developer scenarios
   - Generates deterministic developer ID from email hash (SHA-256 truncated)

2. [ ] Create `tests/unit/identity.test.js` — **Verify**: All identity lifecycle tests pass
   - Registration, retrieval, validation, multi-developer registry
   - Git config auto-detection (mocked)
   - Invalid identity rejection

---

#### 3.2 Task Governance Engine

Extends Phase 2 `task-model.js` with locking, assignment enforcement, and audit trail.

3. [ ] Create `lib/task-governance.js` — **Verify**: Module exports `lockTask()`, `unlockTask()`, `assignTask()`, `getAuditTrail()`, `isTaskLocked()`
   - **Locking**: Optimistic file-based lock per task ID (lock file in `.agent/engine/locks/`)
   - **Assignment authority**: Only assignee or owner identity can transition a locked task
   - **Audit trail**: Append-only log of all task mutations with identity + timestamp + action
   - Audit stored in `.agent/engine/audit-log.json`
   - Integrates with `identity.js` for identity-aware operations

4. [ ] Create `tests/unit/task-governance.test.js` — **Verify**: All governance tests pass
   - Lock/unlock lifecycle
   - Assignment enforcement (reject unauthorized transitions)
   - Audit trail completeness
   - Concurrent lock detection

---

#### 3.3 Skill Sandboxing

5. [ ] Create `lib/skill-sandbox.js` — **Verify**: Module exports `validateSkillPermissions()`, `getSkillPermissions()`, `enforceAllowedTools()`
   - Reads `allowed-tools` from skill `SKILL.md` frontmatter
   - Validates that a skill only references tools within its declared permission set
   - Permission model: `read-only`, `read-write`, `execute`, `network`
   - Reports violations as structured objects with severity levels
   - Scans skill directories for undeclared tool usage patterns

6. [ ] Create `tests/unit/skill-sandbox.test.js` — **Verify**: All sandboxing tests pass
   - Permission extraction from frontmatter
   - Violation detection
   - Permission enforcement
   - Skill directory scan

---

#### 3.4 Agent Conflict Detection

7. [ ] Create `lib/conflict-detector.js` — **Verify**: Module exports `detectConflicts()`, `getFileOwnership()`, `reportConflicts()`
   - Tracks which agent is currently modifying which files (via `.agent/engine/file-locks.json`)
   - Detects when two agents claim the same file path
   - Reports conflicts with severity (warning vs blocking)
   - Provides `claimFile()` and `releaseFile()` for agent file ownership
   - Includes stale lock detection (locks older than configurable TTL auto-expire)

8. [ ] Create `tests/unit/conflict-detector.test.js` — **Verify**: All conflict detection tests pass
   - File claim/release lifecycle
   - Conflict detection between two agents
   - Stale lock expiry
   - Ownership reporting

---

#### 3.5 CLI Dashboard Enhancement

9. [ ] Modify `bin/ag-kit.js` — **Verify**: `ag-kit dashboard` shows all new Phase 3 sections
   - Add identity section (current developer, role)
   - Add task governance section (locked tasks, audit trail count)
   - Add security scan summary
   - Add plugin count
   - Add conflict status
   - Structured sections with ANSI color headers

---

#### 3.6 Plugin System (Full with Hooks)

10. [ ] Create `lib/plugin-system.js` — **Verify**: Module exports `installPlugin()`, `removePlugin()`, `listPlugins()`, `validatePlugin()`, `getPluginHooks()`
    - **Plugin manifest**: Each plugin is a directory with `plugin.json` containing:
      - `name`, `version`, `author`, `description`
      - `agents[]` — agent `.md` files to install
      - `skills[]` — skill directories to install
      - `workflows[]` — workflow `.md` files to install
      - `hooks[]` — lifecycle hook definitions to merge into `hooks.json`
      - `engineConfigs{}` — engine config patches to merge
    - **Install**: Copies plugin contents to `.agent/plugins/{name}/`, then symlinks or copies assets to appropriate directories
    - **Remove**: Reverses install, cleans up symlinks/copies
    - **Validate**: Checks plugin.json schema, verifies all referenced files exist, validates hook event names
    - **Hook merge**: Merges plugin hooks into `hooks.json` under a `source: plugin:{name}` tag for traceability
    - **Conflict check**: Detects naming collisions with existing agents/skills/workflows before install
    - Plugins registry stored in `.agent/engine/plugins-registry.json`

11. [ ] Add CLI commands to `bin/ag-kit.js` — **Verify**: `ag-kit plugin install <path>`, `ag-kit plugin remove <name>`, `ag-kit plugin list` work correctly
    - `ag-kit plugin install <path>` — Install from local directory
    - `ag-kit plugin remove <name>` — Remove installed plugin
    - `ag-kit plugin list` — List all installed plugins with status

12. [ ] Create `tests/unit/plugin-system.test.js` — **Verify**: All plugin lifecycle tests pass
    - Plugin validation (valid/invalid manifest)
    - Install/remove lifecycle
    - Hook merging and unmerging
    - Conflict detection
    - Engine config patching
    - Plugin registry persistence

---

#### 3.7 Enhanced Security Scanning

13. [ ] Create `lib/security-scanner.js` — **Verify**: Module exports `scanForInjection()`, `scanForSecrets()`, `scanForAnomalies()`, `getSecurityReport()`
    - **Runtime injection detection**: Scans agent/skill files for prompt injection patterns (`ignore previous`, `system override`, `act as`, role hijacking)
    - **Secret detection**: Scans all `.md` and `.json` files for API keys, tokens, passwords (regex patterns)
    - **Anomaly alerting**: Detects unusual file size changes, unexpected file types, binary files in agent dirs
    - **Report**: Structured security report with severity levels and recommended actions
    - Extends existing `tests/security/injection-scan.test.js` patterns

14. [ ] Add CLI `ag-kit scan` command to `bin/ag-kit.js` — **Verify**: `ag-kit scan` produces structured security report
    - Runs all three scan types
    - Outputs summary with pass/fail/warning counts
    - Exit code 1 if critical findings detected

15. [ ] Create `tests/unit/security-scanner.test.js` — **Verify**: All security scanning tests pass
    - Injection pattern detection
    - Secret pattern detection  
    - Anomaly detection
    - Report generation
    - Known-safe file handling (no false positives on existing agents)

---

### Agent Assignments

| Task | Agent | Domain |
| :--- | :---- | :----- |
| 3.1, 3.2 Identity + Governance | architect | System design |
| 3.3 Skill Sandboxing | security-reviewer | Permission model |
| 3.4 Conflict Detection | architect | Concurrency patterns |
| 3.5 Dashboard | frontend-specialist | CLI UX |
| 3.6 Plugin System | architect | Extension architecture |
| 3.7 Security Scanning | security-reviewer | Vulnerability analysis |

---

### Risks & Considerations

| Risk | Mitigation |
|:---|:---|
| Plugin system could introduce untrusted code | Validation layer + sandboxing enforced before install |
| File locking on Windows vs Unix | Use JSON-based locks (not OS file locks) for portability |
| Identity auto-detection fails without git | Fallback to manual registration with `ag-kit identity register` |
| Hook merging conflicts with existing hooks | Plugin hooks tagged with `source` field for clean uninstall |
| Security scanner false positives | Allowlist mechanism in `security-config.json` for known-safe patterns |

---

### Verification Plan

```powershell
# Automated tests — target ~190+ total tests
npx vitest run

# CLI verification
node bin/ag-kit.js --version          # Still 2.2.0 (or bump to 2.3.0)
node bin/ag-kit.js verify             # 90+ checks pass
node bin/ag-kit.js dashboard          # Shows identity, governance, hooks, plugins, security
node bin/ag-kit.js scan               # Security report with 0 critical findings
node bin/ag-kit.js plugin list        # Empty initially
```

---

### File Summary

| Action | File | Deliverable |
|:---|:---|:---|
| [NEW] | `lib/identity.js` | 3.1 |
| [NEW] | `lib/task-governance.js` | 3.2 |
| [NEW] | `lib/skill-sandbox.js` | 3.3 |
| [NEW] | `lib/conflict-detector.js` | 3.4 |
| [NEW] | `lib/plugin-system.js` | 3.6 |
| [NEW] | `lib/security-scanner.js` | 3.7 |
| [NEW] | `tests/unit/identity.test.js` | 3.1 |
| [NEW] | `tests/unit/task-governance.test.js` | 3.2 |
| [NEW] | `tests/unit/skill-sandbox.test.js` | 3.3 |
| [NEW] | `tests/unit/conflict-detector.test.js` | 3.4 |
| [NEW] | `tests/unit/plugin-system.test.js` | 3.6 |
| [NEW] | `tests/unit/security-scanner.test.js` | 3.7 |
| [MODIFY] | `bin/ag-kit.js` | 3.5 + 3.6 CLI |
| **Total** | **6 new modules + 6 test files + 1 CLI mod** | |

---

✅ Plan saved: `docs/PLAN-phase3-collaboration-security.md`

Approve to start implementation with `/enhance`.
