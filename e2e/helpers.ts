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
  await page.route('**/api/tenant-survey**', async (route: Route) => {
    const url = new URL(route.request().url());
    const mode = url.searchParams.get('mode') || 'auth';
    const action = url.searchParams.get('action') || '';
    const method = route.request().method();

    // ─── Public endpoints ──────────────────────────────────────
    if (mode === 'public') {
      switch (action) {
        case 'events':
          return route.fulfill({ json: { success: true, events: MOCK_EVENTS } });

        case 'event-info':
          return route.fulfill({
            json: { success: true, event: MOCK_EVENT, is_active: true },
          });

        case 'results-list':
          return route.fulfill({ json: { success: true, data: [MOCK_SURVEY_V3] } });

        case 'results-analytics': {
          const group = url.searchParams.get('group') || '';
          const data = group === 'month' ? MOCK_MONTHLY_TREND : MOCK_ANALYTICS;
          return route.fulfill({ json: { success: true, data } });
        }

        case 'results-roster':
          return route.fulfill({
            json: {
              success: true,
              total: MOCK_TENANTS.length,
              tenants: MOCK_TENANTS.map((t) => ({
                id: t.id,
                name: t.name,
                floor: t.floor,
                lot: t.lot,
                category: t.category,
                logo: t.logo || '',
              })),
            },
          });

        case 'tenants': {
          const q = (url.searchParams.get('q') || '').trim().toLowerCase();
          if (q.length < 2) {
            return route.fulfill({
              status: 400,
              json: { success: false, error: 'Query pencarian minimal 2 karakter', tenants: [] },
            });
          }
          const filtered = MOCK_TENANTS.filter(t => t.name.toLowerCase().includes(q));
          return route.fulfill({ json: { success: true, tenants: filtered } });
        }

        case 'tenant-detail': {
          const id = url.searchParams.get('id') || '';
          const t = MOCK_TENANTS.find(x => x.id === id);
          if (!t) {
            return route.fulfill({ status: 404, json: { success: false, error: 'Tenant tidak ditemukan' } });
          }
          // Only PIC fields returned (mirrors secure backend: no mass PII dump)
          return route.fulfill({
            json: { success: true, tenant: { id: t.id, name: t.name, pic: t.pic, picTelp: t.picTelp } },
          });
        }

        case 'check':
          return route.fulfill({
            json: { success: true, submitted: opts.alreadySubmitted ?? false },
          });

        case 'submit':
          if (opts.submitError) {
            return route.fulfill({
              status: 400,
              json: { success: false, error: opts.submitError },
            });
          }
          if (opts.alreadySubmitted) {
            return route.fulfill({
              status: 409,
              json: {
                success: false,
                error: 'Anda sudah pernah mengirimkan survey untuk event ini.',
                already_submitted: true,
              },
            });
          }
          return route.fulfill({
            status: 201,
            json: {
              success: true,
              id: 'srv_new_001',
              created_at: new Date().toISOString(),
            },
          });

        default:
          return route.fulfill({ status: 400, json: { success: false, error: 'Unknown action' } });
      }
    }

    // ─── Authenticated endpoints ───────────────────────────────
    switch (action) {
      case 'list':
        return route.fulfill({ json: { success: true, data: [MOCK_SURVEY_V3] } });

      case 'tenant-roster':
        return route.fulfill({
          json: {
            success: true,
            total: MOCK_TENANTS.length,
            tenants: MOCK_TENANTS.map((t) => ({
              id: t.id,
              name: t.name,
              floor: t.floor,
              lot: t.lot,
              category: t.category,
              logo: t.logo || '',
            })),
          },
        });

      case 'analytics': {
        const group = url.searchParams.get('group') || '';
        const data = group === 'month' ? MOCK_MONTHLY_TREND : MOCK_ANALYTICS;
        return route.fulfill({ json: { success: true, data } });
      }

      case 'summary':
        return route.fulfill({
          json: {
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
          },
        });

      case 'config-get':
        return route.fulfill({
          json: {
            success: true,
            config: { event_id: url.searchParams.get('event_id') || 'evt_test123', is_active: true },
          },
        });

      default:
        return route.fulfill({ status: 400, json: { success: false, error: 'Unknown action' } });
    }
  });
}

// ─── Auth Mock ───────────────────────────────────────────────────

/**
 * Inject a fake Supabase auth session into localStorage so the app
 * thinks the user is logged in as admin.
 * 
 * IMPORTANT: Must match the projectRef in SUPABASE_URL env var.
 * We use 'test-project' as the projectRef, so the key becomes 'sb-test-project-auth-token'.
 */
export async function mockAuth(page: Page, role: 'superadmin' | 'admin' | 'viewer' | 'eo_tenant' | 'tenant_relation' = 'superadmin') {
  const fakeSession = {
    access_token: 'fake-access-token',
    refresh_token: 'fake-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: `user_${role}_001`,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${role}@metmal.test`,
      app_metadata: { role },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };

  await page.addInitScript((session) => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem('sb-test-project-auth-token', JSON.stringify(session));
  }, fakeSession);
}

export async function mockAdminAuth(page: Page) {
  await mockAuth(page, 'superadmin');
}

export async function setupSupabaseMocks(page: Page, role: 'superadmin' | 'admin' | 'viewer' | 'eo_tenant' | 'tenant_relation' = 'superadmin') {
  const user = {
    id: `user_${role}_001`,
    email: `${role}@metmal.test`,
    display_name: role,
    role,
    aud: 'authenticated',
    app_metadata: { role },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  };

  await page.route(/.*api\/auth.*action=me.*/, async (route) => {
    await route.fulfill({ json: { success: true, user, legacy: false } });
  });

  await page.route('**/api/auth', async (route) => {
    await route.fulfill({ json: { user } });
  });

  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ json: user });
  });

  // Events (for dashboard — must match DbEvent shape)
  await page.route('**/rest/v1/events*', async (route) => {
    await route.fulfill({
      json: [
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
    });
  });

  // Tenant event surveys (for duplicate check — return empty = no duplicate)
  await page.route('**/rest/v1/tenant_event_surveys*', async (route) => {
    await route.fulfill({ json: [] });
  });

  // Site settings, event photos (dashboard widgets)
  await page.route('**/rest/v1/site_settings*', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/rest/v1/event_photos*', async (route) => {
    await route.fulfill({ json: [] });
  });

  // Other Supabase tables (empty)
  for (const table of ['annual_themes', 'holidays', 'gallery_albums', 'draft_events', 'community_registrations', 'letter_requests', 'photo_albums']) {
    await page.route(`**/rest/v1/${table}*`, async (route) => {
      await route.fulfill({ json: [] });
    });
  }
}
