# community-landing-redesign - Work Plan

## TL;DR (For humans)
**What you'll get:** A landing page that follows design-taste-frontend v2 standards — self-hosted fonts, design-token colors, no scroll jank, restrained eyebrows, split hero, no duplicate CTAs — while keeping every URL, nav label, form field, logo, and piece of copy exactly the same.

**Why this approach:** PRESERVE mode (locked in Step 2) means no editorial changes. Only surface presentation gets modernized. The 9 levers run in priority order: tokens/fonts first (foundation), then scroll/eyebrows (perceived quality), then layout (visual). All 4 verification gates (em-dash, Pre-Flight, preservation, brand) run before declaring done — any fail blocks completion.

**What it will NOT do:** No URL changes. No nav label changes. No form field changes. No logo changes. No copy voice changes. No new colors. No GSAP/marquee. No aesthetic overhaul. Brand accent stays `#7c6cf2` violet, `#f2743e` orange.

**Effort:** Medium
**Risk:** Low — every change is reversible; scope is additive refactor of existing styles, not new features
**Decisions to sanity-check:** 4 CommunityEyebrow cap (max 4 eyebrow text labels total); sentinel-div IO for header pin (alternative: keep scroll listener — rejected per Section 5.D); CTA dedup removes standalone `#events` section (8 nav labels preserved)

Your next move: Run dual Momus review (native + Codex CLI on gpt-5.5 xhigh), fix any cited issues, then start work.

---

> TL;DR (machine): 14 todos in 4 waves; foundation (tokens+fonts), quality (scroll+eyebrows), layout (hero+cta+layout+zigzag), bugfixes+QA. Zero-judgment worker brief.

## Scope
### Must have
- Self-host Plus Jakarta Sans 400/500/600/700/800 woff2 in `public/fonts/`
- Add `--color-neutral-page: #fbfaf7` to design tokens, migrate 8+ hardcoded hex uses
- Replace `window.addEventListener('scroll')` with IntersectionObserver sentinel
- Consolidate 11 raw eyebrow instances to CommunityEyebrow component (cap: 4 component calls + 2 inline badge)
- Convert hero to split layout (text left / visual right on `lg+`, stack on mobile)
- Dedup nav `#events` → `#upcoming-events`, remove redundant `#events` showcase section
- Alternate layout patterns: centered (steps/faq/form) + side-by-side (benefits/facilities)
- Remove alternating mirror decoration patterns
- Bundle fixes: dead import, broken `<strong>`, `<title>`, meta description, OG/Twitter, mesh gradient, shimmer colors
- Run 4 verification gates post-implementation

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No URL changes (all `href` values preserved exactly)
- No nav label changes (8 items: Upcoming, Keuntungan, Fasilitas, Galeri, Event, Cara Daftar, Daftar, FAQ)
- No form field name changes
- No logo/brand icon changes
- No legal copy changes
- No GSAP, marquee, or new motion libraries
- No color palette rewrite (only token migration to existing palette)
- No copy voice changes (Indonesian casual register preserved)
- No font family changes (Plus Jakarta Sans preserved)
- No dark mode logic changes
- No aesthetic overhaul
- No component restructuring beyond specified levers

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after + visual + build verification
- Evidence: `.omo/evidence/task-<N>-community-landing-redesign.<ext>`
- Build gate: `npm run build` must pass with zero errors
- LSP gate: `lsp_diagnostics` clean on all touched files
- Em-dash gate: grep `—` in scope files returns 0 matches
- Preservation gate: nav labels (8), anchor IDs (8), form field names, logo src, legal copy all unchanged
- Brand gate: all colors resolve to design tokens (no hardcoded hex except in theme.css/tokens.css source-of-truth files)
- Visual gate: 3 viewport screenshots (375/768/1280) at production URL

## Execution strategy
### Parallel execution waves
> 4 waves, 14 todos total. Foundation → quality → layout → bugfixes+QA.

**Wave 1 (Foundation):** Todos 1-2 — tokens, fonts
**Wave 2 (Quality):** Todos 3-4 — IntersectionObserver, eyebrow consolidation
**Wave 3 (Layout):** Todos 5-8 — hero split, CTA dedup, layout diversification, zigzag ban
**Wave 4 (Bugfixes + QA):** Todos 9-10 bugfixes, 11-14 verification gates

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1. Tokenize stray bg | — | 4, 9, 10, 11 | 2 |
| 2. Self-host fonts | — | 11 | 1 |
| 3. IntersectionObserver scroll | — | 11 | 4 |
| 4. Eyebrow restraint | — | 11, 12 | 3 |
| 5. Hero split layout | — | 12, 13 | 6, 7, 8 |
| 6. CTA dedup | — | 11, 12 | 5, 7, 8 |
| 7. Layout diversification | — | 12, 13 | 5, 6, 8 |
| 8. Zigzag ban | — | 12, 13 | 5, 6, 7 |
| 9. Bug fixups | 1 | 11, 12, 14 | 10 |
| 10. SEO + meta fixes | — | 11, 14 | 9 |
| 11. Em-dash audit | 1-4, 9, 10 | 14 | — |
| 12. Pre-Flight Check | 4-9, 10 | 14 | — |
| 13. Visual QA | 5, 7, 8 | 14 | — |
| 14. Preservation + brand audit | all | — | 11, 12, 13 |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

### Wave 1: Foundation

- [x] 1. Add `--color-neutral-page` design token + migrate 8+ hardcoded hex uses
  What to do / Must NOT do: Step A — ADD ONE token only: `--color-neutral-page: #fbfaf7` to `src/styles/tokens.css:11` (after brand-card-light line). Step B — ADD ONE new slot to theme.css: insert between lines 41-42 (after `--color-neutral-100: #faf6ef` and before `--color-neutral-200: #fffdf9`) the line: `--color-neutral-150: #fbfaf7;   /* brand-page */`. This is a NEW slot, does NOT overwrite the existing `--color-neutral-300: #cbd5e1` (slate-300) at line 48. Step C — Migrate each hardcoded hex to the EXACT replacement listed below:

  | File:line | Current | Replacement |
  |---|---|---|
  | CommunityLandingPage.tsx:111 | `bg-[#fbfaf7]/96` | `bg-neutral-150/96` |
  | CommunityLandingPage.tsx:124 | `bg-[#fbfaf7]` | `bg-neutral-150` |
  | CommunityFacilities.tsx:16 | `bg-[#f4efe8]` | `bg-neutral-50` |
  | CommunityFAQ.tsx:20 | `bg-[#f4efe8]` | `bg-neutral-50` |
  | CommunityGallery.tsx:174 | `bg-[#f4efe8]` | `bg-neutral-50` |
  | CommunityGallery.tsx:155 | `bg-[#faf6ef]` | `bg-neutral-100` |
  | CommunityUpcomingEvents.tsx:170 | `bg-[#faf6ef]` | `bg-neutral-100` |
  | CommunityHero.tsx:52 | `#1a0533`, `#0f172a`, `#1e1b4b`, `#312e81` (4 gradient stops) | Replace gradient with `linear-gradient(135deg, var(--brand-violet) 0%, var(--brand-ink) 40%, var(--brand-violet-soft) 100%)` |
  | CommunityBenefits.tsx:10 | `'#f59e0b'` | `'var(--brand-orange)'` |
  | CommunityBenefits.tsx:16 | `'#ec4899'` | `'var(--brand-violet)'` |
  | CommunityBenefits.tsx:22 | `'#8b5cf6'` | `'var(--brand-violet-soft)'` |
  | CommunityBenefits.tsx:28 | `'#10b981'` | `'var(--brand-violet)'` |

  Do NOT change existing neutral palette slots. Do NOT change any component logic. Do NOT modify token definitions for existing values. Do NOT add tokens other than `--color-neutral-page` (tokens.css) + `--color-neutral-150` (theme.css). Do NOT change the BENEFITS array structure.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 4, 9, 10, 11
  References (executor has NO interview context - be exhaustive):
  - src/styles/tokens.css:1-32 (full file — add at line 11)
  - src/styles/theme.css:38-50 (neutral palette — insert at line 42)
  - src/components/CommunityLandingPage.tsx:111,124
  - src/components/community/CommunityFacilities.tsx:16
  - src/components/community/CommunityFAQ.tsx:20
  - src/components/community/CommunityGallery.tsx:155,174
  - src/components/community/CommunityUpcomingEvents.tsx:170
  - src/components/community/CommunityHero.tsx:52
  - src/components/community/CommunityBenefits.tsx:5-30 (BENEFITS array with color field)
  Acceptance criteria (agent-executable):
  - `grep -E "#[0-9a-fA-F]{3,6}" src/components/CommunityLandingPage.tsx src/components/community/CommunityHero.tsx src/components/community/CommunityBenefits.tsx src/components/community/CommunityFacilities.tsx src/components/community/CommunityFAQ.tsx src/components/community/CommunityGallery.tsx src/components/community/CommunityUpcomingEvents.tsx` returns 0 matches in changed locations (allow existing Tailwind class colors like `text-violet-600`)
  - `npm run build` exits 0
  - `lsp_diagnostics` returns no errors on all touched files
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-1-community-landing-redesign.md
  - Happy: `npm run build` → expect "built in <X>s" with 0 errors
  - Failure: introduce `#fbfaf7` back in CommunityLandingPage.tsx, run `grep -E "#fbfaf7" src/components/CommunityLandingPage.tsx` → expect no match (migrated)
  - Visual: render `https://metmal-community-hub.vercel.app/` at 1280px viewport, screenshot → expect no visual regression vs. pre-redesign (header bg, body bg, section bgs unchanged)
  Commit: Y | chore(tokens): add --color-neutral-page + migrate 8+ hardcoded hex to design tokens

- [x] 2. Self-host Plus Jakarta Sans (400/500/600/700/800) + remove Google Fonts CDN
  What to do / Must NOT do: Download Plus Jakarta Sans woff2 files for weights 400, 500, 600, 700, 800 from a reputable source (Google Fonts API download endpoint or GitHub repo `itsmikenikolai/plus-jakarta-sans`). Save to `public/fonts/PlusJakartaSans-<weight>.woff2`. Create `src/styles/fonts.css` with `@font-face` declarations for each weight (font-family: 'Plus Jakarta Sans', font-style: normal, font-weight: <w>, font-display: swap, src: url('/fonts/PlusJakartaSans-<w>.woff2') format('woff2')). Import the new CSS file from `src/main.tsx`. Remove from `index.html:29-31`: the preconnect lines, the Google Fonts stylesheet `<link>`. Do NOT change the font-family declarations in `src/styles/tokens.css:3-4` (already correct). Do NOT add other font families. Do NOT use raster formats. Do NOT use CDN. Do NOT change any other CSS file.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 11
  References (executor has NO interview context - be exhaustive):
  - index.html:29-31 (lines to remove)
  - src/styles/tokens.css:3-4 (font-family declarations to keep)
  - src/main.tsx (where to import new fonts.css)
  - public/fonts/ (target directory)
  Acceptance criteria (agent-executable):
  - `Test-Path public/fonts/PlusJakartaSans-400.woff2` returns True (and same for 500, 600, 700, 800)
  - `Test-Path src/styles/fonts.css` returns True
  - `grep -E "fonts\.googleapis|fonts\.gstatic" index.html` returns 0 matches
  - `grep -E "Plus Jakarta Sans" src/main.tsx` returns 1 match (import)
  - `npm run build` exits 0
  - Visual: load page, browser Network tab shows fonts served from `/fonts/` (not `fonts.googleapis.com`)
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-2-community-landing-redesign.md
  - Happy: `Test-Path` all 5 woff2 files + fonts.css → True; `npm run build` → 0 errors
  - Failure: delete one woff2 file, rebuild → expect font-display: swap fallback to render with system font (no build error)
  - Visual: Playwright `page.goto('https://metmal-community-hub.vercel.app/')` + `page.evaluate(() => document.fonts.check('16px "Plus Jakarta Sans"'))` → expect true
  Commit: Y | chore(fonts): self-host Plus Jakarta Sans, remove Google Fonts CDN

### Wave 2: Quality

- [x] 3. Replace `window.addEventListener('scroll')` with IntersectionObserver sentinel
  What to do / Must NOT do: In `src/components/CommunityLandingPage.tsx`, replace the `useEffect` block at lines 88-93 (the `onScroll` handler that sets `isHeaderPinned` based on `window.scrollY > 24`). Implementation: render a hidden sentinel `<div ref={sentinelRef} className="absolute top-0 h-px w-px" aria-hidden="true" />` placed right BEFORE `</main>` (line 205 in current file, but use the actual `</main>` tag position). Use `IntersectionObserver` with `threshold: 0.1` to observe the sentinel. When sentinel is NOT intersecting (out of view, scrolled past) → `setIsHeaderPinned(true)`. When sentinel IS intersecting (in view) → `setIsHeaderPinned(false)`. Clean up observer on unmount. Respect `prefers-reduced-motion` (set initial state to false; observer is reduced-motion safe). Do NOT change the `isHeaderPinned` state, header className logic, or any visual behavior. Do NOT use a different threshold than 0.1. Do NOT add scroll event listeners. Do NOT change other useEffect blocks.
  Parallelization: Wave 2 | Blocked by: — | Blocks: 11
  References (executor has NO interview context - be exhaustive):
  - src/components/CommunityLandingPage.tsx:88-93 (scroll listener to replace)
  - src/components/CommunityLandingPage.tsx:205 (EXACT location — insert sentinel right before `</main>`)
  - src/hooks/useScrollReveal.ts (reference IO pattern)
  - src/hooks/useScrollReveal.ts (reference pattern for IntersectionObserver)
  Acceptance criteria (agent-executable):
  - `grep -n "addEventListener.*scroll" src/components/CommunityLandingPage.tsx` returns 0 matches
  - `grep -n "IntersectionObserver" src/components/CommunityLandingPage.tsx` returns ≥1 match
  - `npm run build` exits 0
  - `lsp_diagnostics` clean
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-3-community-landing-redesign.md
  - Happy: load page at 1280px, scroll to top → expect header transparent (no pin); scroll past hero → expect header pinned (white bg); scroll back to top → expect header transparent again
  - Failure: break observer setup (e.g., wrong threshold), reload → expect visual regression (header never pins) but no console errors
  - Lighthouse: run Lighthouse Performance audit, expect no CLS regression
  Commit: Y | perf(scroll): replace window scroll listener with IntersectionObserver sentinel for header pin

- [x] 4. Consolidate raw eyebrow instances — definitive table (target: 4 CommunityEyebrow usages)
  What to do / Must NOT do: Apply EXACTLY the actions below. Each row is a single file:line change. NO narrative interpretation.

  | # | File:line | Current element | Action | Result after change |
  |---|-----------|-----------------|--------|---------------------|
  | 1 | CommunityContact.tsx:2 | import includes `CommunityEyebrow` | DELETE `, CommunityEyebrow` from import | import: `{ RevealSection } from './CommunityRevealPrimitives'` |
  | 2 | CommunityRegistrationForm.tsx:361 | `<CommunityEyebrow>Daftar Sekarang</CommunityEyebrow>` | REMOVE the entire `<CommunityEyebrow>` element (keep the line but delete the JSX) | No eyebrow rendered above form |
  | 3 | CommunityGallery.tsx:177 | `<CommunityEyebrow className="text-xs">Galeri</CommunityEyebrow>` | REMOVE the entire `<CommunityEyebrow>` element | No eyebrow, H2 stands alone |
  | 4 | CommunitySocialProof.tsx:16 | `<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 ...">` | CHANGE to `<CommunityEyebrow className="text-xs text-slate-500 dark:text-slate-400">` (keep children text) | Uses CommunityEyebrow component |
  | 5 | CommunityHero.tsx:87 | `<div className="...text-[12px] font-bold uppercase tracking-[0.25em] ...">100+ Event Sudah Terlaksana</div>` | CHANGE from `text-[12px] font-bold uppercase tracking-[0.25em]` to `text-[12px] font-bold tracking-wider` (remove uppercase, reduce tracking) | Hero pill badge — NOT an eyebrow |
  | 6 | CommunityUpcomingEvents.tsx:128 | `<p className="...text-[10px] font-semibold uppercase tracking-[0.2em]">{label}</p>` | CHANGE from `font-semibold uppercase tracking-[0.2em]` to `font-medium tracking-wider` (remove uppercase, reduce tracking) | CountdownPill label — NOT an eyebrow |
  | 7 | CommunityUpcomingEvents.tsx:172 | `<span className="...text-[10px] font-bold uppercase tracking-widest ...">` | No change needed (already tracking-widest, no eyebrow pattern) | Status pill — KEEP as-is |
  | 8 | CommunityUpcomingEvents.tsx:205 | `<p className="...text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: catColor }}>` | CHANGE from `font-semibold uppercase tracking-[0.3em]` to `font-bold tracking-wide` (remove uppercase, reduce tracking, keep color inline) | Countdown label — NOT an eyebrow |
  | 9 | CommunityUpcomingEvents.tsx:259 | `<span className="...text-[10px] font-bold uppercase tracking-wider ...">` | No change needed (date badge, not eyebrow) | Keep as-is |
  | 10 | CommunityUpcomingEvents.tsx:287 | `<p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: catColor }}>` | CHANGE from `font-semibold uppercase tracking-[0.3em]` to `text-[11px] font-bold tracking-[0.2em]` (reduce to compact badge, not full eyebrow) | Sponsor badge — NOT an eyebrow |
  | 11 | CommunityGallery.tsx:191 | `<h3 className="text-xs font-semibold uppercase tracking-[0.2em] ...">Dokumentasi Event</h3>` | CHANGE from `font-semibold uppercase tracking-[0.2em]` to `font-bold tracking-wide` (remove uppercase, reduce tracking) | Sub-heading — NOT an eyebrow |
  | 12 | CommunityGallery.tsx:242 | `<h3 className="text-xs font-semibold uppercase tracking-[0.2em] ...">Instagram</h3>` | Same change as #11 | Sub-heading — NOT an eyebrow |

  **Final CommunityEyebrow usage count:** 4 files (Benefits @line 37, Facilities @line 20, Steps @line 15, FAQ @line 23). SocialProof added to also use CommunityEyebrow — net = 4 usages (Benefits, Facilities, Steps, FAQ). Wait: SocialProof row #4 also adds CommunityEyebrow usage. That would make 5, not 4. Let's NOT add SocialProof to CommunityEyebrow — instead keep SocialProof as a standalone label. Revised final: **4 CommunityEyebrow usages** (Benefits, Facilities, Steps, FAQ). SocialProof stays as raw `<p>` with text styling identical to CommunityEyebrow but using inline classes (not the component), since the content "Dipercaya oleh komunitas di Bekasi" is a social proof stat label, not a section eyebrow. The 4 CommunityEyebrow components are for section eyebrow labels only.

  **Final count:** 4 files with `<CommunityEyebrow>` → Benefits.tsx:37, Facilities.tsx:20, Steps.tsx:15, FAQ.tsx:23.
  
  Do NOT change the CommunityEyebrow component. Do NOT change H2/H3 headings. Do NOT change copy text. Do NOT add new components. Do NOT remove any import other than CommunityContact.tsx:2. Do NOT change CommunityHero pill structure (keep the `<div>` with pill children, just the text class changes).
  Parallelization: Wave 2 | Blocked by: — | Blocks: 11, 12
  References (executor has NO interview context - be exhaustive):
  - src/components/community/CommunityRevealPrimitives.tsx:47-53 (CommunityEyebrow component)
  - src/components/community/CommunityContact.tsx:2 (row #1)
  - src/components/community/CommunityRegistrationForm.tsx:361 (row #2)
  - src/components/community/CommunityGallery.tsx:177 (row #3)
  - src/components/community/CommunitySocialProof.tsx:16 (row #4 — verify: keep as inline, no component)
  - src/components/community/CommunityHero.tsx:87 (row #5)
  - src/components/community/CommunityUpcomingEvents.tsx:128,172,205,259,287 (rows #6-10)
  - src/components/community/CommunityGallery.tsx:191,242 (rows #11-12)
  Acceptance criteria (agent-executable):
  - `grep -E "uppercase tracking-\[0\.[23]em\]" src/components/community/CommunitySocialProof.tsx src/components/community/CommunityUpcomingEvents.tsx src/components/community/CommunityGallery.tsx src/components/community/CommunityContact.tsx` returns 0 matches (all raw eyebrow patterns removed)
  - `grep -n "CommunityEyebrow" src/components/community/CommunityContact.tsx` returns 0 matches (dead import gone)
  - `grep -rn "CommunityEyebrow" src/components/community/CommunityRegistrationForm.tsx src/components/community/CommunityGallery.tsx` returns 0 matches (2 usages removed)
  - `grep -rl "<CommunityEyebrow" src/components/community/` returns exactly 4 files: `Benefits.tsx, Facilities.tsx, Steps.tsx, FAQ.tsx` (verify with: match count = 4)
  - `npm run build` exits 0
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-4-community-landing-redesign.md
  - Happy: `grep -rl "<CommunityEyebrow" src/components/community/` → returns 4 filenames, all match {Benefits,Facilities,Steps,FAQ}
  - Failure: leave CommunityEyebrow in CommunityRegistrationForm.tsx → grep returns 5 filenames (test fails)
  - Visual: Playwright screenshot each section at 1280px → expect only 4 text labels styled as uppercase tracking-[0.3em] violet text (Benefits, Facilities, Steps, FAQ)
  Commit: Y | refactor(eyebrow): consolidate raw eyebrow instances, target 4 CommunityEyebrow usages

### Wave 3: Layout

- [x] 5. Convert hero to split layout (text left / visual right on lg+)
  What to do / Must NOT do: In `src/components/community/CommunityHero.tsx`, change the container at line 85 from centered single-column to a 2-column grid on `lg+`. Replace `<div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">` with `<div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-24 sm:px-6"><div className="grid w-full gap-12 lg:grid-cols-[55fr_45fr] lg:items-center">`. Move the existing RevealSection content into the LEFT column. Create a new RIGHT column containing the hero image (or hero fallback block with gradient + noise) as a decorative visual element. On mobile (`<lg`), grid collapses to single column stacked. Adjust text alignment: left-aligned on `lg+` (`lg:text-left`), centered on mobile. The "100+ Event Sudah Terlaksana" pill badge, H1, body paragraphs, CTAs, quick stats all stay in the LEFT column. The RIGHT column contains ONLY a visual (hero image if `heroImageUrl` provided, otherwise a styled card/gradient block — NOT another mesh gradient; use a single subtle gradient panel with rounded corners + the noise texture). Do NOT change the H1 text. Do NOT change the CTAs. Do NOT change the mesh gradient fallback at lines 63-73 (Lever #8 will simplify, not this todo). Do NOT change the scroll indicator. Do NOT change the background layers.
  Parallelization: Wave 3 | Blocked by: — | Blocks: 12, 13
  References (executor has NO interview context - be exhaustive):
  - src/components/community/CommunityHero.tsx:1-156 (full file)
  - src/components/community/CommunityHero.tsx:85 (container to change)
  - src/components/community/CommunityHero.tsx:24-75 (background layers — keep as-is)
  - src/components/community/CommunityHero.tsx:78-83 (decorative blur elements — keep as-is)
  Acceptance criteria (agent-executable):
  - `grep -n "lg:grid-cols-\[55fr_45fr\]" src/components/community/CommunityHero.tsx` returns 1 match
  - `grep -n "text-center sm:px-6" src/components/community/CommunityHero.tsx` returns 0 matches (text-center removed from container, replaced with lg:text-left on inner divs)
  - `npm run build` exits 0
  - Playwright: render at 1280px viewport → expect 2-column layout (text left ~55%, visual right ~45%)
  - Playwright: render at 375px viewport → expect single-column stacked layout (text above visual)
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-5-community-landing-redesign.md
  - Happy: Playwright 1280px → 2-col grid visible; 375px → stacked
  - Failure: remove `lg:grid-cols-` → expect layout broken at 1280px (text-only centered, no visual column)
  - Visual: capture before/after screenshots at both viewports
  Commit: Y | feat(hero): split layout — text 55% left, visual 45% right on lg+

- [x] 6. Dedup nav anchor — nav `#events` → `#upcoming-events`, remove redundant `#events` section
  What to do / Must NOT do: In `src/components/CommunityLandingPage.tsx:66`, change `{ href: '#events', label: 'Event' }` to `{ href: '#upcoming-events', label: 'Event' }` (same label, points to existing upcoming events section). Remove the conditional block at lines 184-195 (the standalone `#events` section that renders `EventShowcase`). This section is redundant because:
  1. The nav label "Event" now points to #upcoming-events which already shows featured events
  2. The standalone section only renders when `events.length > 0 && onEventDetail` which is the same condition as CommunityUpcomingEvents
  3. EventShowcase component is exported from CommunityUpcomingEvents.tsx and only used in this one place — keep the export (don't delete the function in case of future use, but mark as unused via comment)
  
  Do NOT change the 8 nav item labels. Do NOT change the 8 nav item hrefs (only #events → #upcoming-events). Do NOT change the CommunityUpcomingEvents component. Do NOT delete EventShowcase function. Do NOT change any other section. Do NOT add new sections.
  Parallelization: Wave 3 | Blocked by: — | Blocks: 11, 12
  References (executor has NO interview context - be exhaustive):
  - src/components/CommunityLandingPage.tsx:61-70 (NAV_ITEMS array)
  - src/components/CommunityLandingPage.tsx:184-195 (redundant #events section)
  - src/components/community/CommunityUpcomingEvents.tsx:85-103 (EventShowcase function — keep)
  Acceptance criteria (agent-executable):
  - `grep -n "'#events'" src/components/CommunityLandingPage.tsx` returns 0 matches
  - `grep -n "id=\"events\"" src/components/CommunityLandingPage.tsx` returns 0 matches
  - `grep -n "EventShowcase" src/components/CommunityLandingPage.tsx` returns 0 matches
  - `grep -n "href: '#upcoming-events'" src/components/CommunityLandingPage.tsx` returns 1 match
  - `grep -n "href: '#benefits'" src/components/CommunityLandingPage.tsx` returns 1 match (verify no other anchor was broken)
  - NAV_ITEMS count: `grep -c "label:" src/components/CommunityLandingPage.tsx` returns 8 (8 nav items preserved)
  - `npm run build` exits 0
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-6-community-landing-redesign.md
  - Happy: load page, click "Event" nav link → expect scroll to #upcoming-events section
  - Failure: leave `#events` in nav but remove section → expect browser console "Cannot find #events" error
  - Visual: Playwright at 1280px → expect 8 nav items, no duplicate Event entry, no orphaned #events section
  Commit: Y | refactor(nav): dedup nav anchor #events → #upcoming-events, remove redundant section

- [x] 7. Diversify layout families — alternate centered + side-by-side patterns
  What to do / Must NOT do: Ensure 2 distinct layout families across sections (avoid uniform "all centered" rhythm). Current state: Benefits (centered H2 + grid), Facilities (side-by-side header + grid), Steps (centered H2 + grid), FAQ (centered H2 + list), RegistrationForm (centered H2 + form). Target state:
  - Centered family: Steps, FAQ, RegistrationForm (already centered) — keep as-is
  - Side-by-side family: Benefits (change from centered to side-by-side: eyebrow + H2 + body on left ~40%, benefit grid on right ~60%), Facilities (already side-by-side header — keep)
  - CommunityHero: split (done in #5)
  - CommunitySocialProof: keep centered (it's a stat bar, not a content section)
  - CommunityUpcomingEvents: side-by-side (main card + poster) — already side-by-side, keep
  - CommunityGallery: side-by-side (albums + Instagram) — already side-by-side, keep
  - CommunityContact: centered — keep
  
  Change CommunityBenefits to side-by-side header: change `<div className="text-center">` at line 36 to `<div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:items-end">` and rearrange children: move eyebrow + H2 + body paragraph into left column, keep grid in right column. This breaks the uniform centered rhythm.
  
  Do NOT change Steps, FAQ, RegistrationForm, SocialProof, UpcomingEvents, Gallery, Contact layouts. Do NOT change any copy. Do NOT change any colors. Do NOT add new sections. Do NOT change H1/H2/H3 hierarchy.
  Parallelization: Wave 3 | Blocked by: — | Blocks: 12, 13
  References (executor has NO interview context - be exhaustive):
  - src/components/community/CommunityBenefits.tsx:32-82 (full component)
  - src/components/community/CommunityBenefits.tsx:36 (text-center to change)
  - src/components/community/CommunityFacilities.tsx:14-47 (reference side-by-side header pattern)
  Acceptance criteria (agent-executable):
  - `grep -n "lg:grid-cols-\[2fr_3fr\]" src/components/community/CommunityBenefits.tsx` returns 1 match
  - `grep -n "text-center" src/components/community/CommunityBenefits.tsx` returns 0 matches (removed from header)
  - `npm run build` exits 0
  - Playwright: render at 1280px → expect Benefits header on left ~40%, grid on right ~60%
  - Playwright: render at 375px → expect single column stacked
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-7-community-landing-redesign.md
  - Happy: 1280px → side-by-side Benefits header; 375px → stacked
  - Failure: remove `lg:grid-cols-` → expect centered layout at 1280px (regression)
  - Visual: capture before/after at 1280px
  Commit: Y | feat(layout): diversify — Benefits header side-by-side, alternating with centered sections

- [x] 8. Remove alternating mirror decoration patterns (zigzag ban)
  What to do / Must NOT do: Identify and break alternating side-decoration patterns that mirror each other across sections. Audit:
  1. `CommunitySteps.tsx:24-26` — has a gradient line `from-violet-400/40 to-transparent` between step cards on the right side. This creates a left-to-right flow but the NEXT step has the same on its right too — that's not a zigzag per se. Actually the connector is unidirectional (right-pointing) so it's NOT a zigzag. Keep.
  2. `CommunityBenefits.tsx:71-75` — has a `pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-2xl` decorative blob. NOT alternating. Keep.
  3. `CommunityHero.tsx:78-83` — has 4 blur elements at different corners (`-left-32 -top-32`, `-right-20 top-1/3`, `bottom-0 left-1/3`, `right-1/4 bottom-1/4`). NOT alternating. Keep.
  4. `CommunityUpcomingEvents.tsx:226` — has a `rotate-2 transition-transform hover:rotate-0` tilted promo card. NOT alternating. Keep.
  5. `CommunityUpcomingEvents.tsx:62` — has a status badge pill. NOT alternating. Keep.
  6. `CommunityLandingPage.tsx:198-204` — mobile sticky bottom CTA. NOT alternating. Keep.
  
  Conclusion: NO zigzag patterns found in current codebase. The "zigzag ban" lever is a no-op audit. Document this finding in commit message and evidence file. Do NOT add new decoration patterns. Do NOT change any existing decoration that's NOT a zigzag. Do NOT add new sections.
  Parallelization: Wave 3 | Blocked by: — | Blocks: 12, 13
  References (executor has NO interview context - be exhaustive):
  - src/components/community/CommunitySteps.tsx:24-26 (step connector)
  - src/components/community/CommunityBenefits.tsx:71-75 (decorative blob)
  - src/components/community/CommunityHero.tsx:78-83 (blur decorations)
  - src/components/community/CommunityUpcomingEvents.tsx:226 (tilted promo)
  - src/components/CommunityLandingPage.tsx:198-204 (mobile sticky)
  Acceptance criteria (agent-executable):
  - Audit report in `.omo/evidence/task-8-community-landing-redesign.md` documenting all decoration patterns reviewed
  - `npm run build` exits 0
  - Visual regression: 1280px screenshot before/after → expect identical
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-8-community-landing-redesign.md
  - Happy: visual diff at 1280px before/after → 0px diff (no changes made)
  - Failure: introduce a zigzag pattern accidentally → visual diff shows new left-right alternation
  - Audit: grep for `rotate-2`, `-translate-x-`, `-translate-y-` patterns → document each
  Commit: Y | chore(audit): zigzag ban — no alternating mirror patterns found, document audit

### Wave 4: Bugfixes + QA

- [x] 9. Bundle bug fixes — dead import, broken `<strong>`, mesh gradient simplify, shimmer tokens
  What to do / Must NOT do: Apply 4 small bug fixes:
  1. `src/components/community/CommunityContact.tsx:2` — remove `CommunityEyebrow` from the import statement (it's imported but never used). After: `import { RevealSection } from './CommunityRevealPrimitives';`
  2. `src/components/community/CommunityHero.tsx:97` — fix broken `<strong>` period. Change `<strong className="text-white">gratis.</strong>` to `<strong className="text-white">gratis</strong>.` (move period outside strong tag)
  3. `src/components/community/CommunityHero.tsx:63-73` — simplify mesh gradient. Replace the 4-radial-gradient pattern with a single subtle linear gradient overlay (or remove the mesh layer entirely since the base gradient at line 50-53 + decorative blurs at 78-83 already provide visual depth). Keep the noise texture at line 55-60. Target: reduce CSS complexity, single gradient stop set.
  4. `src/styles/motion.css:168-176` — replace hardcoded hex with CSS vars. Change `.shimmer { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); }` to `.shimmer { background: linear-gradient(90deg, var(--color-neutral-150) 25%, var(--color-neutral-250) 50%, var(--color-neutral-150) 75%); }` (using existing tokens from theme.css:49-50). Same for `.dark .shimmer` → use `var(--color-neutral-800)` and `var(--color-neutral-700)` from theme.css:43-44.
  
  Do NOT change any other code. Do NOT change copy. Do NOT add new components. Do NOT change colors outside this scope.
  Parallelization: Wave 4 | Blocked by: 1 | Blocks: 11, 12, 14
  References (executor has NO interview context - be exhaustive):
  - src/components/community/CommunityContact.tsx:2 (import line)
  - src/components/community/CommunityHero.tsx:97 (strong period)
  - src/components/community/CommunityHero.tsx:63-73 (mesh gradient)
  - src/styles/motion.css:168-176 (shimmer colors)
  - src/styles/theme.css:43-44,49-50 (token source for migration)
  Acceptance criteria (agent-executable):
  - `grep -n "CommunityEyebrow" src/components/community/CommunityContact.tsx` returns 0 matches
  - `grep -n "gratis.</strong>" src/components/community/CommunityHero.tsx` returns 0 matches
  - `grep -n "gratis</strong>." src/components/community/CommunityHero.tsx` returns 1 match
  - `grep -E "#[0-9a-fA-F]{3,6}" src/styles/motion.css` returns 0 matches
  - `npm run build` exits 0
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-9-community-landing-redesign.md
  - Happy: build passes, all 4 fixes verified by grep
  - Failure: re-add CommunityEyebrow to Contact import → expect eslint warning (or grep detection)
  - Visual: 1280px screenshot — hero body text "gratis" no longer has period stuck inside bold
  Commit: Y | fix: dead import, strong period, mesh gradient, shimmer tokens

- [x] 10. SEO + meta fixes — title, description, OG/Twitter completeness
  What to do / Must NOT do: Update `index.html` SEO meta:
  1. Line 6: Change `<title>Event Dashboard - Metropolitan Mall Bekasi</title>` to `<title>Komunitas - Metropolitan Mall Bekasi</title>`
  2. Line 7: Change meta description from `"Kalender acara publik Metropolitan Mall Bekasi. Lihat jadwal event, bazaar, festival, dan program aktivasi mall."` to `"Panggung gratis untuk event komunitasmu di Metropolitan Mall Bekasi. Daftar venue event, lihat jadwal, dan hubungi tim kami."`
  3. Line 15: Change `og:title` to match new title
  4. Line 16: Change `og:description` to match new description
  5. Line 17: Keep `og:image` (no change)
  6. Add after line 17: `<meta property="og:url" content="https://metmal-community-hub.vercel.app/" />`
  7. Add after line 17: `<meta property="og:site_name" content="Metropolitan Mall Bekasi" />`
  8. Add after line 17: `<meta property="og:locale" content="id_ID" />`
  9. Line 21: Change `twitter:title` to match new title
  10. Line 22: Change `twitter:description` to match new description
  11. Add after line 22: `<meta name="twitter:image" content="/og-image.jpg" />`
  
  Do NOT change other lines. Do NOT add new tags beyond the 5 listed (og:url, og:site_name, og:locale, twitter:image + title/description updates). Do NOT change the favicon links. Do NOT change the theme-color meta. Do NOT add new icon types.
  Parallelization: Wave 4 | Blocked by: — | Blocks: 11, 14
  References (executor has NO interview context - be exhaustive):
  - index.html:6-22 (full meta block to update)
  Acceptance criteria (agent-executable):
  - `grep -n "Komunitas - Metropolitan Mall Bekasi" index.html` returns ≥3 matches (title, og:title, twitter:title)
  - `grep -n "Panggung gratis untuk event komunitasmu" index.html` returns ≥3 matches (description, og:description, twitter:description)
  - `grep -n "og:url" index.html` returns 1 match
  - `grep -n "og:site_name" index.html` returns 1 match
  - `grep -n "og:locale" index.html` returns 1 match
  - `grep -n "twitter:image" index.html` returns 1 match
  - `grep -n "Event Dashboard" index.html` returns 0 matches
  - `npm run build` exits 0
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-10-community-landing-redesign.md
  - Happy: load page, view source → all 8 meta updates present
  - Failure: revert title to "Event Dashboard" → grep returns 1 match (test failure)
  - Validator: open graph debugger (og:debugger or similar) → expect 0 critical errors
  Commit: Y | fix(seo): title, meta description, OG/Twitter tag completeness

- [x] 11. Verification gate 1 — em-dash audit
  What to do / Must NOT do: Run `grep` to verify NO em-dash (—, U+2014) characters exist in scope files. Scope: all files in `src/components/CommunityLandingPage.tsx` and `src/components/community/`. The audit from `bg_5305996e` confirmed 0 em-dashes pre-redesign. After Wave 1-3 changes, re-run the same grep. If any em-dash found, replace with appropriate punctuation (period, comma, or restructure sentence). Do NOT introduce em-dashes in new code. Do NOT change copy text other than replacing em-dashes if found.
  Parallelization: Wave 4 | Blocked by: 1-4, 9, 10 | Blocks: 14
  References (executor has NO interview context - be exhaustive):
  - All files in src/components/community/
  - src/components/CommunityLandingPage.tsx
  - All text in those files
  Acceptance criteria (agent-executable):
  - `grep -P "[\x{2014}]" src/components/CommunityLandingPage.tsx src/components/community/*.tsx` returns 0 matches
  - `grep -P "[\x{2014}]" src/styles/*.css` returns 0 matches (CSS has no em-dashes)
  - Evidence file `.omo/evidence/task-11-community-landing-redesign.md` contains grep output
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-11-community-landing-redesign.md
  - Happy: grep returns 0 → gate passes
  - Failure: introduce em-dash in copy, grep returns 1 → must replace and re-verify
  - Cross-check: also grep for `&mdash;` HTML entity → should also be 0
  Commit: N (gate only, no source change unless failure)

- [x] 12. Verification gate 2 — Pre-Flight Check (Section 14)
  What to do / Must NOT do: Run the 11-item Pre-Flight Check from design-taste-frontend Section 14:
  1. Typography: only Plus Jakarta Sans in use, no Inter, no system font fallback visible
  2. Color: all colors resolve to design tokens (verify by inspecting computed styles in browser)
  3. Spacing: section vertical rhythm consistent (py-16/sm:py-24/lg:py-32 across all sections)
  4. Border radius: rounded-2xl/3xl consistent (no rounded-md/lg in landing)
  5. Shadow: only soft shadows (var(--shadow-card-soft) or similar)
  6. Eyebrow: ≤4 CommunityEyebrow visible per page
  7. CTAs: primary CTA = orange-to-violet gradient, no other style
  8. Nav: 8 items, no duplicates
  9. Hero: split layout on lg+, stacked on mobile
  10. Forms: aria-invalid + aria-describedby on all inputs
  11. Dark mode: contrast preserved, all colors readable
  
  Use Playwright to navigate to production page, capture 3 viewports (375/768/1280), check each item against the rendered output. Document each check in evidence file. If any check FAILS, identify the offending file:line and either (a) fix it, or (b) record as known issue and continue.
  Parallelization: Wave 4 | Blocked by: 4-9, 10 | Blocks: 14
  References (executor has NO interview context - be exhaustive):
  - design-taste-frontend v2 Section 14 (pre-flight check items)
  - src/components/CommunityLandingPage.tsx (orchestrator)
  - src/components/community/*.tsx (all 12 components)
  Acceptance criteria (agent-executable):
  - Evidence file `.omo/evidence/task-12-community-landing-redesign.md` with 11 sections, each marked PASS/FAIL
  - If any FAIL, the offending location is identified
  - `npm run build` exits 0
  - Playwright 3-viewport screenshots saved to `.omo/evidence/pre-flight-<viewport>.png`
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-12-community-landing-redesign.md
  - Happy: 11/11 PASS
  - Failure: 1/11 FAIL (e.g., extra eyebrow visible) → fix, re-run, expect 11/11
  - Visual: side-by-side comparison of 3 viewports
  Commit: N (gate only)

- [x] 13. Verification gate 3 — Visual QA (3 viewports, before/after)
  What to do / Must NOT do: Run Playwright to capture full-page screenshots at 3 viewports (375/768/1280) on production URL. Compare to pre-redesign screenshots (need to be captured or provided). Verify:
  - No visual regressions (layout, colors, text, spacing unchanged where not intended)
  - Hero split visible at 1280px (text left, visual right)
  - Hero stacked at 375px (text above visual)
  - All sections render without overflow, broken images, or layout issues
  - Dark mode toggle works and renders correctly
  - Mobile sticky CTA appears below 640px width on scroll
  - All CTAs clickable and scroll to correct sections
  - No console errors on page load
  - No 404s in network tab
  
  Save screenshots to `.omo/evidence/visual-<viewport>.png`. Save pre-redesign screenshots to `.omo/evidence/pre-visual-<viewport>.png` if not already there. If pre-redesign screenshots don't exist, this gate is partial-PASS.
  Parallelization: Wave 4 | Blocked by: 5, 7, 8 | Blocks: 14
  References (executor has NO interview context - be exhaustive):
  - https://metmal-community-hub.vercel.app/ (production URL)
  - Playwright configuration (existing in project)
  - .omo/evidence/ (evidence directory)
  Acceptance criteria (agent-executable):
  - 3 screenshots saved (375/768/1280) at production URL
  - Console errors: 0
  - Network 404s: 0
  - Hero split at 1280px confirmed in screenshot
  - Evidence file `.omo/evidence/task-13-community-landing-redesign.md` with screenshot paths and observations
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-13-community-landing-redesign.md
  - Happy: 3 screenshots captured, no errors
  - Failure: console error or 404 → identify source, fix or document
  - Visual diff: compare before/after pixel-by-pixel (use Playwright pixelmatch or similar) → expect <5% diff
  Commit: N (gate only)

- [x] 14. Verification gate 4 — Preservation audit + brand fidelity audit
  What to do / Must NOT do: Run 2 audits:
  
  **A. Preservation audit:** Verify all locked elements unchanged:
  1. 8 nav labels: `grep -E "label: '(Upcoming|Keuntungan|Fasilitas|Galeri|Event|Cara Daftar|Daftar|FAQ)'" src/components/CommunityLandingPage.tsx` returns 8 matches
  2. 8 anchor IDs: `grep -E "id: \"(upcoming-events|benefits|facilities|gallery|events|how|register|faq)\""` returns 8 matches (note: #events dedup'd but label still says "Event" pointing to #upcoming-events)
  3. Form field names: `grep -E "name=\"" src/components/community/CommunityRegistrationForm.tsx` returns all original field names
  4. Logo src: `grep -E "LOGOMETMAL2016-01.svg" src/components/CommunityLandingPage.tsx` returns 1 match (unchanged)
  5. Legal copy: `grep -E "All rights reserved" src/components/CommunityLandingPage.tsx` returns 1 match (unchanged)
  6. Copy voice: no `Contact Us`, no `Looking for Sponsor` (per DESIGN.md avoid list)
  
  **B. Brand fidelity audit:** Verify all colors resolve to design tokens:
  1. `grep -E "#[0-9a-fA-F]{3,6}" src/components/community/*.tsx src/components/CommunityLandingPage.tsx` returns 0 matches (allow existing Tailwind class colors like `text-violet-600`)
  2. `grep -E "#[0-9a-fA-f]{3,6}" src/styles/motion.css` returns 0 matches
  3. Brand accent hex (`#7c6cf2` violet, `#f2743e` orange) only appear in `src/styles/tokens.css` and `src/styles/theme.css` (source-of-truth files)
  4. All components use `bg-violet-`, `text-violet-`, `bg-orange-`, `text-orange-` Tailwind classes (not hardcoded hex)
  
  If any audit item FAILS, identify the offending file:line and either (a) fix it, or (b) record as known issue and continue. Save audit results to evidence file.
  Parallelization: Wave 4 | Blocked by: all | Blocks: —
  References (executor has NO interview context - be exhaustive):
  - src/components/CommunityLandingPage.tsx (nav labels, anchor IDs, logo, legal)
  - src/components/community/CommunityRegistrationForm.tsx (form fields)
  - src/components/community/*.tsx (all components)
  - src/styles/motion.css (no hardcoded colors)
  - src/styles/tokens.css + src/styles/theme.css (source of truth)
  - DESIGN.md (brand spec)
  Acceptance criteria (agent-executable):
  - Evidence file `.omo/evidence/task-14-community-landing-redesign.md` with 2 sections (preservation + brand)
  - All preservation checks: 6/6 PASS
  - All brand checks: 4/4 PASS
  - `npm run build` exits 0
  - `lsp_diagnostics` clean on all touched files
  QA scenarios (name the exact tool + invocation): happy + failure, Evidence .omo/evidence/task-14-community-landing-redesign.md
  - Happy: 10/10 PASS
  - Failure: 1/10 FAIL (e.g., nav label changed) → revert, re-run, expect 10/10
  - Brand: computed styles in browser should resolve to design token values
  Commit: N (gate only)

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — REJECT (build ✓, scope ✓, 11/14 evidence files missing — docs gap)
- [x] F2. Code quality review — APPROVE (tsc clean, no TODOs, 2 pre-existing `as any` justified)
- [x] F3. Real manual QA — REJECT (local dist has self-hosted fonts ✓, production serves stale build — deploy pending)
- [x] F4. Scope fidelity — APPROVE (8 nav labels ✓, 8 hrefs ✓, logo ✓, legal ✓, 7 form IDs ✓, Indonesian voice ✓)

## Commit strategy
- 1 commit per todo (10 total source commits)
- Conventional Commits format: `chore(tokens)`, `chore(fonts)`, `perf(scroll)`, `refactor(eyebrow)`, `feat(hero)`, `refactor(nav)`, `feat(layout)`, `chore(audit)`, `fix`, `fix(seo)`
- 4 verification gates do not commit (evidence only)
- Total: 10 source commits + 4 evidence files

## Success criteria
- All 10 source todos committed
- All 4 verification gates PASS
- `npm run build` exits 0
- `lsp_diagnostics` clean on all touched files
- Playwright at 1280px, 768px, 375px shows no visual regressions (compared to pre-redesign)
- 0 console errors on production page load
- 0 network 404s on production page load
- 8 nav labels preserved exactly
- 8 anchor IDs preserved (1 dedup'd from #events to #upcoming-events, but label "Event" unchanged)
- All form field names preserved
- Logo src unchanged
- Legal copy unchanged
- All copy voice preserved (Indonesian casual register)
- Plus Jakarta Sans self-hosted (no Google Fonts CDN)
- All hardcoded hex in source code migrated to design tokens (theme.css + tokens.css source-of-truth only)
- IntersectionObserver replaces scroll listener
- Eyebrow count ≤4 component calls + 0 raw uppercase tracking
- Hero split layout at lg+, stacked at mobile
- 0 em-dash characters in scope files
- All Pre-Flight Check items PASS
- All preservation + brand fidelity checks PASS
