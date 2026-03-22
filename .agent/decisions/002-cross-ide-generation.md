# ADR-002: Cross-IDE Configuration Generation

## Status: Accepted

## Context
Kit v4.0.0 only supported Claude Code via `.agent/`. Users of Cursor, OpenCode, and Codex had no native integration.

## Decision
Generate IDE-specific configs at `kit init` time from `manifest.json` (single source of truth). Configs live outside `.agent/` in native IDE directories.

## Consequences
- One command configures all IDEs
- Configs stay in sync with manifest
- Non-destructive: existing IDE dirs are preserved unless --force
- IDE configs are gitignored by default (generated, not source)
