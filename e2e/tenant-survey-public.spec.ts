import { test, expect } from '@playwright/test';
import { setupSurveyApiMocks, MOCK_EVENT } from './helpers';

test.describe('Tenant Survey — Public Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupSurveyApiMocks(page);
  });

  test('load form — render event banner + 3 sections', async ({ page }) => {
    await page.goto(`/tenant-survey/${MOCK_EVENT.id}`);

    await expect(page.getByRole('heading', { name: MOCK_EVENT.acara })).toBeVisible();
    await expect(page.getByText('Self-Assessment Tenant')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Bagian 1: Informasi Gerai' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Evaluasi Traffic.*Sales/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bagian 3: Umpan Balik' })).toBeVisible();

    await expect(page.getByRole('button', { name: /Kirim Survey/ })).toBeVisible();
  });

  test('submit button disabled when required fields empty', async ({ page }) => {
    await page.goto(`/tenant-survey/${MOCK_EVENT.id}`);
    await expect(page.getByRole('heading', { name: MOCK_EVENT.acara })).toBeVisible();

    // Submit button should be disabled and styled as grey
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Progress shows 0/5
    await expect(page.getByText('0% selesai')).toBeVisible();
    await expect(page.getByText('0 dari 5 bagian wajib terisi')).toBeVisible();
  });

  test('fill + submit — success screen appears', async ({ page }) => {
    await page.goto(`/tenant-survey/${MOCK_EVENT.id}`);
    await expect(page.getByRole('heading', { name: MOCK_EVENT.acara })).toBeVisible();

    // Section 1: Nama gerai — type in search
    await page.getByPlaceholder('Ketik nama gerai Anda...').fill('Kopi Metmal');
    await page.getByRole('option', { name: /Kopi Metmal/ }).click();

    // Lokasi — auto-filled from tenant, verify or select manually
    const lokasiSelect = page.locator('#tenant-survey-lokasi');
    if (!(await lokasiSelect.inputValue())) {
      await lokasiSelect.selectOption('Lantai Dasar');
    }

    // Kategori — auto-filled, verify or click
    const kategoriRadio = page.locator('input[type="radio"][value="Food & Beverage (F&B)"]');
    if (!(await kategoriRadio.isChecked())) {
      await kategoriRadio.check();
    }

    // Section 2: Traffic — click label containing 'Signifikan'
    await page.locator('label', { hasText: 'Signifikan' }).click();

    // Section 2: Sales — click label containing '10% - 30%'
    await page.locator('label', { hasText: '10% - 30%' }).click();

    // Submit
    await page.getByRole('button', { name: /Kirim Survey/ }).click();

    // Success screen
    await expect(page.getByRole('heading', { name: 'Survey Terkirim!' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Terima kasih/)).toBeVisible();
  });

  test('duplicate detection — already submitted shows duplicate screen', async ({ page }) => {
    await page.unroute('**/api/tenant-survey**');
    await setupSurveyApiMocks(page, { alreadySubmitted: true });

    await page.goto(`/tenant-survey/${MOCK_EVENT.id}`);

    await expect(page.getByRole('heading', { name: 'Anda Sudah Mengisi Survey' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/sudah pernah mengirimkan/)).toBeVisible();
  });

  test('progress bar — updates as fields are filled', async ({ page }) => {
    await page.goto(`/tenant-survey/${MOCK_EVENT.id}`);
    await expect(page.getByRole('heading', { name: MOCK_EVENT.acara })).toBeVisible();

    // Initial: 0%
    await expect(page.getByText('0% selesai')).toBeVisible();

    // Fill nama_gerai via search
    await page.getByPlaceholder('Ketik nama gerai Anda...').fill('Kopi Metmal');
    await page.getByRole('option', { name: /Kopi Metmal/ }).click();

    // After nama_gerai + auto-filled lokasi + kategori = 3/5
    await expect(page.getByText(/3 dari 5/)).toBeVisible({ timeout: 3000 });

    // Fill traffic
    await page.locator('label', { hasText: 'Signifikan' }).click();
    await expect(page.getByText(/4 dari 5/)).toBeVisible();

    // Fill sales
    await page.locator('label', { hasText: '10% - 30%' }).click();
    await expect(page.getByText('100% selesai')).toBeVisible();
  });

  test('TenantSearchSelect — search + auto-fill lokasi and kategori', async ({ page }) => {
    await page.goto(`/tenant-survey/${MOCK_EVENT.id}`);
    await expect(page.getByRole('heading', { name: MOCK_EVENT.acara })).toBeVisible();

    // Type query
    const searchInput = page.getByPlaceholder('Ketik nama gerai Anda...');
    await searchInput.fill('Kopi');
    await searchInput.focus();

    // Dropdown appears with matching tenant
    await expect(page.getByRole('option', { name: /Kopi Metmal/ })).toBeVisible({ timeout: 3000 });

    // Select tenant
    await page.getByRole('option', { name: /Kopi Metmal/ }).click();

    // Auto-fill: lokasi should be 'Lantai Dasar' (floor LTB → Lantai Dasar)
    await expect(page.locator('#tenant-survey-lokasi')).toHaveValue('Lantai Dasar');

    // Auto-fill: kategori should be checked
    await expect(page.locator('input[type="radio"][value="Food & Beverage (F&B)"]')).toBeChecked();

    // PIC should be auto-filled
    await expect(page.locator('#tenant-survey-pic-name')).toHaveValue('Budi Santoso');
    await expect(page.locator('#tenant-survey-pic-phone')).toHaveValue('081234567890');
  });
});
