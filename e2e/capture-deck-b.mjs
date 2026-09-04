// Screenshot capture untuk Deck B (project-presentation.html)
// Public pages: real production anon reads (read-only, safe)
// Dashboard: mock auth superadmin + real event data via anon public read
// Run: node e2e/capture-deck-b.mjs  (dev server harus jalan di :5173)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('assets/deck-b');
const BASE = 'http://localhost:5173';
const VP = { width: 1600, height: 1000 };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// Mock supabase auth bootstrap (useAuth hits /api/auth?action=me)
await page.route('**/api/auth*', async (route) => {
  const url = new URL(route.request().url());
  if (url.searchParams.get('action') === 'me') {
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: { id: 'deck-b', email: 'marcomm@metmal.local', display_name: 'Andy Safii', role: 'superadmin' },
        legacy: false,
      }),
    });
  }
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
});

// Tenant-survey mock — realistic fixtures so results page renders data
const surveyResults = [
  { id: 's1', event_id: 'e1', tenant_user_id: null, tenant_name: 'Toko A', tenant_organization: 'Org A', tenant_email: '', tenant_phone: '', business_category: 'fashion', business_subcategory: 'apparel', sales_lift_pct: 25, traffic_lift_pct: 30, venue_rating: 4, management_rating: 4, event_organization_rating: 5, booth_facility_rating: 4, overall_rating: 4, feedback_comment: 'Bagus', improvement_suggestion: 'Tambah area', status: 'submitted', submitted_at: '2026-08-15T10:00:00Z', reviewed_by: null, reviewed_at: null, review_notes: '', created_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z', nama_gerai: 'Gerai A-01', lokasi_zona: 'Zona 1', kategori: 'fashion', kenaikan_traffic: 'naik_signifikan', kenaikan_sales: 'naik_sedang', feedback_teks: 'Event bagus', tenant_id: 't1', pic_name: 'Budi', pic_phone: '0812' },
  { id: 's2', event_id: 'e1', tenant_user_id: null, tenant_name: 'Toko B', tenant_organization: 'Org B', tenant_email: '', tenant_phone: '', business_category: 'fnb', business_subcategory: 'cafe', sales_lift_pct: 40, traffic_lift_pct: 50, venue_rating: 5, management_rating: 4, event_organization_rating: 4, booth_facility_rating: 5, overall_rating: 5, feedback_comment: 'Mantap', improvement_suggestion: '', status: 'submitted', submitted_at: '2026-08-16T11:00:00Z', reviewed_by: null, reviewed_at: null, review_notes: '', created_at: '2026-08-16T11:00:00Z', updated_at: '2026-08-16T11:00:00Z', nama_gerai: 'Gerai B-02', lokasi_zona: 'Zona 2', kategori: 'fnb', kenaikan_traffic: 'naik_signifikan', kenaikan_sales: 'naik_banyak', feedback_teks: 'Laris', tenant_id: 't2', pic_name: 'Sari', pic_phone: '0813' },
  { id: 's3', event_id: 'e2', tenant_user_id: null, tenant_name: 'Toko C', tenant_organization: 'Org C', tenant_email: '', tenant_phone: '', business_category: 'electronics', business_subcategory: 'gadget', sales_lift_pct: 10, traffic_lift_pct: 15, venue_rating: 3, management_rating: 3, event_organization_rating: 4, booth_facility_rating: 3, overall_rating: 3, feedback_comment: 'Lumayan', improvement_suggestion: 'Promo lebih', status: 'submitted', submitted_at: '2026-08-20T09:00:00Z', reviewed_by: null, reviewed_at: null, review_notes: '', created_at: '2026-08-20T09:00:00Z', updated_at: '2026-08-20T09:00:00Z', nama_gerai: 'Gerai C-03', lokasi_zona: 'Zona 1', kategori: 'electronics', kenaikan_traffic: 'naik_sedikit', kenaikan_sales: 'naik_sedikit', feedback_teks: 'Biasa', tenant_id: 't3', pic_name: 'Doni', pic_phone: '0814' },
];
const monthlyTrend = [
  { period: '2026-06', total_submissions: 8, v2_count: 3, v3_count: 5, avg_venue_rating: 4.0, avg_management_rating: 3.8, avg_event_organization_rating: 4.2, avg_booth_facility_rating: 3.9, avg_overall_rating: 4.0, traffic_signifikan: 4, traffic_sedikit_naik: 2, traffic_tidak_ada: 1, traffic_menurun: 1, sales_no_change: 2, sales_lt_10: 3, sales_10_30: 2, sales_30_50: 1, sales_gt_50: 0 },
  { period: '2026-07', total_submissions: 12, v2_count: 4, v3_count: 8, avg_venue_rating: 4.2, avg_management_rating: 4.0, avg_event_organization_rating: 4.5, avg_booth_facility_rating: 4.1, avg_overall_rating: 4.3, traffic_signifikan: 6, traffic_sedikit_naik: 3, traffic_tidak_ada: 2, traffic_menurun: 1, sales_no_change: 3, sales_lt_10: 4, sales_10_30: 3, sales_30_50: 1, sales_gt_50: 1 },
  { period: '2026-08', total_submissions: 15, v2_count: 5, v3_count: 10, avg_venue_rating: 4.5, avg_management_rating: 4.2, avg_event_organization_rating: 4.6, avg_booth_facility_rating: 4.3, avg_overall_rating: 4.4, traffic_signifikan: 8, traffic_sedikit_naik: 4, traffic_tidak_ada: 2, traffic_menurun: 1, sales_no_change: 2, sales_lt_10: 5, sales_10_30: 4, sales_30_50: 3, sales_gt_50: 1 },
];
await page.route('**/api/tenant-survey*', async (route) => {
  const url = new URL(route.request().url());
  const action = url.searchParams.get('action') || '';
  const mode = url.searchParams.get('mode') || '';
  // Public results page reads
  if (mode === 'public' && (action === 'results-list' || action === 'list')) {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: surveyResults }) });
  }
  if (mode === 'public' && action === 'results-analytics') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: monthlyTrend }) });
  }
  if (mode === 'public' && action === 'events') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, events: [
      { id: 'e1', acara: 'Metmal Kids Fun Run', tanggal: '2026-08-15', lokasi: 'Ground Floor', eo: 'Metmal', status: 'berlangsung' },
      { id: 'e2', acara: 'Pameran UMKM', tanggal: '2026-08-20', lokasi: 'Atrium', eo: 'Komunitas Kreatif', status: 'berlangsung' },
    ] }) });
  }
  if (mode === 'public' && action === 'event-info') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, event: { id: 'e1', acara: 'Metmal Kids Fun Run', tanggal: '2026-08-15', lokasi: 'Ground Floor' }, is_active: true }) });
  }
  // Dashboard/admin reads
  if (action === 'list') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: surveyResults }) });
  }
  if (action === 'summary') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { event_id: 'e1', tenant_name: 'Toko A', tenant_organization: 'Org A', tenant_survey_status: 'submitted', venue_rating: 4, management_rating: 4, event_organization_rating: 5, booth_facility_rating: 4, overall_rating: 4, feedback_comment: 'Bagus', improvement_suggestion: 'Tambah area', tenant_survey_created_at: '2026-08-15T10:00:00Z', total_visitor_responses: 42, visitor_mall_overall: 4.3, visitor_eo_overall: 4.5 } }) });
  }
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
});

// Admin proxy: honest empty fixtures (no error banners)
await page.route('**/api/supabase-admin', async (route) => {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
});

async function snap(url, file, { waitText, ms = 1500 } = {}) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  if (waitText) await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(ms);
  await page.screenshot({ path: path.join(OUT, file) });
  console.log('saved', file);
}

console.log('=== public pages (real anon data) ===');
await snap('/', '01-landing.png', { ms: 2500 });
await snap('/events', '02-events-public.png', { ms: 2500 });
await snap('/daftar', '03-daftar.png', { ms: 1500 });
await snap('/community', '04-community.png', { ms: 2000 });
await snap('/gallery', '05-gallery.png', { ms: 2500 });
await snap('/news', '06-news.png', { ms: 2000 });

console.log('=== tenant survey (public) ===');
await snap('/tenant-survey', '07-tenant-survey-picker.png', { ms: 2000 });
await snap('/tenant-survey-results', '08-tenant-survey-results.png', { ms: 2000 });

console.log('=== dashboard (mock auth + real public events data) ===');
await page.goto(`${BASE}/dashboard/events`, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: 'Jadwal Event' }).waitFor({ timeout: 30000 });
await page.waitForTimeout(4000);

// Force "Semua" filter tab if present so all events show
const semTab = page.getByRole('tab', { name: 'Semua', exact: true });
if (await semTab.count()) { await semTab.click(); await page.waitForTimeout(1200); }

async function snapView(tabLabel, tabKey, file) {
  const tab = page.getByRole('tab', { name: tabLabel, exact: true });
  if (!(await tab.count())) { console.log('tab not found:', tabLabel); return; }
  await tab.click();
  await page.waitForFunction(
    (k) => document.querySelector(`#dashboard-tab-${k}`)?.getAttribute('aria-selected') === 'true',
    tabKey
  );
  await page.waitForTimeout(1400);
  await page.screenshot({ path: path.join(OUT, file) });
  console.log('saved', file);
}
await snapView('Tabel', 'table', '10-admin-table.png');
await snapView('Kalender', 'calendar', '11-admin-calendar.png');
await snapView('Kanban', 'kanban', '12-admin-kanban.png');
await snapView('Timeline', 'timeline', '13-admin-timeline.png');

await snap('/dashboard/registrations', '14-admin-registrations.png', { ms: 2500 });

await browser.close();
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
console.log('DONE');