import type { Page, Route } from '@playwright/test';

// ─── Mock Data ───────────────────────────────────────────────────

export const MOCK_EVENT = {
  id: 'evt_test123',
  acara: 'Pameran Otomotif Bekasi 2026',
  tanggal: '2026-07-15',
  lokasi: 'Atrium Utama',
  eo: 'PT Otomotif Indonesia',
  status: 'past',
};

export const MOCK_EVENTS = [MOCK_EVENT];

export const MOCK_TENANTS = [
  {
    id: 'tnt_001',
    name: 'Kopi Metmal',
    floor: 'LTB',
    lot: 'A-12',
    category: 'Food & Beverage',
    pic: 'Budi Santoso',
    picTelp: '081234567890',
    logo: '',
    status: 'active',
    participantEvoucher: 'Yes',
  },
  {
    id: 'tnt_002',
    name: 'Fashion Hub',
    floor: 'LT1',
    lot: 'B-05',
    category: 'Fashion',
    pic: 'Sari Dewi',
    picTelp: '089876543210',
    logo: '',
    status: 'active',
    participantEvoucher: 'No',
  },
];

export const MOCK_SURVEY_V3 = {
  id: 'srv_v3_001',
  event_id: 'evt_test123',
  tenant_user_id: null,
  tenant_name: 'Kopi Metmal',
  tenant_organization: '',
  tenant_email: '',
  tenant_phone: '',
  business_category: 'other',
  business_subcategory: '',
  sales_lift_pct: null,
  traffic_lift_pct: null,
  venue_rating: null,
  management_rating: null,
  event_organization_rating: null,
  booth_facility_rating: null,
  overall_rating: null,
  feedback_comment: '',
  improvement_suggestion: '',
  status: 'submitted',
  submitted_at: '2026-07-16T10:00:00Z',
  reviewed_by: null,
  reviewed_at: null,
  review_notes: '',
  created_at: '2026-07-16T09:30:00Z',
  updated_at: '2026-07-16T10:00:00Z',
  nama_gerai: 'Kopi Metmal',
  lokasi_zona: 'Lantai Dasar',
  kategori: 'Food & Beverage (F&B)',
  kenaikan_traffic: 'Signifikan',
  kenaikan_sales: '10% - 30%',
  feedback_teks: 'Event bagus, ramai pengunjung',
  tenant_id: 'tnt_001',
  pic_name: 'Budi Santoso',
  pic_phone: '081234567890',
};

export const MOCK_ANALYTICS = [
  {
    tenant_user_id: 'user_001',
    tenant_organization: 'Kopi Metmal',
    total_surveys: 2,
    submitted_surveys: 2,
    avg_venue_rating: 4,
    avg_management_rating: 5,
    avg_event_organization_rating: 4,
    avg_booth_facility_rating: 3,
    avg_overall_rating: 4,
    last_survey_at: '2026-07-16T10:00:00Z',
    traffic_signifikan: 1,
    traffic_sedikit_naik: 1,
    traffic_tidak_ada: 0,
    traffic_menurun: 0,
    sales_no_change: 0,
    sales_lt_10: 1,
    sales_10_30: 1,
    sales_30_50: 0,
    sales_gt_50: 0,
  },
];

export const MOCK_MONTHLY_TREND = [
  {
    period: '2026-07',
    total_submissions: 2,
    v2_count: 0,
    v3_count: 2,
    avg_venue_rating: null,
    avg_management_rating: null,
    avg_event_organization_rating: null,
    avg_booth_facility_rating: null,
    avg_overall_rating: null,
    traffic_signifikan: 1,
    traffic_sedikit_naik: 1,
    traffic_tidak_ada: 0,
    traffic_menurun: 0,
    sales_no_change: 0,
    sales_lt_10: 0,
    sales_10_30: 2,
    sales_30_50: 0,
    sales_gt_50: 0,
  },
  {
    period: '2026-06',
    total_submissions: 1,
    v2_count: 0,
    v3_count: 1,
    avg_venue_rating: null,
    avg_management_rating: null,
    avg_event_organization_rating: null,
    avg_booth_facility_rating: null,
    avg_overall_rating: null,
    traffic_signifikan: 0,
    traffic_sedikit_naik: 1,
    traffic_tidak_ada: 0,
    traffic_menurun: 0,
    sales_no_change: 0,
    sales_lt_10: 1,
    sales_10_30: 0,
    sales_30_50: 0,
    sales_gt_50: 0,
  },
];

// ─── API Mock Handler ────────────────────────────────────────────

/**
 * Intercept all /api/tenant-survey* calls and return mock responses.
 * Pass options to customize behavior per-test (e.g. simulate duplicate).
 */
export async function setupSurveyApiMocks(
  page: Page,
  opts: {
    alreadySubmitted?: boolean;
    submitError?: string;
  } = {},
) {
  // Route REST baru (server/src/routes/tenant.js) — dipetakan per path,
  // bukan lagi mode/action query string. Envelope: { success, data }.
  const json = (route: Route, body: Record<string, unknown>, status = 200) =>
    route.fulfill(status === 200 ? { json: body } : { status, json: body });

  // ─── Public GET ─────────────────────────────────────────────
  await page.route('**/api/v1/tenant/events', (route) =>
    json(route, { success: true, data: MOCK_EVENTS }));

  await page.route('**/api/v1/tenant/event-info*', (route) =>
    json(route, { success: true, data: { ...MOCK_EVENT, is_active: true } }));

  await page.route('**/api/v1/tenant/results-list*', (route) =>
    json(route, { success: true, data: [MOCK_SURVEY_V3] }));

  await page.route('**/api/v1/tenant/results-analytics*', (route) => {
    const group = new URL(route.request().url()).searchParams.get('group') || '';
    return json(route, { success: true, data: group === 'month' ? MOCK_MONTHLY_TREND : MOCK_ANALYTICS });
  });

  await page.route('**/api/v1/tenant/results-roster', (route) =>
    json(route, {
      success: true,
      data: MOCK_TENANTS.map((t) => ({
        id: t.id, name: t.name, floor: t.floor, lot: t.lot, category: t.category, logo: t.logo || '',
      })),
    }));

  await page.route('**/api/v1/tenant/tenants*', (route) => {
    const q = (new URL(route.request().url()).searchParams.get('q') || '').trim().toLowerCase();
    if (q.length < 2) {
      return json(route, { success: false, error: 'Query pencarian minimal 2 karakter' }, 400);
    }
    return json(route, { success: true, data: MOCK_TENANTS.filter((t) => t.name.toLowerCase().includes(q)) });
  });

  await page.route('**/api/v1/tenant/tenant-detail*', (route) => {
    const id = new URL(route.request().url()).searchParams.get('id') || '';
    const t = MOCK_TENANTS.find((x) => x.id === id);
    if (!t) return json(route, { success: false, error: 'Tenant tidak ditemukan' }, 404);
    // Hanya field PIC (mirror backend secure — tanpa mass PII dump)
    return json(route, { success: true, data: { id: t.id, name: t.name, pic: t.pic, picTelp: t.picTelp } });
  });

  await page.route('**/api/v1/tenant/check*', (route) =>
    json(route, { success: true, data: { submitted: opts.alreadySubmitted ?? false } }));

  // ─── Public POST submit ────────────────────────────────────
  await page.route('**/api/v1/tenant/submit', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    if (opts.submitError) return json(route, { success: false, error: opts.submitError }, 400);
    if (opts.alreadySubmitted) {
      return json(route, {
        success: false,
        error: 'Anda sudah pernah mengirimkan survey untuk event ini.',
      }, 409);
    }
    return json(route, {
      success: true,
      id: 'srv_new_001',
      created_at: new Date().toISOString(),
    }, 201);
  });

  // ─── Authenticated ──────────────────────────────────────────
  await page.route('**/api/v1/tenant/list*', (route) =>
    json(route, { success: true, data: [MOCK_SURVEY_V3] }));

  await page.route('**/api/v1/tenant/roster', (route) =>
    json(route, {
      success: true,
      data: MOCK_TENANTS.map((t) => ({
        id: t.id, name: t.name, floor: t.floor, lot: t.lot, category: t.category, logo: t.logo || '',
      })),
    }));

  await page.route('**/api/v1/tenant/analytics*', (route) => {
    const group = new URL(route.request().url()).searchParams.get('group') || '';
    return json(route, { success: true, data: group === 'month' ? MOCK_MONTHLY_TREND : MOCK_ANALYTICS });
  });

  await page.route('**/api/v1/tenant/summary*', (route) =>
    json(route, {
      success: true,
      data: {
        event_id: 'evt_test123',
        tenant_name: 'Kopi Metmal',
        tenant_organization: '',
        tenant_survey_status: 'submitted',
        venue_rating: null,
        management_rating: null,
        event_organization_rating: null,
        booth_facility_rating: null,
        overall_rating: null,
        feedback_comment: '',
        improvement_suggestion: '',
        tenant_survey_created_at: '2026-07-16T09:30:00Z',
        total_visitor_responses: 5,
        visitor_mall_overall: 4,
        visitor_eo_overall: 4,
      },
    }));

  await page.route('**/api/v1/tenant/config-get*', (route) =>
    json(route, {
      success: true,
      data: {
        event_id: new URL(route.request().url()).searchParams.get('event_id') || 'evt_test123',
        is_active: true,
      },
    }));
}

// ─── Auth Mock (REST /api/v1 — Opsi B, ADR 005) ────────────────────

/**
 * Mock auth via route intercept: GET /api/v1/auth/me → user (cookie JWT model).
 * SPA memanggil apiGet('/auth/me') = VITE_API_URL + '/api/v1/auth/me';
 * di e2e VITE_API_URL kosong → relatif origin lokal, cukup intercept '/api/v1/**'.
 */
export async function mockAuth(page: Page, role: 'superadmin' | 'admin' | 'viewer' | 'eo_tenant' | 'tenant_relation' = 'superadmin') {
  const user = {
    id: `user_${role}_001`,
    email: `${role}@metmal.test`,
    display_name: role,
    role,
    is_active: true,
  };

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { success: true, user } });
  });
  // Login + logout (bila dijalankan flow-nya)
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: { success: true, user } });
  });
  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ json: { success: true } });
  });
}

export async function mockAdminAuth(page: Page) {
  await mockAuth(page, 'superadmin');
}

/**
 * Mock dasar backend REST untuk dashboard tests.
 * Envelope: { success, data }. Router per path persis server/src/routes/*.
 */
export async function setupApiMocks(page: Page, role: 'superadmin' | 'admin' | 'viewer' | 'eo_tenant' | 'tenant_relation' = 'superadmin') {
  await mockAuth(page, role);

  // Events (public + admin — DbEvent shape, tanpa PII utk public)
  await page.route('**/api/v1/events*', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: [
          {
            id: 'evt_test123',
            date_str: '2026-07-15',
            date_end: null,
            day: 'Selasa',
            tanggal: '15 Jul 2026',
            jam: '10:00 - 22:00',
            acara: 'Pameran Otomotif Bekasi 2026',
            lokasi: 'Atrium Utama',
            eo: 'PT Otomotif Indonesia',
            pic: 'Andi',
            phone: '081234567890',
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
      },
    });
  });

  // Tenant surveys (duplicate check → kosong)
  await page.route('**/api/v1/tenant/list*', async (route) => {
    await route.fulfill({ json: { success: true, data: [] } });
  });

  // Settings, themes, holidays, albums, areas — envelope data
  for (const [path, data] of [
    ['**/api/v1/settings/*', null],
    ['**/api/v1/themes', []],
    ['**/api/v1/holidays', []],
    ['**/api/v1/albums*', { albums: [], photos: [] }],
    ['**/api/v1/areas', { areas: [], photos: [] }],
    ['**/api/v1/draft_events*', []],
  ] as const) {
    await page.route(path, async (route) => {
      await route.fulfill({ json: { success: true, data } });
    });
  }
}
