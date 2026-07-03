import { test, expect } from '@playwright/test';
import { setupSurveyApiMocks, mockAdminAuth, MOCK_EVENT, MOCK_SURVEY_V3 } from './helpers';

// ponytail: Admin E2E skipped — requires Supabase projectRef for localStorage auth key.
// Enable once projectRef is available from .env or test config.
test.describe.skip('Tenant Survey — Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminAuth(page);
    await setupSurveyApiMocks(page);
  });

  test('list view — render survey list with tabs', async ({ page }) => {
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /Self-Assessment/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Analytics/ })).toBeVisible();
    await expect(page.getByText(MOCK_SURVEY_V3.nama_gerai!)).toBeVisible();
    await expect(page.getByText('Publik')).toBeVisible();
  });

  test('event picker — "Buat Self-Assessment" shows event dropdown', async ({ page }) => {
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Buat Self-Assessment/ }).click();
    await expect(page.getByRole('button', { name: new RegExp(MOCK_EVENT.acara) })).toBeVisible({ timeout: 3000 });
  });

  test('form v3 — render v3 form (not v2 rating stars)', async ({ page }) => {
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Buat Self-Assessment/ }).click();
    await page.getByRole('button', { name: new RegExp(MOCK_EVENT.acara) }).click();

    await expect(page.getByRole('heading', { name: 'Informasi Gerai' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Evaluasi Traffic/ })).toBeVisible();

    // V3 fields present
    await expect(page.getByPlaceholder('Ketik nama gerai...')).toBeVisible();

    // V2 rating stars absent
    await expect(page.getByText('Kualitas Venue')).not.toBeVisible();
  });

  test('analytics tab — render stat cards + trend chart', async ({ page }) => {
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Analytics/ }).click();

    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.getByText(/Feedback Publik|Self-Assessment/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Tren Bulanan' })).toBeVisible();
  });
});
