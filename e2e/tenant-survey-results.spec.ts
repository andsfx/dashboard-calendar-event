import { test, expect } from '@playwright/test';
import { setupSurveyApiMocks, setupSupabaseMocks, mockAuth, MOCK_SURVEY_V3 } from './helpers';

test.describe('Tenant Survey Results — public + TR', () => {
  test('public guest can open results without login', async ({ page }) => {
    await setupSurveyApiMocks(page);
    // Events for share list (guest has no auth mock)
    await page.route('**/rest/v1/events*', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'evt_test123',
            date_str: '2026-07-15',
            tanggal: '15 Jul 2026',
            day: 'Selasa',
            jam: '10:00 - 22:00',
            acara: 'Pameran Otomotif Bekasi 2026',
            lokasi: 'Atrium Utama',
            eo: 'PT Otomotif Indonesia',
            pic: '',
            phone: '',
            keterangan: '',
            month: 'Juli',
            status: 'past',
            category: 'Exhibition',
            categories: ['Exhibition'],
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
          },
        ],
      });
    });

    await page.goto('/tenant-survey-results');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Hasil Evaluasi Tenant' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Filter' })).toBeVisible();
    // Tabs reorganize content — open Bagikan then Checklist
    await page.getByRole('tab', { name: /Bagikan form survey/i }).click();
    await expect(page.getByRole('heading', { name: /Bagikan form survey/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Salin link/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /^QR$/i }).first()).toBeVisible();
    await page.getByRole('tab', { name: /Checklist tenant/i }).click();
    await expect(page.getByRole('heading', { name: /Checklist tenant/i })).toBeVisible();
    await page.getByRole('tab', { name: /Detail/i }).click();
    await expect(page.getByRole('cell', { name: MOCK_SURVEY_V3.nama_gerai! })).toBeVisible({ timeout: 15000 });
    // export off for guests
    await expect(page.getByRole('button', { name: /Export PDF/i })).toHaveCount(0);
  });

  test('tenant_relation still lands on results when opening dashboard', async ({ page }) => {
    await mockAuth(page, 'tenant_relation');
    await setupSupabaseMocks(page, 'tenant_relation');
    await setupSurveyApiMocks(page);

    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/tenant-survey-results$/);
    await expect(page.getByRole('heading', { name: 'Hasil Evaluasi Tenant' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Export PDF/i })).toBeVisible();
  });

  test('admin can export PDF on public page', async ({ page }) => {
    await mockAuth(page, 'admin');
    await setupSupabaseMocks(page, 'admin');
    await setupSurveyApiMocks(page);

    await page.goto('/tenant-survey-results');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Hasil Evaluasi Tenant' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Export PDF/i })).toBeVisible();
  });

  test('legacy /dashboard/tenant-survey-results redirects to standalone', async ({ page }) => {
    await setupSurveyApiMocks(page);

    await page.goto('/dashboard/tenant-survey-results');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tenant-survey-results$/);
  });
});
