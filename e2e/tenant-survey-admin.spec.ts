import { test, expect } from '@playwright/test';
import { setupSurveyApiMocks, setupApiMocks, mockAdminAuth, mockAuth, MOCK_EVENT, MOCK_SURVEY_V3 } from './helpers';

test.describe('Tenant Survey — Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAuth(page);
    await setupApiMocks(page);
  });

  test('viewer unauthorized route redirects to allowed dashboard page', async ({ page }) => {
    await mockAuth(page, 'viewer');
    await setupApiMocks(page, 'viewer');
    await page.goto('/dashboard/drafts');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Pusat Komando' })).toBeVisible();
  });

  test('eo tenant unauthorized route redirects to tenant surveys', async ({ page }) => {
    await mockAuth(page, 'eo_tenant');
    await setupApiMocks(page, 'eo_tenant');
    await setupSurveyApiMocks(page);
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/tenant-surveys$/);
    await expect(page.getByRole('heading', { name: 'Evaluasi Tenant' })).toBeVisible();
  });

  test('list view — render survey list with tabs', async ({ page }) => {
    await setupSurveyApiMocks(page);
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: 'Penilaian mandiri', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: 'Analitik', exact: true })).toBeVisible();
    // Nama tenant dirender ganda (kartu tersembunyi + tabel) — ambil sel tabel yang terlihat.
    await expect(page.getByRole('table').getByText(MOCK_SURVEY_V3.nama_gerai!, { exact: true })).toBeVisible();
    await expect(page.getByRole('table').getByText('Publik', { exact: true })).toBeVisible();
  });

  test('event picker — "Buat Penilaian mandiri" shows event dropdown', async ({ page }) => {
    await page.route('**/api/tenant-survey**', async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get('action') || '';
      if (action === 'list') return route.fulfill({ json: { success: true, data: [] } });
      if (action === 'analytics') return route.fulfill({
        json: { success: true, data: [] },
      });
      return route.continue();
    });

    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: 'Penilaian mandiri', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Buat Penilaian mandiri/ }).click();
    await expect(page.getByRole('button', { name: new RegExp(MOCK_EVENT.acara) }).last()).toBeVisible({ timeout: 5000 });
  });

  test('form v3 — render v3 form (not v2 rating stars)', async ({ page }) => {
    await page.route('**/api/tenant-survey**', async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get('action') || '';
      if (action === 'list') return route.fulfill({ json: { success: true, data: [] } });
      if (action === 'analytics') return route.fulfill({
        json: { success: true, data: [] },
      });
      return route.continue();
    });

    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: 'Penilaian mandiri', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Buat Penilaian mandiri/ }).click();

    const eventBtn = page.getByRole('button', { name: new RegExp(MOCK_EVENT.acara) }).last();
    await expect(eventBtn).toBeVisible({ timeout: 5000 });
    await eventBtn.click();

    await expect(page.getByRole('heading', { name: 'Informasi tenant' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Evaluasi kunjungan/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Umpan balik/ })).toBeVisible();
    // v3 memilih tenant dari combobox (bukan input ketik bebas seperti v2)
    await expect(page.getByRole('combobox', { name: /Nama Tenant/ })).toBeVisible();
    await expect(page.getByText('Kualitas Venue')).not.toBeVisible();
    await expect(page.getByText('Kualitas Manajemen')).not.toBeVisible();
  });

  test('analytics tab — render trend chart', async ({ page }) => {
    await setupSurveyApiMocks(page);
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: 'Penilaian mandiri', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: 'Analitik', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tren Bulanan' })).toBeVisible({ timeout: 10000 });
  });
});
