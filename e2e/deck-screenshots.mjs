// Standalone Playwright script — regenerate deck screenshots for AND-15.
// Uses REAL Supabase read-only data (anon key from .env.local) for events,
// mocks auth + admin proxy (readRegistrations -> empty) so no error toast.
// Run: node e2e/deck-screenshots.mjs  (dev server must be running on :5173)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ASSET_DIR = path.resolve('presentasi/assets');
const BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1440, height: 900 };

fs.mkdirSync(ASSET_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });

const failed = [];
page.on('pageerror', (err) => failed.push(`pageerror: ${err.message}`));

// --- Mock auth: /api/auth?action=me -> superadmin (dashboard access) ---
await page.route('**/api/auth*', async (route) => {
  const url = new URL(route.request().url());
  if (url.searchParams.get('action') === 'me') {
    return route.fulfill({
      json: {
        success: true,
        user: { id: 'screenshot-superadmin', email: 'superadmin@metmal.test', display_name: 'Admin Metmal', role: 'superadmin' },
        legacy: false,
      },
    });
  }
  return route.fulfill({ json: { success: true } });
});

// --- Mock admin proxy: readRegistrations -> empty (no error toast, honest empty state) ---
await page.route('**/api/supabase-admin', async (route) => {
  const body = route.request().postDataJSON?.() ?? null;
  const action = body?.action ?? '';
  if (action === 'readRegistrations') {
    return route.fulfill({ json: { success: true, data: [] } });
  }
  // Other admin actions (should not be triggered during screenshots) — empty success
  return route.fulfill({ json: { success: true, data: [] } });
});

// ═══ 1. Pendaftaran Community — clean empty state ═══
await page.goto(`${BASE}/dashboard/registrations`, { waitUntil: 'domcontentloaded' });
await page.getByText('Belum ada pendaftaran').waitFor({ timeout: 20000 });
await page.waitForTimeout(1200); // let any stray toast appear so we can assert absence
const toastCount = await page.getByText('Gagal memuat').count();
console.log(`registrations: toast 'Gagal memuat' count = ${toastCount}`);
if (toastCount > 0) throw new Error('Registration page still shows error toast — aborting');
const heading = await page.getByRole('heading', { name: 'Pendaftaran Community' }).isVisible();
console.log(`registrations: heading visible = ${heading}`);
await page.screenshot({ path: path.join(ASSET_DIR, '10-dashboard-registrations.png') });
console.log('saved 10-dashboard-registrations.png');

// ═══ 2. Four view modes (real event data) ═══
await page.goto(`${BASE}/dashboard/events`, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: 'Jadwal Event' }).waitFor({ timeout: 20000 });
// Wait until real data is loaded (footer shows "Menampilkan X dari Y acara")
await page.getByText(/Menampilkan \d+ dari \d+ acara/).waitFor({ timeout: 20000 });
await page.waitForTimeout(800);

// Show ALL events so every mode is populated (kanban columns, timeline, calendar)
await page.getByRole('tab', { name: 'Semua', exact: true }).click();
await page.getByText(/Menampilkan \d+ dari \d+ acara/).waitFor({ timeout: 10000 });
await page.waitForTimeout(900);

const info = await page.getByText(/Menampilkan \d+ dari \d+ acara/).textContent();
console.log(`events footer: ${info}`);

async function snapTab(tabName, tabKey, file) {
  const tab = page.getByRole('tab', { name: `Tampilan ${tabName}` });
  await tab.click();
  // wait until it is selected and the panel re-renders
  await page.waitForFunction(
    (k) => document.querySelector(`#dashboard-tab-${k}`)?.getAttribute('aria-selected') === 'true',
    tabKey,
  );
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ASSET_DIR, file) });
  console.log(`saved ${file}`);
}

await snapTab('Tabel', 'table', '16-dashboard-table.png');
await snapTab('Kalender', 'calendar', '17-dashboard-calendar.png');
await snapTab('Kanban', 'kanban', '18-dashboard-kanban.png');
await snapTab('Timeline', 'timeline', '19-dashboard-timeline.png');

await browser.close();
console.log(failed.length ? `PAGE ERRORS:\n${failed.join('\n')}` : 'no page errors');
console.log('DONE');
