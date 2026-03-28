---
name: accessibility
description: WCAG 2.1 AA compliance requirements for all user-facing interfaces
---

# Accessibility Rules

> **Priority**: HIGH — Applied to all tasks creating or modifying user-facing UI

---

## WCAG 2.1 AA Minimum Standard

All user-facing interfaces MUST meet WCAG 2.1 Level AA compliance. This is the baseline, not the goal.

---

## Semantic HTML

- **Use semantic elements**: `<button>` for actions (not `<div onclick>`), `<nav>` for navigation, `<main>` for primary content, `<article>` for self-contained content
- **Heading hierarchy**: Use `<h1>` through `<h6>` in logical order — never skip levels (no `<h1>` followed by `<h3>`)
- **Lists**: Use `<ul>`/`<ol>` for lists — not `<div>` with visual bullets
- **Forms**: Every `<input>` must have an associated `<label>` (via `for` attribute or wrapping)
- **Tables**: Use `<th>` for headers, `scope` attribute for complex tables, `<caption>` for table description

---

## ARIA Attributes

- **ARIA is a supplement, not a replacement**: Use semantic HTML first — add ARIA only when semantic HTML is insufficient
- **Required ARIA**: `aria-label` for icon-only buttons, `aria-expanded` for collapsible elements, `aria-live` for dynamic content, `role` for custom widgets
- **aria-hidden**: Use `aria-hidden="true"` for decorative elements (icons next to text labels, decorative images)
- **Never use**: `role="presentation"` on interactive elements — it removes them from the accessibility tree

---

## Keyboard Navigation

- **All interactive elements** must be keyboard-accessible (focusable via Tab, activatable via Enter/Space)
- **Focus order**: Tab order must follow visual reading order (left-to-right, top-to-bottom for LTR languages)
- **Focus trap prevention**: Modal dialogs must trap focus inside; closing must return focus to the trigger element
- **Skip links**: Pages with significant navigation must provide "Skip to main content" link
- **No keyboard traps**: Users must be able to navigate away from any element using standard keyboard keys

---

## Color & Contrast

| Element | Minimum Contrast Ratio |
| :--- | :--- |
| Normal text (< 18px) | 4.5:1 |
| Large text (>= 18px or >= 14px bold) | 3:1 |
| UI components and graphical objects | 3:1 |
| Focus indicators | 3:1 against adjacent colors |

- **Never use color alone** to convey information — add icons, text, or patterns
- **Error states**: Use red color AND icon AND text message (not just red border)

---

## Touch & Interaction

- **Touch targets**: Minimum 44x44 CSS pixels for all interactive elements (per WCAG 2.5.8)
- **Spacing**: Minimum 8px spacing between adjacent touch targets
- **Hover alternatives**: Any information revealed on hover must also be accessible via focus or click

---

## Responsive & Adaptive

- **Responsive testing breakpoints**: 375px (mobile), 768px (tablet), 1024px (small desktop), 1280px (desktop)
- **Zoom support**: Content must be usable at 200% zoom without horizontal scrolling
- **Text resizing**: Text must remain readable when user increases browser font size to 200%

---

## Testing Requirements

- **Automated**: Run `axe-core` or `pa11y` in CI for every UI change
- **Screen reader**: Test critical flows with VoiceOver (macOS) or NVDA (Windows) for new UI features
- **Keyboard-only**: Navigate the entire flow using only keyboard for every new page/modal/form

---

## Cross-References

- **Agent**: `frontend-specialist` — consulted for all UI changes
- **Domain enhancer**: `.agent/skills/plan-writing/domain-enhancers.md` (Frontend Domain: Accessibility section)
