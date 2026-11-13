# DESIGN

> **Source of truth:** `src/styles/tokens.css` + `src/styles/theme.css` (palet) · `src/styles/dashboard-wayfinding.css` (token `--wf-*` yang dipakai komponen)  
> **Last updated:** 2026-11-11 (migrasi penuh ke shadcn/ui: dashboard + seluruh halaman publik, sertakan permukaan netral — pengecualian native tinggal empat kategori teknis)

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

### Palet Stitch — belum diadopsi

`redesign/DESIGN.md` (ekspor Stitch) memakai palet sendiri: `#006769` primary, `#855300` secondary, `#004D4A` teal-dark, `#fdfcff` surface. Palet itu **belum** masuk tokens; komponen tidak boleh memakai hex-nya. Padanan yang berlaku: `#006769`/`#004D4A` → `--wf-accent` (+ `--wf-accent-ink` untuk teks di atasnya), `#855300` → `--wf-action`. `#fdfcff` → `--wf-board`. `redesign/` adalah bahan rujukan struktur, bukan sumber warna.

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
- Varian `hover:` pada CTA solid **WAJIB** memakai `--wf-accent-hover` sebagai latar (bukan `--wf-page`, `--wf-board`, atau `--wf-board-2`); tinta tidak diganti saat hover karena `--wf-accent-ink` sudah menjadi pasangan kontras dari kedua fill (`#ffffff`/`#005f5e` = 7.5:1 di terang, `#06120f`/`#66cfcd` = 10.33:1 di gelap). **Kecuali** primitive memasang hover text sendiri: `Button` shadcn varian `ghost` (`src/components/shadcn/button.tsx`) membawa `hover:text-foreground`, jadi `hover:text-[var(--wf-accent-ink)]!` **wajib dipertahankan** pada elemen itu untuk menimpanya — tanpa override, label jatuh ke 2.21:1 (terang) / 1.63:1 (gelap) dan gagal AA.

### Surfaces

- Warm paper: `#f8f7f0` (`--brand-paper`)
- Warm card: `#fdfcf6` (`--brand-card`)
- Light card: `#fffdf9` (`--brand-card-light`)
- Page neutral: `#f8f7f0` (`--color-neutral-page`)
- White section: `#ffffff`
- Ink: `#16211b` (`--brand-ink`)
- Text, latar, dan garis netral: token `--wf-ink`, `--wf-ink-muted`, `--wf-board`, `--wf-board-2`, `--wf-rule` (`dashboard-wayfinding.css`). Ramp `slate-*` **dilarang** untuk ketiga peran ini — dua palet gelap dalam satu aplikasi membelah dark mode jadi dua keluarga warna (olive `#16211b` vs blue-slate `#0f172a`).
  Di light mode `--wf-board` = `--brand-card` `#fdfcf6`, jadi kartu yang dulu memakai `--brand-card` **tidak bergeser sama sekali**; yang bergeser hanya (a) tinta `slate-600` `#475569` (cool) → `--wf-ink-muted` `#58645a` (warm), 7.4:1 → 6.6:1 di atas board, keduanya lolos AA dan sejalan dengan aturan "jangan pakai slate dingin di permukaan brand" di §Shadow, dan (b) panel yang dulu putih murni `#ffffff` → warm board `#fdfcf6` (selisih 1–2% luminansi, sengaja: satu permukaan kartu untuk seluruh aplikasi). Pergeseran besar ada di dark.

  **Lever terbesar pemusatan warna bukan di TSX, tapi di `src/styles/utilities.css`.** `.ui-text-muted` dan `.ui-text-secondary` dulu `@apply text-slate-600 dark:text-slate-300`, `.ui-text-strong` `@apply text-slate-800 dark:text-white`; ketiganya kini `text-[var(--wf-ink-muted)]` / `text-[var(--wf-ink)]`, sehingga setiap pemakaian kelas itu di seluruh aplikasi ikut berpindah tanpa menyentuh call site. `typography.css` (`.ui-eyebrow`, `.ui-caption`) diperlakukan sama. Saat mengubah token netral, cek `src/styles/*.css` lebih dulu: satu baris `@apply` mengalahkan ratusan edit komponen.

  **Aturan satu token per peran.** Bila sebuah elemen punya pasangan `X-terang` + `dark:Y-*`, konversi kelas **terang**-nya dan buang `dark:`-nya. Dua utilitas berbeda pada peran yang sama (`bg-[var(--wf-board)] bg-[var(--wf-board-2)]`) tidak menulis "board-2 menang": keduanya spesifisitas sama, jadi pemenangnya ditentukan urutan aturan di stylesheet hasil build, bukan urutan kelas atau niat penulis. Scan duplikat per-kelas-literal (`q` grouping) dipakai untuk memastikan nol sisa. Pasangan `hover:bg-[…]` + `dark:hover:bg-[…]` pada CTA solid membuang varian dark-nya: `--wf-accent-hover` sudah punya nilai sendiri di blok `.dark` (`src/styles/dashboard-wayfinding.css:65`), jadi kelas dark hanya menduplikasi peran token yang sudah flip.

  **Latar halaman memakai `--wf-page`, bukan `--color-neutral-page`.** `--color-neutral-page`/`--brand-paper` tidak punya pasangan `.dark`, jadi halaman yang memakainya tetap terang di dark mode (dulu ditambal `dark:bg-slate-950`). Semua `bg-[var(--color-neutral-*)]` dan `bg-[var(--brand-*)]` yang menjadi latar halaman dipetakan ke `--wf-page`; latar kartu ke `--wf-board`.

  **Pengecualian yang sah (bukan utang):** (1) panel brand-gelap permanen — `bg-brand-primary-950` / `text-brand-primary-100` pada Docs, survey, NotFound, TenantDirectory: permukaannya memang gelap di kedua mode, token tema tidak memodelkannya; (2) overlay translusen di atas hero gelap/foto — pasangan `bg-white/50` + `dark:bg-slate-800/50` dibiarkan apa adanya karena mengganti light-nya akan membuat kartu opak di atas foto; (3) scrim viewport `bg-black/…` dan `dark:bg-slate-900/95`; (4) warna status (`--wf-danger`, `--wf-live`) dan hue data-viz; (5) gradien hero `from-brand-primary-950` di `FeaturedEventCard`; (6) link tekstual ber-fill `--wf-accent` yang memindahkan latar ke `--wf-page` **dan** tinta ke `--wf-ink` saat hover — contoh `src/pages/EventsLandingPage.tsx:788` ("Kalender lengkap"). Ini bukan CTA solid: pasangan paper/ink-nya sudah kontras, dan kriteria CTA solid adalah fill accent + tinta `--wf-accent-ink` **tanpa** override tinta hover + bobot/padding tombol. Jangan perluas pengecualian ini ke CTA yang tinta hover-nya tidak diganti. Konversi 2026-11-10 menyentuh 45 file komponen bersama dashboard/publik; sisa `slate-*` di `src/**/*.tsx` hanya boleh berasal dari lima kategori di atas.

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

Both names must stay in sync. `motion.css` consumes `--ease-out-expo` for the non-reveal animations that still live in CSS (modal panel, toast, nav dropdown, FAQ accordion). Reveal and hero entrance no longer read it — GSAP uses `CustomEase` `metmal-out-expo` with the identical `0.22,1,0.36,1` curve. When the token was undefined, every `var()` fallback collapsed to `transition-duration: 0s` / `animation-name: none` and the whole motion layer silently died. `e2e/a11y.spec.ts` asserts the token resolves, `.reveal-stage` carries no CSS transition, and it ends at a non-zero opacity.

**Keyframes live in `motion.css`.** Every `animate-[<name>_…]` reference must resolve to a `@keyframes` there, or the class is a silent no-op. Current set: `modal-panel-in/out`, `toast-in/out/progress`, `count-up`, `fade-up`, `fade-in`, `fade-in-up`, `shake`, `scale-in`, `slide-up`, `mobile-nav-in`, `nav-dropdown-in`, `card-hover-lift`, `shimmer`, `live-pulse`, `vt-fade-in`. Named utilities without a Tailwind `--animate-*` theme entry (`.animate-fade-in-up`) are declared in `motion.css` directly. `community-hero-in` was a keyframe until GSAP took the hero entrance over; the class survives as a CSS pre-state marker only.

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

- preserve `reveal-on-scroll`, `reveal-visible`, `reveal-stage`, `reveal-fallback`
- support custom tag via `as`
- support skeleton fallback when needed
- GSAP adalah satu-satunya penggerak reveal: `useScrollReveal` memutar satu timeline (`opacity` + `y`, durasi 0,5 s, stagger 0,06 s, easing `metmal-out-expo`) untuk `.reveal-stage` lalu anak-anaknya. Tidak ada opt-in: item yang ingin distagger sendiri cukup ditandai `data-reveal-item`, tanpa tanda itu semua anak langsung stage yang di-tween
- `motion.css` hanya memegang pre-state dan end state jalur gagal. Tidak boleh ada `transition` atau `@keyframes` untuk reveal/entrance; transisi CSS pada properti yang sama dengan tween akan memulai ulang animasi tiap frame GSAP menulis inline style
- `reveal-visible` hanya penanda bahwa trigger sudah menyala; end state CSS dipakai `reveal-fallback` (reduced motion, chunk gagal, atau chunk belum termuat setelah 2,5 s)
- reduced motion meninggalkan semuanya di end state tanpa tween

### CommunityEyebrow

Section eyebrow, still used outside the landing page (`/events`, `/sponsor`):

- uppercase
- `brand-primary-700` (light) / `brand-primary-400` (dark) — 6.71:1 on paper, 8.95:1 on slate-950. This single tone is shared with the `.ui-eyebrow` utility; the `eyebrow()` helper that duplicated it was removed together with `src/components/shared/PublicShared.tsx`.
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

Contract (2026-10-30, product decision — supersedes the old CSS-first motion rule):

- GSAP owns **all** motion on public routes: section reveal (`useScrollReveal`) and hero entrance + parallax (`useHeroParallax`). It is loaded through dynamic `import()` only, never statically, so it stays out of the boot bundle.
- CSS exists only as (a) the pre-state before GSAP takes over and (b) the end state for the fallback paths. No `transition` or `@keyframes` may implement a reveal or an entrance; delete it rather than leaving a parallel CSS animation.
- Fallback paths (reduced motion, chunk failed, chunk stalled > 2,5 s) end in the CSS end state with no tween. Content is never permanently invisible: `reveal-fallback` and `.community-hero-static` lift the pre-state.
- `active:scale-[0.98]`, `hover:` colour/translate and other interactive-state transitions are not reveals; they stay in CSS and keep `motion-reduce:*` guards.
- Always support `prefers-reduced-motion: reduce` — end state, no tween.
- Avoid large continuous animation on mobile.
- Heavy blur/glow decoration should be hidden or reduced on small screens.

## Conversion Flow

The landing page has **one** conversion intent with one label and one destination: every `Daftar Event` CTA (hero, header, mobile panel, sticky mobile bar, footer) targets the `/daftar` route — 5 places, one label, one target. This is the M6 fix in `docs/AUDIT-design-taste-2026-09-20.md` and a user decision (2026-09-21); do not retarget these to the in-page `#register` anchor.

`/daftar` renders the **same** `RegistrationForm` as the embedded `#register` section (see `docs/SPEC.md` §7.2), and stays a shareable URL for IG bio / WhatsApp / QR. The hero's secondary CTA is `Cek Event` → `#upcoming-events` (a different intent, so not a duplicate). `/events` also points its registration CTAs at `/daftar` because that page has no embedded form.

`Ajukan Event` (`/ajukan-event`) remains the separate formal EO/business pipeline.

Sticky bottom CTAs on mobile must clear overlays: the toast stack is lifted above the CTA on the landing route (`bottom-24`), and the mobile nav panel is height-bounded with `overflow-y: auto` so every item stays reachable on short phones.

### Community stats — one vocabulary, one display rule

`communityStats.ts` owns the label vocabulary (`COMMUNITY_STAT_LABELS`); `countFormat.ts` owns the display rule (`formatStat`). Hero, the trust band, and `/events` all read from them.

A zero metric renders as a plain `0`, never `0+`. "0+" reads as zero social proof; the hero badge previously showed `0+ Event Terlaksana` while the band below showed `-` for the same metric: two representations of one state.

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

- Satu palet gelap untuk seluruh aplikasi, dari `dashboard-wayfinding.css`: `--wf-page` `#0e1612`, `--wf-board` `#16211b`, `--wf-board-2` `#121a15`, `--wf-rule` `rgba(255,255,255,.14)`, `--wf-ink` `#eef2ea`, `--wf-ink-muted` `#a9b4a5`.
- Token itu **flip sendiri**. Jangan menulis `dark:bg-*` / `dark:text-*` / `dark:border-*` untuk permukaan, teks, atau garis netral — satu token mewakili kedua mode, dan memasang `dark:` di sebelahnya menandakan lapisan yang sama dikodekan dua kali.
- `dark:` hanya untuk yang tidak dimodelkan token: scrim viewport (`bg-black/…`), warna semantik status (`--wf-danger` / `--wf-action` / `--wf-live` bila sudah ada padanannya), dan hue data-viz.
- Keep **tosca** accents visible: `--wf-accent` (`#33bfbc`, tosca-400) di dark = 7.35:1; `--wf-accent-ink` `#06120f` untuk teks di atas fill aksen (7.88:1).
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

Status labels on the public schedule use the `StatusBadge` vocabulary: `Berlangsung`, `Mendatang`, `Selesai`; do not use `Live` or `Segera Hadir` as status labels.

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

## shadcn/ui on the Dashboard

Dashboard UI dibangun di atas primitif **shadcn/ui** dengan ikon **lucide-react**. Komponen hidup di `src/components/shadcn/` (alias `@/components/shadcn`), dan **FULL registry** sudah di-install via `npx shadcn@latest add --all` dengan `components.json` (style `radix-nova`, Tailwind v4 CSS vars, `iconLibrary: lucide`). **Jangan mencampur** dengan barrel primitif milik proyek `src/components/ui` (`StatCard`, `StatusBadge`, `FilterBar`, dll.) — itu aset domain lama, bukan primitif.

### Skema warna asli tetap dipakai

shadcn **tidak membawa palet baru**. Palet brand tidak berubah:

- Tosca primary `#00918e` (CTA/AA `#007a78`)
- Pink secondary `#e24378` / `#c2185b` (AA destructive)
- Warm paper surfaces `#f8f7f0` / `#fdfcf6`
- Olive-slate neutrals — ink `#16211b`, dll.

Semantic token shadcn dipetakan ke palet asli di `src/styles/shadcn-theme.css` (**ADDITIVE ONLY** — tidak ada token existing yang didefinisi ulang), diimpor dari `src/index.css` sebelum baris `@variant dark`. Radius sengaja memakai skala `theme.css` yang sudah ada: `--radius` 0.5rem, sm 0.25rem / md 0.75rem / lg 1rem / xl 1.25rem — formula calc() shadcn tidak dideklarasikan ulang agar util `rounded-*` existing tidak tertimpa.

Layer token shadcn juga membawa blok override `.dark` di `shadcn-theme.css` yang dipetakan ke palet gelap wf (board `#16211b` / tosca-400 `#33bfbc` / ink `#eef2ea`, bersumber dari `.dark` di `dashboard-wayfinding.css`) agar Card/Button/Tabs/Dialog tetap on-brand di dark mode; nilai light tidak berubah.

Registry shadcn menulis varian `data-horizontal:*` / `data-vertical:*`, sedangkan Radix memancarkan `data-orientation="horizontal|vertical"`. `src/index.css` mendefinisikan keduanya sebagai `@custom-variant` (setelah `@variant dark`); tanpa itu semua kelas tersebut jadi selector mati — root `Tabs` tetap `flex` baris sehingga `TabsList` dan `TabsContent` berbagi satu baris dan panel Analytics terjepit selebar daftar tab (`/dashboard/tenant-surveys`, 2026-11-11).

| Token shadcn | Nilai | Sumber |
|---|---|---|
| `--background` | `#f8f7f0` | slate-50 warm paper (`theme.css`) |
| `--foreground` | `#16211b` | slate-900 ink (`theme.css`) |
| `--card` / `--popover` | `#fdfcf6` | slate-100 (`theme.css`) |
| `--primary` | `var(--wf-accent)` | light `#00706e` (terang) / `#33bfbc` (gelap); foreground `var(--wf-accent-ink)` (`#ffffff`/`#06120f`, 5.85:1 & 7.88:1). **Bukan** tosca 500 `#00918e` — putih di atasnya hanya 3.85:1 (lihat `shadcn-theme.css:22-28`) |
| `--secondary` / `--accent` | `#e6f7f6` | tosca 50; foreground `#007a78` (tosca 600, AA) |
| `--muted` / `--border` | `#edeee2` | slate-200 (`theme.css`) |
| `--input` | `#7d847e` / dark `#969b98` | `--wf-rule-control` (`dashboard-wayfinding.css`, 3.73:1 & 5.87:1 — batas kontrol, ambang 3:1) |
| `--muted-foreground` | `#586056` | slate-500 (`theme.css`) |
| `--destructive` | `#b91c1c` / dark `#fca5a5` | `--wf-danger` (`dashboard-wayfinding.css`, 6.29:1 & 8.73:1); md lama juga memakai token ini via `--md-sys-color-error`; foreground `#ffffff` (light) / `#06120f` (dark) |
| `--ring` | `#00918e` | tosca 500 (`theme.css`) |

### Pola komponen dashboard

Impor selalu relatif dari `../shadcn/<prim>` (di `src/pages/*` menjadi `../components/shadcn/<prim>`) — bukan alias `@/` (lihat AGENTS.md aturan 1):

```tsx
// KPI — Card + CardHeader + CardTitle + CardDescription + CardContent
import { Card, CardContent, CardHeader, CardTitle } from "../shadcn/card";

<Card>
  <CardHeader>
    <CardTitle>Total Event</CardTitle>
    <CardDescription>Seluruh periode</CardDescription>
  </CardHeader>
  <CardContent className="text-3xl font-bold text-[var(--wf-ink)]">128</CardContent>
</Card>
```

```tsx
// Navigasi tab — Tabs terkontrol; state tetap milik halaman
import { Tabs, TabsList, TabsTrigger } from "../shadcn/tabs";

<Tabs value={view} onValueChange={(next) => setView(next as ViewMode)}>
  <TabsList>
    <TabsTrigger value="calendar">Kalender</TabsTrigger>
    <TabsTrigger value="list">Daftar</TabsTrigger>
  </TabsList>
</Tabs>
```

```tsx
// Daftar data — Table primitif + Badge untuk status
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../shadcn/table";
import { Badge } from "../shadcn/badge";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Judul</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {events.map((event) => (
      <TableRow key={event.id}>
        <TableCell>{event.title}</TableCell>
        <TableCell><Badge variant="secondary">{label}</Badge></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

```tsx
// Modal — Dialog; DialogTitle wajib (boleh sr-only bila judul visual dirender sendiri)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../shadcn/dialog";
```

```tsx
// Form & filter — Input / Textarea / NativeSelect / Checkbox + Label
import { Label } from "../shadcn/label";
import { NativeSelect } from "../shadcn/native-select";

<div>
  <Label htmlFor="f-status" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Status</Label>
  <NativeSelect id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
    <option value="">Semua</option>
  </NativeSelect>
</div>
```

```tsx
// Loading — Skeleton, bukan div animate-pulse manual
import { Skeleton } from "../shadcn/skeleton";
<Skeleton className="h-24 w-full" />
```

```tsx
// Keadaan kosong — Empty; panel `ui-empty-panel` tetap pembungkus luar agar
// garis/permukaan `--wf-*` tidak berubah. `Empty` sendiri tidak boleh
// menggambar border/background baru: matikan dengan `border-0 bg-transparent`.
import { Empty, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription } from "../shadcn/empty";
import { CalendarDays } from "lucide-react";

<div className="ui-empty-panel" role="status" aria-live="polite">
  <Empty className="border-0 bg-transparent py-16">
    <EmptyMedia>
      <CalendarDays className="h-10 w-10 opacity-60" aria-hidden="true" />
    </EmptyMedia>
    <EmptyHeader>
      <EmptyTitle className="text-sm font-medium">Tidak ada acara ditemukan</EmptyTitle>
      <EmptyDescription className="text-xs text-[var(--wf-ink-muted)]">Coba ubah filter atau kata kunci pencarian.</EmptyDescription>
    </EmptyHeader>
  </Empty>
</div>
```

Aturan:

- Kelas semantik shadcn (`bg-primary`, `text-muted-foreground`, dll.) otomatis resolve ke palet asli lewat `shadcn-theme.css`. Kelas utilitas existing `wf-*` tetap dipakai bila sudah menyatakan desain yang dimaksud.
- Ikon selalu `lucide-react` dengan ukuran utility `size-*` (`size-4`, `size-3.5`), bukan `h-4 w-4`.
- Tombol ikon: `Button variant="ghost" size="icon-sm"` + `aria-label` wajib.
- `Select` Radix menolak `value=""`; bila opsi memuat nilai kosong (sentinel "Semua"), pakai `NativeSelect`.
- Chip filter dengan keadaan terpilih memakai `Toggle` (`pressed` / `onPressedChange`), bukan `Button` + kelas manual.
- **Tabel**: `<table>/<thead>/<tbody>/<tr>/<th>/<td>` di permukaan dashboard WAJIB primitif `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`. `Table` sudah membawa `overflow-x-auto`, jadi jangan bungkus lagi dengan `<div className="overflow-x-auto">`. `TableHead`/`TableRow` membawa tinggi & hover default (`h-10`, `hover:bg-muted/50`); tulis `h-auto` / `hover:bg-transparent` saat `px-4 py-3` dan hover per-baris tetap diperlukan. `[&_tr]:border-b` dari `TableHeader` dimatikan dengan `[&_tr]:border-b-0` bila baris header sudah punya `border-b` sendiri. Status sel tetap `Badge` (`StatusBadge`, `DraftProgressBadge`, `PriorityBadge` sudah berbasis `Badge`).
- **Keadaan kosong**: pakai `Empty` + `EmptyMedia`/`EmptyHeader`/`EmptyTitle`/`EmptyDescription`; panel `ui-empty-panel` tetap dipakai sebagai pembungkus bila elemen itu sudah memilikinya (jangan menambah lapisan border ganda). **`EmptyMedia` tanpa `variant="icon"`** — varian itu memasang `[&_svg:not([class*='size-'])]:size-4` yang mengalahkan `h-10 w-10` dan mengecilkan ikon 40px jadi 16px. Satu baris teks saja cukup `Empty` + `EmptyDescription` (`text-sm text-[var(--wf-ink-muted)]`); `EmptyHeader` hanya perlu bila ada judul + deskripsi.
- **Kontrol form (seluruh app)**: `<input>` → `Input`, `<select>` → `NativeSelect` (atau `Select` bila tanpa opsi kosong), `<textarea>` → `Textarea`, `<button>` → `Button` dengan `variant`/`size`, `<label>` → `Label`. Cakupan penuh sejak **2026-11-11** (Andy: "intinya full migrasi, abaikan rules yang ada"): login dashboard, login modal, admin/`forms`/`modals`/`drafts`/`events`, survei tenant, survei event, formulir komunitas, formulir publik (`EventSubmissionPage`, `SponsorLandingPage`, `ExhibitionsLandingPage`, `TenantParticipationPage`, `TenantCollaborationPage`, `TenantDirectoryPage`), chrome publik (`nav/PublicSiteHeader`, `nav/NavDropdown`), galeri/lightbox (`media/PhotoLightbox`, `events/EventPhotoGallery`), `ui/Editable`, `ui/ErrorBoundary`, dan sepuluh halaman publik lain. Pembungkus kartu terpilih memakai `label` + `RadioGroupItem` shadcn (bukan radio mentah) agar cincin fokus dan keadaan terpilih berasal dari satu primitive.
- **Override wajib saat mengonversi**: primitive membawa default yang menabrak layout asli (`Button` `h-8 px-2.5 rounded-lg active:translate-y-px focus-visible:ring-3`, `Input` `h-8 w-full px-2.5 md:text-sm dark:bg-input/30`, `Textarea` `field-sizing-content min-h-16`, `Label` `flex items-center text-sm font-medium leading-none`, `NativeSelect` menaruh `className` di pembungkus `w-fit`). Pertahankan kelas asli + tambahkan `h-auto`, `whitespace-normal`, `justify-start`, `active:translate-y-0`, `focus-visible:ring-0` (bila sudah ada `ui-focus-ring`), dan pasangan `hover:*`/`dark:hover:*` asli. Karena `cn` repo ini **tidak** mendedupe nilai arbitrary dan kelas token shadcn di-emit setelah kelas `--wf-*`, override yang kalah diberi sufiks `!` Tailwind v4 — preseden `dashboard/Card.tsx`, `AdminSidebar.tsx`, `TenantParticipationPage.tsx`.
- **Teks di dalam `Button`**: guard `[&_svg:not([class*='size-'])]:size-4` memaksa ikon 16px, jadi setiap ikon di dalam tombol memakai kelas `size-*`. Kelas `h-N w-N` lama harus diganti, bukan ditambahkan.

### Pengecualian native yang sah (setelah migrasi penuh 2026-11-11)

Hanya empat kategori teknis ini yang tetap HTML native, masing-masing dengan alasan yang tidak bisa digantikan primitive:

| Kategori | Contoh | Alasan |
|---|---|---|
| **`<input type="file">` tersembunyi** | `modals/*` (6 situs), `community/CommunityRegistrationForm:448`, `events/EventPhotoGallery:222/334`, `letters/LetterWorkspace:428`, `pages/TenantCollaborationPage:573` | Dipicu tombol lewat `ref`/`getElementById().click()` — bukan kontrol visual; `Input` membawa `w-full h-8` yang bertabrakan dengan `sr-only` di lapisan cascade |
| **Anak elemen, bukan kontrol** | `<option>` di dalam `NativeSelect`, `<datalist>`/`<option>` pada saran input `forms/EventForm*` | Tidak ada primitive shadcn untuk datalist; `Combobox` menggantinya berarti mengubah perilaku |
| **`survey/RatingSlider`** | 10 tombol `role="radio"` dengan roving tabindex + panah buatan (`handleKey`) | `RadioGroupItem` Radix menggantikan mesin keyboard itu dan menambah indikator titik — perubahan logika, bukan kosmetik |
| **Permukaan dokumen** | iframe pratinjau PDF (`pdf/PdfPreviewStage`, `pdf/PdfExportOptionsModal`), kertas surat (`letters/LetterPaper`, `letters/SikPaper` — pasangan `dark:bg-[var(--wf-board)]`) | Isi pratinjau adalah halaman dokumen putih; kertas tidak punya kontrol sama sekali |

**Utang struktur yang diketahui:** kartu Kanban (`views/KanbanView`) dan Timeline (`views/TimelineView`) kini `Button` yang membungkus tombol aksi di dalamnya. Bentuk sebelumnya (`<div role="button">` berisi tombol) juga melanggar aturan `nested-interactive`, jadi konversi ini netral untuk a11y dan tidak mengubah bubbling handler; perbaikan yang benar adalah pola *overlay* (kartu `relative` + `Button absolute inset-0` + tombol aksi di atasnya), yang mengubah struktur DOM dan harus dikerjakan bersama tes `views/__tests__`. Kasus serupa ada di `modals/EventAreaManagerModal` (Button memuat `<div>`/`<p>` — valid di React, bukan konten phrasing).

### Migrasi penuh: permukaan netral tidak lagi putih mati (2026-11-11)

Menutup migrasi, seluruh permukaan netral yang masih menulis `bg-white` / `bg-slate-*` secara literal diganti token yang flip sendiri — `bg-[var(--wf-board)]` (`/50`–`/95` untuk veil translusen). Konsekuensi disengaja dan terdokumentasi di aturan 6: di mode terang `#ffffff` menjadi warm board `#fdfcf6`; di mode gelap permukaan ikut gelap sehingga tinta `--wf-ink`/`--wf-ink-muted` tetap terbaca.

| Bukti | Sebelum | Sesudah |
|---|---|---|
| Formulir survei tenant anonim `/tenant-survey/:id` (terukur dengan axe di Chromium, REST di-mock) | **39 node gagal kontras** di tema gelap (`#a9b4a5` di atas `#ffffff` = 2.15:1) | **0** di terang dan gelap |
| `/` `·` `/daftar` `·` `/community` `·` `/docs` `·` `/events` `·` `/gallery` `·` `/partisipasi-tenant` (delapan rute gelap yang gagal di gate a11y repo) | 4–16 node gagal per rute | **0** per rute (terang & gelap) |
| `/dashboard/events`, `/dashboard/drafts`, `/dashboard/calendar`, `/dashboard/content/surat` | — | axe seluruh aturan: **0 pelanggaran** di terang & gelap |
| Input bertoken `dark:bg-white` di `TenantParticipationPage`/`TenantCollaborationPage`/`TenantDirectoryPage` | tinta `--wf-ink` (terang di tema gelap) di atas kotak putih = ~1.1:1 | `bg-[var(--wf-board)]`, tinta dan permukaan flip bersama |

### Kontras & sticky: dua koreksi lapisan primitive (2026-11-11)

Dua cacat yang hanya muncul di pengukuran browser nyata (bukan analisis statis), keduanya sudah diperbaiki di lapisan token/primitive:

| Cacat | Bukti terukur | Perbaikan |
|---|---|---|
| Tombol `bg-primary` (varian default `Button`) gagal AA di tema terang | putih `#ffffff` di atas `#00918e` = **3.85:1** (butuh 4.5) di `/dashboard/events` & `/dashboard/drafts` | `shadcn-theme.css`: `--primary: var(--wf-accent)` + `--primary-foreground: var(--wf-accent-ink)` — pasangan accent dashboard (**5.85:1** terang, 7.88:1 gelap). Tema gelap memang sudah memakai pasangan itu |
| Tab non-aktif gagal AA | `text-foreground/60` → `#6c736b` di atas `--muted #edeee2` = **4.16:1** | `tabs.tsx`: warna non-aktif → `text-muted-foreground` |
| Kertas surat tak terbaca di tema gelap | permukaan flip ke `--wf-board` (`#16211b`) sementara tinta dipin `#0f172a` → **1.07:1** (19 node di `/dashboard/content/surat`) | `LetterPaper`/`SikPaper`: tambah `dark:text-[var(--wf-ink)]` — tinta dan permukaan kini flip bersama |
| Header tabel tidak lagi menempel saat digulir | wrapper `Table` ber-`overflow-x-auto` memaksa `overflow-y: auto` → jadi scrollport terdekat; `sticky top-0` pada `<thead>` mati (offset header **−900px** setelah region digulir 900px) | `table.tsx`: wrapper `overflow-x-auto overflow-y-clip` — bukan scroll container di sumbu Y, sticky kembali merujuk scroller luar. Terukur: offset **0**, gulir horizontal & kolom Aksi sticky kanan tetap utuh |

Hasil akhir: axe `color-contrast` di browser, 5 rute dashboard × terang/gelap = **0 pelanggaran**, dan `scrollWidth == innerWidth` pada 375 px untuk kelima rute.

### Kolisi varian: `md:` dan `dark:` bawaan primitive

`cn` yang dipakai primitive shadcn (`src/components/shadcn/*`) adalah paket **`cn`** (`"cn": "^0.5.2"` — compiler kelas ala tailwind-merge), sedangkan komponen aplikasi memakai `src/utils/cn.ts` (resolver prefix-based sendiri). Konsekuensinya: **kelas varian tidak saling menghapus**. Tiga pola yang sudah terbukti terukur:

| Pola | Efek | Aturan |
|---|---|---|
| `text-[11px]` polos pada `Input` | `Input` membawa `md:text-sm` (varian berbeda) → di ≥768px ukuran melompat ke 14px | ukuran teks non-`sm` pada `Input` WAJIB dicerminkan: `text-[11px] md:text-[11px]` |
| `bg-[var(--wf-board)]` polos pada `Input` | `dark:bg-input/30` bawaan bertahan → di tema gelap permukaannya tint input, bukan board. **Itu perilaku primitive dan sudah jadi mayoritas repo (19 situs), jadi jangan dicerminkan satu-off** | pakai permukaan gelap bawaan primitive; cermin `dark:` hanya bila satu permukaan memang harus beda, dan lakukan untuk seluruh kontrol di permukaan itu |
| `data-active:` (varian salah) | inert — lihat koreksi `tabs.tsx` di atas | varian harus sama persis dengan atribut yang ditulis library |

Selisih terukur pada baris filter Log Aktivitas (sebelum → sesudah patch): `font-size` 14px → **11px**, tinggi 30px → **26.5px**.

### Status migrasi (2026-11-11)

**Selesai.** Seluruh permukaan dashboard memakai primitive shadcn; yang tersisa hanyalah empat kategori pengecualian sah di atas.

| Area | Status |
|---|---|
| Tabel | `events/EventTable`, `drafts/DraftQueueTable`, `drafts/DraftHistoryTable`, `survey/TenantSurveyList`, `community/CommunityRegistrationSection` → `Table` + primitive sel/baris. Sisa `<table>` mentah hanya di permukaan publik (`survey/TenantSurveyResultsPage`) dan sandbox (`pages/MotionLabPage`) |
| Keadaan kosong | `Empty` + `EmptyMedia`/`EmptyHeader`/`EmptyTitle`/`EmptyDescription` di 8 komponen; panel `ui-empty-panel` dipertahankan sebagai pembungkus luar |
| Kontrol form | `Input`/`Label`/`NativeSelect`/`Checkbox`/`Switch`/`Textarea` termasuk input **date** (dengan `dark:[color-scheme:dark]` dipertahankan) di `forms/*`, `modals/*`, `admin/*`, `pages/AdminLoginPage` |
| Tab | `dashboard/ViewToggle`, `dashboard/DashboardCalendarView`, `survey/TenantSurveyPage`, `letters/LetterWorkspace` (pil SKE/SIK) → `Tabs`/`TabsList`/`TabsTrigger` |
| Lapisan legacy Material Web | **Dihapus tuntas (2026-11-11)** — `src/components/md/**` (11 wrapper + `md-internals` + tes), `src/test/md-mocks.ts`, `src/test/md-setup.ts`, `src/styles/material-theme.css`, dan dependency `@material/web` sudah dibuang. Bukti sebelum penghapusan: nol impor `components/md` di luar folder itu, nol `<md-*>` di `src`, nol konsumen `var(--md-sys-color-*)`. Preload dialog `React.lazy` pindah ke `src/test/lazy-modal-setup.ts` (hanya `ConfirmDialog`) |

**Koreksi primitive `tabs.tsx` (2026-11-11):** kelas state aktif semula memakai varian `data-active:` (11 tempat) — atribut itu **tidak pernah** ditulis Radix Tabs (yang menulis `data-state="active"`), sehingga seluruh gaya aktif inert dan tab aktif tampak identik dengan tab non-aktif (terukur: `bg` transparan + `color` sama 60% di `/dashboard/events`). Diganti ke `data-[state=active]:`. Konsekuensinya, konsumen yang punya kelas sendiri harus menang lewat varian yang setara — pil SKE/SIK memakai `data-[state=active]:` + `dark:data-[state=active]:` untuk `bg`/`text` agar pasangan token `--wf-accent` / `--wf-accent-ink` tetap utuh (terukur 5.85:1 terang, 7.88:1 gelap).

### Riwayat (2026-11-10)

Tabel dashboard sudah sepenuhnya memakai primitif `Table`: `events/EventTable`, `drafts/DraftQueueTable`, `drafts/DraftHistoryTable`, `survey/TenantSurveyList`, `survey/TenantSurveyResultsPage` (dua tabel), `community/CommunityRegistrationSection`. Keadaan kosong memakai `Empty` di `events/EventTable`, `views/KanbanView`, `views/TimelineView`, `views/DashboardViewsSection`, `views/CalendarView`, `dashboard/DashboardCalendarView`, `drafts/DraftQueueTable`, `drafts/DraftHistoryTable`. Kontrol login memakai `Button`/`Input`/`Label`. Sejak migrasi penuh 2026-11-11, satu-satunya `<table>` mentah yang tersisa berada di sandbox (`pages/MotionLabPage`).
