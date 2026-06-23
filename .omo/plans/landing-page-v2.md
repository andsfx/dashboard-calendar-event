# landing-page-v2 - Work Plan

## TL;DR (For humans)

**What you'll get:** Landing page baru untuk Metropolitan Mall Bekasi Community Hub di folder `landing-page-v2/` — total overhaul dengan identitas brand asli Metmal (pink `#ec4899` + teal `#14b8a6`), layout Agency/Experimental, scroll-driven narrative, dan motion intensitas tinggi. Semua section existing (hero, benefits, facilities, gallery, steps, form, FAQ, contact) dirancang ulang dengan visual language baru.

**Why this approach:** Brand Metmal asli (logo SVG) pakai pink + teal, bukan violet + orange. Ini koreksi brand alignment sekaligus elevate ke Agency/Experimental aesthetic dengan referensi dari Awwwards, VORTEX, MONOLITH, dan FUBAR. Folder terpisah (`landing-page-v2/`) — zero risk ke dashboard existing. Pakai folder terpisah supaya bisa A/B test nanti.

**What it will NOT do:** Tidak sentuh dashboard admin (`/dashboard/*`), tidak ubah data flow (tetap pakai events/albums/registrations dari Supabase), tidak buat backend baru, tidak ganti routing utama.

**Effort:** Large — 12-15 section components + shared primitives + theme system
**Risk:** Medium — brand palette baru tapi bisa fallback ke existing jika ada issue
**Decisions I made for you:** (1) Tailwind v4 + CSS variables (bukan design system library), (2) Pink+teal palette pakai Tailwind default pink & teal scales (bukan custom Radix), (3) Motion via CSS scroll-driven animations + GSAP untuk sticky/horizontal sections, (4) Font Geist Sans + Geist Mono, (5) No serif, no AI purple, no glassmorphism default, no three equal cards, no eyebrow spam. **FULL EXPERIMENTAL** per user confirm — VARIANCE 9, MOTION 8, DENSITY 3. Warm pink palette + dark accents, NOT cold dark-only. GSAP + Motion dual. Mobile-first performance tetap diutamakan.

Your next move: approve plan, or run a high-accuracy review. Full execution detail follows below.

---

> TL;DR (machine): Large effort, Medium risk — 12-15 section components, Agency/Experimental redesign dengan pink+teal brand Metmal asli

## Scope
### Must have
- `landing-page-v2/` folder dengan Vite + React 19 standalone project (bisa jalan independen)
- Tailwind v4 + CSS custom properties untuk pink & teal theme
- CommunityLandingPage baru dengan section order: Hero → Benefits → Facilities → Gallery → Steps → Form → FAQ → Contact → Footer
- Scroll-driven animations: horizontal gallery pan, sticky card stack, scroll-reveal stagger
- Dark mode support (system preference)
- `prefers-reduced-motion` compliance
- Indonesian copy language (PRESERVE semua konten existing)
- Reusable primitives: RevealSection (Motion/GSAP), section eyebrow (max 1 per 3 sections), CTA button variants
- Responsive mobile-first (breakpoints sm 640, md 768, lg 1024, xl 1280)
- WCAG AA minimum: focus rings, keyboard nav, color contrast

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO violet `#7c6cf2` or orange `#f2743e` — ini palette lama, diganti pink+teal
- NO AI purple gradients as default background
- NO three equal feature cards in a row (Section-Layout-Repetition Ban)
- NO eyebrow di setiap section (max 1 eyebrow per 3 sections)
- NO serif fonts (Geist Sans only)
- NO em-dash di copy text
- NO `window.addEventListener('scroll', ...)` — pakai IntersectionObserver / GSAP ScrollTrigger
- NO `useState` untuk continuous values (mouse/scroll) — pakai `useMotionValue`
- NO dua marquee di satu halaman
- NO zigzag alternation lebih dari 2 section berturut-turut
- NO `h-screen` — pakai `min-h-[100dvh]`
- NO edit ke file di luar `landing-page-v2/`
- NO backend / API changes

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after via Playwright visual regression + unit tests
- Framework: Vitest + Playwright
- Evidence: .omo/evidence/task-<N>-landing-page-v2.<ext>

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

**Wave 1 — Foundation (6 todos):** Project scaffold, theme system, shared primitives, fonts, base layout, CTA variants
**Wave 2 — Sections A (6 todos):** Hero, Benefits, Facilities, Gallery, Steps, Form
**Wave 3 — Sections B + Polish (6 todos):** FAQ, Contact, Footer, Nav, SocialProof, Final integration
**Final Wave:** Playwright snapshot tests, visual QA, contrast audit, build check

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 (scaffold) | — | ALL | — |
| T2 (theme) | T1 | T4-T18 | T3 |
| T3 (primitives) | T1 | T4-T18 | T2 |
| T4 (fonts) | T1 | — | T2, T3, T5 |
| T5 (base layout) | T1 | T6-T18 | T2, T3, T4 |
| T6 (CTA variants) | T2 | T7-T15 | T3, T4, T5 |
| T7-T15 (sections) | T1, T2, T3, T5, T6 | F1-F4 | can parallel within same wave |
| T16-T18 (integration) | T7-T15 | F1-F4 | can parallel |

## Todos

> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

- [ ] 1. **landing-page-v2/ — Project Scaffold** — Vite + React 19 + TypeScript + Tailwind v4
  What to do: `npm create vite@latest landing-page-v2 -- --template react-ts`, install deps (react 19, react-dom 19, tailwindcss v4, @tailwindcss/vite, motion, gsap, react-router-dom, date-fns, lucide-react, clsx, tailwind-merge), configure vite.config.ts with `@tailwindcss/vite` plugin and react plugin, set `tsconfig.json` strict mode with `noUncheckedIndexedAccess` dan `noImplicitReturns`. Set package.json scripts: dev, build, preview, test. Create `public/` folder, copy Metmal logo SVG from `../src/assets/brand/LOGOMETMAL2016-01.svg`.
  Must NOT do: NO create-next-app, NO CRA, NO webpack, NO `npm install` on root project (only in landing-page-v2/), NO `vite.config.ts` outside this folder.
  Parallelization: Wave 1 | Blocked by: — | Blocks: ALL subsequent todos
  References: `D:\Andy\Antigravity\schedule-event-v2\package.json` (current deps to match), `D:\Andy\Antigravity\schedule-event-v2\tsconfig.json` (strict settings), `D:\Andy\Antigravity\schedule-event-v2\vite.config.ts` (Vite plugin patterns)
  Acceptance criteria: `cd landing-page-v2 && npm run dev` starts dev server on localhost, `npm run build` produces dist/, `npm test` passes (even if empty test suite)
  QA scenarios: happy: `npm run build` exits 0; failure: missing @tailwindcss/vite → build fails. Evidence `.omo/evidence/task-1-landing-page-v2.log`
  Commit: Y | `feat(landing-page-v2): scaffold Vite + React 19 + Tailwind v4 project`

- [ ] 2. **index.css — Pink + Teal Theme System** — Tailwind v4 @theme block dengan color scales
  What to do: replace default `src/index.css` with: `@import "tailwindcss";` + `@theme` block defining `--color-pink-*` (11-step dari Tailwind pink scale, OKLCH) dan `--color-teal-*` (11-step dari Tailwind teal scale, OKLCH). Add CSS custom properties for brand tokens: `--brand-pink: var(--color-pink-500)`, `--brand-pink-soft: var(--color-pink-300)`, `--brand-pink-dark: var(--color-pink-700)`, `--brand-teal: var(--color-teal-500)`, `--brand-teal-soft: var(--color-teal-300)`, `--brand-teal-dark: var(--color-teal-700)`. Define dark mode tokens under `.dark` class: swap pink/teal brightness. Add `--color-surface-page: #fafafa`, `--color-surface-card: #ffffff`, dark variants `#111111` and `#1a1a1a`. Use Tailwind default slate/zinc for neutrals. Add `@variant dark (&:where(.dark, .dark *))`.
  Must NOT do: NO `tailwind.config.js` (v4 has none), NO PostCSS plugin (`@tailwindcss/postcss` — use Vite plugin), NO custom 12-step Radix scale (pakai Tailwind default), NO `--brand-violet` / `--brand-orange` (palette lama).
  Parallelization: Wave 1 | Blocked by: T1 | Blocks: T6-T18 | Can parallelize with: T3, T4, T5
  References: `D:\Andy\Antigravity\schedule-event-v2\src\styles\tokens.css:1-33` (brand token pattern to replace), `D:\Andy\Antigravity\schedule-event-v2\src\assets\brand\LOGOMETMAL2016-01.svg` (logo colors: teal #00918E, pink #E24378), Tailwind v4 OKLCH values from research: pink-500 `oklch(0.656 0.241 354.308)`, teal-500 `oklch(0.704 0.14 182.503)`
  Acceptance criteria: `bg-pink-500`, `text-teal-500` utilities work in dev, dark mode toggles correctly, build passes
  QA scenarios: happy: `bg-pink-500` renders pink in browser; failure: undefined color class → no styling. Evidence `.omo/evidence/task-2-landing-page-v2.css`
  Commit: Y | `feat(landing-page-v2): pink + teal theme system with Tailwind v4 @theme`

- [ ] 3. **Shared Primitives** — RevealSection, SectionEyebrow, animations, layout wrappers
  What to do: create `src/components/primitives/` folder with:
  - `RevealSection.tsx` — wraps sections with `motion` `whileInView` + `useReducedMotion()`. Props: `as` (tag), `intensity` (default | strong), `children`, `className`, `skeleton`. Default: `opacity: 0, y: 24 → opacity: 1, y: 0`, `viewport: { once: true, amount: 0.2 }`.
  - `SectionEyebrow.tsx` — `text-[11px] font-semibold uppercase tracking-[0.22em] text-pink-500`. Props: `children`.
  - `ScrollRevealStagger.tsx` — wraps children list with staggered entry (delay `i * 0.06`), same as `RevealStagger` skeleton from design-taste-frontend skill Section 5.C.
  - `useScrollReveal.ts` — IntersectionObserver hook (not in main render cycle), returns `isVisible` boolean.
  Must NOT do: NO GSAP in shared primitives (GSAP only in section-specific components), NO `window.addEventListener('scroll')`, NO `useState` for scroll tracking, NO eyebrow di file ini (eyebrow adalah shared primitive, bukan per-section default).
  Parallelization: Wave 1 | Blocked by: T1 | Blocks: T6-T18 | Can parallelize with: T2, T4, T5
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityRevealPrimitives.tsx` (existing pattern to replace), `D:\Andy\Antigravity\schedule-event-v2\src\hooks\useScrollReveal.ts` (existing hook), design-taste-frontend Skill Section 5.C (RevealStagger canonical skeleton)
  Acceptance criteria: each primitive exports correctly, TypeScript compiles, `useScrollReveal` returns `isVisible` boolean with IntersectionObserver
  QA scenarios: happy: component mounts and reveals on scroll; failure: missing `"use client"` → SSR error in strict mode. Evidence `.omo/evidence/task-3-landing-page-v2.tsx`
  Commit: Y | `feat(landing-page-v2): shared primitives (RevealSection, Eyebrow, Stagger)`

- [ ] 4. **Fonts + Typography** — Geist Sans + Geist Mono, self-hosted
  What to do: install `geist` font npm package (`npm i geist`), configure in `index.css` with `@font-face` + `font-display: swap`. Set CSS custom properties: `--font-display: 'Geist Sans', sans-serif`, `--font-body: 'Geist Sans', sans-serif`, `--font-mono: 'Geist Mono', monospace`. Typography utility classes: display `text-4xl md:text-6xl tracking-tighter leading-[1.05] font-extrabold`, body `text-base leading-relaxed max-w-[65ch]`.
  Must NOT do: NO Google Fonts `<link>` (self-host only), NO Inter font, NO serif font, NO `Plus Jakarta Sans`.
  Parallelization: Wave 1 | Blocked by: T1 | Blocks: (none directly, but needed by all sections) | Can parallelize with: T2, T3, T5
  References: design-taste-frontend Skill Section 3.A (self-host fonts), Section 4.1 (typography defaults, Geist preference over Inter), `D:\Andy\Antigravity\schedule-event-v2\src\styles\fonts.css` (existing pattern)
  Acceptance criteria: Geist renders in browser, font-display: swap prevents FOIT, build passes
  QA scenarios: happy: network tab shows self-hosted Geist .woff2; failure: missing font → fallback sans-serif. Evidence `.omo/evidence/task-4-landing-page-v2.txt`
  Commit: Y | `feat(landing-page-v2): Geist Sans + Mono self-hosted fonts`

- [ ] 5. **Base Layout + Shell** — App.tsx wrapper, Nav, Footer
  What to do: create `src/App.tsx` with `Routes` setup (single route `"/"` for landing page), dark mode class toggle on `<html>`, `Layout.tsx` wrapper with `max-w-[1400px] mx-auto`, `Nav.tsx` (sticky, `bg-white/90 backdrop-blur-md`, pink+teal brand, mobile hamburger), `Footer.tsx` (teal bg, pink CTA, copyright). Nav items: `#benefits`, `#facilities`, `#gallery`, `#cara-daftar`, `#daftar`, `#faq`, `#kontak`. Mobile nav: full-screen overlay, Escape closes.
  Must NOT do: NO glassmorphism `bg-white/30` default, NO two-line nav at desktop, NO nav height > 80px, NO pure `#000` or `#fff` backgrounds.
  Parallelization: Wave 1 | Blocked by: T1 | Blocks: T6-T18 | Can parallelize with: T2, T3, T4
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\CommunityLandingPage.tsx:1-72` (nav items, IntersectionObserver pinning), `D:\Andy\Antigravity\schedule-event-v2\src\components\Navbar.tsx:1-140` (dashboard nav to avoid copying), `D:\Andy\Antigravity\schedule-event-v2\src\components\ui\Footer.tsx`
  Acceptance criteria: nav renders 7 items on single line desktop, hamburger on mobile, dark mode toggle works
  QA scenarios: happy: `npm run dev` → `/` renders nav+footer; failure: mobile Escape doesn't close → a11y violation. Evidence `.omo/evidence/task-5-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): base layout shell with nav + footer`

- [ ] 6. **CTA Button Variants** — Primary, Secondary, Ghost, Text Link
  What to do: create `src/components/ui/Button.tsx` with variants: `primary` (pink-500 bg, white text, `rounded-full px-8 py-4`, hover: `brightness-110 scale-[1.02]`), `secondary` (teal-500 bg, white text), `outline` (border-pink-500, text-pink-500), `ghost` (transparent, pink text). Add `size` variants: sm, md, lg. Motion: `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.98 }}`, respect `useReducedMotion()`. Focus ring: `ring-2 ring-pink-400 ring-offset-2`. Add `motion-reduce:transform-none` and `motion-reduce:transition-none`.
  Must NOT do: NO button without contrast check (4.5:1 minimum), NO CTA with wrapped text (short labels: max 3 words), NO `from-pink-500 to-teal-500` gradient button (single solid), NO white button with white text.
  Parallelization: Wave 1 | Blocked by: T2 | Blocks: T7-T15 | Can parallelize with: T3, T4, T5
  References: design-taste-frontend Skill Section 4.5 (button contrast, CTA wrap ban), `D:\Andy\Antigravity\schedule-event-v2\src\components\ui\Button.tsx` (existing variant pattern)
  Acceptance criteria: all 4 variants render, hover/active states work, reduced motion respected, contrast passes WCAG AA
  QA scenarios: happy: click CTA → correct navigation; failure: `bg-pink-500` text-white contrast < 4.5:1 → fail. Evidence `.omo/evidence/task-6-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): CTA button variants with motion`

- [ ] 7. **Hero Section** — Full-screen pink+teal hero, split layout, scroll indicator
  What to do: create `src/components/Hero.tsx`. Split layout: left 55% text (eyebrow → headline → subtext → dual CTA → quick stats), right 45% visual (hero image with `object-cover` + gradient overlay). Background: dark canvas (`bg-[#0a0a0a]` or `bg-zinc-950`) with noise texture SVG overlay + mesh gradient `radial-gradient` rings (pink-500/20, teal-500/20). Headline: `text-[2.5rem] md:text-6xl font-extrabold leading-[1.05] text-white`, max 2 lines. Subtext: max 20 words, `text-lg text-white/70`. Eyebrow: pink pill badge with Sparkles icon. CTA: primary (pink) → `#register`, secondary (outline) → `#benefits`. Quick stats: 3 inline pills (100% Gratis, Sound 10K Watt, Terbuka Semua). Scroll indicator: animated `ChevronDown` at bottom.
  Must NOT do: NO `h-screen` (use `min-h-[100dvh]`), NO hero overflow forcing scroll, NO trust logos inside hero, NO `pt-*` > `pt-24`, NO hero text > 4 elements total, NO `bg-pink-500` as hero bg (dark canvas with pink glow only).
  Parallelization: Wave 2 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityHero.tsx:1-167` (existing hero layout), design-taste-frontend Skill Section 4.7 (hero discipline rules), VORTEX reference: dark canvas + single accent glow, Codioful "Pink to Cyan" gradient pattern
  Acceptance criteria: hero renders full viewport on mobile/desktop, CTA links scroll to registration, scroll indicator animates
  QA scenarios: happy: `min-h-[100dvh]` hero visible, CTA click → smooth scroll; failure: hero overflows viewport → CTA not visible. Evidence `.omo/evidence/task-7-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): hero section with dark canvas + pink glow`

- [ ] 8. **Benefits Section** — Bentogrid dengan real visual variation
  What to do: create `src/components/Benefits.tsx`. 4 benefit cards dalam asymmetric bento grid (2+2 split dengan varied heights, bukan 4 equal cards). Setiap card: accent bar (pink/teal top border), icon dalam `bg-pink-50` circle, title, description. Minimal 2 cards punya background visual (gradient atau subtle pattern). Data: copy/preserve dari existing BENEFITS array (Dukungan Sponsorship → pink accent, Promosi → teal accent, Kembangkan Komunitas → pink accent, Venue Gratis → teal accent). Grid: `grid-cols-1 md:grid-cols-2` dengan row-span variations. Section header: split-header BANNED — pakai simple centered headline: "Bukan cuma dikasih space." + subtext di bawah. Eyebrow hitung: ini section 2, boleh 1 eyebrow.
  Must NOT do: NO 4 equal cards in a row (bento grid must have varied sizes), NO split-header (headline left + explainer right), NO AI-purple gradient backgrounds on cards (pink/teal only), NO white-on-white cards.
  Parallelization: Wave 2 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T9, T10, T11
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityBenefits.tsx:1-86` (existing benefits data & layout), design-taste-frontend Skill Section 4.7 (bento background diversity rule)
  Acceptance criteria: 4 cards render in 2x2 grid on desktop, each card has distinct visual accent
  QA scenarios: happy: each card visible with colored accent bar; failure: 4 equal white cards → violates bento rule. Evidence `.omo/evidence/task-8-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): benefits bento grid with pink+teal accents`

- [ ] 9. **Facilities Section** — 3x2 card grid, full-width alternating bg
  What to do: create `src/components/Facilities.tsx`. 6 facility cards in `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Each card: icon in pink-100 circle, title, description. Section bg: `bg-zinc-100 dark:bg-zinc-900` (alternating from white). Header: centered headline "Semua udah disiapin." + subtext, NO eyebrow (section 3, after benefits eyebrow). Use `RevealSection` with stagger child animation. Data: copy/preserve from existing FACILITIES array (6 items: Panggung, Sound, Lighting, Kursi, Area Lantai 3, Meja Juri).
  Must NOT do: NO eyebrow on this section (section 3 of 9 = too early for 2nd eyebrow), NO white cards on white bg (use bg-white on bg-zinc-100 section), NO left-image-right-text zigzag.
  Parallelization: Wave 2 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T8, T10, T11
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityFacilities.tsx:1-47` (existing facilities data), design-taste-frontend Skill Section 4.7 (eyebrow restraint rule)
  Acceptance criteria: 6 cards render, stagger animation works on scroll
  QA scenarios: happy: 6 cards fade in sequentially; failure: cards render but no stagger → animation bug. Evidence `.omo/evidence/task-9-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): facilities grid section`

- [ ] 10. **Gallery Section** — Horizontal scroll-pan + Instagram grid
  What to do: create `src/components/Gallery.tsx`. Two sub-sections: (A) Album gallery dengan GSAP horizontal-pan pattern (Section 5.B canonical skeleton — wrapper pinned, inner track scrolls horizontal), 3-6 album cards (cover photo, name, date count). (B) Instagram grid 2-3 cards with cached posts (gunakan pattern dari existing CommunityGallery tapi di-skin ulang). Header: centered, NO eyebrow (section 4, only 1 eyebrow used so far). Gallery skeleton: `SkeletonGalleryAlbums` pattern dari existing. Props: `albums: PhotoAlbum[]`, `instagramPosts?: string[]`, `cachedIgPosts?: CachedInstagramPost[]`.
  Must NOT do: NO marquee (horizontal pan is NOT a marquee — it's scroll-driven, user-controlled), NO iframe Instagram embeds as default (pakai cached image cards), NO `overflow-x-auto` native scroll (must use GSAP ScrollTrigger).
  Parallelization: Wave 2 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T8, T9, T11
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityGallery.tsx:1-284` (existing gallery logic), design-taste-frontend Skill Section 5.B (Horizontal-Pan canonical skeleton GSAP), VORTEX horizontal-scroll project gallery reference
  Acceptance criteria: horizontal scroll works on desktop, falls back to vertical stack on mobile, photo count renders
  QA scenarios: happy: scroll triggers horizontal pan; failure: GSAP ScrollTrigger not registered → no pan. Evidence `.omo/evidence/task-10-landing-page-v2.mp4`
  Commit: Y | `feat(landing-page-v2): gallery with GSAP horizontal pan + Instagram cards`

- [ ] 11. **Steps Section** — 4-step horizontal card stack with sticky-scroll
  What to do: create `src/components/Steps.tsx`. 4 steps sebagai sticky card stack (GSAP Section 5.A canonical skeleton). Each card: numbered badge (01-04), title, description. Cards stack and scale down as user scrolls. Card 1 (pinned top) → Card 2 slides over → Card 3 → Card 4. Final state shows all 4 cards. Data: existing 4-step flow (Isi Form → Tim Review → Konfirmasi → Persiapan & Pelaksanaan). Header: "Cara Daftar — Gampang Banget.", eyebrow: ini section 5 — boleh eyebrow ke-2 (total 2 of ~12 sections, under max 1 per 3 rule).
  Must NOT do: NO left-right zigzag alternation, NO vertical card list without sticky (must use real sticky-stack), NO `start: "top center"` (use `start: "top top"`).
  Parallelization: Wave 2 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T8, T9, T10
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunitySteps.tsx:1-40` (existing steps content), design-taste-frontend Skill Section 5.A (Sticky-Stack canonical skeleton)
  Acceptance criteria: 4 cards stack and scale on scroll, pin works at `top top`, reduced motion falls back to static
  QA scenarios: happy: scroll through section → cards stack properly; failure: pin triggers at wrong point → cards overlap wrongly. Evidence `.omo/evidence/task-11-landing-page-v2.mp4`
  Commit: Y | `feat(landing-page-v2): GSAP sticky-stack steps section`

- [ ] 12. **Registration Form Section** — Multi-step form with org type selector
  What to do: create `src/components/RegistrationForm.tsx`. Preserve full logic dari existing `CommunityRegistrationForm.tsx` tapi re-skin dengan pink theme: option cards `border-2 border-pink-200 hover:border-pink-500 checked:bg-pink-50`, submit button `bg-pink-500` (bukan gradient), inputs `rounded-2xl border-zinc-200 focus:ring-pink-400`, error states `text-pink-600`, success state with pink checkmark circle. OrganizationTypeSelector: 8 org types dalam 4x2 grid pill cards. TypeSpecificFields: conditional fields based on org type. Props: same as existing (no new props needed — form posts to same Supabase endpoint). Label ABOVE input (bukan placeholder). Header: "Daftar Kolaborasi — GRATIS!" + subtext. Eyebrow: NO (section 6, hanya 2 eyebrows total dari 12 sections).
  Must NOT do: NO placeholder-as-label, NO disabled primary submit (kecuali submitting), NO form tanpa field-level error messages, NO `from-brand-secondary to-brand-primary` gradient (solid pink-500), NO white form on white page section (gunakan bg-zinc-50 form container).
  Parallelization: Wave 2 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T13, T14, T15
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityRegistrationForm.tsx:1-398` (form logic, validation, submission), `D:\Andy\Antigravity\schedule-event-v2\src\components\community\OrganizationTypeSelector.tsx`, `D:\Andy\Antigravity\schedule-event-v2\src\components\community\TypeSpecificFields.tsx`
  Acceptance criteria: form renders all 8 org types, validation works, submit posts to Supabase
  QA scenarios: happy: fill form → click submit → success state renders; failure: empty required field → error message appears. Evidence `.omo/evidence/task-12-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): registration form with pink theme`

- [ ] 13. **FAQ Section** — Accordion list, single-open pattern
  What to do: create `src/components/FAQ.tsx`. 6 accordion items with `ChevronDown` icon rotation (180° on open). Single-open-at-a-time via state index. Icon color: `text-pink-500`. Question: `text-lg font-semibold`, answer: `text-base leading-7 text-zinc-600`. Divider: `border-zinc-200`. Wrap in `RevealSection`. Data: 6 existing Q&A items. Header: centered "Masih Ragu?", NO eyebrow.
  Must NOT do: NO simultaneous accordion open (must be single-open), NO chevron animation that doesn't respect reduced-motion.
  Parallelization: Wave 3 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T12, T14, T15
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityFAQ.tsx:1-59` (existing FAQ data & accordion logic)
  Acceptance criteria: 6 questions render, click toggles one at a time, chevron rotates
  QA scenarios: happy: click Q2 → Q1 closes, Q2 opens; failure: multiple open simultaneously → single-open violated. Evidence `.omo/evidence/task-13-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): FAQ accordion section`

- [ ] 14. **Contact Section** — 3 contact tiles + WhatsApp CTA
  What to do: create `src/components/Contact.tsx`. 3 contact cards: WhatsApp Andy, WhatsApp Uca, Email. Each: icon `bg-pink-50 text-pink-600`, title, detail, clickable link (`wa.me` / `mailto:`). Office phone footnote. Cards: `rounded-2xl`, `hover:-translate-y-1`. Header: centered "Hubungi Kami", NO eyebrow. Use `ScrollRevealStagger` for card entry.
  Must NOT do: NO generic "Contact Us" label (use "Hubungi Kami"), NO mixed English/Indonesian labels.
  Parallelization: Wave 3 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T12, T13, T15
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunityContact.tsx:1-29` (existing contact data), `D:\Andy\Antigravity\schedule-event-v2\PRODUCT.md:47-65` (tone & language rules)
  Acceptance criteria: 3 cards render, WhatsApp links open correct wa.me URLs
  QA scenarios: happy: click WhatsApp → opens wa.me tab; failure: empty phone → link broken. Evidence `.omo/evidence/task-14-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): contact section with WhatsApp tiles`

- [ ] 15. **Social Proof Section** — Stat banner, no eyebrow
  What to do: create `src/components/SocialProof.tsx`. Centered banner: "100+ Event Terlaksana", "50+ Komunitas Bergabung", "10,000+ Total Pengunjung". Numbers: `text-3xl md:text-4xl font-extrabold text-pink-600`. Labels: `text-sm text-zinc-500`. Background: `bg-zinc-950` (dark section, full-width). Dark text on dark bg → use white numbers. Section divider: none. NO eyebrow. Wrap in `RevealSection`.
  Must NOT do: NO eyebrow, NO section ini digabung ke section lain (must be standalone dark banner), NO fake-precise numbers (all 3 stats exist in existing code).
  Parallelization: Wave 3 | Blocked by: T1, T2, T3, T5, T6 | Blocks: T16 | Can parallelize with: T12, T13, T14
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\community\CommunitySocialProof.tsx:1-27` (existing stats data)
  Acceptance criteria: dark banner renders with 3 stats, numbers visible in white
  QA scenarios: happy: banner renders dark bg with white text; failure: dark bg + dark text → invisible. Evidence `.omo/evidence/task-15-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): social proof dark stat banner`

- [ ] 16. **Landing Page Assembly** — Compose all sections, pass props, scroll links
  What to do: create `src/pages/LandingPage.tsx` (or compose in `src/App.tsx`). Import all 9 sections (Hero, Benefits, Facilities, Gallery, Steps, RegistrationForm, FAQ, Contact, SocialProof) + Nav + Footer. Pass props: `events`, `albums`, `instagramPosts`, `cachedIgPosts`, `heroImageUrl`, `onEventDetail`. Set `scroll-mt-24` on all sections. Wire nav anchor links to `#section-id`. Handle mobile menu close on nav click. Add `isDark` / `onToggleDark` state.
  Must NOT do: NO section order mutation (must be: Hero → Benefits → Facilities → Gallery → Steps → Form → FAQ → Contact), NO SocialProof placement change (must be before FAQ or after Contact — choose after Gallery for visual punch), NO `id` attribute duplication.
  Parallelization: Wave 3 | Blocked by: T7-T15 | Blocks: T17, T18, F1-F4
  References: `D:\Andy\Antigravity\schedule-event-v2\src\components\CommunityLandingPage.tsx:100-216` (section composition), `D:\Andy\Antigravity\schedule-event-v2\src\App.tsx:616-641` (route setup)
  Acceptance criteria: all 9 sections render on `/`, nav links scroll correctly, mobile menu works
  QA scenarios: happy: scroll through all sections → each section appears; failure: nav link → wrong section id → no scroll. Evidence `.omo/evidence/task-16-landing-page-v2.png`
  Commit: Y | `feat(landing-page-v2): compose landing page with all sections`

- [ ] 17. **Animation QA + Reduced Motion** — Verify all motion respects `prefers-reduced-motion`
  What to do: audit every animated component (RevealSection, ScrollRevealStagger, Hero scroll indicator, GSAP sticky-stack, GSAP horizontal-pan, button hover, FAQ chevron). Add `useReducedMotion()` check at top of each: return static fallback. Test with Windows `Settings > Accessibility > Visual Effects > Animation effects = Off` OR manual CSS `@media (prefers-reduced-motion: reduce)`. Add `motion-reduce:` Tailwind variants on all transitional CSS.
  Must NOT do: NO animation that doesn't have a fallback, NO infinite loops that ignore reduced motion.
  Parallelization: Wave 3 | Blocked by: T16 | Blocks: F1-F4
  Acceptance criteria: every animated element goes static when reduced motion pref is on
  QA scenarios: happy: toggle reduced motion → all animasi freeze; failure: sticky-stack still animates → not respecting. Evidence `.omo/evidence/task-17-landing-page-v2.txt`
  Commit: Y | `fix(landing-page-v2): reduced motion compliance for all animations`

- [ ] 18. **Contrast & Accessibility Audit** — WCAG AA on all components
  What to do: verify every interactive element has: visible focus ring (`focus-visible:ring-2 focus-visible:ring-pink-400`), text contrast ≥ 4.5:1 for body / 3:1 for large, aria labels on icon-only buttons, skip-link before nav, `role="navigation"` on nav, `aria-expanded` on mobile menu / FAQ accordion, form labels with `htmlFor`, `aria-describedby` for errors. Check: pink-500 on white = contrast? pink-500 `#ec4899` on white `#ffffff` → ratio ~3.7:1 (FAIL) → must use pink-600 `#db2777` for white-bg CTAs with small text. Teal-500 `#14b8a6` on white → ratio ~3.4:1 (FAIL) → use teal-600 `#0d9488`. White text on pink-500 bg → ratio ~4.6:1 (PASS for large, borderline for small) → use white with `font-semibold`.
  Must NOT do: NO skipped contrast check on CTA buttons, NO form without error aria, NO missing alt text on images.
  Parallelization: Wave 3 | Blocked by: T16 | Blocks: F1-F4 | Can parallelize with: T17
  Acceptance criteria: every interactive element passes WCAG AA contrast
  QA scenarios: happy: axe DevTools scan returns 0 violations; failure: CTA button contrast < 4.5:1. Evidence `.omo/evidence/task-18-landing-page-v2.json`
  Commit: Y | `fix(landing-page-v2): WCAG AA contrast + accessibility fixes`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. **Plan compliance audit** — run `task(subagent_type="oracle")` to verify: all 18 todos completed, no scope creep, must-NOT-have rules not violated, 9 sections rendered, pink+teal palette consistent across all components, no violet/orange leakage.
- [ ] F2. **Code quality review** — run `task(subagent_type="oracle")` to check: TypeScript strict mode clean, no `any` types, no `useState` for continuous values, GSAP cleanup (`ctx.revert()`) in all `useEffect`, LSP diagnostics zero errors.
- [ ] F3. **Real visual QA** — `cd landing-page-v2 && npm run build && npm run dev`, open browser Playwright, capture full-page screenshot, verify visually: dark mode toggles, mobile layout single-column, nav hamburger, form validation, FAQ accordion, gallery horizontal scroll. Capture 5 screenshots (desktop light, desktop dark, mobile light, mobile dark, reduced motion).
- [ ] F4. **Scope fidelity** — verify: NO files touched outside `landing-page-v2/`, NO backend/Supabase changes, dashboard `/dashboard/*` still works unchanged, product code in `src/` untouched.

## Commit strategy
- One commit per todo (atomic, single-purpose)
- Commit messages: `type(landing-page-v2): description` format
- Branch: stay on current branch unless user wants separate PR branch
- After all todos + final wave pass: tag or user confirms merge

## Success criteria
1. `landing-page-v2/` runs independently with `npm run dev` and `npm run build`
2. All 9 sections render in correct order on `/`
3. Pink (`#ec4899` family) + Teal (`#14b8a6` family) palette — zero violet/orange
4. Scroll-driven animations: gallery horizontal pan, steps sticky stack, section reveals
5. Dark mode works (system preference), reduced motion respected
6. WCAG AA contrast on all interactive elements
7. Indonesian copy preserved from existing components
8. Mobile responsive: single-column below 768px, nav hamburger, form single-column
9. Zero TypeScript errors, zero console errors (except Supabase network in dev)
10. Build output < 300KB gzipped (GSAP + Motion are large libraries)
