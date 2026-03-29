# ADR-003: Onboarding as Pre-SDLC One-Time Phase

## Status: Accepted

## Context

Devran AI Kit uses a 7-phase SDLC cycle (discover → plan → build → verify → checkpoint → ship → evaluate) managed by `workflow-state.json` and `sdlc-map.json`. The new `/greenfield` and `/brownfield` onboarding workflows need a home in this lifecycle, but they are fundamentally different from the repeating SDLC cycle — they run once per project to establish the foundation.

Options considered:
1. Add `onboarding` as a new phase inside the SDLC cycle
2. Replace `discover` with `onboarding`
3. Add `onboarding` as a pre-SDLC one-time phase outside the cycle

## Decision

Onboarding is a **pre-SDLC one-time phase** with `oneTime: true`. It precedes the SDLC cycle but does not participate in it. The `discover` phase retains `previous: null` — there is no backward navigation from discover to onboarding.

Transitions: `IDLE → ONBOARDING → EXPLORE` or `IDLE → ONBOARDING → PLAN`.

## Consequences

- Onboarding never re-enters the SDLC cycle after completion
- `discover.previous` stays `null` — preserves existing cycle behavior
- The `/brownfield` refresh mode handles re-runs without re-entering the phase
- Phase transition guards prevent accidental re-onboarding
- Existing workflows are completely unaffected
