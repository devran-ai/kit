---
description: Premium UI/UX design and implementation workflow.
args: component or page
version: 2.1.0
sdlc-phase: build
skills: [ui-ux-pro-max, frontend-patterns, mobile-design, project-docs-discovery]
commit-types: [feat, refactor]
---

# /ui-ux-pro-max — Premium UI/UX Design & Implementation

> **Trigger**: `/ui-ux-pro-max [description]`
> **Lifecycle**: Build — UI/design implementation

> Standards: See `rules/workflow-standards.md`

> [!IMPORTANT]
> Visual excellence required. No generic, template-like, or "AI-slop" designs.

---

## Critical Rules

1. **Anti-AI-slop** — no generic gradients, default border-radius, cookie-cutter layouts
2. Premium aesthetics — curated HSL palettes, modern typography, smooth micro-animations
3. WCAG 2.1 AA compliance mandatory
4. Performance-first — 60fps animations, optimized images, minimal layout shifts
5. Mobile-first responsive design
6. Design system coherence — use existing tokens or create consistent ones

---

## Scope Filter

| Commit Type | Applicability | Rationale |
| :--- | :--- | :--- |
| `feat` | Required | New UI features need full premium design workflow |
| `refactor` | Required | UI refactors must preserve accessibility and quality standards |
| `fix` | Optional | Only for visual regressions or WCAG accessibility violations |
| `docs` | Skip | Documentation doesn't need UI/UX workflow |
| `chore` | Skip | Tooling changes are out of scope |

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/ui-ux-pro-max [description]` | Full premium design workflow for component or page |
| `/ui-ux-pro-max [description] --responsive-only` | Responsive testing and breakpoint fixes only |
| `/ui-ux-pro-max [description] --a11y-only` | Accessibility audit and WCAG 2.1 AA fixes only |
| `/ui-ux-pro-max [description] --dark-mode` | Include dark mode palette and token variant |

---

## Steps

// turbo
1. **Design System Audit** — check existing palette, typography, spacing, component library, CSS variables

// turbo
2. **Requirements** — what's being designed, target mood/aesthetic, brand guidelines

3. **Design System Compliance Check** — before writing any CSS/components:
   - Identify existing design tokens (colors, spacing, typography, radii, shadows)
   - Use tokens exclusively — never hardcode values present in design system
   - If tokens don't exist for needed style: create new tokens in design system file, then use them

4. **Implementation** — semantic HTML, palette + typography, spacing + hierarchy, responsive breakpoints

5. **Responsive Testing** — verify at all 4 breakpoints:
   | Breakpoint | Width | Target Device |
   | :--- | :--- | :--- |
   | Mobile | 375px | iPhone SE / small Android |
   | Tablet | 768px | iPad portrait |
   | Desktop | 1024px | Laptop |
   | Wide | 1280px+ | Desktop monitor |

6. **Polish** — hover/focus states, transitions, loading/skeleton states, 60fps animations

7. **Accessibility Verification** — WCAG 2.1 AA mandatory:
   - Color contrast: ≥4.5:1 for body text, ≥3:1 for large text (18pt+ or 14pt bold)
   - Keyboard navigation: all interactive elements reachable and operable
   - ARIA attributes: semantic roles, labels, live regions for dynamic content
   - `prefers-reduced-motion`: animations respect user preference
   - Focus indicators: visible on all interactive elements (no `outline: none` without replacement)

---

## Design Reference

```css
/* Curated palette */ --primary: hsl(230, 70%, 55%); --surface: hsl(230, 20%, 10%);
/* Typography */ --font-display: "Inter", "Outfit", system-ui; --font-mono: "JetBrains Mono", monospace;
/* Effects */ backdrop-filter: blur(12px); box-shadow: 0 4px 24px rgba(0,0,0,0.12);
/* Breakpoints */ @media (min-width: 640/768/1024/1280px)
```

---

## Output Template

```markdown
## 🎨 UI/UX: [Component/Page]

- **Palette/Typography/Style**: [details]
- **Files**: [created/modified]
- **Accessibility**: contrast/keyboard/screen-reader/reduced-motion
- **Responsive**: mobile/tablet/desktop

**Next**: `/preview` or `/test`
```

---

## Governance

**PROHIBITED:** Generic designs · default browser colors/fonts · ignoring accessibility · hardcoded pixels without responsive

**REQUIRED:** Curated palettes · modern typography · WCAG 2.1 AA · mobile-first · micro-animations

---

## Completion Criteria

- [ ] Design system audited — existing tokens identified
- [ ] Design system compliance checked — no hardcoded values that duplicate tokens
- [ ] Premium implementation: curated palette, modern typography, micro-animations
- [ ] Responsive verified at 375/768/1024/1280px breakpoints
- [ ] Accessibility verified: WCAG 2.1 AA contrast ratios, keyboard nav, ARIA, `prefers-reduced-motion`
- [ ] No generic/template patterns — "anti-AI-slop" standard met

---

## Failure Output

> Use when: WCAG failures detected, design system tokens missing, or accessibility violations block merge.

```markdown
## UI/UX — ACCESSIBILITY VIOLATIONS

**Status**: BLOCKED
**Reason**: [WCAG 2.1 AA failures / missing design tokens / responsive breakpoint failures]

### Violations

| Check | Requirement | Current | Issue |
| :---- | :---------- | :------ | :---- |
| Color contrast | 4.5:1 (normal) / 3:1 (large) | [ratio] | [element] |
| Touch target | 44×44px minimum | [size] | [element] |
| Keyboard nav | All interactive elements focusable | Missing | [element] |
| ARIA | Roles present on custom widgets | Missing | [element] |

### Required Fixes

1. [Fix 1 — with file:line reference]
2. [Fix 2]

**Must pass all WCAG 2.1 AA checks before `/test`.**
```

---

## Related Resources

- **Skill**: `.agent/skills/ui-ux-pro-max/SKILL.md`
- **Next**: `/preview` · `/test`
