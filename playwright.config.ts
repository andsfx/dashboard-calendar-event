import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      ...process.env,
      // Opsi B (ADR 005): backend = REST /api/v1 via VITE_API_URL.
      // Kosong = fetch relatif ke origin dev server (localhost:5173/api/v1/...),
      // semua di-intercept page.route() di e2e/helpers.ts — tanpa backend nyata.
      VITE_API_URL: process.env.VITE_API_URL ?? '',
      // Jangan bawa VITE_DEV_AUTO_LOGIN dari .env.local — e2e harus mengontrol
      // role sendiri via mockAuth; auto-login Dev Admin menimpa semua mock.
      VITE_DEV_AUTO_LOGIN: 'false',
    },
  },
});
