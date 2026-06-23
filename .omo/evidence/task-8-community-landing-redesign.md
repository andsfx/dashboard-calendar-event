# Task 8 — Community Landing Zigzag Decoration Audit

**Date:** 2026-06-23
**Scope:** `src/components/community/` + `src/components/CommunityLandingPage.tsx`
**Type:** Audit-only (no code changes)

## Conclusion

**No alternating mirror/zigzag patterns found in community landing scope.**

All decoration patterns discovered are either unidirectional, static, or already
asymmetrical across sections. No element flips/mirrors its position from one section
to the next in a left/right zigzag rhythm.

## Search Patterns

### 1. Rotation utilities (`rotate-2` / `rotate-3` / `-rotate-*`)

**Result:** 1 match, single file, single line.

| File:Line | Class | Why NOT zigzag |
|---|---|---|
| `src/components/community/CommunityUpcomingEvents.tsx:226` | `rotate-2 ... hover:rotate-0` on promo poster | Single fixed rotation. No sibling element mirrors with `-rotate-2`. Hover un-rotates to 0. |

### 2. Translate utilities (`-translate-x-` / `-translate-y-`)

**Result:** 7 matches across 4 community files. All are functional centering or
hover micro-interactions — none are decorative alternations.

| File:Line | Class | Why NOT zigzag |
|---|---|---|
| `src/components/community/CommunityHero.tsx:169` | `left-1/2 -translate-x-1/2` on scroll-indicator dot | Centers a single child within its parent. No mirrored counterpart exists. |
| `src/components/community/CommunityUpcomingEvents.tsx:47` | `hover:-translate-y-0.5` on event card | Hover lift micro-interaction. Unidirectional (up only), uniform across all cards. |
| `src/components/community/CommunityUpcomingEvents.tsx:256` | `hover:-translate-y-0.5` on view-all card | Same pattern, same direction. |
| `src/components/community/CommunityContact.tsx:21,34,45` | `hover:-translate-y-1` × 3 contact cards | Hover lift, uniform direction, no alternation across cards. |
| `src/components/community/CommunityBenefits.tsx:50` | `hover:-translate-y-1` on benefit card | Hover lift, uniform. |

### 3. Blur decorations (`blur-2xl` / `blur-3xl` / `blur-[…]`)

**Result:** 5 matches, 2 files.

| File:Line | Class | Why NOT zigzag |
|---|---|---|
| `src/components/community/CommunityHero.tsx:79` | `-left-32 -top-32 h-96 w-96 bg-violet-600/25 blur-[120px]` | Asymmetric. Counterpart at :80 is at `-right-20 top-1/3` — different offset, different size (80 vs 96), different color (orange vs violet), different blur (100 vs 120). Not a mirrored pair. |
| `src/components/community/CommunityHero.tsx:80` | `-right-20 top-1/3 h-80 w-80 bg-orange-500/25 blur-[100px]` | See :79 above. Asymmetric. |
| `src/components/community/CommunityHero.tsx:81` | `bottom-0 left-1/3 h-64 w-64 bg-indigo-500/25 blur-[80px]` | Standalone — no right-side mirror at matching geometry. |
| `src/components/community/CommunityHero.tsx:82` | `right-1/4 bottom-1/4 h-72 w-72 bg-pink-500/25 blur-[90px]` | Standalone — no left-side mirror at matching geometry. |
| `src/components/community/CommunityBenefits.tsx:72` | `-bottom-8 -right-8 h-24 w-24 blur-2xl` per card, hover-only | Same bottom-right corner on every benefit card. No alternation across the 6 cards in the grid. |

### 4. Spot-check: `CommunitySteps.tsx:24-26` (step connector)

```
24:                 <div className="absolute right-0 top-10 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-violet-400/40 to-transparent ... lg:block" />
```

**Why NOT zigzag:** Connector line emits from `right-0` of each step with
`translate-x-1/2` so it extends only to the right. Gradient is
`from-violet-400/40 to-transparent` — unidirectional, fades to the right. Every
step uses the same right-pointing line. No step emits left. No mirror alternation.

### 5. Spot-check: `CommunityBenefits.tsx:71-75` (decorative blob)

```
71:               <div
72:                 className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-20"
73:                 style={{ background: b.color }}
74:                 aria-hidden="true"
75:               />
```

**Why NOT zigzag:** Anchored at `-bottom-8 -right-8` of every card. The 6 cards
in the grid all place the blob in the same bottom-right corner. Color varies per
card (per `b.color`), but the geometric position is uniform — not alternating.

### 6. Spot-check: `CommunityHero.tsx:78-83` (blur decorations)

```
78:       <div className="absolute inset-0 hidden overflow-hidden sm:block">
79:         <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/25 blur-[120px]" />
80:         <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-orange-500/25 blur-[100px]" />
81:         <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/25 blur-[80px]" />
82:         <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-pink-500/25 blur-[90px]" />
83:       </div>
```

**Why NOT zigzag:** Four blobs at deliberately asymmetric positions:
- (-left-32, -top-32) violet 96 / 120
- (-right-20, top-1/3) orange 80 / 100
- (left-1/3, bottom-0) indigo 64 / 80
- (right-1/4, bottom-1/4) pink 72 / 90

All four differ in size, color, blur radius, and offset. There is no left/right
mirror pair with matching geometry. The composition is intentionally irregular
(not symmetrical), so it is already asymmetrical — the opposite of zigzag.

## Cross-Section Summary

Checked for patterns that would mirror across sections (e.g., hero blob on
left, then a mirrored blob on right in the next section):

- Hero blobs: contained to hero, do not repeat in steps/benefits/contact.
- Steps connector: unidirectional right-gradient.
- Benefits blob: uniform bottom-right corner on every card.
- Contact cards: uniform hover-lift, no rotation/translation alternation.
- UpcomingEvents: single fixed `rotate-2` on promo, no counter-rotation.
- CommunityLandingPage.tsx: only `hover:-translate-y-0.5` on header nav links
  (lines 144, 156, 161) — functional, not decorative.

## Audit Sign-off

- No source files modified.
- No new decoration patterns added.
- No existing decorations changed.
- No new sections added.

**Verdict:** No alternating mirror/zigzag patterns found in community landing scope.
The existing decoration system uses unidirectional gradients, uniform corner
anchors, and intentionally asymmetric blob placement — none of which constitute
a zigzag rhythm.
