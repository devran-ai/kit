# ADR-006: Staging Directory Pattern for Atomic Document Generation

## Status: Accepted

## Context

The onboarding system generates 7-15 documents in a single workflow. If generation fails mid-way, the output directory would contain an inconsistent set of documents — some generated, others missing. This partial state could confuse users and downstream tools.

Options considered:
1. Generate directly to output directory, clean up on failure
2. Generate to a staging directory, validate, then atomically move
3. Generate in-memory, write all at once

## Decision

Generate all documents to `.agent/staging/onboarding/`, run 4-check validation and quality scoring, then atomically move to the output directory (`docs/`) on success. If validation fails, staging contents are preserved for debugging.

Key behaviors:
- `CLAUDE.md` goes to project root, not `docs/`
- Brownfield mode never overwrites existing `CLAUDE.md` — merge under `## Kit-Generated Context`
- Staging directory is cleaned after successful move
- Staging directory is preserved (not deleted by Kit updater) via `USER_DATA_DIRS`
- Session can be resumed from the staging checkpoint if interrupted

## Consequences

- Users never see partially generated documentation sets
- Failed generations are debuggable (staging contents remain)
- The staging directory supports checkpoint-based resumption
- `path.basename()` guards on all staging write operations prevent path traversal
- Kit updates preserve in-progress staging via `lib/updater.js` protection
