---
description: Design UI/UX components
workflow: ui-ux-pro-max
---

# /design Command

Create premium UI/UX design specifications and implementations. Dispatches to the `/ui-ux-pro-max` workflow. See `.agent/workflows/ui-ux-pro-max.md` for full process.

## Usage

| Command | Action |
| :--- | :--- |
| `/design [component]` | Design a component with premium aesthetics |
| `/design [component] --responsive` | Emphasize responsive design for all breakpoints |
| `/design [component] --dark-mode` | Include dark mode variant |
| `/design [component] --accessible` | Extra focus on WCAG 2.1 AA compliance |

## Examples

```
/design dashboard layout
/design login form --accessible
/design navigation menu --responsive --dark-mode
/design product card grid --responsive
```

## Process

1. Audit existing design system (palette, typography, tokens)
2. Verify design system compliance before writing CSS
3. Implement with semantic HTML + curated palette + responsive breakpoints
4. Polish: hover/focus states, transitions, 60fps animations
5. Verify: WCAG 2.1 AA contrast, keyboard nav, ARIA, `prefers-reduced-motion`

## Output Preview

```
## Design: Dashboard Layout

Palette: hsl(230, 70%, 55%) primary + hsl(230, 20%, 10%) surface
Typography: Inter (body) + JetBrains Mono (code)
Responsive: 375/768/1024/1280px verified
Accessibility: contrast 5.2:1 ✅ · keyboard nav ✅ · ARIA ✅
Files: src/components/Dashboard.tsx, dashboard.module.css
```

## Related Commands

`/ui-ux-pro-max` — full workflow · `/create` — scaffold component after design · `/test` — visual regression tests
