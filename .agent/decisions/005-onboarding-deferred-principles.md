# ADR-005: Deferred Onboarding Principles

## Status: Accepted

## Context

During the onboarding system design, several advanced principles were considered but deferred to post-v5.1.0 to maintain scope discipline and ship a solid foundation first.

## Decision

The following principles are deferred with rationale:

### Cross-Project Knowledge Transfer
**Deferred because:** Requires a global pattern store (`~/.devran-kit/patterns.json`) that operates outside project scope. Cross-project learning needs careful privacy design — patterns from a stealth-mode project must never leak to other projects.

### Full User Journey Simulation
**Deferred because:** Runtime UX simulation requires integration with design tools and user research data. The current `USER-JOURNEY-MAP.md` captures journeys as documentation; full simulation needs a separate runtime module.

### Living Documentation Code-Drift Detection
**Deferred because:** Automated drift detection (checking if code changes invalidate documented architecture) requires AST analysis and semantic diffing. The current `doc-freshness` rule provides manual trigger-based detection. A future `lib/doc-drift-detector.js` module will automate this.

## Consequences

- v5.1.0 ships with a focused, testable feature set
- Each deferred principle has a clear path to implementation
- The `doc-freshness` rule provides interim code-drift detection
- `USER-JOURNEY-MAP.md` provides interim journey documentation
- No architectural decisions are blocked by these deferrals
