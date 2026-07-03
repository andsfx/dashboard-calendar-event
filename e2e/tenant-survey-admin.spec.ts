import { test, expect } from '@playwright/test';
import { setupSurveyApiMocks, setupSupabaseMocks, mockAdminAuth, MOCK_EVENT, MOCK_SURVEY_V3 } from './helpers';

test.describe('Tenant Survey — Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAuth(page);
    await setupSupabaseMocks(page);
  });

  test('list view — render survey list with tabs', async ({ page }) => {
    await setupSurveyApiMocks(page);
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Self-Assessment', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Analytics', exact: true })).toBeVisible();

    // V3 survey data visible
    await expect(page.getByText(MOCK_SURVEY_V3.nama_gerai!)).toBeVisible();
    await expect(page.getByText('Publik')).toBeVisible();
    await expect(page.getByText(MOCK_SURVEY_V3.kategori!)).toBeVisible();
  });

  test('event picker — "Buat Self-Assessment" shows event dropdown', async ({ page }) => {
    await page.route('**/api/tenant-survey**', async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get('action') || '';
      if (action === 'list') return route.fulfill({ json: { success: true, data: [] } });
      if (action === 'analytics') return route.fulfill({ json: { success: true, data: [] } });
      return route.continue();
    });

    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Self-Assessment', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Buat Self-Assessment/ }).click();

    await expect(page.getByRole('button', { name: new RegExp(MOCK_EVENT.acara) }).last()).toBeVisible({ timeout: 5000 });
  });

  // ponytail: Form v3 + Analytics tab tests need full Supabase REST mock
  // (response headers, Content-Range, events transformation). Enable with
  // test DB or vercel dev. Tracked in audit follow-up.
  test.skip('form v3 — render v3 form (not v2 rating stars)', async ({ page }) => {
    await page.route('**/api/tenant-survey**', async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get('action') || '';
      if (action === 'list') return route.fulfill({ json: { success: true, data: [] } });
      if (action === 'analytics') return route.fulfill({ json: { success: true, data: [] } });
      return route.continue();
    });

    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Self-Assessment', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Buat Self-Assessment/ }).click();

    const eventBtn = page.getByRole('button', { name: new RegExp(MOCK_EVENT.acara) }).last();
    await expect(eventBtn).toBeVisible({ timeout: 5000 });
    await eventBtn.click();

    await expect(page.getByRole('heading', { name: 'Informasi Gerai' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Ketik nama gerai...')).toBeVisible();
    await expect(page.getByText('Kualitas Venue')).not.toBeVisible();
  });

  test.skip('analytics tab — render trend chart', async ({ page }) => {
    await setupSurveyApiMocks(page);
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Self-Assessment', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Tren Bulanan' })).toBeVisible({ timeout: 10000 });
  });
});
