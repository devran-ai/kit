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

## Steps

// turbo
1. **Design System Audit** — check existing palette, typography, spacing, component library, CSS variables

// turbo
2. **Requirements** — what's being designed, target mood/aesthetic, brand guidelines

3. **Implementation** — semantic HTML, palette + typography, spacing + hierarchy, responsive breakpoints

4. **Polish** — hover/focus states, transitions, loading/skeleton states, 60fps animations

5. **Accessibility** — contrast (>=4.5:1 text, >=3:1 large), keyboard nav, ARIA, `prefers-reduced-motion`

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
## UI/UX: [Component/Page]

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

- [ ] Design system audited
- [ ] Premium implementation with accessibility
- [ ] Responsive across breakpoints

---

## Related Resources

- **Skill**: `.agent/skills/ui-ux-pro-max/SKILL.md`
- **Next**: `/preview` · `/test`
