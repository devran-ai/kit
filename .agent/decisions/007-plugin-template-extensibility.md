# ADR-007: Plugin Template Extensibility

## Status: Accepted

## Context

The onboarding system generates documents from 15 built-in templates. Plugins and custom workflows may need to add their own onboarding templates (e.g., a mobile plugin adding `MOBILE-ARCHITECTURE.md`, or a compliance plugin adding `SOC2-CHECKLIST.md`).

Options considered:
1. Hardcoded template list — simple but not extensible
2. Manifest-driven registry with plugin support — extensible, versioned
3. Convention-based scanning (any `.md` in templates dir) — too permissive

## Decision

A **manifest-driven template registry** using `manifest.json`:
- Core templates in `.agent/templates/onboarding/manifest.json`
- Plugin templates in `.agent/templates/plugins/<plugin-name>/manifest.json`
- Each manifest defines templates with `file`, `requires` (dependencies), `audience`, and `applicability`
- `lib/doc-generator.js → resolveTemplateRegistry()` merges core + plugin manifests
- Topological sort ensures dependency-ordered generation
- Symlink protection on plugin directory scanning (`isSymbolicLink()` check)

## Consequences

- Plugins can extend onboarding without modifying core templates
- Dependency ordering prevents cross-reference issues
- Audience tags enable role-based document filtering (future)
- Manifest schema validation catches typos and misconfiguration
- Core templates remain updatable by Kit (not in `USER_DATA_DIRS`)
- Plugin templates follow the same validation rules as core templates
