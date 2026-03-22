---
name: ui-ux-pro-max
description: UI/UX design intelligence with anti-AI-slop philosophy. 50+ styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks.
---

# ui-ux-pro-max

Design guide for web and mobile applications with searchable database of styles, palettes, fonts, UX rules, and chart types.

> **Design Philosophy**: Every interface must have a **bold, intentional aesthetic direction** — never generic, never default. Production-grade code with extraordinary creative vision.

## Prerequisites

Check/install Python 3 (`python3 --version`). Install via `brew install python3` (macOS), `apt install python3` (Ubuntu), or `winget install Python.Python.3.12` (Windows).

---

## When to Apply

Reference when designing UI components, choosing palettes/typography, reviewing UX, building landing pages/dashboards, or implementing accessibility.

## UX Rule Categories by Priority

1. **Accessibility (CRITICAL)**: color-contrast 4.5:1, visible focus rings, alt-text, aria-labels, keyboard-nav, form labels
2. **Touch & Interaction (CRITICAL)**: 44x44px touch targets, click/tap primary, disable buttons during async, clear error messages, cursor-pointer
3. **Performance (HIGH)**: WebP + srcset + lazy loading, prefers-reduced-motion, reserve space for async content
4. **Layout & Responsive (HIGH)**: viewport meta, min 16px body on mobile, no horizontal scroll, z-index scale (10/20/30/50)
5. **Typography (MEDIUM)**: line-height 1.5-1.75, line-length 65-75 chars, match heading/body font personalities
6. **Animation (MEDIUM)**: 150-300ms micro-interactions, transform/opacity only, skeleton screens
7. **Style (MEDIUM)**: match style to product, consistent across pages, SVG icons not emojis
8. **Charts (LOW)**: match chart to data type, accessible palettes, table alternative

---

## Workflow

### Step 0: Design Thinking (REQUIRED)

Before ANY code, commit to a clear creative direction:

1. **Purpose**: What problem? Who uses it?
2. **Aesthetic Tone**: Pick a BOLD direction — brutally minimal, maximalist chaos, retro-futuristic, organic, luxury, playful, editorial, brutalist, art deco, soft/pastel, industrial, neo-gothic, or invent your own
3. **The Memorable Thing**: ONE element someone will remember
4. **Constraints**: Technical requirements

> **CRITICAL**: Bold maximalism and refined minimalism both work. The safe middle — generic, forgettable — NEVER works.

### Step 1: Analyze Requirements

Extract: product type, style keywords, industry, stack (default: `html-tailwind`)

### Step 2: Generate Design System (REQUIRED)

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

Searches 5 domains in parallel, applies reasoning rules, returns complete design system with anti-patterns.

**Persist** with `--persist` flag → creates `design-system/MASTER.md` + page overrides in `design-system/pages/`. Page files override Master.

### Step 3: Supplement with Detailed Searches

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

Domains: `product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `react`, `web`, `prompt`

### Step 4: Stack Guidelines

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Stacks: `html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

---

## Landing Page Strategy

### Above-the-Fold (5-second value communication)

Hero layout: Logo + Nav + CTA | Headline (6-12 words) | Subheadline (15-25 words) | Hero image showing OUTCOME | Social proof

**Headlines**: Say what it DOES, not what it IS. Specific outcomes > buzzwords.
**Hero Images**: Show the OUTCOME, not the product. Transformation > screenshots.
**CTA Buttons**: `Action verb + value/outcome + risk reducer` ("Start Free Trial" not "Submit")

### Section Order

Hero → Social Proof → Problem → Solution → Features/Benefits (3-5) → Testimonials → Pricing → FAQ (3-5 objections) → Final CTA → Footer

### Social Proof Types

Logo bar (B2B), Stats (scale), Testimonials (emotion), Case studies (complex products), Star ratings (consumer), Media mentions (awareness)

### OG Image

1200x630px with product name + tagline + brand colors. Readable at thumbnail size.

---

## Anti-AI-Slop Rules (MANDATORY BANS)

| Banned | Do Instead |
|--------|-----------|
| Inter/Roboto/Arial as primary | Distinctive display + body pairing |
| Purple gradients on white | Curated context-specific palette |
| Predictable card grids + rounded corners | Asymmetry, overlap, diagonal flow |
| Generic centered h1 + subtext + CTA hero | Offset, layered, editorial layout |
| Same fonts/colors across projects | Unique aesthetic per project |
| Solid white/dark backgrounds | Gradient meshes, noise, grain, textures |

## Professional UI Rules

- **Typography**: Distinctive display fonts, sharp hierarchy contrast, CSS @font-face/Google Fonts
- **Color**: Dominant + accent > evenly distributed; CSS custom properties; one bold choice > five safe
- **Motion**: One orchestrated page load with staggered delays > scattered micro-interactions; CSS-first, Motion library for React; match complexity to vision
- **Backgrounds**: Create atmosphere with gradient meshes, noise/grain, geometric patterns, layered transparency, dramatic shadows, decorative borders
- **Spatial Composition**: Asymmetry, overlap, diagonal flow; generous negative space OR controlled density — not the middle
- **Icons**: SVG only (Heroicons/Lucide/Simple Icons), consistent sizing (24x24 viewBox, w-6 h-6), no emoji icons
- **Interactions**: cursor-pointer on all clickable, visual hover feedback, smooth transitions (150-300ms)
- **Light/Dark**: Light text #0F172A (slate-900), muted #475569 (slate-600+), glass bg-white/80+, visible borders

---

## Pre-Delivery Checklist

- [ ] Bold aesthetic direction chosen and documented; "memorable thing" identifiable
- [ ] No anti-AI-slop patterns; distinctive fonts; background has depth; layout has spatial interest
- [ ] Consistent icon set (SVG), correct brand logos, no layout-shift hovers
- [ ] cursor-pointer on clickables, smooth transitions, visible focus states, high-impact animation moment
- [ ] Light/dark contrast verified (4.5:1), glass elements visible, borders visible both modes
- [ ] Floating elements spaced from edges, no content behind fixed navbars
- [ ] Responsive at 375/768/1024/1440px, no horizontal scroll on mobile
- [ ] Alt text, form labels, color not sole indicator, prefers-reduced-motion respected
