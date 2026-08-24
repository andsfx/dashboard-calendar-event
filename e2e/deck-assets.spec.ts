import { test, expect, chromium } from '@playwright/test';
import { mockAuth } from './helpers';

const ASSET_DIR = './presentasi/assets';
const VIEWPORT = { width: 1440, height: 900 };

test('regenerate deck screenshots', async ({}) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  // Use production read-only Supabase data. Mock auth only; no event rows invented.
  await mockAuth(page, 'superadmin');
  await page.route(/.*api\/auth.*action=me.*/, async route => {
    await route.fulfill({ json: {
      success: true,
      user: { id: 'screenshot-superadmin', email: 'superadmin@metmal.test', display_name: 'Admin Metal', role: 'superadmin' },
      legacy: false,
    } });
  });
  await page.route('**/api/supabase-admin', async route => {
    const body = route.request().postDataJSON() as { action?: string } | null;
    if (body?.action === 'readRegistrations') {
      return route.fulfill({ json: { success: true, data: [] } });
    }
    return route.fulfill({ json: { success: true, data: [] } });
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
  await expect(page.getByText('Jadwal Event')).toBeVisible({ timeout: 15000 });

  await page.getByRole('tab', { name: 'Tampilan Tabel' }).click();
  await page.waitForTimeout(400);
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await page.screenshot({ path: `${ASSET_DIR}/16-dashboard-table.png` });

  await page.getByRole('tab', { name: 'Tampilan Kalender' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${ASSET_DIR}/17-dashboard-calendar.png` });

  await page.getByRole('tab', { name: 'Tampilan Kanban' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${ASSET_DIR}/18-dashboard-kanban.png` });

  await page.getByRole('tab', { name: 'Tampilan Timeline' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${ASSET_DIR}/19-dashboard-timeline.png` });

  await browser.close();
});
