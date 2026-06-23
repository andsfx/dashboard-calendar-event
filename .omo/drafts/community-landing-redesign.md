---
slug: community-landing-redesign
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/community-landing-redesign.md
approach: PRESERVE mode landing redesign via 9 levers in priority order. No URL/nav/label/form/logo/copy-voice changes. Surface presentation only. Self-host fonts → tokenise stray colors → IntersectionObserver scroll → eyebrow restraint → hero split layout → CTA dedup → layout diversification → zigzag ban → icon library (optional). Then run 4 verification gates: em-dash audit, Pre-Flight Check, preservation audit, brand fidelity audit.
---

# Draft: community-landing-redesign

## Components (topology ledger)
| id | outcome | status | evidence path |
|---|---|---|---|
| fonts | Self-host Plus Jakarta Sans, remove Google Fonts CDN link | active | public/fonts/, index.html:29-31 |
| tokens | Add --color-neutral-page token for #fbfaf7 | active | src/styles/tokens.css, src/styles/theme.css |
| scroll | Replace window.addEventListener('scroll') with IntersectionObserver for header pin | active | src/components/CommunityLandingPage.tsx:88-93 |
| eyebrows | Consolidate 11 raw eyebrow instances to CommunityEyebrow component (Hero:1, SocialProof:1, UpcomingEvents:5 raw, Gallery:2) | active | src/components/community/ |
| hero-split | Split hero layout: text left, visual right on lg+ | active | src/components/community/CommunityHero.tsx |
| cta-dedup | Deduplicate nav anchor #events vs #upcoming-events confusion; remove redundant CTA instances | active | src/components/CommunityLandingPage.tsx:66,185 |
| layout-diversify | Break uniform centered-card rhythm with 2 alternating layout patterns | active | src/components/community/CommunityBenefits.tsx, CommunityFacilities.tsx, CommunitySteps.tsx |
| zigzag | Remove alternating side-decoration patterns that mirror each other | active | src/components/community/ |
| icon-library | Optional: replace random icon selections with consistent Lucide family | deferred | src/components/community/CommunityBenefits.tsx:2, CommunityFacilities.tsx:2 |
| fixups | Dead import removal, broken <strong> period, <title>/meta fix, shimmer token migration, mesh gradient simplification | active | various files |
| seo | Add og:url, og:site_name, og:locale, twitter:image | active | index.html |
| gates | 4 verification gates: em-dash audit, Pre-Flight Check, preservation audit, brand fidelity audit | active | .omo/evidence/ |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| Font weight range | Keep 400/500/600/700/800 as current | Matches existing type scale usage | Yes |
| IntersectionObserver threshold | Use 0.1 threshold with rootMargin: '0px 0px -90% 0px' for header unpin (hero bottom edge crossing) | Standard header-pin pattern | Yes |
| Hero split ratio | 55/45 (text/image) | Section 4.7 recommended split | Yes |
| Layout families | Alternate between centered (steps, faq, form) and side-by-side (benefits, facilities) | PRESERVE mode: minimal disruption | Yes |
| Icon consistency | Leave icons as-is unless explicit mismatch found | Lever #9 is deferred/optional | Yes |
| #events vs #upcoming-events resolution | Keep #upcoming-events nav label "Event", remove #events dedicated section (it already filters high-priority events in #upcoming-events) | Nav has 8 items, PRESERVE mode: keep label count constant | Yes |
| Google Fonts removal | Convert to @font-face with woff2 files in public/fonts/, remove preconnect + link from index.html | Section 3.A: self-host fonts mandate | Yes |
| Mesh gradient fallback | Replace 4-radial-gradient pattern with single linear gradient + noise texture (already present at Hero:55-60) | Audit flagged as slop | Yes |

## Findings (cited - path:lines)
- **scroll** listener at `CommunityLandingPage.tsx:88-93`: `window.addEventListener('scroll', onScroll, { passive: true })` — must become IntersectionObserver (Section 5.D)
- **stray bg** `#fbfaf7` at `CommunityLandingPage.tsx:111,124` (header pinned bg, body bg) — needs matching `--color-neutral-page` token
- **hardcoded hex** count: `CommunityLandingPage.tsx:111 bg-[#fbfaf7]/96`, `:124 bg-[#fbfaf7]`, `CommunityFacilities.tsx:16 bg-[#f4efe8]`, `CommunityFAQ.tsx:20 bg-[#f4efe8]`, `CommunityGallery.tsx:174 bg-[#f4efe8]`, `:155 bg-[#faf6ef]`, `CommunityUpcomingEvents.tsx:170 bg-[#faf6ef]`, `CommunityBenefits.tsx:10,16,22,28` 4 inline accent colors, `CommunityHero.tsx:52` mesh gradient fallback hex colors
- **motion.css shimmer** at `:168-176`: hardcoded `#f1f5f9`, `#e2e8f0`, `#1e293b`, `#334155`
- **eyebrow excess**: 11 non-CommunityEyebrow uppercase-tracking instances (Hero:1 badge, SocialProof:1, UpcomingEvents:5, Gallery:2 sub-headings, CountdownPill:2 labels) — Section 4.7 cap is 4 per 12 sections
- **dead import** `CommunityContact.tsx:2` imports `CommunityEyebrow`, never used
- **broken <strong>** at `CommunityHero.tsx:97`: period inside `<strong>gratis.</strong>` creates visual glitch
- **wrong <title>** at `index.html:6`: "Event Dashboard" should be "Komunitas - Metropolitan Mall Bekasi"
- **vague meta description** at `index.html:7` uses "program aktivasi mall"
- **missing OG/Twitter** at `index.html`: og:url, og:site_name, og:locale, twitter:image all absent
- **mesh gradient** `CommunityHero.tsx:63-73`: 4-radial-gradient slop pattern
- **#events / #upcoming-events** duplication: nav has both labels pointing to separate event sections
- **empty-state contradiction** `CommunityUpcomingEvents.tsx:15-16`: "belum ada event mendatang" + "akan segera hadir"

## Decisions (with rationale)
1. **PRESERVE mode** — URLs, nav labels, form fields, logo, legal copy, copy voice all locked. Surface-only.
2. **Lever priority order**: #1 Eyebrow restraint → #2 IntersectionObserver scroll → #3 Self-host fonts → #4 Tokenise stray bg → #5 Hero split layout → #6 CTA dedup → #7 Layout family diversification → #8 Zigzag ban → #9 Icon library (deferred/optional).
3. **Eyebrow cap**: max 4 CommunityEyebrow instances + max 2 non-eyebrow `uppercase tracking` badges (Hero badge, SocialProof stat label). All other raw eyebrow instances convert to CommunityEyebrow or be removed.
4. **Design token for page bg**: Add `--color-neutral-page: #fbfaf7` to tokens.css, map to theme.css `--color-neutral-*` scale.
5. **Font self-hosting**: Download Plus Jakarta Sans 400/500/600/700/800 woff2 from Google Fonts API into `public/fonts/`. Create `src/styles/fonts.css` with @font-face declarations. Remove Google Fonts CDN links from index.html.
6. **IntersectionObserver**: Create a hidden sentinel div at end of hero section. Observe with threshold 0.1. When sentinel leaves viewport → pin header. When sentinel enters viewport → unpin header. This replaces the scroll listener entirely.
7. **CTA dedup**: Nav item #events label "Event" now points to #upcoming-events (the main event section). Remove the standalone #events section at CommunityLandingPage.tsx:184-195 (the one with EventShowcase). Keeps nav label "Event" — just fixes target.
8. **Hero split**: Left column: text content (badge, H1, body, CTAs, stats). Right column: image. On mobile: stack vertically (current behavior).
9. **Zigzag ban**: Remove alternating left-right decorative blob patterns. Keep static background decorations that don't mirror.

## Scope IN
- All 9 levers (1-8 mandatory, 9 deferred)
- Bug fixes: dead import removal, broken <strong> period, <title> fix, meta description rewrite, SEO OG/Twitter completeness
- Token migration: shimmer colors, all hardcoded hex to design tokens
- Font self-hosting: woff2 download, @font-face, CDN removal
- IntersectionObserver header pin
- Eyebrow consolidation
- Hero split layout
- CTA dedup
- Layout diversification (2 alternating styles)
- Mesh gradient simplification
- 4 verification gates

## Scope OUT (Must NOT have)
- No URL changes
- No nav label changes (8 labels preserved: Upcoming, Keuntungan, Fasilitas, Galeri, Event, Cara Daftar, Daftar, FAQ)
- No form field name changes
- No logo/brand icon changes
- No legal copy changes
- No GSAP or marquee animations
- No color palette rewrite
- No aesthetic overhaul
- No copy voice changes (Indonesian casual register preserved)
- No font family changes (Plus Jakarta Sans preserved)
- No dark mode logic changes
- No component restructuring beyond specified levers

## Open questions
(none — all forks resolved by PRESERVE mode constraints + announced defaults above)

## Approval gate
status: awaiting-approval
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->