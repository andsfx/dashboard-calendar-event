import { defineConfig, devices } from '@playwright/test';

/**
 * Konfigurasi Playwright untuk audit UI/UX dashboard admin.
 *
 * Sama seperti `playwright.a11y.config.ts`, config ini memiliki port sendiri
 * dan TIDAK memakai ulang server yang sedang jalan: kalau sebuah proses basi
 * memegang port, hasil audit bisa berasal dari build lama — bukti yang salah.
 * Lebih baik gagal cepat dengan pesan port yang bisa ditindaklanjuti.
 *
 * Jalankan: `npm run test:audit`.
 */

const AUDIT_PORT = 5175;
const AUDIT_URL = `http://localhost:${AUDIT_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: /audit-dashboard\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Audit flaky = audit yang menipu; jangan auto-retry jadi hijau.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: AUDIT_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${AUDIT_PORT} --strictPort`,
    url: AUDIT_URL,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      ...process.env,
      VITE_API_URL: process.env.VITE_API_URL ?? '',
      // Wajib off: VITE_DEV_AUTO_LOGIN=true akan menimpa role mock.
      VITE_DEV_AUTO_LOGIN: 'false',
    },
  },
});
