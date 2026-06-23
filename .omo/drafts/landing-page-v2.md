---
slug: landing-page-v2
status: approved
intent: unclear
pending-action: user approve plan, then execute with `$start-work`
approach: Overhaul total landing page Metmal Community Hub ke folder baru landing-page-v2/ dengan brand pink+teal, Agency/Experimental aesthetic, Tailwind v4 + GSAP + Motion
---

# Draft: landing-page-v2

## Components (topology ledger)

| id | outcome | status | evidence |
| --- | --- | --- | --- |
| T1 | Vite + React 19 + TS scaffold | planned | .omo/plans/landing-page-v2.md |
| T2 | Pink + Teal theme via Tailwind v4 @theme | planned | .omo/plans/landing-page-v2.md |
| T3 | Shared primitives (RevealSection, Eyebrow, Stagger) | planned | .omo/plans/landing-page-v2.md |
| T4 | Geist fonts self-hosted | planned | .omo/plans/landing-page-v2.md |
| T5 | Base layout shell (Nav, Footer, App) | planned | .omo/plans/landing-page-v2.md |
| T6 | CTA button variants with motion | planned | .omo/plans/landing-page-v2.md |
| T7 | Hero section (dark canvas, pink glow, split) | planned | .omo/plans/landing-page-v2.md |
| T8 | Benefits bento grid (4 cards, varied sizes) | planned | .omo/plans/landing-page-v2.md |
| T9 | Facilities grid (6 cards, stagger) | planned | .omo/plans/landing-page-v2.md |
| T10 | Gallery (GSAP horizontal pan + Instagram) | planned | .omo/plans/landing-page-v2.md |
| T11 | Steps sticky-stack (GSAP, 4 cards) | planned | .omo/plans/landing-page-v2.md |
| T12 | Registration form (multi-step, Supabase POST) | planned | .omo/plans/landing-page-v2.md |
| T13 | FAQ accordion (single-open, 6 items) | planned | .omo/plans/landing-page-v2.md |
| T14 | Contact (3 tiles, WhatsApp/Email) | planned | .omo/plans/landing-page-v2.md |
| T15 | SocialProof dark stat banner | planned | .omo/plans/landing-page-v2.md |
| T16 | Landing page assembly + props wiring | planned | .omo/plans/landing-page-v2.md |
| T17 | Reduced motion audit | planned | .omo/plans/landing-page-v2.md |
| T18 | WCAG AA contrast + a11y | planned | .omo/plans/landing-page-v2.md |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
| --- | --- | --- | --- |
| Font choice | Geist Sans + Mono (not Inter, not serif) | design-taste-frontend 4.1 prefers Geist over Inter; no serif | Yes (user can swap font) |
| Color scale source | Tailwind default pink/teal (not Radix) | Already available in v4, no extra install | Yes (user can pick custom) |
| Motion library | CSS + GSAP + Motion (not pure CSS) | GSAP needed for sticky/horizontal; Motion for scroll-reveal | Yes (user can remove GSAP) |
| No violet/orange from old palette | Replaced entirely by pink/teal | Brand alignment with logo SVG | Yes (user can revert) |
| No eybrow spam | Max 1 per 3 sections | design-taste-frontend 4.7 hard rule | No (code enforces) |
| Self-hosted fonts | npm geist package, not Google CDN | Performance, no external requests | Medium |

## Findings (cited - path:lines)

- Metmal logo actual colors: teal `#00918E` + pink `#E24378` (D:\Andy\Antigravity\schedule-event-v2\src\assets\brand\LOGOMETMAL2016-01.svg)
- Current app brand tokens: violet `#7c6cf2` + orange `#f2743e` — MISMATCH (D:\Andy\Antigravity\schedule-event-v2\src\styles\tokens.css)
- `--brand-pink` alias currently points to violet, not pink (tokens.css:17)
- 10 existing community sections in src/components/community/ (files verified)
- Product goals: conversion-first, proof-before-form, mobile-first (PRODUCT.md)
- Tailwind v4 OKLCH pink-500: `oklch(0.656 0.241 354.308)` (research: frontend-hero.com + tailwindcss.com docs)
- Agency/Experimental references: VORTEX (Next.js + GSAP Awwwards template), MONOLITH (Svelte brutalist), FUBAR (glitch event), REACTŌR (industrial event)

## Decisions (with rationale)
1. **Brand pink+teal, not violet+orange** — Logo SVG uses teal (#00918E) + pink (#E24378). Current app uses wrong palette.
2. **Tailwind default scales** (not custom Radix) — Simpler, no extra dependency, OKLCH perceptual uniformity built-in.
3. **GSAP + Motion dual** — Motion for light scroll-reveals, GSAP ScrollTrigger for heavy pinned/horizontal sections.
4. **No design system library** — Tailwind utilities + custom CSS is sufficient for a single landing page. shadcn/ui or Radix Themes would add overhead for no benefit.
5. **9 sections, not 10** — Merged SocialProof into a more impactful standalone dark banner section (removed CommunitySteps duplicate concept, now reimagined as sticky-stack).

## Scope IN
- `landing-page-v2/` folder: full Vite + React 19 project
- Pink (`#ec4899` scale) + Teal (`#14b8a6` scale) palette via Tailwind v4 @theme
- 9 sections: Hero, Benefits, Facilities, Gallery, Steps, Form, FAQ, Contact, SocialProof
- Nav + Footer + layout shell
- Scroll-driven animations (RevealSection, Sticky-stack GSAP, Horizontal-pan GSAP)
- Dark mode + reduced motion
- WCAG AA contrast + a11y
- Indonesian copy (preserve from existing)

## Scope OUT (Must NOT have)
- NO edits to files outside landing-page-v2/
- NO violet/orange palette
- NO dashboard changes
- NO backend/Supabase changes
- NO shadcn/ui or Radix Themes
- NO serif fonts
- NO AI purple gradients
- NO three equal cards in a row
- NO eyebrow spam (>1 per 3 sections)

## Open questions
None — all resolved via research and defaults. User can veto any default in approval step.

## Approval gate
status: approved
Plan written to: .omo/plans/landing-page-v2.md
Dual Momus review: in-progress (background task bg_275a61d7)
Next: user approved → `$start-work` to execute
