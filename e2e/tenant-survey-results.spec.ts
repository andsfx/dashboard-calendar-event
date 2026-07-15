import { test, expect } from '@playwright/test';
import { setupSurveyApiMocks, setupSupabaseMocks, mockAuth, MOCK_SURVEY_V3 } from './helpers';

test.describe('Tenant Survey Results — TR + admin', () => {
  test('tenant_relation lands on standalone results page and cannot open ops', async ({ page }) => {
    await mockAuth(page, 'tenant_relation');
    await setupSupabaseMocks(page, 'tenant_relation');
    await setupSurveyApiMocks(page);

    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/tenant-survey-results$/);
    await expect(page.getByRole('heading', { name: 'Hasil Evaluasi Tenant' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Export PDF/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: MOCK_SURVEY_V3.nama_gerai! })).toBeVisible();

    // ops page not allowed — bounce back to standalone results
    await page.goto('/dashboard/tenant-surveys');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tenant-survey-results$/);
  });

  test('admin can open standalone results page', async ({ page }) => {
    await mockAuth(page, 'admin');
    await setupSupabaseMocks(page, 'admin');
    await setupSurveyApiMocks(page);

    await page.goto('/tenant-survey-results');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Hasil Evaluasi Tenant' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Filter')).toBeVisible();
  });

  test('legacy /dashboard/tenant-survey-results redirects to standalone', async ({ page }) => {
    await mockAuth(page, 'admin');
    await setupSupabaseMocks(page, 'admin');
    await setupSurveyApiMocks(page);

    await page.goto('/dashboard/tenant-survey-results');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tenant-survey-results$/);
  });
});
