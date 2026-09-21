import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated Playwright config for the accessibility gate (`npm run test:a11y`).
 *
 * Why this exists — the `reuseExistingServer` coupling bug
 * -------------------------------------------------------
 * The root `playwright.config.ts` serves every spec from port 5173 with
 * `reuseExistingServer: !process.env.CI`. That is right for the interactive
 * specs, but it makes the a11y gate unrunnable in exactly the environment it
 * was built for: under `CI=true`, if anything already holds 5173 (a developer's
 * `npm run dev`, a leftover watcher, a previous CI step), Playwright refuses to
 * start and the gate dies with:
 *
 *     Error: http://localhost:5173 is already used, make sure that nothing is
 *     running on the port/url or set reuseExistingServer:true in config.webServer.
 *
 * The gate would then silently not run in CI — the same class of
 * unreproducible-evidence failure this harness was written to eliminate.
 *
 * The fix: this config owns a distinct port (5174) and never reuses a server.
 *
 * Trade-off, stated explicitly
 * ----------------------------
 * `reuseExistingServer: false` is deliberate and unconditional, NOT
 * `!process.env.CI`. Reusing a running server would let a stale process from an
 * older build serve the tests, so the gate would report results for code that
 * is not the code under test — precisely the error being fixed. The cost is
 * that if a stray process already holds 5174, this config fails fast rather
 * than proceeding. That failure is correct and its message is actionable
 * (Playwright names the port and tells you to free it); a green run on stale
 * code would be far worse than a red run on an occupied port.
 */

const A11Y_PORT = 5174;
const A11Y_URL = `http://localhost:${A11Y_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: /a11y\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A flaky a11y gate is worse than no gate; never auto-retry into a green.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: A11Y_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /**
       * Dark mode. `colorScheme: 'dark'` would be a NO-OP here: the app's dark
       * variant is class-gated — `@variant dark (&:where(.dark, .dark *))` in
       * `src/index.css:13` — and `src/App.tsx:52-56` sets `.dark` from
       * `localStorage['theme']`, with no `matchMedia` fallback in the live path.
       * So flipping the emulated media query leaves `<html class="">` and the
       * computed colors byte-identical to light mode.
       *
       * Seeding `localStorage` before the first navigation is the mechanism that
       * actually applies `.dark`. Verified during setup: with this project the
       * root element carries `class="dark"` and the body color flips.
       */
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        storageState: {
          cookies: [],
          origins: [
            {
              origin: A11Y_URL,
              localStorage: [{ name: 'theme', value: 'dark' }],
            },
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${A11Y_PORT} --strictPort`,
    url: A11Y_URL,
    // Never reuse: see the header comment. A reused server may serve stale code.
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      ...process.env,
      // Same contract as the root config: REST via relative /api/v1, all
      // intercepted by e2e/helpers.ts — no real backend needed.
      VITE_API_URL: process.env.VITE_API_URL ?? '',
      // Must be forced off: VITE_DEV_AUTO_LOGIN=true in .env.local would
      // auto-login as Dev Admin and overwrite every mock role, so the public
      // routes would render the admin surface instead of the anonymous one.
      VITE_DEV_AUTO_LOGIN: 'false',
    },
  },
});
