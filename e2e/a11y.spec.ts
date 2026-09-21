import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import {
  AXE_TAGS,
  PUBLIC_ROUTES,
  VIEWPORTS,
  VIEWPORT_HEIGHT,
  HERO_CONTENT_MAX_FRACTION,
  AXE_RUN_OPTIONS,
  setupPublicApiMocks,
  settle,
  detectRenderFailure,
  summarizeViolations,
  summarizeIncomplete,
  formatViolations,
  attachReport,
  countRule,
  measureScroll,
  extractHeadingOutline,
  measureStructure,
  measureHeroContentFraction,
  writeAxeReport,
  writeReportFile,
} from './a11y.config';
import { censusIncompleteNodes, type CensusNode } from './a11y.census';

/**
 * Accessibility verification harness — the executable form of the audit gate:
 *
 *   "axe-core 0 pelanggaran di 10 rute"
 *   (docs/PLAN_2026-09-18_20-18-audit-uiux.md:241)
 *
 * Only the 5 community routes live in this repo; the other 5 are the medprom repo.
 * Every route is measured at 320/375/414/768/1280 — the audit's viewport set — with
 * all API traffic intercepted, so no backend is required.
 *
 * Run: `npm run test:a11y`
 */

test.describe.configure({ mode: 'parallel' });

test.describe('axe-core a11y gate — community public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} — 0 axe violations across 320–1280px`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);

      /** Every (viewport, violation) pair, so one failure reports all of them. */
      const failures: string[] = [];
      /**
       * Nodes axe could not evaluate (neither pass nor fail). Summed across
       * viewports so a red run also reports the verification gap, not just the
       * violations — "0 violations" is not the same as "0 unresolved".
       */
      let incompleteTotal = 0;
      const report: Record<string, unknown> = { route: route.path, viewports: {} };

      for (const width of VIEWPORTS) {
        await setupPublicApiMocks(page);
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(route.path);
        await settle(page);

        // A route that cannot render is worse than a contrast bug — assert the
        // app actually mounted before spending time on axe.
        const mounted = await page.evaluate(() => {
          const root = document.getElementById('root');
          return {
            rootChildren: root?.children.length ?? 0,
            bodyTextLength: (document.body.innerText || '').trim().length,
            hasMain: document.querySelectorAll('main').length > 0,
          };
        });
        const renderFailure = await detectRenderFailure(page);

        if (renderFailure || mounted.rootChildren === 0 || mounted.bodyTextLength === 0) {
          const detail = renderFailure
            ?? `rendered an empty document (root children=${mounted.rootChildren}, body text length=${mounted.bodyTextLength})`;
          (report.viewports as Record<string, unknown>)[String(width)] = {
            url: page.url(),
            mounted,
            renderFailure: detail,
            violationCount: null,
            nodeCount: null,
            incomplete: [],
            passes: null,
            violations: [],
          };
          failures.push(
            `\n  ✖ RENDER FAILURE at ${route.path} @${width}px\n     ${detail}\n     axe was NOT run for this viewport — violations would describe the error overlay, not the app.`,
          );
          continue;
        }

        const results = await new AxeBuilder({ page })
          .withTags([...AXE_TAGS])
          .options(AXE_RUN_OPTIONS)
          .analyze();
        const summaries = summarizeViolations(results, route.path, width);
        incompleteTotal += results.incomplete.reduce((acc, v) => acc + v.nodes.length, 0);

        (report.viewports as Record<string, unknown>)[String(width)] = {
          url: page.url(),
          mounted,
          violationCount: results.violations.length,
          nodeCount: results.violations.reduce((acc, v) => acc + v.nodes.length, 0),
          // Node targets, not just counts: a count is not checkable evidence.
          incomplete: summarizeIncomplete(results),
          passes: results.passes.length,
          violations: summaries,
        };

        if (summaries.length > 0) failures.push(formatViolations(summaries));
      }

      await attachReport(testInfo, report, 'axe-report.json');
      // Also persist to a stable path: Playwright prunes attachments for passing
      // tests, so the attached copy is not reproducible evidence. This file is
      // written whether the run passes or fails (reports/ is gitignored).
      writeAxeReport(route.path, report);

      // Diagnostics only on the failure path — no console noise when green.
      // When red, also surface the incomplete count so a human sees the gap.
      const diagnostics = failures.length > 0
        ? `${failures.join('\n')}\n\n  Note: ${incompleteTotal} axe node(s) were reported as \`incomplete\` (not evaluated) across ${VIEWPORTS.length} viewport(s); see axe-report.json. "0 violations" ≠ "0 unresolved".`
        : '';
      expect(diagnostics, `\n${diagnostics}\n`).toBe('');
    });
  }
});

/**
 * Deliverable 3 — independent verification of the audit's specific claims.
 * These are measurements, not assertions of correctness: they record what the
 * current tree actually does so the audit's numbers can be confirmed or refuted.
 */
test.describe('audit claims — direct measurement', () => {
  test('horizontal overflow + h1/alt/label + heading outline (320–1280px)', async ({ page }, testInfo) => {
    test.setTimeout(300_000);

    const report: Record<string, unknown> = {};

    for (const route of PUBLIC_ROUTES) {
      const perRoute: Record<string, unknown> = {};

      for (const width of VIEWPORTS) {
        await setupPublicApiMocks(page);
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(route.path);
        await settle(page);

        const renderFailure = await detectRenderFailure(page);
        const mounted = await page.evaluate(() => ({
          rootChildren: document.getElementById('root')?.children.length ?? 0,
          bodyTextLength: (document.body.innerText || '').trim().length,
        }));

        if (renderFailure || mounted.rootChildren === 0 || mounted.bodyTextLength === 0) {
          perRoute[String(width)] = {
            renderFailure: renderFailure ?? 'empty document',
            mounted,
            axe: null,
            scroll: null,
            structure: null,
            headings: null,
          };
          continue;
        }

        const results = await new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
        const scroll = await measureScroll(page);
        const structure = await measureStructure(page);
        const headings = await extractHeadingOutline(page);

        perRoute[String(width)] = {
          renderFailure: null,
          axe: {
            violationCount: results.violations.length,
            nodeCount: results.violations.reduce((acc, v) => acc + v.nodes.length, 0),
            byRule: Object.fromEntries(
              results.violations.map((v) => [v.id, { impact: v.impact, nodes: v.nodes.length }]),
            ),
            colorContrast: countRule(results, 'color-contrast'),
          },
          scroll,
          structure,
          headings,
        };
      }

      report[route.path] = perRoute;
    }

    await attachReport(testInfo, report, 'audit-claims.json');
    expect(Object.keys(report).length).toBe(PUBLIC_ROUTES.length);
  });

  /**
   * Falsifies the hero assumption the unit test hardcodes.
   *
   * `src/utils/__tests__/heroContrast.test.ts` assumes hero copy stops at 87% of
   * the hero box (`HERO_CONTENT_MAX_FRACTION`, measured 86.5% at 320px). That
   * assumption is only safe while the real DOM agrees with it: if the copy grows
   * past the line into the gradient's light band, contrast fails but BOTH the
   * unit test (which assumes 0.87) and axe (which returns the gradient as
   * `incomplete`) would stay green. This measures the live DOM so the
   * assumption fails loudly instead.
   *
   * The 0.87 constant is intentionally duplicated from the unit test — see the
   * note on `HERO_CONTENT_MAX_FRACTION` in e2e/a11y.config.ts.
   */
  test('hero copy stays above the 87% line at every viewport', async ({ page }, testInfo) => {
    test.setTimeout(180_000);

    const report: Record<string, unknown> = {};
    const failures: string[] = [];
    const measured: string[] = [];
    /** Routes that rendered a hero at each viewport — must be non-empty. */
    const heroRoutes = new Set<string>();
    /** Viewports where the hero rendered but NO copy element was found. */
    let viewportsWithoutCopy = 0;

    for (const route of PUBLIC_ROUTES) {
      const perViewport: Record<string, unknown> = {};

      for (const width of VIEWPORTS) {
        await setupPublicApiMocks(page);
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(route.path);
        await settle(page);

        const metrics = await measureHeroContentFraction(page);
        perViewport[String(width)] = metrics;

        // Only routes that actually render the hero participate.
        if (metrics.heroSelector === null) continue;
        heroRoutes.add(route.path);

        // A hero with no measurable copy means the locator is broken — fail
        // loudly rather than let the ≤0.87 assertion pass vacuously.
        if (metrics.lowestElement === null || metrics.contentBottomPx <= 0) {
          viewportsWithoutCopy += 1;
          failures.push(
            `\n  ✖ HERO COPY NOT FOUND at ${route.path} @${width}px`
            + `\n     hero=${metrics.heroSelector} height=${metrics.heroHeight.toFixed(1)}px`
            + `\n     No text element inside the hero was measured; the ≤87% assertion would be vacuous.`,
          );
          continue;
        }

        measured.push(
          `${route.path} @${width}px: ${(metrics.fraction * 100).toFixed(2)}% `
          + `(${metrics.contentBottomPx.toFixed(1)}px of ${metrics.heroHeight.toFixed(1)}px; `
          + `lowest=${metrics.lowestElement})`,
        );

        if (metrics.fraction > HERO_CONTENT_MAX_FRACTION) {
          failures.push(
            `\n  ✖ HERO COPY PAST THE 87% LINE at ${route.path} @${width}px`
            + `\n     content bottom = ${metrics.contentBottomPx.toFixed(1)}px`
            + ` of hero height ${metrics.heroHeight.toFixed(1)}px`
            + ` = ${(metrics.fraction * 100).toFixed(2)}% > ${(HERO_CONTENT_MAX_FRACTION * 100).toFixed(0)}%`
            + `\n     lowest element: ${metrics.lowestElement}`
            + `\n     The gradient turns light below this line — white copy here is likely below AA.`
            + `\n     src/utils/__tests__/heroContrast.test.ts assumes the copy stops at `
            + `${(HERO_CONTENT_MAX_FRACTION * 100).toFixed(0)}%; that assumption is now false.`,
          );
        }
      }

      report[route.path] = perViewport;
    }

    await attachReport(testInfo, report, 'hero-content-fraction.json');
    writeReportFile('hero-content-fraction.json', report);

    // The harness must actually have found a hero, otherwise "0 failures" means
    // the measurement never ran — the exact vacuous-green trap this closes.
    expect(
      heroRoutes.size,
      'no route rendered a hero (bg-gradient-hero-tosca) at any viewport — measurement never ran',
    ).toBeGreaterThan(0);
    expect(viewportsWithoutCopy, 'hero rendered but no copy element was measured').toBe(0);

    const summary = `\nHero content fraction per viewport (must be ≤ ${(HERO_CONTENT_MAX_FRACTION * 100).toFixed(0)}%):`
      + `\n  ${measured.join('\n  ')}\n`;

    expect(failures.length > 0 ? `${failures.join('\n')}\n` : '', summary).toBe('');
  });

  /**
   * Closes the loop on axe's `incomplete` verdict.
   *
   * "Incomplete" is not a pass, and the gate alone leaves those nodes unresolved.
   * This measures EVERY incomplete color-contrast node by direct pixel
   * compositing (see e2e/a11y.census.ts) and fails if any is genuinely below AA
   * — or if any node went unmeasured. That makes the claim in the a11y.config.ts
   * doc-comment ("all 24 incomplete nodes pass") reproducible by re-running the
   * gate, instead of resting on a one-off measurement.
   *
   * Per-node AA threshold is applied (large text ≥18pt, or ≥14pt bold → 3:1;
   * else 4.5:1), so an `h1` at 40px/800 is not judged as small text.
   */
  test('every axe `incomplete` node passes AA when measured directly', async ({ page }, testInfo) => {
    test.setTimeout(600_000);

    const report: Record<string, unknown> = {};
    /** Distinct nodes (target+text+colour), worst ratio first. */
    const distinct = new Map<string, CensusNode>();
    const failures: string[] = [];
    const unmeasured: string[] = [];
    let totalRows = 0;

    for (const route of PUBLIC_ROUTES) {
      const perViewport: Record<string, unknown> = {};

      for (const width of VIEWPORTS) {
        await setupPublicApiMocks(page);
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(route.path);
        await settle(page);
        // Deterministic scrolling: axe found these nodes; make them measurable.
        await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });

        const census = await censusIncompleteNodes(page);
        perViewport[String(width)] = census;
        totalRows += census.nodes.length;

        for (const target of census.skipped) {
          unmeasured.push(`${route.path} @${width}px: ${target}`);
        }

        for (const node of census.nodes) {
          const key = `${node.target}|${node.text}|${node.rawColor}`;
          const prev = distinct.get(key);
          if (!prev || node.ratio < prev.ratio) distinct.set(key, node);

          if (!node.passesAA) {
            failures.push(
              `\n  ✖ INCOMPLETE NODE BELOW AA at ${route.path} @${width}px`
              + `\n     ${node.target} "${node.text}"`
              + `\n     ${node.fontSize}/${node.fontWeight} colour=${node.rawColor} alpha=${node.alpha}`
              + `\n     composited fg=${node.compositedFg.join(',')} over bg=${node.background.join(',')}`
              + `\n     ratio ${node.ratio.toFixed(2)}:1 < required ${node.requiredRatio}:1`
              + `\n     axe left this node "incomplete"; it is a real failure. Fix it or document why not.`,
            );
          }
        }
      }

      report[route.path] = perViewport;
    }

    await attachReport(testInfo, report, 'incomplete-census.json');
    writeReportFile('incomplete-census.json', report);

    const sorted = [...distinct.values()].sort((a, b) => a.ratio - b.ratio);
    const censusLines = sorted.map(
      (n) => `${n.passesAA ? 'PASS' : 'FAIL'} ${n.ratio.toFixed(2)}:1 (need ${n.requiredRatio})`
        + `  ${n.target} "${n.text}"  ${n.fontSize}/${n.fontWeight} a=${n.alpha}`
        + ` bg=${n.background.join(',')} hist=${n.histogram.map(([c, k]) => `${c}×${k}`).join(' ')}`,
    );

    // The census must have actually measured something, or "0 failures" is a lie.
    expect(
      sorted.length,
      'no axe incomplete node was measured — the census never ran (0 nodes)',
    ).toBeGreaterThan(0);
    expect(
      unmeasured,
      `axe incomplete node(s) could not be measured (off-screen or selector drift):\n  ${unmeasured.join('\n  ')}`,
    ).toEqual([]);

    const summary = `\nIncomplete-node census (distinct nodes, worst first; ${totalRows} route×viewport×node rows):\n`
      + `  ${censusLines.join('\n  ')}\n`;

    expect(failures.length > 0 ? `${failures.join('\n')}\n` : '', summary).toBe('');
  });
});

/**
 * Interactive state — the photo lightbox.
 *
 * The route sweep above never clicks anything, so it cannot see any state that
 * exists only after interaction (see the NO-INTERACTIVE-STATE caveat in
 * e2e/a11y.config.ts). This test covers the one such surface that had a real
 * defect: `src/components/PhotoLightbox.tsx`, shared by the album grid
 * (`/gallery/<slug>`) and the event-area cards (`/`). Its counter shipped as
 * `text-xs text-white/40` — 3.33:1 over the `bg-slate-950/85` overlay, below AA
 * — and the sweep stayed green because it never opened the dialog.
 *
 * The test is deliberately NOT vacuous: it asserts the dialog actually opened
 * and that the counter is inside it, so a mock regression that stops the
 * lightbox from rendering fails loudly instead of passing on an empty page.
 */
test.describe('interactive state — photo lightbox', () => {
  for (const width of [375, 1280] as const) {
    test(`/gallery/<slug> lightbox — 0 axe violations inside the open dialog @${width}px`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);

      await setupPublicApiMocks(page);
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto('/gallery/festival-komunitas-2026');
      await settle(page);

      // The album must actually render — otherwise the click below would be the
      // only thing "testing" anything, and it would fail for the wrong reason.
      const albumHeading = page.locator('main h1');
      await expect(
        albumHeading,
        'album page did not render (the /albums/<slug> mock shape may be wrong) — the lightbox cannot be reached',
      ).toBeVisible({ timeout: 15_000 });

      // Open the lightbox from the photo grid. `button.group` is the album
      // tile wrapper in GalleryAlbumPage.tsx.
      const tile = page.locator('main button.group').first();
      await expect(tile, 'no clickable photo tile in the album grid').toBeVisible({ timeout: 15_000 });
      await tile.click();

      // Fail loudly if the lightbox never opened: an empty dialog assertion is
      // the difference between a real test and a vacuous one.
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog, 'photo lightbox did not open').toBeVisible({ timeout: 15_000 });

      const counter = dialog.locator('p', { hasText: /^\s*\d+\s*\/\s*\d+\s*$/ }).first();
      await expect(
        counter,
        'lightbox opened but the "{n} / {total}" counter is not inside it — axe would be measuring the wrong surface',
      ).toBeVisible({ timeout: 15_000 });

      // Let the modal enter animation finish: `.modal-*`/dialog opacity animates
      // 0→1, and axe samples composited pixels, so a mid-animation run would
      // report a bogus contrast ratio.
      await page.evaluate(async () => {
        for (let i = 0; i < 60; i += 1) {
          const running = document.getAnimations().filter((a) => a.playState === 'running');
          if (running.length === 0) return;
          await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
          await new Promise((r) => setTimeout(r, 50));
        }
      });
      await settle(page);

      const results = await new AxeBuilder({ page })
        .withTags([...AXE_TAGS])
        .options(AXE_RUN_OPTIONS)
        .include('[role="dialog"]')
        .analyze();

      const summaries = summarizeViolations(results, `/gallery/festival-komunitas-2026 (lightbox open)`, width);
      const counterText = (await counter.textContent())?.trim() ?? '';
      const report = {
        width,
        route: '/gallery/festival-komunitas-2026',
        state: 'PhotoLightbox open',
        counterText,
        violationCount: results.violations.length,
        nodeCount: results.violations.reduce((acc, v) => acc + v.nodes.length, 0),
        incomplete: summarizeIncomplete(results),
        violations: summaries,
      };
      await attachReport(testInfo, report, 'lightbox-report.json');
      writeReportFile(`lightbox-${width}.json`, report);

      expect(summaries.length > 0 ? formatViolations(summaries) : '', '').toBe('');
    });
  }
});

/**
 * Event detail page — `/events/:id` (`EventPublicDetailPage`) and the gallery
 * lightbox inside `EventPhotoGallery`.
 *
 * Closes the two coverage gaps recorded OPEN in
 * `docs/PLAN_2026-09-18_20-18-audit-uiux.md` § "DUA celah cakupan TERBUKA":
 *
 *  (a) `EventPhotoGallery` needs an event whose `event_id` matches a photo row.
 *      `setupPublicApiMocks` now intercepts `GET /events/<id>` (registered AFTER
 *      the collection handler), returning the single `DbEvent` for a known id and
 *      404 otherwise — so `/events/evt_a11y_past` renders the event and its photo
 *      grid (photos `ph_a11y_*` carry `event_id: 'evt_a11y_past'`). Before that,
 *      the collection-only pattern matched only `/api/v1/events` and the detail
 *      fetch 404'd into "Event tidak ditemukan".
 *  (b) `/events/:id` was not one of the gate's measured routes. It is covered by
 *      THIS dedicated test rather than by adding it to `PUBLIC_ROUTES`, so the
 *      documented "5 rute" shape and every artifact count stay valid.
 *
 * Deliberately NOT vacuous: it asserts the real event title rendered, that the
 * "not found" state is absent, that the `EventPhotoGallery` grid rendered, and
 * that the lightbox dialog is genuinely open with a named close button BEFORE
 * axe is allowed to run. A mock regression therefore fails loudly instead of
 * passing on an empty page.
 */
test.describe('event detail page — /events/:id + EventPhotoGallery lightbox', () => {
  const EVENT_ID = 'evt_a11y_past';
  const EVENT_TITLE = 'Pameran Otomotif Bekasi 2026';

  test(`/events/${EVENT_ID} — 0 axe violations across 320–1280px (page + open gallery lightbox)`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);

    /** Every (viewport, failure) pair, so one failure reports all of them. */
    const failures: string[] = [];
    let incompleteTotal = 0;
    const report: Record<string, unknown> = { route: `/events/${EVENT_ID}`, viewports: {} };

    for (const width of VIEWPORTS) {
      await setupPublicApiMocks(page);
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto(`/events/${EVENT_ID}`);
      await settle(page);

      const renderFailure = await detectRenderFailure(page);
      const main = page.locator('main#konten-utama');
      const mounted = await page.evaluate(() => ({
        rootChildren: document.getElementById('root')?.children.length ?? 0,
        bodyTextLength: (document.body.innerText || '').trim().length,
      }));

      // ── Non-vacuity gate 1: the REAL event must render, not the 404 state ──
      const heading = main.getByRole('heading', { level: 1 });
      const headingVisible = await heading.isVisible().catch(() => false);
      const headingText = headingVisible ? ((await heading.textContent())?.trim() ?? '') : '';
      const notFoundCount = await main.getByText('Event tidak ditemukan').count();

      // ── Non-vacuity gate 2: the EventPhotoGallery grid must render ──
      const galleryHeading = main.getByRole('heading', { name: 'Dokumentasi Foto' });
      const galleryHeadingVisible = await galleryHeading.isVisible().catch(() => false);
      const tiles = main.locator('img.cursor-pointer');
      const tileCount = await tiles.count();

      if (
        renderFailure
        || mounted.rootChildren === 0
        || mounted.bodyTextLength === 0
        || !headingVisible
        || headingText !== EVENT_TITLE
        || notFoundCount > 0
        || !galleryHeadingVisible
        || tileCount === 0
      ) {
        const detail = renderFailure
          ?? `headingVisible=${headingVisible} headingText="${headingText}" notFound=${notFoundCount}`
            + ` galleryHeading=${galleryHeadingVisible} photoTiles=${tileCount}`;
        (report.viewports as Record<string, unknown>)[String(width)] = {
          url: page.url(),
          mounted,
          renderFailure: detail,
          violationCount: null,
          nodeCount: null,
          incomplete: [],
          violations: [],
        };
        failures.push(
          `\n  ✖ EVENT DETAIL / GALLERY NOT RENDERED at /events/${EVENT_ID} @${width}px`
          + `\n     ${detail}`
          + `\n     Expected the real event "${EVENT_TITLE}" plus an EventPhotoGallery photo grid.`
          + `\n     axe was NOT run for this viewport — violations would describe the 404/empty state, not the page.`,
        );
        continue;
      }

      // ── Full-page axe sweep (same tags + options as the 5-route sweep) ──
      const pageResults = await new AxeBuilder({ page })
        .withTags([...AXE_TAGS])
        .options(AXE_RUN_OPTIONS)
        .analyze();
      const pageSummaries = summarizeViolations(pageResults, `/events/${EVENT_ID}`, width);
      incompleteTotal += pageResults.incomplete.reduce((acc, v) => acc + v.nodes.length, 0);

      // ── Open the gallery lightbox from a photo tile ──
      await tiles.first().click();
      const dialog = page.locator('[role="dialog"]');
      const dialogVisible = await dialog.isVisible().catch(() => false);
      const closeButton = dialog.getByRole('button', { name: 'Tutup lightbox', exact: true });
      const closeButtonCount = await closeButton.count();
      const closeAccessibleName = closeButtonCount > 0
        ? await closeButton.first().getAttribute('aria-label')
        : null;

      if (!dialogVisible || closeButtonCount === 0 || !closeAccessibleName) {
        (report.viewports as Record<string, unknown>)[String(width)] = {
          url: page.url(),
          mounted,
          headingText,
          photoTiles: tileCount,
          page: {
            violationCount: pageResults.violations.length,
            nodeCount: pageResults.violations.reduce((acc, v) => acc + v.nodes.length, 0),
            incomplete: summarizeIncomplete(pageResults),
            violations: pageSummaries,
          },
          lightbox: {
            dialogVisible,
            closeButtonCount,
            closeAccessibleName,
            renderFailure: 'gallery lightbox did not open with a named close button',
          },
        };
        failures.push(
          `\n  ✖ GALLERY LIGHTBOX NOT OPEN/UNNAMED at /events/${EVENT_ID} @${width}px`
          + `\n     dialogVisible=${dialogVisible} closeButtonCount=${closeButtonCount}`
          + ` closeAccessibleName=${JSON.stringify(closeAccessibleName)}`
          + `\n     The photo tile did not open a [role=dialog], or its close button has no accessible name.`
          + `\n     axe was NOT run inside the dialog for this viewport.`,
        );
        if (pageSummaries.length > 0) failures.push(formatViolations(pageSummaries));
        continue;
      }

      // Let the overlay's enter animation finish before sampling pixels: axe
      // composites real colours, so a mid-animation run reports bogus ratios.
      await page.evaluate(async () => {
        const delay = (ms: number) => {
          const { promise, resolve } = Promise.withResolvers<void>();
          setTimeout(resolve, ms);
          return promise;
        };
        for (let i = 0; i < 60; i += 1) {
          const running = document.getAnimations().filter((a) => a.playState === 'running');
          if (running.length === 0) return;
          await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
          await delay(50);
        }
      });
      await settle(page);

      // ── Axe scoped to the OPEN dialog ──
      const dialogResults = await new AxeBuilder({ page })
        .withTags([...AXE_TAGS])
        .options(AXE_RUN_OPTIONS)
        .include('[role="dialog"]')
        .analyze();
      const dialogSummaries = summarizeViolations(
        dialogResults,
        `/events/${EVENT_ID} (gallery lightbox open)`,
        width,
      );

      (report.viewports as Record<string, unknown>)[String(width)] = {
        url: page.url(),
        mounted,
        headingText,
        notFoundCount,
        galleryHeadingVisible,
        photoTiles: tileCount,
        page: {
          violationCount: pageResults.violations.length,
          nodeCount: pageResults.violations.reduce((acc, v) => acc + v.nodes.length, 0),
          incomplete: summarizeIncomplete(pageResults),
          passes: pageResults.passes.length,
          violations: pageSummaries,
        },
        lightbox: {
          dialogVisible,
          closeButtonCount,
          closeAccessibleName,
          violationCount: dialogResults.violations.length,
          nodeCount: dialogResults.violations.reduce((acc, v) => acc + v.nodes.length, 0),
          incomplete: summarizeIncomplete(dialogResults),
          violations: dialogSummaries,
        },
      };

      if (pageSummaries.length > 0) failures.push(formatViolations(pageSummaries));
      if (dialogSummaries.length > 0) failures.push(formatViolations(dialogSummaries));
    }

    await attachReport(testInfo, report, 'event-detail-report.json');
    writeAxeReport(`/events/${EVENT_ID}`, report);

    const diagnostics = failures.length > 0
      ? `${failures.join('\n')}\n\n  Note: ${incompleteTotal} axe node(s) were reported as \`incomplete\` (not evaluated) across ${VIEWPORTS.length} viewport(s); see axe-report-events-evt-a11y-past.json. "0 violations" ≠ "0 unresolved".`
      : '';
    expect(diagnostics, `\n${diagnostics}\n`).toBe('');
  });
});

/**
 * Proof the harness can fail.
 *
 * Injects a deliberately broken DOM node into a throwaway page (never into src/)
 * and asserts axe reports it. If axe cannot see a hand-planted, unambiguous
 * violation, the gate is not a gate — this test would fail and say so.
 */
test.describe('harness self-check', () => {
  test('axe reports an injected violation (harness can fail)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: VIEWPORT_HEIGHT });
    await page.setContent(`
      <!doctype html>
      <html lang="id">
        <head><title>self-check</title></head>
        <body>
          <main>
            <h1>Baseline</h1>
            <img id="injected-broken-image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
            <input id="injected-unlabelled-input" type="text">
          </main>
        </body>
      </html>
    `);

    const clean = await new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
    const cleanIds = clean.violations.map((v) => v.id);
    expect(cleanIds, 'baseline page unexpectedly clean of image-alt/label').toContain('image-alt');
    expect(cleanIds).toContain('label');

    // Now prove the SAME harness passes once the defects are removed — i.e. the
    // assertion is not vacuously true.
    await page.evaluate(() => {
      document.getElementById('injected-broken-image')?.setAttribute('alt', 'deskripsi');
      document.getElementById('injected-unlabelled-input')?.setAttribute('aria-label', 'Nama');
    });

    const fixed = await new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
    expect(
      fixed.violations.map((v) => v.id),
      'image-alt/label still reported after the injected defects were repaired',
    ).not.toContain('image-alt');
    expect(fixed.violations.map((v) => v.id)).not.toContain('label');
  });

  test('formatViolations renders route, viewport, rule, impact and selectors', () => {
    const rendered = formatViolations([
      {
        route: '/events',
        viewport: 320,
        id: 'color-contrast',
        impact: 'serious',
        help: 'Elements must meet minimum color contrast ratio thresholds',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/color-contrast',
        tags: ['wcag2aa'],
        nodeCount: 1,
        nodes: [
          {
            target: '.bg-\\[var\\(--brand-tosca\\)\\]',
            html: '<a class="…">',
            failureSummary: 'Element has insufficient color contrast of 3.85',
          },
        ],
      },
    ]);

    expect(rendered).toContain('/events');
    expect(rendered).toContain('320');
    expect(rendered).toContain('color-contrast');
    expect(rendered).toContain('serious');
    expect(rendered).toContain('.bg-\\[var\\(--brand-tosca\\)\\]');
    expect(rendered).toContain('insufficient color contrast');
  });

  test('detectRenderFailure distinguishes an error overlay from a healthy page', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: VIEWPORT_HEIGHT });

    await page.setContent('<!doctype html><html lang="id"><body><main><h1>Sehat</h1></main></body></html>');
    expect(await detectRenderFailure(page)).toBeNull();

    await page.setContent(
      '<!doctype html><html lang="id"><body><main><h1>Sehat</h1></main><vite-error-overlay>Failed to resolve import</vite-error-overlay></body></html>',
    );
    expect(await detectRenderFailure(page)).toContain('Vite error overlay');

    await page.setContent('<!doctype html><html lang="id"><body><h2>Terjadi Kesalahan</h2></body></html>');
    expect(await detectRenderFailure(page)).toContain('ErrorBoundary');
  });
});
