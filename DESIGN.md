# DESIGN

> **Source of truth:** `src/styles/tokens.css` + `src/styles/theme.css`  
> **Last updated:** 2026-09-24

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

### Brand primary scale (`theme.css` — angka di bawah = nilai kode, jangan ubah sepihak)

| Token | Hex | Use |
|-------|-----|-----|
| `brand-primary-50` | `#e6f7f6` | Soft wash / selected row |
| `brand-primary-100` | `#ccefef` | Chip bg light |
| `brand-primary-200` | `#99dfde` | Soft border accent |
| `brand-primary-300` | `#66cfcd` | Hover wash |
| `brand-primary-400` | `#33bfbc` | Soft tosca / dark-mode text |
| `brand-primary-500` | `#00918e` | Dekoratif saja (3.86:1 — JANGAN teks kecil di terang) |
| `brand-primary-600` | `#007a78` | **CTA surface (AA 5.18:1)** — semua teks/button di terang pakai ini |
| `brand-primary-700` | `#006260` | Teks kecil terang / pressed |
| `brand-primary-800`–`950` | deeper | Rare; dense dark UI only |

Pink scale mirrors the same pattern under `brand-secondary-*` (`#e24378` = 500, `#c2185b` = 600). `--color-brand-secondary-600` aliases `--brand-pink-600` (`#c2185b`, 4.90:1 on the 14% pink wash) — do not reintroduce a separate literal here; the two used to diverge (`#c92d62` at 4.34:1 failed AA). For badge/avatar text on pink washes, `brand-secondary-700` (`#a82150`) is the safe shade.

**Aturan mutlak kontras — `brand-primary-500` vs `brand-primary-600`:**

- `--brand-tosca` / `brand-primary-500` (`#00918e`) **DILARANG** dipakai sebagai background/fill di belakang teks — hanya untuk elemen dekoratif tanpa teks: ikon fill, dot, bar chart, garis timeline, progress fill, gradient stop, `border-*`, `text-*`, `ring-*`, atau wash transparan (`bg-[var(--brand-tosca)]/10`, `color-mix(… N%, transparent)`). Putih di atas `#00918e` cuma 3.85:1 — gagal WCAG 2.2 AA.
- Setiap permukaan yang membawa teks (button solid, chip aktif, badge, skip-link, CTA) **WAJIB** pakai `--brand-tosca-600` / `brand-primary-600` (`#007a78`) — putih di atasnya 5.18:1 (AA). Termasuk varian `hover:` / `active:` / `focus:` / `dark:` / `group-hover:`.
- Saat menemukan `bg-[var(--brand-tosca)]` dengan teks di atasnya, ganti ke `bg-[var(--brand-tosca-600)]`; jangan biarkan alasan "teksnya besar" — tetap pakai 600 kecuali harus menyamai elemen tosca-500 di sebelahnya.

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
Error/required markers use rose — never brand-primary. On light campaign surfaces use `text-rose-700` (`#be123c`, 6.12:1 on `--brand-card`); `rose-600` (`#ec003f`) is only 4.40:1 there and fails AA for small text. Dark mode pairs `rose-700` with `dark:text-rose-400`.

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

Campaign cards: `var(--radius-campaign-card)` (equiv. `rounded-[2rem]` / `rounded-3xl`). Product controls: `var(--radius-control)` — never campaign radius in admin forms. Landing form inputs, textareas, and upload tiles also use `var(--radius-control)` (12px) — `rounded-2xl` (24px) was an undocumented outlier there.

### Motion

| Token | Value | Use |
|-------|-------|-----|
| `--ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` (`tokens.css`) | Reveals, hero entrance, modal panel, toast, nav dropdown, FAQ accordion |
| `--transition-timing-function-ease-out-expo` | same value (`theme.css` `@theme`) | Tailwind-side alias |

Both names must stay in sync. `motion.css` consumes `--ease-out-expo` 19 times; when it was undefined, every `var()` fallback collapsed to `transition-duration: 0s` / `animation-name: none` and the entire motion layer silently died. `e2e/a11y.spec.ts` asserts the token resolves and `.reveal-stage` has a non-zero duration.

**Keyframes live in `motion.css`.** Every `animate-[<name>_…]` reference must resolve to a `@keyframes` there, or the class is a silent no-op. Current set: `community-hero-in`, `modal-panel-in/out`, `toast-in/out/progress`, `count-up`, `fade-up`, `fade-in`, `fade-in-up`, `shake`, `scale-in`, `slide-up`, `mobile-nav-in`, `nav-dropdown-in`, `card-hover-lift`, `shimmer`, `live-pulse`, `vt-fade-in`. Named utilities without a Tailwind `--animate-*` theme entry (`.animate-fade-in-up`) are declared in `motion.css` directly.

`animations.css`, `mobile.css`, and `performance.css` were removed — they were never imported by `src/index.css` and every class they defined was dead (`.touch-target` is owned by `accessibility.css`). `useAnimation.ts` was removed with them: it was the only consumer of those classes and had zero importers.

### Reduced motion

`motion.css` ends with a global `@media (prefers-reduced-motion: reduce)` block that forces `animation-duration: 0.01ms` and `transition-duration: 0.01ms`. New animations inherit that for free; do not add a second reset.

### Shadow & border

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-card-soft` | `0 1px 3px rgba(22, 33, 27, 0.06)` (`tokens.css`) | Default card rest |
| `--shadow-card-raised` | `0 18px 45px rgba(22, 33, 27, 0.08)` (`tokens.css`) | Hover / elevated interactive |
| `--border-subtle` | `rgba(22, 33, 27, 0.06)` (`tokens.css`) | Default card/panel border |

Shadow ink is warm (`rgba(22, 33, 27, …)`), matching `--brand-ink`. Do not use cool slate (`rgba(15, 23, 42, …)`) on campaign surfaces — the landing page carried 10 such literals against 1 token use before this was reconciled.

### Focus

- `--focus-ring-color`: tosca (consumed by `base.css` and `utilities.css`)
- Use the `ui-focus-ring` utility, or `--tw-ring-color: var(--brand-tosca)`.

The former `--focus-ring-offset-light` / `--focus-ring-offset-dark` tokens were removed (zero references; `ui-focus-ring` uses Tailwind `ring-offset` with explicit slate/white values). `--accent-soft` was removed for the same reason.

## Typography

Display: Bricolage Grotesque via `--font-display`. Body: Geist via `--font-body`. Hierarchy via weight, size, spacing, line height.

### Landing Page

- Hero H1: extra-bold, tight leading, large mobile-aware scale.
- Hero layout: two columns at `lg` — copy on the left, a realtime community data board (metrics from `communityStats`) on the right; stacks to one column below `lg`. Hero copy must stay above `HERO_CONTENT_MAX_FRACTION` (0.87) of the hero box so it never sits on the gradient's light band.
- Section H2: bold, `text-4xl` to `sm:text-5xl`.
- No eyebrow above a section heading. The H2 carries its own weight. Eyebrows were removed from every landing `/` section on 2026-09-24 (Agenda, Keuntungan, Fasilitas, Cara Daftar, FAQ, Galeri, Berita, Kontak, Foto Area Event, Sponsor & Support); this replaces the earlier rule that mandated them. Where a section genuinely needs a category label, fold it into the heading.
- Body: `text-base`, relaxed `leading-7` or `leading-8`.
- Metadata/chips: small but readable, usually `text-sm`. Descriptive or sentence-case text a reader must parse stays ≥`text-xs` (12px) — the org-type descriptors under `OrganizationTypeSelector` were `text-[10px]` and are now `text-xs`. Compact labels that sit adjacent to a larger value (category pills, status tags, countdown unit labels) may stay at `text-[10px]`/`text-[11px]`: tracking and context carry them, and they are labels, not reading text.

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

Section eyebrow, still used outside the landing page (`/events`, `/sponsor`):

- uppercase
- `brand-primary-700` (light) / `brand-primary-400` (dark) — 6.71:1 on paper, 8.95:1 on slate-950. This single tone is shared with the `.ui-eyebrow` utility and `eyebrow()` in `PublicShared.tsx`; the three were previously three different colours for one role.
- `text-[11px]`, `tracking-[0.3em]`
- concise label only

Do not place one above a landing section H2 — see Typography → Landing Page.

### CTA Buttons

Primary landing CTA:

- rounded full
- solid tosca 600 (`var(--brand-tosca-600)` / `bg-brand-primary-600`, AA 5.18:1)
- white text
- no orange→violet gradient
- clear verb: `Daftar Event`, `Ajukan Kolaborasi`, or `Hubungi Kami`

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

## Conversion Flow

The landing page has **one** conversion intent with one label and one destination: every `Daftar Event` CTA (hero, header, mobile panel, sticky mobile bar, footer) targets the `/daftar` route — 5 places, one label, one target. This is the M6 fix in `docs/AUDIT-design-taste-2026-09-20.md` and a user decision (2026-09-21); do not retarget these to the in-page `#register` anchor.

`/daftar` renders the **same** `RegistrationForm` as the embedded `#register` section (see `docs/SPEC.md` §7.2), and stays a shareable URL for IG bio / WhatsApp / QR. The hero's secondary CTA is `Cek Event` → `#upcoming-events` (a different intent, so not a duplicate). `/events` also points its registration CTAs at `/daftar` because that page has no embedded form.

`Ajukan Event` (`/ajukan-event`) remains the separate formal EO/business pipeline.

Sticky bottom CTAs on mobile must clear overlays: the toast stack is lifted above the CTA on the landing route (`bottom-24`), and the mobile nav panel is height-bounded with `overflow-y: auto` so every item stays reachable on short phones.

### Community stats — one vocabulary, one display rule

`communityStats.ts` owns the label vocabulary (`COMMUNITY_STAT_LABELS`); `countFormat.ts` owns the display rule (`formatStat`). Hero, the trust band, and `/events` all read from them.

A zero metric renders as `—`, never `0+`. "0+" reads as zero social proof; the hero badge previously showed `0+ Event Terlaksana` while the band below showed `-` for the same metric — two representations of one state.

### Feature detection

`src/utils/intersectionObserver.ts` exports `createIntersectionObserver`, the single guarded factory. Never call `new IntersectionObserver` directly: in an environment without the API the constructor throws inside an effect and takes the whole page to the error boundary. Callers must treat `null` as "not available" and render the final state (visible / pinned), never leave content hidden.

## Accessibility

Baseline requirements:

- Visible focus rings on all interactive elements. Use the `ui-focus-ring` utility (or `--tw-ring-color: var(--brand-tosca)`); do **not** hand-roll `ring-[var(--brand-tosca-soft)]` — `#33a8a5` is 2.88:1 against white and fails WCAG 1.4.11 (non-text 3:1). `brand-tosca-500` is 3.86:1 and is the minimum.
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

- `Daftar Event`
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
