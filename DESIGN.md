# DESIGN

> **Source of truth:** `src/styles/tokens.css` + `src/styles/theme.css`  
> **Last updated:** 2026-07-16

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

Use tosca for structure, focus, links, selected states, primary CTAs, and brand continuity. Pink is secondary only — see rules below. Legacy CSS vars `--brand-violet` / `--brand-orange` alias to tosca/pink (compatibility only; new code uses `--brand-tosca` / `--brand-pink`).

### Pink secondary — allow / deny

| Allow | Deny |
|-------|------|
| Small badge / chip / “highlight” label | Primary CTA fill |
| Inline text emphasis (1 phrase max) | Large section wash / full-width bg |
| Secondary chart series (with tosca primary) | Error / required / destructive (use rose) |
| Soft pink border on optional callout | Focus ring (always tosca) |
| Icon accent on non-primary list items | Login / admin chrome headers |

Cap: at most **one** pink signal per viewport region. If tosca already carries the action, skip pink.

### Brand primary scale (`theme.css`)

| Token | Hex | Use |
|-------|-----|-----|
| `brand-primary-50` | `#eefafa` | Soft wash / selected row |
| `brand-primary-100` | `#d5f3f2` | Chip bg light |
| `brand-primary-200` | `#aae6e4` | Soft border accent |
| `brand-primary-300` | `#66d1ce` | Hover wash |
| `brand-primary-400` | `#33a8a5` | Soft tosca / dark-mode text |
| `brand-primary-500` | `#00918e` | **Primary CTA / links** |
| `brand-primary-600` | `#007a78` | Hover primary |
| `brand-primary-700` | `#00554c` | Pressed / dark tosca |
| `brand-primary-800`–`950` | deeper | Rare; dense dark UI only |

Pink scale mirrors the same pattern under `brand-secondary-*` (`#e24378` = 500).

### Surfaces

- Warm paper: `#f8f7f0` (`--brand-paper`)
- Warm card: `#fdfcf6` (`--brand-card`)
- Light card: `#fffdf9` (`--brand-card-light`)
- Page neutral: `#f8f7f0` (`--color-neutral-page`)
- White section: `#ffffff`
- Ink: `#16211b` (`--brand-ink`)
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

**Data-viz exception:** charts/category series may use amber, emerald, blue, etc. outside brand accents. Those colors are for encoding data only — not brand CTAs or large UI washes.

## Token Reference

Mirror of semantic tokens in `tokens.css`. Prefer CSS vars (or utilities that wrap them) over hard-coded `rounded-[2rem]` / raw rgba.

### Radius

| Token | Value | Surface |
|-------|-------|---------|
| `--radius-control` | `0.75rem` | Inputs, product buttons, chips |
| `--radius-card` | `1rem` | Compact product cards |
| `--radius-card-lg` | `1.5rem` | Admin panels / larger product cards |
| `--radius-campaign-card` | `2rem` | Landing / campaign cards only |

Campaign cards: `var(--radius-campaign-card)` (equiv. `rounded-[2rem]` / `rounded-3xl`). Product controls: `var(--radius-control)` — never campaign radius in admin forms.

### Shadow & border

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-card-soft` | `0 12px 28px rgba(15, 23, 42, 0.04)` | Default card rest |
| `--shadow-card-raised` | `0 18px 45px rgba(15, 23, 42, 0.08)` | Hover / elevated interactive |
| `--border-subtle` | `rgba(15, 23, 42, 0.06)` | Default card/panel border |
| `--ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | Reveals, modal panel, toast |

### Focus

- `--focus-ring-color`: tosca
- Light offset: `--focus-ring-offset-light` (card light)
- Dark offset: `--focus-ring-offset-dark` (`#16211b`)

## Typography

Display: Bricolage Grotesque via `--font-display`. Body: Geist via `--font-body`. Hierarchy via weight, size, spacing, line height.

### Landing Page

- Hero H1: extra-bold, tight leading, large mobile-aware scale.
- Section H2: bold, `text-4xl` to `sm:text-5xl`.
- Eyebrow: uppercase, `text-[11px]`, `tracking-[0.3em]`, tosca/brand-primary.
- Body: `text-base`, relaxed `leading-7` or `leading-8`.
- Metadata/chips: small but readable, usually `text-sm`.

### Product/Admin UI

- Prefer compact headings (`text-lg`–`text-2xl` max for page titles).
- Keep table/card metadata readable (`text-sm` / `text-xs`).
- Avoid marketing-sized headings (`text-4xl+`) in admin flows.
- Dense tables: sticky header, horizontal scroll on overflow — never squeeze columns into unreadable wrap.
- Sidebar / nav: compact labels, active state = tosca text or soft primary wash — not campaign gradient deco.
- Modals: `ui-btn-primary` (solid tosca) for confirm; ghost/outline for cancel. No orange→violet or multi-stop brand gradients on admin chrome.
- Controls use `--radius-control`; panels use `--radius-card` / `--radius-card-lg`.

## Layout

- Use `max-w-7xl` for broad landing sections.
- Use `max-w-5xl` for FAQ/content-heavy sections.
- Use mobile-first padding: `px-4`, `sm:px-6`.
- Landing vertical rhythm: `py-16`, `sm:py-24`, `lg:py-32`.
- Anchor sections with fixed headers should use `scroll-mt-28` or appropriate offset.
- Admin shell: fixed sidebar + scrollable main; content max-width as needed for tables, not campaign hero widths.

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

**Campaign / landing**

- radius: `var(--radius-campaign-card)` (`2rem`)
- soft border `border-slate-200/50` or `var(--border-subtle)`
- warm card background
- `var(--shadow-card-soft)`; raised on interactive hover
- hover elevation only when clickable

**Product / admin**

- radius: `var(--radius-card)` or `var(--radius-card-lg)`
- tighter padding; less decorative elevation
- prefer `ui-*` utilities over one-off campaign card classes

### Forms

Form controls should:

- have visible labels
- use field-specific errors
- include `aria-invalid` and `aria-describedby` when invalid
- avoid disabled primary submit unless submission is in progress
- provide clear success state and next step
- use `--radius-control` on inputs and product buttons

Option cards acting as single-choice controls should use real radio semantics or correct `radiogroup`/`radio` ARIA with keyboard support.

## Motion

Motion should support orientation and hierarchy, not distract.

Use:

- reveal-on-scroll for section entrance (`--ease-out-expo`)
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
- Keep **tosca / brand-primary** accents visible (`brand-primary-400` text on dark is preferred over full 500 wash).
- Pink secondary stays sparse — chips/badges only, not large fills.
- Avoid low-opacity white text for critical content.
- Borders should be subtle but perceptible.

## Legacy aliases & migrate path

`tokens.css` keeps aliases so old classnames don’t break:

| Alias | Resolves to | Status |
|-------|-------------|--------|
| `--brand-violet` / `--brand-violet-soft` | tosca / soft tosca | **Deprecated** — do not use in new code |
| `--brand-orange` | pink family | **Deprecated** — do not use in new code |

**New code:** only `--brand-tosca`, `--brand-pink`, `brand-primary-*`, `brand-secondary-*`.

**When touching a file:** replace residual purple/violet hardcodes (`#8b5cf6`, `rgba(139,92,246,…)`, `bg-violet-*` as brand chrome) with tosca tokens. Exception: pure data-viz series colors (see Color System).

Known residual (fix when editing that surface):

- ~~`CommunityRegistrationDetailModal`~~ — fixed → tosca wash (2026-07-16)
- ~~`eventUtils` draft/Bazaar/Konser purple~~ — fixed: draft=`slate`, Bazaar=tosca, Konser=pink; Hiburan/Teknologi rebalanced (2026-07-16)
- ~~`SurveyDashboard` / `TenantSurveyResultsPage` violet keys~~ — fixed → `primary` / brand-secondary bars (2026-07-16)
- ~~`SurveyQRCode` indigo-950 QR ink~~ — fixed → brand ink `#16211b` (2026-07-16)
- Outside `src/` (ignore): `improve/` sandbox + `pdfExport` indigo headers — migrate when those surfaces ship

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

Before shipping admin / product changes:

- Login modal keyboard-complete (Tab trap, Escape close, focus restore).
- Tables: no horizontal page scroll; overflow scrolls inside table region.
- Forms: labels + errors readable in light and dark.
- Primary actions use solid tosca — no residual violet/purple hardcodes.
- Dense UI still hits ≥44px touch targets on mobile admin breakpoints where applicable.
