import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import {
  AUDIT_ROUTES,
  AUDIT_ROLES,
  AUDIT_VIEWPORTS,
  AUDIT_VIEWPORT_HEIGHT,
  AUDIT_THEMES,
  AUDIT_REPORT_DIR,
  auditRouteSlug,
  installDashboardMocks,
  seedTheme,
  applyTheme,
  type AuditRole,
  type AuditTheme,
} from './audit-dashboard.config';
import {
  measureTouchTargets,
  measureTextFloor,
  measureClippedControls,
  measureEmptyStates,
  measureShell,
  settleNavigation,
} from './audit-dashboard.measure';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Audit UI/UX dashboard admin — harness ter-commit (ADR-006).
 *
 * Bukan gate CI: ia menghasilkan BUKTI terukur (JSON per rute×role×tema) +
 * temuan axe, yang dibaca untuk menulis laporan `docs/AUDIT-dashboard-uiux-*.md`.
 * Assert-nya sengaja longgar (hanya overflow horizontal yang fail keras) supaya
 * run pertama mengumpulkan seluruh temuan, bukan berhenti di kegagalan pertama.
 *
 * Jalankan: `npm run test:audit`
 */

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] as const;

function ensureReportDir(): string {
  const dir = join(process.cwd(), AUDIT_REPORT_DIR);
  mkdirSync(dir, { recursive: true });
  return dir;
}

interface RouteReport {
  route: string;
  role: AuditRole;
  theme: AuditTheme;
  viewport: number;
  axe: Array<{ id: string; impact: string | null; help: string; nodes: string[] }>;
  axeIncomplete: Array<{ id: string; nodes: string[] }>;
  overflow: number;
  h1Count: number;
  h1Texts: string[];
  dialogs: number;
  landmarks: { main: number; header: number; nav: number; footer: number };
  emptyStates: Array<{ selector: string; text: string }>;
  touchTargets: Array<{ selector: string; width: number; height: number; text: string }>;
  textFloor: Array<{ selector: string; fontSize: number; text: string }>;
  clipped: Array<{ selector: string; text: string; kind: 'clipped' | 'wrapped' }>;
  consoleErrors: string[];
}

test.describe.configure({ mode: 'parallel' });

// ─── Bagian 1: GATE A11Y ADMIN (role × rute, tema terang, desktop) ──
// Ini gate a11y EKSPLISIT untuk rute admin — terpisah dari `npm run test:a11y`
// yang hanya menyapu rute publik (`playwright.a11y.config.ts`). Dijalankan
// lewat `npm run test:audit:a11y` (grep "axe gate"); laporan tetap ditulis
// lebih dulu walau assertion gagal, jadi kegagalan pun menghasilkan bukti.
for (const role of AUDIT_ROLES) {
  for (const route of AUDIT_ROUTES) {
    test(`[${role}] ${route} — axe gate + struktur`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      const consoleErrors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
      });
      page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));

      await installDashboardMocks(page, role, 'rich');
      await seedTheme(page, 'light');
      await page.setViewportSize({ width: 1440, height: AUDIT_VIEWPORT_HEIGHT });
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      // Redirect client-side (eo_tenant di /dashboard/* → Evaluasi Tenant) bisa
      // masih berjalan; stabilkan URL dulu supaya evaluasi DOM tidak kena
      // "execution context destroyed".
      await settleNavigation(page);
      await page.waitForTimeout(400);

      const axe = await new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
      const shell = await measureShell(page);

      const report: RouteReport = {
        route,
        role,
        theme: 'light',
        viewport: 1440,
        axe: axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact ?? null,
          help: v.help,
          nodes: v.nodes.slice(0, 25).map((n) => n.target.join(' ')),
        })),
        axeIncomplete: axe.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 10).map((n) => n.target.join(' ')) })),
        overflow: shell.overflow,
        h1Count: shell.h1Count,
        h1Texts: shell.h1Texts,
        dialogs: shell.dialogs,
        landmarks: shell.landmarks,
        emptyStates: await measureEmptyStates(page),
        touchTargets: await measureTouchTargets(page),
        textFloor: await measureTextFloor(page),
        clipped: (await measureClippedControls(page)).map((c) => ({ selector: c.selector, text: c.text, kind: c.kind })),
        consoleErrors: [...new Set(consoleErrors)],
      };

      const dir = ensureReportDir();
      writeFileSync(join(dir, `${auditRouteSlug(route)}--${role}.json`), JSON.stringify(report, null, 2));
      await testInfo.attach('report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });

      // Gate a11y admin: nol pelanggaran axe pada rute admin. Pesan kegagalan
      // menyebut rule + node supaya bisa langsung ditindaklanjuti.
      const axeSummary = report.axe
        .map((v) => `  ✖ [${v.impact ?? 'unknown'}] ${v.id} — ${v.help}\n     ${v.nodes.slice(0, 8).join('\n     ')}`)
        .join('\n');
      expect(
        axe.violations.length,
        `axe violations @ ${route} (${role}):\n${axeSummary}`,
      ).toBe(0);

      // Overflow horizontal tidak boleh ada di desktop.
      expect(shell.overflow, `horizontal overflow @1440 (${role})`).toBe(0);
    });
  }
}

// ─── Bagian 2: matriks rute × tema × viewport (superadmin) ─────────
// Bukti visual + overflow + touch + tipografi untuk desktop/HP × terang/gelap.
for (const theme of AUDIT_THEMES) {
  for (const viewport of AUDIT_VIEWPORTS) {
    for (const route of AUDIT_ROUTES) {
      test(`[superadmin][${theme}][${viewport}] ${route} — axe gate + ukur + screenshot`, async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        await installDashboardMocks(page, 'superadmin', 'rich');
        await seedTheme(page, theme);
        await page.setViewportSize({ width: viewport, height: AUDIT_VIEWPORT_HEIGHT });
        await page.goto(route);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await applyTheme(page, theme);
        await settleNavigation(page);
        await page.waitForTimeout(400);

        const axe = await new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
        const shell = await measureShell(page);
        const touch = await measureTouchTargets(page);
        const textFloor = await measureTextFloor(page);
        const clipped = await measureClippedControls(page);

        const dir = ensureReportDir();
        const slug = `${auditRouteSlug(route)}--superadmin--${theme}--${viewport}`;
        await page.screenshot({ path: join(dir, `${slug}.png`), fullPage: true });
        const report = {
          route,
          role: 'superadmin' as const,
          theme,
          viewport,
          axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact ?? null, help: v.help, nodes: v.nodes.slice(0, 25).map((n) => n.target.join(' ')) })),
          overflow: shell.overflow,
          h1Count: shell.h1Count,
          dialogs: shell.dialogs,
          landmarks: shell.landmarks,
          touchTargets: touch,
          textFloor,
          clipped: clipped.map((c) => ({ selector: c.selector, text: c.text, kind: c.kind })),
        };
        writeFileSync(join(dir, `${slug}.json`), JSON.stringify(report, null, 2));
        await testInfo.attach('report.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });

        const axeSummary = report.axe
          .map((v) => `  ✖ [${v.impact ?? 'unknown'}] ${v.id} — ${v.help}\n     ${v.nodes.slice(0, 8).join('\n     ')}`)
          .join('\n');
        expect(axe.violations.length, `axe violations @ ${route} (${theme}/${viewport}):\n${axeSummary}`).toBe(0);
        expect(shell.overflow, `horizontal overflow @${viewport} ${theme}`).toBe(0);
      });
    }
  }
}

// ─── Bagian 3: state khusus (empty / error) di 6 surface kritis ────
const STATE_ROUTES = [
  '/dashboard',
  '/dashboard/events',
  '/dashboard/drafts',
  '/dashboard/registrations',
  '/dashboard/analytics',
  '/dashboard/activity-log',
] as const;

for (const mode of ['empty', 'error'] as const) {
  for (const route of STATE_ROUTES) {
    test(`[superadmin][${mode}] ${route} — state khusus`, async ({ page }) => {
      test.setTimeout(120_000);
      const consoleErrors: string[] = [];
      page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));

      await installDashboardMocks(page, 'superadmin', mode);
      await seedTheme(page, 'light');
      await page.setViewportSize({ width: 1440, height: AUDIT_VIEWPORT_HEIGHT });
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(400);

      const shell = await measureShell(page);
      const emptyStates = await measureEmptyStates(page);
      const report = { route, mode, overflow: shell.overflow, h1Count: shell.h1Count, emptyStates, consoleErrors: [...new Set(consoleErrors)] };

      const dir = ensureReportDir();
      writeFileSync(join(dir, `${auditRouteSlug(route)}--superadmin--${mode}.json`), JSON.stringify(report, null, 2));
      await page.screenshot({ path: join(dir, `${auditRouteSlug(route)}--superadmin--${mode}.png`), fullPage: true });

      expect(shell.overflow, `horizontal overflow @1440 (${mode})`).toBe(0);
    });
  }
}
