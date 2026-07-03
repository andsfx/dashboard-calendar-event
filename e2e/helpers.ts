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
          return route.fulfill({ json: { success: true, event: MOCK_EVENT } });

        case 'tenants': {
          const q = (url.searchParams.get('q') || '').toLowerCase();
          const filtered = q
            ? MOCK_TENANTS.filter(t => t.name.toLowerCase().includes(q))
            : MOCK_TENANTS;
          return route.fulfill({ json: { success: true, tenants: filtered } });
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

      case 'analytics':
        return route.fulfill({ json: { success: true, data: MOCK_ANALYTICS } });

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
          json: { success: true, data: { event_id: 'evt_test123', is_active: true } },
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
 */
export async function mockAdminAuth(page: Page) {
  const fakeSession = {
    access_token: 'fake-access-token',
    refresh_token: 'fake-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: 'user_admin_001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'admin@metmal.test',
      app_metadata: { role: 'superadmin' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };

  await page.addInitScript((session) => {
    // Supabase stores session under sb-<ref>-auth-token key
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }
    // Set with a generic key; the client will pick it up
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
    const targetKey = keys[0] || 'sb-localhost-auth-token';
    localStorage.setItem(targetKey, JSON.stringify(session));
  }, fakeSession);
}
