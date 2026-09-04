// Capture tenant-survey pages with full public-API mocks + DOM assertions.
// Roster endpoint shape: { success, tenants: [{ id, name, floor, lot, category, logo }] }
// (api/tenant-survey.js handlePublicResultsRoster — key `tenants`, not `data`).
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('assets/deck-b');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173';
const VP = { width: 1600, height: 1000 };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
const page = await ctx.newPage();

await page.route('**/api/auth*', async (route) => {
  const url = new URL(route.request().url());
  if (url.searchParams.get('action') === 'me') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      success: true,
      user: { id: 'deck-b', email: 'marcomm@metmal.local', display_name: 'Andy Safii', role: 'superadmin' },
      legacy: false,
    }) });
  }
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
});

await page.route('**/api/supabase-admin', async (route) => {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
});

// ─── Fixtures (DbTenantSurvey snake_case; enums per src/constants/survey-options.ts) ───
const surveyResults = [
  { id: 's1', event_id: 'e1', tenant_user_id: null, tenant_name: 'Toko A', tenant_organization: 'Org A', tenant_email: '', tenant_phone: '', business_category: 'fashion', business_subcategory: 'apparel', sales_lift_pct: 25, traffic_lift_pct: 30, venue_rating: 4, management_rating: 4, event_organization_rating: 5, booth_facility_rating: 4, overall_rating: 4, feedback_comment: 'Bagus', improvement_suggestion: 'Tambah area', status: 'submitted', submitted_at: '2026-08-15T10:00:00Z', reviewed_by: null, reviewed_at: null, review_notes: '', created_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z', nama_gerai: 'Gerai A-01', lokasi_zona: 'Zona 1', kategori: 'fashion', kenaikan_traffic: 'Signifikan', kenaikan_sales: '10% - 30%', feedback_teks: 'Event bagus, pengunjung ramai sepanjang akhir pekan.', tenant_id: 't1', pic_name: '', pic_phone: '' },
  { id: 's2', event_id: 'e1', tenant_user_id: null, tenant_name: 'Toko B', tenant_organization: 'Org B', tenant_email: '', tenant_phone: '', business_category: 'fnb', business_subcategory: 'cafe', sales_lift_pct: 40, traffic_lift_pct: 50, venue_rating: 5, management_rating: 4, event_organization_rating: 4, booth_facility_rating: 5, overall_rating: 5, feedback_comment: 'Mantap', improvement_suggestion: '', status: 'submitted', submitted_at: '2026-08-16T11:00:00Z', reviewed_by: null, reviewed_at: null, review_notes: '', created_at: '2026-08-16T11:00:00Z', updated_at: '2026-08-16T11:00:00Z', nama_gerai: 'Gerai B-02', lokasi_zona: 'Zona 2', kategori: 'fnb', kenaikan_traffic: 'Signifikan', kenaikan_sales: '> 50%', feedback_teks: 'Penjualan laris, antrean terus penuh.', tenant_id: 't2', pic_name: '', pic_phone: '' },
  { id: 's3', event_id: 'e2', tenant_user_id: null, tenant_name: 'Toko C', tenant_organization: 'Org C', tenant_email: '', tenant_phone: '', business_category: 'electronics', business_subcategory: 'gadget', sales_lift_pct: 10, traffic_lift_pct: 15, venue_rating: 3, management_rating: 3, event_organization_rating: 4, booth_facility_rating: 3, overall_rating: 3, feedback_comment: 'Lumayan', improvement_suggestion: 'Promo lebih', status: 'submitted', submitted_at: '2026-08-20T09:00:00Z', reviewed_by: null, reviewed_at: null, review_notes: '', created_at: '2026-08-20T09:00:00Z', updated_at: '2026-08-20T09:00:00Z', nama_gerai: 'Gerai C-03', lokasi_zona: 'Zona 1', kategori: 'electronics', kenaikan_traffic: 'Sedikit Naik', kenaikan_sales: '< 10%', feedback_teks: 'Trafi naik tipis, cocok untuk pameran gadget.', tenant_id: 't3', pic_name: '', pic_phone: '' },
];
const monthlyTrend = [
  { period: '2026-06', total_submissions: 8, v2_count: 3, v3_count: 5, avg_venue_rating: 4.0, avg_management_rating: 3.8, avg_event_organization_rating: 4.2, avg_booth_facility_rating: 3.9, avg_overall_rating: 4.0, traffic_signifikan: 4, traffic_sedikit_naik: 2, traffic_tidak_ada: 1, traffic_menurun: 1, sales_no_change: 2, sales_lt_10: 3, sales_10_30: 2, sales_30_50: 1, sales_gt_50: 0 },
  { period: '2026-07', total_submissions: 12, v2_count: 4, v3_count: 8, avg_venue_rating: 4.2, avg_management_rating: 4.0, avg_event_organization_rating: 4.5, avg_booth_facility_rating: 4.1, avg_overall_rating: 4.3, traffic_signifikan: 6, traffic_sedikit_naik: 3, traffic_tidak_ada: 2, traffic_menurun: 1, sales_no_change: 3, sales_lt_10: 4, sales_10_30: 3, sales_30_50: 1, sales_gt_50: 1 },
  { period: '2026-08', total_submissions: 15, v2_count: 5, v3_count: 10, avg_venue_rating: 4.5, avg_management_rating: 4.2, avg_event_organization_rating: 4.6, avg_booth_facility_rating: 4.3, avg_overall_rating: 4.4, traffic_signifikan: 8, traffic_sedikit_naik: 4, traffic_tidak_ada: 2, traffic_menurun: 1, sales_no_change: 2, sales_lt_10: 5, sales_10_30: 4, sales_30_50: 3, sales_gt_50: 1 },
];
// TenantRosterItem: { id, name, floor, lot, category, logo }
const roster = [
  { id: 't1', name: 'Gerai A-01', floor: 'Ground Floor', lot: 'A-01', category: 'fashion', logo: '' },
  { id: 't2', name: 'Gerai B-02', floor: 'Ground Floor', lot: 'B-02', category: 'fnb', logo: '' },
  { id: 't3', name: 'Gerai C-03', floor: '1st Floor', lot: 'C-03', category: 'electronics', logo: '' },
  { id: 't4', name: 'Gerai D-04', floor: '1st Floor', lot: 'D-04', category: 'fnb', logo: '' },
  { id: 't5', name: 'Gerai E-05', floor: '2nd Floor', lot: 'E-05', category: 'fashion', logo: '' },
];
const events = [
  { id: 'e1', acara: 'Metmal Kids Fun Run', tanggal: '2026-08-15', lokasi: 'Ground Floor', eo: 'Metmal', status: 'berlangsung' },
  { id: 'e2', acara: 'Pameran UMKM', tanggal: '2026-08-20', lokasi: 'Atrium', eo: 'Komunitas Kreatif', status: 'berlangsung' },
];

await page.route('**/api/tenant-survey*', async (route) => {
  const url = new URL(route.request().url());
  const action = url.searchParams.get('action') || '';
  const mode = url.searchParams.get('mode') || '';
  if (mode === 'public' && action === 'results-list') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: surveyResults }) });
  }
  if (mode === 'public' && action === 'results-analytics') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: monthlyTrend }) });
  }
  if (mode === 'public' && action === 'results-roster') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, tenants: roster, total: roster.length }) });
  }
  if (mode === 'public' && action === 'events') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, events }) });
  }
  if (mode === 'public' && action === 'event-info') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, event: { id: 'e1', acara: 'Metmal Kids Fun Run', tanggal: '2026-08-15', lokasi: 'Ground Floor' }, is_active: true }) });
  }
  if (action === 'list') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: surveyResults }) });
  }
  if (action === 'summary') {
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { event_id: 'e1', tenant_name: 'Toko A', tenant_organization: 'Org A', tenant_survey_status: 'submitted', venue_rating: 4, management_rating: 4, event_organization_rating: 5, booth_facility_rating: 4, overall_rating: 4, feedback_comment: 'Bagus', improvement_suggestion: 'Tambah area', tenant_survey_created_at: '2026-08-15T10:00:00Z', total_visitor_responses: 42, visitor_mall_overall: 4.3, visitor_eo_overall: 4.5 } }) });
  }
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
});

// ─── Picker: /tenant-survey ───
await page.goto(`${BASE}/tenant-survey`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, '07-tenant-survey-picker.png') });
console.log('saved 07-tenant-survey-picker.png');

// ─── Results: /tenant-survey-results ───
await page.goto(`${BASE}/tenant-survey-results`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

// DOM assertions — ground truth before screenshot (image read unreliable).
// aggregateResults: 3 v3 surveys → trafficPos 2, salesPos 2 → 67% / 67%.
await expect(page.getByText('67%').first()).toBeVisible({ timeout: 8000 });
// Survey gerai names must render (from results-list via dbTenantSurveyToTenantSurvey).
await expect(page.getByText('Gerai A-01').first()).toBeVisible({ timeout: 8000 });
await expect(page.getByText('Gerai C-03').first()).toBeVisible({ timeout: 8000 });
// Empty-state message must NOT show.
const emptyMsg = await page.getByText('belum tersedia', { exact: false }).count();
if (emptyMsg > 0) throw new Error('Empty-state message still visible on results page');

await page.screenshot({ path: path.join(OUT, '08-tenant-survey-results.png') });
console.log('saved 08-tenant-survey-results.png (assertions passed: 67% stats, gerai names, no empty state)');

await browser.close();
console.log('DONE');
