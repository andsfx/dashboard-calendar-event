import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page, Route, TestInfo } from '@playwright/test';
import type { AxeResults, Result, NodeResult, RunOptions } from 'axe-core';
import { setupApiMocks } from './helpers';

/**
 * Shared configuration + measurement helpers for the accessibility harness.
 *
 * Design notes
 * ------------
 * - The audit gate this harness reproduces is:
 *     `axe-core` with tags wcag2a/2aa/21a/21aa/22aa/best-practice, 0 violations.
 *   The tag list below is that exact set (see docs/PLAN_2026-09-18_20-18-audit-uiux.md:3).
 * - The audit's viewport set was 320/375/414/768/1280. It is parameterized, never
 *   hardcoded to a single width — 320px is where the audit found a real overflow bug.
 * - Public routes are rendered as an ANONYMOUS visitor (GET /api/v1/auth/me → user:null),
 *   matching the audited production surface. All API traffic is intercepted, so no
 *   backend is required (same contract as e2e/helpers.ts).
 * - `0 violations` means axe found no violations among the nodes it COULD evaluate;
 *   it does NOT mean every text node was resolved. axe also returns `incomplete`
 *   results — nodes it could not evaluate — which are neither passes nor failures.
 *   These are the gradient nodes: axe structurally CANNOT evaluate a gradient (it
 *   cannot resolve the colour a glyph actually sits on), so an `incomplete` node
 *   is NOT a pass. Those nodes are recorded per route/viewport in the stable
 *   on-disk report at `reports/a11y/axe-report-<slug>.json` (one file per route;
 *   slug = the route path with `/` → `-`, root → `root`), e.g.
 *   `reports/a11y/axe-report-events.json` for `/events`. That on-disk path is the
 *   ONLY durable evidence — there is no attached `axe-report.json` to rely on,
 *   because Playwright prunes attachments for PASSING tests. The file exists
 *   after a run whether the run passes or fails, so the evidence is reproducible
 *   rather than ephemeral. `reports/` is gitignored (.gitignore:31), so it is
 *   never committed. For the CURRENT per-route/viewport counts, run
 *   `npm run test:a11y` and read `reports/a11y/axe-report-*.json` — do not copy
 *   counts from this comment, they drift silently. (One observed snapshot,
 *   2026-09-20: 98 node instances over 24 distinct nodes, all of them white-alpha
 *   text over a gradient; the one former "short content" node — the `/community`
 *   active pill count badge, 1 character, i.e. 5 viewport-instances — left the
 *   set when its badge moved from `text-white/70` to full `text-white`.)
 *
 *   POST-FIX CENSUS (2026-09-20) — every incomplete node measured, not only the
 *   ones that once failed. The hero gradient edit changed the background under
 *   EVERY white-alpha hero node, so the nodes that passed before the edit could
 *   not be assumed to still pass. Method (e2e/a11y.census.ts): resolve the
 *   node's computed colour to sRGB incl. alpha through a canvas, make only the
 *   TEXT transparent (preserving the element's own translucent backdrop), then
 *   sample the screenshot at the tight text-line rects (Range.getClientRects)
 *   and take the median — the background the glyphs actually sit on. This
 *   re-measured ALL 24 distinct incomplete nodes on the current tree — not just
 *   the 12 the earlier pre-fix measurement found failing (~36–37 instances, not
 *   the 44 once reported). Result: 24/24 pass AA; worst 5.10:1 (`.text-white/65`
 *   hero paragraph at 1280px), best 11.33:1. No incomplete node is a hidden
 *   failure, and none was left unmeasured. The node TARGETS are listed in each
 *   `reports/a11y/axe-report-*.json` under `incomplete[].nodes[]`, so this set is
 *   inspectable without re-running axe.
 *
 *   This census is REPRODUCIBLE, not a one-off: the gate's test "every axe
 *   `incomplete` node passes AA when measured directly" runs it on every
 *   `npm run test:a11y` (helper: e2e/a11y.census.ts) and fails if any node is
 *   below AA or could not be measured. It writes the per-node table to
 *   `reports/a11y/incomplete-census.json`. So "all incomplete nodes pass" is a
 *   claim the reader can re-derive, not a number to be trusted.
 *
 *   axe still returns the gradient nodes as `incomplete` — it structurally
 *   cannot evaluate a gradient — so an `incomplete` node is still not a pass;
 *   the census above is what turns "not a pass" into a measured verdict.
 *
 * `ignoreLength` (coverage, not a verdict change). axe's `color-contrast` check
 *   moves a 1-character FAILING node out of `violations` into `incomplete`
 *   unless `ignoreLength: true` (default `false` — axe.js check metadata). That
 *   is a hiding place for exactly the defect class that already bit us (short
 *   count badges / 1-char labels — the `/community` pill). The gate sets
 *   `ignoreLength: true` via the CORRECT nested path
 *   `rules.<rule>.checks.<check>.options`; axe's `getCheckOption` reads check
 *   options from there, and a rule-level `rules.<rule>.options` is silently
 *   ignored (empirically confirmed — it is a no-op). Measured effect today:
 *   none (0 new violations across all 25 route×viewport pairs), so the gate
 *   stays green; the gain is that a FUTURE 1-character failure now surfaces as
 *   a loud violation instead of vanishing into `incomplete`.
 *   Measurement trap: this Tailwind v4 build resolves `text-white/65` to
 *   `oklab(...)` and `color-mix()` surfaces to `color(srgb ...)`, never `rgb()`;
 *   a pipeline that only parses `rgb()` silently fails on every such node.
 *
 * LIGHT-MODE-ONLY caveat (do not mistake this gate for full coverage)
 * ------------------------------------------------------------------
 * `playwright.a11y.config.ts` sets no `colorScheme`, so every route is measured
 * in the app's default LIGHT theme only. Every `dark:` variant is therefore
 * UNTESTED by this gate — e.g. `dark:text-slate-400` in
 * `src/pages/EventsLandingPage.tsx` (line 695) is never evaluated. A
 * `dark:`-only contrast regression would leave this gate green. Treat a green
 * run as "light mode passes", not "both themes pass".
 *
 * NO-INTERACTIVE-STATE caveat (the gate renders static pages only)
 * ---------------------------------------------------------------
 * Every assertion in this harness measures a page in its INITIAL, un-interacted
 * state. The specs navigate and settle; NONE of them clicks, hovers, focuses or
 * presses a key — there is no `page.click`/`hover`/`focus` in
 * `e2e/a11y.spec.ts`. So a green run says nothing about any state that exists
 * only after interaction: no modal, no lightbox, no dropdown/expanded panel, no
 * hover overlay, no focus ring and no `details`/`summary` disclosure is ever
 * opened or evaluated by the route sweep.
 *
 * Concrete example: `src/components/media/PhotoLightbox.tsx` — the shared photo
 * lightbox behind the album grid (`/gallery/<slug>`) and the event-area cards
 * (`/`) — renders only AFTER a click. Its counter (`text-xs text-white/40`,
 * 12px) sat at 3.33:1 composited over the `bg-slate-950/85` overlay: a real
 * `color-contrast` failure axe reports (3.34) the moment the dialog is open,
 * yet the route sweep never saw it because it never opens the dialog. It was
 * fixed to `text-white/70` (measured 6.71–6.79:1) and the dialog is now covered
 * by the dedicated "interactive state — photo lightbox" test in
 * `e2e/a11y.spec.ts`, which is the pattern for covering any other interactive
 * surface: open it, assert it is really open, then run axe scoped to it.
 *
 * Treat "0 violations" as "the initial, un-interacted state of these 5 routes,
 * in light mode, at 5 viewports, has 0 axe violations". Interactive surfaces are
 * covered only where a spec explicitly opens them.
 */

/** Tags the audit cites. Order preserved for readable reporting. */
export const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
] as const;

/** Viewports measured by the audit (widths only; height is fixed for determinism). */
export const VIEWPORTS = [320, 375, 414, 768, 1280] as const;

export const VIEWPORT_HEIGHT = 900;

/**
 * Axe run options for the gate.
 *
 * `ignoreLength: true` is applied through the CORRECT nested path
 * (`rules.<rule>.checks.<check>.options`) because axe's `getCheckOption`
 * (axe.js:19278) reads check options from there — a rule-level
 * `rules.<rule>.options` is silently ignored (empirically confirmed: it is a
 * no-op). Default axe behaviour is `ignoreLength: false`, which moves a
 * 1-character FAILING node out of `violations` into `incomplete` — i.e. it
 * hides a real defect class (short count badges / 1-char labels; the
 * `/community` pill badge is exactly that class). Setting it `true` asserts
 * those nodes instead of hiding them. It is a strict coverage gain: today it
 * changes nothing (measured: 0 new violations on all 25 route×viewport pairs),
 * but a future 1-character failure surfaces as a loud violation rather than
 * disappearing into `incomplete`.
 */
export const AXE_RUN_OPTIONS: RunOptions = {
  rules: {
    'color-contrast': {
      checks: {
        'color-contrast': { options: { ignoreLength: true } },
      },
    },
  },
};

/**
 * Lowest vertical fraction of the hero box that hero copy actually reaches.
 *
 * DUPLICATED, DELIBERATELY, with `HERO_CONTENT_MAX_FRACTION` in
 * `src/utils/__tests__/heroContrast.test.ts` — that unit test recomputes the
 * gradient arithmetic against this fraction, while the Playwright assertion in
 * `e2e/a11y.spec.ts` measures the real rendered DOM against it. Keeping the two
 * in sync is the point: the unit test proves the gradient is dark enough up to
 * this line, the browser test proves the copy never crosses it. If you change
 * one, change the other.
 */
export const HERO_CONTENT_MAX_FRACTION = 0.87;

/**
 * Authoritative public routes of THIS repository (the community repo).
 *
 * The audit lists five community routes as `/`, `/events`, `/gallery`, `/community`,
 * `/daftar`. These are confirmed against src/App.tsx <Routes> — see
 * docs/PLAN_2026-09-18_20-18-audit-uiux.md:241 for the 10-route gate (5 komunitas +
 * 5 medprom); only the 5 komunitas routes exist in this repo.
 */
export const PUBLIC_ROUTES = [
  { path: '/', name: 'beranda' },
  { path: '/events', name: 'events' },
  { path: '/gallery', name: 'gallery' },
  { path: '/community', name: 'community' },
  { path: '/daftar', name: 'daftar' },
  { path: '/docs', name: 'docs' },
] as const;

// ─── Mock data (representative, non-empty) ───────────────────────
// Non-empty payloads matter: empty states hide the card markup that carries the
// contrast/heading bugs the audit found. Same-origin `/og-image.jpg` is used for
// every image so runs never depend on an external CDN (no flaky network).

const IMG = '/og-image.jpg';

const DB_EVENTS = [
  {
    id: 'evt_a11y_upcoming_1',
    date_str: '2026-10-15',
    date_end: null,
    day: 'Kamis',
    tanggal: '15 Okt 2026',
    jam: '10:00 - 22:00',
    acara: 'Festival Komunitas Bekasi',
    lokasi: 'Atrium Utama',
    eo: 'Komunitas Bekasi Kreatif',
    pic: 'Andi',
    phone: '081234567890',
    keterangan: 'Festival tahunan komunitas kreatif.',
    month: 'Oktober',
    status: 'upcoming',
    category: 'Festival',
    categories: ['Festival'],
    priority: 'high',
    event_model: '',
    event_nominal: '',
    event_model_notes: '',
    source_draft_id: '',
    is_multi_day: false,
    day_time_slots: null,
    event_type: 'single',
    recurrence_group_id: '',
    is_recurring: false,
    poster_url: IMG,
    organization_id: null,
    area_id: null,
  },
  {
    id: 'evt_a11y_upcoming_2',
    date_str: '2026-10-22',
    date_end: null,
    day: 'Kamis',
    tanggal: '22 Okt 2026',
    jam: '13:00 - 20:00',
    acara: 'Bazar Kuliner Nusantara',
    lokasi: 'Main Atrium',
    eo: 'UMKM Bekasi',
    pic: 'Sari',
    phone: '089876543210',
    keterangan: '',
    month: 'Oktober',
    status: 'upcoming',
    category: 'Bazaar',
    categories: ['Bazaar'],
    priority: 'medium',
    event_model: '',
    event_nominal: '',
    event_model_notes: '',
    source_draft_id: '',
    is_multi_day: false,
    day_time_slots: null,
    event_type: 'single',
    recurrence_group_id: '',
    is_recurring: false,
    poster_url: null,
    organization_id: null,
    area_id: null,
  },
  {
    id: 'evt_a11y_past',
    date_str: '2026-07-15',
    date_end: null,
    day: 'Rabu',
    tanggal: '15 Jul 2026',
    jam: '10:00 - 22:00',
    acara: 'Pameran Otomotif Bekasi 2026',
    lokasi: 'Atrium Utama',
    eo: 'PT Otomotif Indonesia',
    pic: 'Budi',
    phone: '081111111111',
    keterangan: '',
    month: 'Juli',
    status: 'past',
    category: 'Pameran',
    categories: ['Pameran'],
    priority: 'medium',
    event_model: '',
    event_nominal: '',
    event_model_notes: '',
    source_draft_id: '',
    is_multi_day: false,
    day_time_slots: null,
    event_type: 'single',
    recurrence_group_id: '',
    is_recurring: false,
    poster_url: IMG,
    organization_id: null,
    area_id: null,
  },
];

const DB_ALBUMS = [
  {
    id: 'alb_a11y_1',
    name: 'Festival Komunitas 2026',
    slug: 'festival-komunitas-2026',
    description: 'Dokumentasi festival komunitas tahunan.',
    event_date: '2026-07-15',
    cover_photo_url: IMG,
    sort_order: 0,
    event_id: 'evt_a11y_past',
    lokasi: 'Atrium Utama',
    theme_id: '',
  },
  {
    id: 'alb_a11y_2',
    name: 'Bazar Kuliner',
    slug: 'bazar-kuliner',
    description: 'Bazar kuliner UMKM.',
    event_date: '2026-06-10',
    cover_photo_url: IMG,
    sort_order: 1,
    event_id: '',
    lokasi: 'Main Atrium',
    theme_id: '',
  },
];

const DB_ALBUM_PHOTOS = [
  { id: 'ph_a11y_1', url: IMG, caption: 'Suasana panggung', event_date: '2026-07-15', sort_order: 0, album_id: 'alb_a11y_1', event_id: 'evt_a11y_past' },
  { id: 'ph_a11y_2', url: IMG, caption: 'Pengunjung', event_date: '2026-07-15', sort_order: 1, album_id: 'alb_a11y_1', event_id: 'evt_a11y_past' },
];

const DB_AREAS = [
  { id: 'area_a11y_1', name: 'Atrium Utama', description: 'Area utama dengan kapasitas besar.', cover_photo_url: IMG, sort_order: 0, is_active: true },
  { id: 'area_a11y_2', name: 'Main Atrium', description: 'Area terbuka untuk bazar.', cover_photo_url: IMG, sort_order: 1, is_active: true },
];

const DB_AREA_PHOTOS = [
  { id: 'aph_a11y_1', area_id: 'area_a11y_1', url: IMG, caption: 'Atrium', sort_order: 0 },
];

// All 8 OrganizationType values (src/types/index.ts) appear here so every entry in the
// `TYPE_ACCENT` table in src/pages/CommunityDirectoryPage.tsx is actually
// rendered. With only two types the gate could not detect a contrast regression
// in the other six — notably `eo` (brand-secondary badge), the type the audit
// found failing on production. At least one org has a `link` and at least one
// does not, so both card branches are exercised.
const DB_ORGANIZATIONS = [
  { id: 'org_a11y_1', name: 'Komunitas Bekasi Kreatif', type: 'community', description: 'Komunitas seni dan kreatif Bekasi.', link: '', eventCount: 4, upcomingEventCount: 1, source: 'registered' },
  { id: 'org_a11y_2', name: 'SMK Negeri 1 Bekasi', type: 'school', description: 'Sekolah menengah kejuruan negeri di Bekasi.', link: 'https://instagram.com/smkn1bekasi', eventCount: 2, upcomingEventCount: 0, source: 'event-history' },
  { id: 'org_a11y_3', name: 'PT Metropolitan Properti', type: 'company', description: 'Perusahaan pengelola properti dan pusat perbelanjaan.', link: '', eventCount: 3, upcomingEventCount: 1, source: 'event-history' },
  { id: 'org_a11y_4', name: 'EO Cahaya Nusantara', type: 'eo', description: 'Event organizer pameran dan festival.', link: 'https://instagram.com/eocahayanusantara', eventCount: 5, upcomingEventCount: 2, source: 'registered' },
  { id: 'org_a11y_5', name: 'BEM Universitas Bekasi', type: 'campus', description: 'Badan eksekutif mahasiswa Universitas Bekasi.', link: '', eventCount: 1, upcomingEventCount: 0, source: 'event-history' },
  { id: 'org_a11y_6', name: 'Dinas Pariwisata Kota Bekasi', type: 'government', description: 'Instansi pemerintah bidang pariwisata dan ekonomi kreatif.', link: 'https://bekasikota.go.id', eventCount: 2, upcomingEventCount: 1, source: 'registered' },
  { id: 'org_a11y_7', name: 'Yayasan Peduli Sesama', type: 'ngo', description: 'Yayasan sosial dan kemanusiaan.', link: '', eventCount: 1, upcomingEventCount: 0, source: 'registered' },
  { id: 'org_a11y_8', name: 'Perkumpulan Pecinta Fotografi', type: 'other', description: 'Komunitas fotografi lintas kota.', link: 'https://instagram.com/pecintafotografi', eventCount: 2, upcomingEventCount: 0, source: 'event-history' },
];

const DB_TENANTS = [
  { id: 'tnt_a11y_1', name: 'Kopi Metmal', floor: 'LTB', lot: 'A-12', category: 'Food & Beverage', logo: '' },
  { id: 'tnt_a11y_2', name: 'Fashion Hub', floor: 'LT1', lot: 'B-05', category: 'Fashion', logo: '' },
];

/**
 * Intercept every API call the five public routes make, as an anonymous visitor.
 *
 * Built on top of the repo's own e2e/helpers.ts `setupApiMocks` so there is no
 * parallel mocking layer. Two deliberate overrides:
 *  1. `/auth/me` is re-registered AFTER setupApiMocks with `user: null`. Playwright
 *     matches route handlers in reverse registration order, so this guest handler
 *     wins — the pages under test are the anonymous public surfaces.
 *  2. Non-empty content payloads (albums/areas/directory/news/instagram) so the
 *     card markup is actually rendered instead of an empty state.
 */
export async function setupPublicApiMocks(page: Page): Promise<void> {
  await setupApiMocks(page, 'viewer');

  const json = (route: Route, data: unknown) => route.fulfill({ json: { success: true, data } });

  // Anonymous visitor — registered last, therefore matched first.
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { success: true, user: null } }));

  // Content payloads (override the generic ones from setupApiMocks).
  await page.route('**/api/v1/events', (route) => json(route, DB_EVENTS));
  // Event DETAIL (`GET /events/<id>`) answers a SINGLE `DbEvent` row, not the
  // collection array. Registered AFTER the collection handler because Playwright
  // matches route handlers in REVERSE registration order (last registered wins).
  // Without it a detail fetch 404s: the `**/api/v1/events` pattern above matches
  // only the COLLECTION path (Playwright's `*` does not cross `/`), so
  // `/events/<id>` fell through to the dev server and the page rendered its 404
  // state ("Event tidak ditemukan"). That in turn meant the `EventPhotoGallery`
  // on `/events/:id` could never render its photo grid — the component (and its
  // own `Lightbox`) was invisible to this gate. Unknown ids still 404, so the
  // "not found" path stays reachable for other tests.
  await page.route('**/api/v1/events/*', (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const row = DB_EVENTS.find((e) => e.id === id);
    if (!row) {
      return route.fulfill({ status: 404, json: { success: false, error: 'Event tidak ditemukan' } });
    }
    return json(route, row);
  });
  await page.route('**/api/v1/albums*', (route) =>
    json(route, { albums: DB_ALBUMS, photos: DB_ALBUM_PHOTOS }));
  // Album DETAIL (`GET /albums/<slug>`) answers `{album, photos}` — a different
  // shape from the collection endpoint's `{albums, photos}`. Registered AFTER
  // the collection handler because Playwright matches route handlers in REVERSE
  // registration order: the last-registered match wins, so this narrower
  // `/albums/<slug>` handler must come later. Without it the album page renders
  // its 404 state ("Album tidak ditemukan") and the photo lightbox can never be
  // opened from `/gallery/<slug>`.
  await page.route('**/api/v1/albums/*', (route) =>
    json(route, { album: DB_ALBUMS[0], photos: DB_ALBUM_PHOTOS }));
  await page.route('**/api/v1/areas*', (route) =>
    json(route, { areas: DB_AREAS, photos: DB_AREA_PHOTOS }));
  await page.route('**/api/v1/directory', (route) =>
    json(route, {
      organizations: DB_ORGANIZATIONS,
      // Mirrors the 8 org types present in DB_ORGANIZATIONS (src/types/index.ts
      // OrganizationType union), so the filter pills stay consistent with the
      // organizations actually rendered.
      categories: [
        'community',
        'school',
        'company',
        'eo',
        'campus',
        'government',
        'ngo',
        'other',
      ],
    }));
  await page.route('**/api/v1/tenant/directory', (route) => json(route, DB_TENANTS));
  await page.route('**/api/v1/news', (route) => json(route, []));
  await page.route('**/api/v1/instagram', (route) => json(route, { posts: [] }));
}

/**
 * Detect a dev-server error overlay (Vite/HMR compile error) or a React error
 * boundary fallback. These are RENDER failures, not accessibility defects — if
 * they are present, axe is measuring the overlay instead of the app, and the
 * resulting violations are meaningless. Reported as a first-class finding.
 */
export async function detectRenderFailure(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const overlay = document.querySelector('vite-error-overlay');
    if (overlay) {
      const text = (overlay.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400);
      return `Vite error overlay present (dev compile error): ${text}`;
    }
    const boundary = Array.from(document.querySelectorAll('h1,h2')).find((h) =>
      /Terjadi Kesalahan/i.test(h.textContent || ''),
    );
    if (boundary) return 'React ErrorBoundary fallback rendered ("Terjadi Kesalahan")';
    return null;
  });
}

/** Wait for the app to settle: network idle + fonts + a paint frame. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  // Network idle can hang on long-lived connections; bound it and continue.
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.evaluate(() => {
    const { promise, resolve } = Promise.withResolvers<null>();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)));
    return promise;
  });
}

// ─── Measurement primitives (Deliverable 3) ──────────────────────

export interface ScrollMetrics {
  /** documentElement.scrollWidth — the metric the audit quotes. */
  scrollWidth: number;
  /** window.innerWidth — the metric the audit compares against. */
  innerWidth: number;
  /** documentElement.clientWidth — the layout viewport excluding the scrollbar. */
  clientWidth: number;
  /** scrollWidth > clientWidth ⇒ content genuinely overflows the layout viewport. */
  overflows: boolean;
  /** Elements whose right edge exceeds the layout viewport (widest first). */
  offenders: Array<{ selector: string; right: number; width: number }>;
}

/** Measure horizontal overflow, plus the offending elements when any exist. */
export async function measureScroll(page: Page): Promise<ScrollMetrics> {
  return await page.evaluate(() => {
    const de = document.documentElement;
    const clientWidth = de.clientWidth;
    const offenders: Array<{ selector: string; right: number; width: number }> = [];

    const describe = (el: Element): string => {
      const parts: string[] = [];
      let node: Element | null = el;
      for (let depth = 0; node && depth < 4; depth += 1) {
        let part = node.tagName.toLowerCase();
        if (node.id) part += `#${node.id}`;
        const cls = (node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
        if (cls.length) part += `.${cls.join('.')}`;
        parts.unshift(part);
        node = node.parentElement;
      }
      return parts.join(' > ');
    };

    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > clientWidth + 1) {
        offenders.push({ selector: describe(el), right: Math.round(rect.right), width: Math.round(rect.width) });
      }
    }
    offenders.sort((a, b) => b.right - a.right);

    return {
      scrollWidth: de.scrollWidth,
      innerWidth: window.innerWidth,
      clientWidth,
      overflows: de.scrollWidth > clientWidth,
      offenders: offenders.slice(0, 10),
    };
  });
}

/** Ordered heading outline, filtered the way axe's `heading-order` sees the page. */
export async function extractHeadingOutline(
  page: Page,
): Promise<Array<{ level: number; text: string; selector: string }>> {
  return await page.evaluate(() => {
    const hidden = (el: Element): boolean => {
      if (el.closest('[aria-hidden="true"]')) return true;
      if ((el as HTMLElement).hidden) return true;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      return el.getClientRects().length === 0;
    };

    const describe = (el: Element): string => {
      let out = el.tagName.toLowerCase();
      if (el.id) out += `#${el.id}`;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) out += `.${cls.join('.')}`;
      return out;
    };

    return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter((el) => !hidden(el))
      .map((el) => ({
        level: Number(el.tagName.substring(1)),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
        selector: describe(el),
      }));
  });
}

export interface StructuralAudit {
  h1Count: number;
  h1Texts: string[];
  imagesWithoutAlt: Array<{ selector: string; src: string }>;
  totalImages: number;
  /** Elements with NO accessible name by any method axe accepts — a real failure. */
  inputsWithoutLabel: Array<{ selector: string; type: string; name: string }>;
  /**
   * Elements named ONLY by `placeholder` (or `title`). axe's `label` rule accepts
   * these (its `any` list includes non-empty-placeholder), so they are NOT axe
   * violations — but the audit's prose claim "0 input tanpa label" is ambiguous
   * about whether placeholder-only counts, so they are reported separately.
   */
  inputsLabelledOnlyByPlaceholder: Array<{ selector: string; type: string; placeholder: string }>;
  totalInputs: number;
  landmarks: { main: number; header: number; footer: number; nav: number };
}

/** Direct DOM checks for the audit's structural claims (h1 / alt / label). */
export async function measureStructure(page: Page): Promise<StructuralAudit> {
  return await page.evaluate(() => {
    const describe = (el: Element): string => {
      let out = el.tagName.toLowerCase();
      if (el.id) out += `#${el.id}`;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) out += `.${cls.join('.')}`;
      return out;
    };

    const visible = (el: Element): boolean => {
      if (el.closest('[aria-hidden="true"]')) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return el.getClientRects().length > 0;
    };

    const headings = Array.from(document.querySelectorAll('h1')).filter(visible);

    const images = Array.from(document.querySelectorAll('img')).filter(visible);
    const imagesWithoutAlt = images
      .filter((img) => img.getAttribute('alt') === null)
      .map((img) => ({ selector: describe(img), src: img.getAttribute('src') || '' }));

    // Mirrors axe's `label` rule `any` list: implicit-label, explicit-label,
    // aria-label, aria-labelledby, non-empty-title, non-empty-placeholder.
    const nameSources = (el: Element): string[] => {
      const sources: string[] = [];
      const id = el.getAttribute('id');
      if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) sources.push('explicit-label');
      if (el.closest('label')) sources.push('implicit-label');
      if (el.getAttribute('aria-label')?.trim()) sources.push('aria-label');
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy && labelledBy.split(/\s+/).some((ref) => document.getElementById(ref))) sources.push('aria-labelledby');
      if (el.getAttribute('title')?.trim()) sources.push('title');
      if (el.getAttribute('placeholder')?.trim()) sources.push('placeholder');
      return sources;
    };

    const inputs = Array.from(
      document.querySelectorAll('input:not([type="hidden"]), select, textarea'),
    ).filter(visible);

    const inputsWithoutLabel = inputs
      .filter((el) => nameSources(el).length === 0)
      .map((el) => ({
        selector: describe(el),
        type: el.getAttribute('type') || el.tagName.toLowerCase(),
        name: el.getAttribute('name') || '',
      }));

    const inputsLabelledOnlyByPlaceholder = inputs
      .filter((el) => {
        const sources = nameSources(el);
        return sources.length > 0 && sources.every((s) => s === 'placeholder' || s === 'title');
      })
      .map((el) => ({
        selector: describe(el),
        type: el.getAttribute('type') || el.tagName.toLowerCase(),
        placeholder: el.getAttribute('placeholder') || el.getAttribute('title') || '',
      }));

    const count = (sel: string) => document.querySelectorAll(sel).length;

    return {
      h1Count: headings.length,
      h1Texts: headings.map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)),
      imagesWithoutAlt,
      totalImages: images.length,
      inputsWithoutLabel,
      inputsLabelledOnlyByPlaceholder,
      totalInputs: inputs.length,
      landmarks: {
        main: count('main'),
        header: count('header'),
        footer: count('footer'),
        nav: count('nav'),
      },
    };
  });
}

// ─── Hero content measurement (falsifiable counterpart to heroContrast.test.ts) ──

export interface HeroContentMetrics {
  /** The hero <section> that contains the `bg-gradient-hero-tosca` layer, or null. */
  heroSelector: string | null;
  heroHeight: number;
  /** Lowest TEXT element inside the hero (the copy), by bottom edge. */
  lowestElement: string | null;
  /** `lowestElement`'s bottom edge, relative to the hero's top edge (px). */
  contentBottomPx: number;
  /** contentBottomPx / heroHeight — the number the audit claim is checked against. */
  fraction: number;
}

/**
 * Measure how far down the hero box its copy reaches, as a fraction of the box.
 *
 * Structure note: `bg-gradient-hero-tosca` is applied to a DECORATIVE, absolutely
 * positioned layer (`<div aria-hidden class="absolute inset-0 bg-gradient-hero-tosca">`)
 * that is a SIBLING of the copy — not an ancestor. The copy lives in the sibling
 * `<div class="relative z-10 …">`. So the hero box is taken to be the nearest
 * block ancestor of the gradient layer (the `<section id="hero">`), which is
 * exactly the box the gradient paints; the copy is then the lowest TEXT element
 * inside that section. Measuring descendants of the gradient layer itself would
 * find nothing.
 *
 * The "copy" is a visible element carrying its own non-empty text (the h1, the
 * paragraphs, the badge count, the chip labels). Decorative, `aria-hidden`
 * subtrees are excluded, and so is pure geometry — an `absolute inset-0` overlay
 * has its bottom at the hero's bottom and would otherwise dominate the maximum.
 *
 * Returns `heroSelector: null` when the route renders no hero (e.g. `/daftar`).
 */
export async function measureHeroContentFraction(page: Page): Promise<HeroContentMetrics> {
  return await page.evaluate(() => {
    const describe = (el: Element): string => {
      let out = el.tagName.toLowerCase();
      if (el.id) out += `#${el.id}`;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 4);
      if (cls.length) out += `.${cls.join('.')}`;
      return out;
    };

    /** `describe` + a short text snippet, so the report names the actual copy. */
    const describeWithText = (el: Element): string => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return text.length > 0 ? `${describe(el)} "${text}"` : describe(el);
    };

    const gradientLayer = document.querySelector('.bg-gradient-hero-tosca');
    if (!gradientLayer) {
      return { heroSelector: null, heroHeight: 0, lowestElement: null, contentBottomPx: 0, fraction: 0 };
    }

    // The gradient paints an absolutely positioned layer; the box it covers is
    // the nearest positioned block ancestor (the <section>), not the layer.
    const hero = gradientLayer.closest('section, header') ?? gradientLayer.parentElement ?? gradientLayer;
    const heroRect = hero.getBoundingClientRect();

    const visible = (el: Element): boolean => {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return el.getClientRects().length > 0;
    };

    const hasOwnText = (el: Element): boolean =>
      Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0);

    let lowest: { selector: string; bottomPx: number } | null = null;
    for (const el of Array.from(hero.querySelectorAll('*'))) {
      // Decorative layers are not copy.
      if (el.closest('[aria-hidden="true"]')) continue;
      if (!visible(el) || !hasOwnText(el)) continue;
      const rect = el.getBoundingClientRect();
      const bottomPx = rect.bottom - heroRect.top;
      if (!lowest || bottomPx > lowest.bottomPx) {
        lowest = { selector: describeWithText(el), bottomPx };
      }
    }

    const heroHeight = heroRect.height;
    const contentBottomPx = lowest ? lowest.bottomPx : 0;
    return {
      heroSelector: describe(hero),
      heroHeight,
      lowestElement: lowest ? lowest.selector : null,
      contentBottomPx,
      fraction: heroHeight > 0 ? contentBottomPx / heroHeight : 0,
    };
  });
}

// ─── Reporting ───────────────────────────────────────────────────

/**
 * Stable on-disk location for the per-route axe report.
 *
 * Playwright PRUNES attachments for passing tests, so `testInfo.attach` alone
 * leaves no reproducible evidence. These files always land on disk — pass or
 * fail — and `reports/` is gitignored (.gitignore:31), so they are never
 * committed. One file per route (each route is one test) avoids write races
 * under `test.describe.configure({ mode: 'parallel' })`.
 */
export const A11Y_REPORT_DIR = 'reports/a11y';

/** Route path → filename slug: `/events` → `events`, `/` → `root`. */
export function routeSlug(routePath: string): string {
  const trimmed = routePath.replace(/^\/+|\/+$/g, '');
  return trimmed.length === 0 ? 'root' : trimmed.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

/** Write a named JSON report into reports/a11y/ (creates the dir if needed). */
export function writeReportFile(fileName: string, report: unknown): string {
  const dir = resolve(A11Y_REPORT_DIR);
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, fileName);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

/** Write a route's axe report to `reports/a11y/axe-report-<slug>.json`. */
export function writeAxeReport(routePath: string, report: unknown): string {
  return writeReportFile(`axe-report-${routeSlug(routePath)}.json`, report);
}

export interface NodeSummary {
  target: string;
  html: string;
  failureSummary: string;
}

/**
 * Normalize one axe node into the report's node shape.
 *
 * Shared by `summarizeViolations` and `summarizeIncomplete` so violations and
 * `incomplete` nodes are truncated and flattened identically — a reader can
 * compare the two sets without accounting for a shape difference.
 */
export function summarizeNode(n: NodeResult): NodeSummary {
  return {
    target: n.target.map((t) => (Array.isArray(t) ? t.join(' ') : String(t))).join(' >> '),
    html: n.html.length > 300 ? `${n.html.slice(0, 300)}…` : n.html,
    failureSummary: (n.failureSummary || '').replace(/\s*\n\s*/g, ' '),
  };
}

/**
 * `incomplete` rules with their actual NODE TARGETS, not just a count.
 *
 * The count alone is not checkable evidence: a reader cannot confirm "these
 * unresolved nodes pass AA" from `nodes: 11`. Naming each target (and a short
 * html snippet) makes the claim auditable from the artifact alone. This is a
 * data-shape addition — it does not affect the gate's pass/fail verdict.
 */
export interface IncompleteSummary {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodeCount: number;
  nodes: NodeSummary[];
}

/** Flatten axe `incomplete` results into a node-level, auditable shape. */
export function summarizeIncomplete(results: AxeResults): IncompleteSummary[] {
  return results.incomplete.map((v: Result) => ({
    id: v.id,
    impact: v.impact ?? null,
    help: v.help,
    helpUrl: v.helpUrl,
    nodeCount: v.nodes.length,
    nodes: v.nodes.slice(0, 25).map(summarizeNode),
  }));
}

export interface ViolationSummary {
  route: string;
  viewport: number;
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  tags: string[];
  nodeCount: number;
  nodes: NodeSummary[];
}

/** Flatten axe results into an actionable, route+viewport-scoped shape. */
export function summarizeViolations(
  results: AxeResults,
  route: string,
  viewport: number,
): ViolationSummary[] {
  return results.violations.map((v: Result) => ({
    route,
    viewport,
    id: v.id,
    impact: v.impact ?? null,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags,
    nodeCount: v.nodes.length,
    nodes: v.nodes.slice(0, 25).map(summarizeNode),
  }));
}

/**
 * Human-readable, actionable failure message: route + viewport + rule id + impact
 * + failing node selectors. A bare "1 violation" is useless.
 */
export function formatViolations(summaries: ViolationSummary[]): string {
  if (summaries.length === 0) return '';
  const lines: string[] = [];
  const totalNodes = summaries.reduce((acc, s) => acc + s.nodeCount, 0);
  lines.push(
    `${summaries.length} axe rule violation(s), ${totalNodes} failing node(s) at ${summaries[0]?.route} @${summaries[0]?.viewport}px`,
  );
  for (const s of summaries) {
    lines.push('');
    lines.push(`  ✖ [${s.impact ?? 'unknown'}] ${s.id} — ${s.help} (${s.nodeCount} node(s))`);
    lines.push(`     ${s.helpUrl}`);
    for (const n of s.nodes) {
      lines.push(`     • ${n.target}`);
      if (n.failureSummary) lines.push(`       ${n.failureSummary}`);
    }
    if (s.nodeCount > s.nodes.length) {
      lines.push(`     … ${s.nodeCount - s.nodes.length} more node(s) (see attached JSON report)`);
    }
  }
  return lines.join('\n');
}

/** Attach the machine-readable report to the test result (no console noise). */
export async function attachReport(
  testInfo: TestInfo,
  payload: unknown,
  name: string,
): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(payload, null, 2),
    contentType: 'application/json',
  });
}

/** Counts for the Deliverable-3 evidence table. */
export function countRule(
  results: AxeResults,
  ruleId: string,
): { nodes: number; present: boolean; impact: string | null } {
  const rule = results.violations.find((v) => v.id === ruleId);
  if (!rule) return { nodes: 0, present: false, impact: null };
  return { nodes: rule.nodes.length, present: true, impact: rule.impact ?? null };
}
