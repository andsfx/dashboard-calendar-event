# DESIGN

## Design Direction

Metropolitan Mall Bekasi event pages should feel warm, active, and community-centered. The visual language blends mall hospitality, event energy, and operational trust.

Public marketing surfaces should feel like a polished community campaign, not a generic dashboard. Admin/product surfaces should stay compact, readable, and efficient.

## Visual Keywords

- warm paper
- tosca/pink Metmal brand
- rounded cards
- soft elevation
- clear hierarchy
- real event proof
- mobile-first campaign
- accessible motion

## Color System

### Brand Accents

- Tosca (primary): `#00918E`
- Soft Tosca: `#33A8A5`
- Dark Tosca: `#00554C`
- Pink (secondary): `#E24378`
- Soft Pink: `#EE95A9`

Use tosca for structure, focus, links, selected states, primary CTAs, and brand continuity. Use pink sparingly for secondary accent. Legacy CSS vars `--brand-violet` / `--brand-orange` alias to tosca/pink.

### Surfaces

- Warm paper: `#f4efe8`
- Warm card: `#faf6ef`
- Light card: `#fffdf9`
- White section: `#ffffff`
- Slate text: Tailwind `slate-950`, `slate-700`, `slate-600`, `slate-500`
- Dark background: Tailwind `slate-950`, `slate-900`, `slate-800`

### Status / Semantic

Use established Tailwind semantic colors:

- Success: emerald
- Warning: amber/orange
- Error: rose/red
- Info: blue (or tosca for brand-linked info)

Do not create new semantic colors unless existing meaning is insufficient.
Error/required markers use rose — never brand-primary.

## Typography

Display: system serif (Iowan/Palatino/Georgia). Body: Plus Jakarta Sans. Hierarchy via weight, size, spacing, line height.

### Landing Page

- Hero H1: extra-bold, tight leading, large mobile-aware scale.
- Section H2: bold, `text-4xl` to `sm:text-5xl`.
- Eyebrow: uppercase, `text-[11px]`, `tracking-[0.3em]`, tosca/brand-primary.
- Body: `text-base`, relaxed `leading-7` or `leading-8`.
- Metadata/chips: small but readable, usually `text-sm`.

### Product/Admin UI

- Prefer compact headings.
- Keep table/card metadata readable.
- Avoid marketing-sized headings in admin flows.

## Layout

- Use `max-w-7xl` for broad landing sections.
- Use `max-w-5xl` for FAQ/content-heavy sections.
- Use mobile-first padding: `px-4`, `sm:px-6`.
- Landing vertical rhythm: `py-16`, `sm:py-24`, `lg:py-32`.
- Anchor sections with fixed headers should use `scroll-mt-28` or appropriate offset.

## Components

### RevealSection

Shared landing reveal primitive. It should:

- preserve `reveal-on-scroll`, `reveal-visible`, `reveal-stage`
- support `intensity="default" | "strong"`
- support custom tag via `as`
- support skeleton fallback when needed
- respect reduced-motion global CSS

### CommunityEyebrow

Shared section eyebrow for community landing surfaces:

- uppercase
- tosca / brand-primary text
- high letter spacing
- concise label only

### CTA Buttons

Primary landing CTA:

- rounded full
- solid tosca (`var(--brand-tosca)` / `bg-brand-primary-500`)
- white text
- no orange→violet gradient
- clear verb: `Daftar Sekarang`, `Daftar Kolaborasi`, or `Hubungi Kami`

Secondary CTA:

- bordered/glass when on dark hero
- outline/ghost for non-conversion actions (e.g. Event Dashboard)
- lower visual weight than primary CTA
- points to proof or supporting info

### Cards

Cards use:

- `rounded-[2rem]`
- soft border `border-slate-200/50` or `border-black/[0.06]`
- warm card background on marketing surfaces
- subtle shadows
- hover elevation only when clickable/interactive

### Forms

Form controls should:

- have visible labels
- use field-specific errors
- include `aria-invalid` and `aria-describedby` when invalid
- avoid disabled primary submit unless submission is in progress
- provide clear success state and next step

Option cards acting as single-choice controls should use real radio semantics or correct `radiogroup`/`radio` ARIA with keyboard support.

## Motion

Motion should support orientation and hierarchy, not distract.

Use:

- reveal-on-scroll for section entrance
- small hover translations for cards/buttons
- subtle icon movement on CTA hover

Rules:

- Always support `prefers-reduced-motion: reduce`.
- Use Tailwind `motion-reduce:*` on local transitions/transforms.
- Avoid large continuous animation on mobile.
- Heavy blur/glow decoration should be hidden or reduced on small screens.

## Accessibility

Baseline requirements:

- Visible focus rings on all interactive elements.
- Keyboard support for nav, forms, accordions, and option groups.
- Correct ARIA for expanded/collapsed states.
- Labels for all form fields.
- Decorative icons/images use `aria-hidden` or empty alt.
- Informative images have useful alt text.
- Reduced motion support.
- Sufficient contrast in light and dark modes.

## Image Guidance

Hero images:

- use responsive `srcSet`
- provide `sizes="100vw"` for full-width hero images
- use `fetchPriority="high"` only for LCP hero image
- use `decoding="async"`
- keep alt empty only if image is decorative and text conveys the message

Gallery/social proof images:

- lazy-load below fold
- provide meaningful alt text when content is informative
- keep skeleton states stable to avoid layout shift

## Dark Mode

Dark mode should preserve warmth but avoid low contrast.

- Use `slate-950`, `slate-900`, `slate-800` backgrounds.
- Keep violet accents visible.
- Avoid low-opacity white text for critical content.
- Borders should be subtle but perceptible.

## Copy Style

Use Indonesian-first labels. English is allowed for known event terms only, but avoid mixing in core CTAs.

Preferred:

- `Daftar Sekarang`
- `Hubungi Kami`
- `Cara Daftar`
- `Fasilitas`
- `Promosi & Marketing`
- `Pendaftaran Terkirim`

Avoid:

- `Contact Us`
- `Looking for Sponsor & Support`
- `Lihat Benefits`
- excessive slang in formal sections

## QA Checklist

Before shipping public landing changes:

- Build passes with `npm run build`.
- LSP diagnostics clean on changed files.
- `/` loads on desktop and mobile widths.
- Primary CTA scrolls to registration form.
- Mobile menu opens, closes, and Escape works.
- Organization type selector works by mouse and keyboard.
- Form shows required errors before submission.
- Reduced motion does not hide content.
- Console has no new runtime errors.
