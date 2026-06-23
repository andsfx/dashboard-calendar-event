## Refactor: Priority-based Featured + Poster in Correct Modal (2026-05-10)

### Problem
- Poster field was added to `CrudEventModal.tsx` (unused legacy modal), not `EventCrudModal.tsx` (active modal).
- Featured upcoming events used `featuredUpcomingIds` state + `site_settings` DB fetch/write + star toggle buttons.

### Changes Made
- `EventCrudModal.tsx` — added `posterUrl` to EMPTY, state (`posterUploading`, `posterError`, `posterInputRef`), handlers (`handlePosterChange`, `handleRemovePoster`), JSX (upload/preview section after keterangan). Imports: `useRef`, `Image`, `Trash2`, `Upload`, `uploadToR2`.
- `CommunityLandingPage.tsx` — removed `featuredUpcomingIds` prop; filter now `event.priority === 'high' && event.status === 'upcoming'`.
- `EventTable.tsx` — removed `featuredUpcomingIds`, `onToggleFeaturedUpcoming` props; removed star toggle buttons (mobile + desktop); removed `Star` import.
- `App.tsx` — removed `featuredUpcomingIds` state, `fetchSiteSettings('featured_upcoming_event_ids')` call, `handleToggleFeaturedUpcoming` handler, prop passing to `CommunityLandingPage` and `DashboardViewsSection`.
- `DashboardViewsSection.tsx` — removed `featuredUpcomingIds`, `onToggleFeaturedUpcoming` from Props interface, destructure, and EventTable pass-through.
- `CrudEventModal.tsx` — deleted (unused legacy modal).

### Key Insight
Active CRUD modal is `EventCrudModal.tsx` (uses `EventFormBasicFields`, `EventFormDetailsFields`, etc.). `CrudEventModal.tsx` was a simpler legacy version never rendered in production routes.

### Priority → Featured Logic
High-priority events auto-appear in Upcoming Events section on landing page. No manual star toggle needed. Reduces admin friction and removes DB dependency for featured state.

## Feature: Category-Adaptive Color Accents in UpcomingEventsFeature (2026-05-10)

### Problem
`UpcomingEventsFeature` used static violet/indigo accents regardless of event category.

### Changes Made
- `CommunityLandingPage.tsx` — added `CSSProperties` to React import.
- `CountdownPill` — added optional `color?: string` prop; applies inline `borderColor`, `backgroundColor`, `color` when provided.
- `UpcomingEventsFeature` — derives `catColor` from `mainEvent.categories[0]` or `mainEvent.category`, fallback `CATEGORY_COLORS.Umum` (`#64748b`).
- Replaced violet/indigo hardcoded accents with `catColor` inline styles on: countdown label text, CountdownPill, CTA button (gradient), info pill icons (CalendarDays/Clock/MapPin), no-poster banner gradient, no-poster promo card gradient + label, side panel eyebrow, side card hover border + CalendarDays icon, empty-state icon circle + CalendarDays + eyebrow + CTA button.
- Side cards derive their own `evColor` per event for hover border and icon.

### Key Insight
Tailwind dynamic classes (`bg-[${color}]`) are purged at build time — use inline styles for runtime-dynamic colors. Hex alpha suffix (`${color}40`) works in modern browsers for opacity without needing `rgba()`.

### Fallback Chain
`mainEvent.categories[0]` → `mainEvent.category` → `'Umum'` → `CATEGORY_COLORS.Umum` (`#64748b`).

## Feature: Sponsor/Support CTA in UpcomingEventsFeature (2026-05-10)

### Problem
Side CTA panel in `UpcomingEventsFeature` used registration-focused copy (`Jangan lewatkan`, `Daftar sekarang`, `Amankan tempat...`, button `Daftar Sekarang`). User decided against PDF proposal upload; proposals will be sent manually via WhatsApp.

### Changes Made
- `CommunityLandingPage.tsx` lines 632-650 — replaced CTA panel copy:
  - eyebrow: `Sponsor & Support`
  - headline: `Looking for Sponsor & Support`
  - body: `Hubungi tim kami untuk peluang sponsorship dan kolaborasi event.`
  - button: `Contact Us` (changed from `<button>` to `<a>`)
- Button opens WhatsApp Andy (`https://wa.me/6281318534823`) with prefilled message including `mainEvent.acara`.
- Preserved category-color theming (gradient, icon, eyebrow).
- Button is `<a>` with `target="_blank" rel="noopener noreferrer"`.

### Result
Sponsor/support-focused CTA with direct WhatsApp contact. No PDF upload field. Proposal submission remains manual via WhatsApp.
