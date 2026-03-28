# PR Bot Parsers

> **Purpose**: Parsing rules for each supported review bot. Used by `/pr-fix` (Step 2) and `/pr-review` (Step 3b).

---

## Gemini Code Assist

**Comment pattern**: Posted as regular PR comments from user `gemini-code-assist[bot]`.

**Severity extraction**:
- `**High Priority**` → P1 HIGH
- `**Medium Priority**` → P2 MEDIUM
- `**Low Priority**` / `**Nitpick**` → P3 LOW

**Suggested change extraction**:
```
Look for code blocks preceded by "Suggested change" or "Consider changing"
Extract: file path from comment context + suggested replacement code
```

**Ignore patterns**: Comments containing "LGTM", "looks good", "no issues" → skip.

---

## CodeRabbit

**Comment pattern**: Posted as review comments from `coderabbitai[bot]` with badge emojis.

**Severity extraction**:
- 🔴 or `[critical]` → P0 CRITICAL
- 🟠 or `[major]` → P1 HIGH
- 🟡 or `[minor]` → P2 MEDIUM
- 💡 or `[nitpick]` → P3 LOW

**Structure**: Each finding has `file:line` in comment position + description + optional fix suggestion in code block.

**Walkthrough comments**: Top-level summaries — read for context but don't extract as individual findings.

---

## SonarCloud / SonarQube

**Comment pattern**: Status checks + PR decorations from `sonarcloud[bot]`.

**Quality gate extraction**: Check `gh pr checks` output:
- `Quality Gate: failed` → extract failed conditions
- Condition pattern: `[metric] [value] > [threshold]` → P1 HIGH

**Code smell mapping**:
- `BUG` → P1 HIGH
- `VULNERABILITY` → P0 CRITICAL
- `SECURITY_HOTSPOT` → P1 HIGH (requires review)
- `CODE_SMELL` → P2 MEDIUM
- `DUPLICATION > 10%` → P2 MEDIUM

---

## Dependabot

**Comment pattern**: Automated PR from `dependabot[bot]` or alerts in existing PR checks.

**Severity mapping**:
- `GHSA` advisory present → P0 CRITICAL
- `severity: high` → P1 HIGH
- `severity: moderate` → P2 MEDIUM
- `severity: low` → P3 LOW

**Extraction**: From `gh api repos/{owner}/{repo}/vulnerability-alerts` or PR body of dependabot PRs.

**Auto-fix**: Dependabot PRs with only version bumps and passing CI → safe to merge without manual review (unless semver major bump).

---

## GitHub Actions (CI)

**Comment pattern**: Check runs visible via `gh pr checks {number}`.

**Severity mapping**:
- Failed check on `main`/`master` branch protection rule → P0 CRITICAL
- Failed test job → P1 HIGH
- Failed lint/type-check → P1 HIGH
- Failed security scan → P0 CRITICAL (if CRITICAL CVEs) / P1 HIGH (if HIGH CVEs)
- Failed build → P1 HIGH

**Extraction format**:
```
Job: [job-name]
Step: [step-name]
Error: [first 5 lines of output]
File: [if available from output]
```

---

## General Bot Handling Rules

1. Always fetch from all 3 endpoints: `/reviews`, `/comments`, `/issues/comments`
2. Deduplicate: same file:line from multiple bots → keep highest severity
3. Resolved/outdated → skip
4. When in doubt → include (false negative is worse than false positive for security/critical findings)
