import { test, expect, chromium } from '@playwright/test';
import { mockAuth } from './helpers';

const ASSET_DIR = './presentasi/assets';
const VIEWPORT = { width: 1440, height: 900 };

// Opsi B (ADR 005): data produksi = REST VPS. Jalankan dengan env:
//   VITE_API_URL=https://metmal.andotherstori.my.id npx playwright test deck-assets
// (utilitas regenerasi screenshot, bukan CI gate — tetap manual-run.)
const API_BASE = process.env.VITE_API_URL || 'https://metmal.andotherstori.my.id';

// Skip bila dijalankan tanpa VITE_API_URL (default suite run) — utilitas ini
// butuh data produksi REST VPS; tanpa env, fetch localhost gagal CORS/route.
const maybe = process.env.VITE_API_URL ? test : test.skip;

maybe('regenerate deck screenshots', async ({}) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  // Data produksi read-only dari REST VPS (API_BASE). Mock auth only; no event rows invented.
  await mockAuth(page, 'superadmin');
  await page.route('**/api/v1/admin/readRegistrations', async route => {
    await route.fulfill({ json: { success: true, data: [] } });
  });

  // --- Registration (empty state, no error toast) ---
  await page.goto('/dashboard/registrations');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Belum ada pendaftaran')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Gagal memuat')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pendaftaran Community' })).toBeVisible();
  await page.screenshot({ path: `${ASSET_DIR}/10-dashboard-registrations.png` });

  // --- Four view modes ---
  await page.goto('/dashboard/events');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Jadwal Event' })).toBeVisible({ timeout: 15000 });

  await page.getByRole('tab', { name: 'Tabel' }).click();
  await page.waitForTimeout(400);
  await expect(page.getByRole('tabpanel')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${ASSET_DIR}/16-dashboard-table.png` });
  await page.getByRole('tab', { name: 'Kalender' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${ASSET_DIR}/17-dashboard-calendar.png` });

  await page.getByRole('tab', { name: 'Kanban' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${ASSET_DIR}/18-dashboard-kanban.png` });

  await page.getByRole('tab', { name: 'Timeline' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${ASSET_DIR}/19-dashboard-timeline.png` });

  await browser.close();
});
