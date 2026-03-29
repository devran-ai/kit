# ADR-004: Two-Tier Template Engine (Zero-Dependency)

## Status: Accepted

## Context

The onboarding system generates 15 master documents from templates. A template engine is needed to substitute project-specific values and conditionally include/exclude sections based on project type. Devran AI Kit has a zero-dependency constraint.

Options considered:
1. Handlebars.js — full-featured but adds a dependency
2. EJS — embedded JavaScript, adds a dependency
3. Custom two-tier system — zero dependencies, ~50 lines of code

## Decision

A custom two-tier template engine with zero external dependencies:

**Tier 1 — Variable substitution:** `{{key.path}}` resolved via dot-notation traversal. Regex: `/\{\{(\w[\w.]*)\}\}/g` — restricted to alphanumeric + dots (prevents injection).

**Tier 2 — Section conditionals:** `<!-- IF:flag -->...<!-- ENDIF:flag -->` using HTML comment markers. Regex flag restricted to `\w+`. No nesting beyond one level.

Post-generation validation catches unresolved tokens, empty sections, broken cross-references, and name inconsistencies.

## Consequences

- Zero dependencies maintained — aligns with Kit's core constraint
- Template syntax is simple enough for non-developers to read
- The `\w` restriction on variable keys prevents template injection attacks
- No nested conditionals keeps templates maintainable and predictable
- Extracted into `lib/doc-generator.js` (~830 lines including Mermaid generation)
