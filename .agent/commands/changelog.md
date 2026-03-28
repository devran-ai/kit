---
description: Generate changelog from commits
uses: [git-workflow]
---

# /changelog Command

Generate or update CHANGELOG.md from git history using conventional commits. Follows Keep a Changelog format.

## Usage

| Command | Action |
| :--- | :--- |
| `/changelog` | Generate from commits since last tag |
| `/changelog [version]` | Generate changelog for specific version |
| `/changelog --since [date]` | Generate from a specific date |
| `/changelog --unreleased` | Show unreleased changes only |

## Examples

```
/changelog
/changelog v1.2.0
/changelog --since 2026-01-01
/changelog --unreleased
```

## Output Format

Appended/updated in `CHANGELOG.md`:

```markdown
## [1.2.0] - 2026-03-28

### Added
- User profile photo upload (feat: #PR-42)

### Changed
- Improved authentication flow response times

### Fixed
- Login error handling when session expires
```

## Commit Type Mapping

| Commit Type | Changelog Section |
| :--- | :--- |
| `feat` | Added |
| `fix` | Fixed |
| `refactor`, `perf` | Changed |
| `docs`, `chore` | Skipped (internal) |
| `BREAKING CHANGE` | ⚠️ Breaking Changes |

## Related Commands

`/pr` — includes changelog update · `/doc` — full documentation update
