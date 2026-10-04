import type { Page, Route } from '@playwright/test';

/**
 * Konfigurasi + data mock untuk audit UI/UX dashboard admin.
 *
 * Lihat `docs/adr/006-audit-harness-dashboard-di-commit.md` — harness ini
 * SENGAJA di-commit (bukan `e2e/__*` yang gitignored) supaya baseline audit
 * bisa direproduksi ulang & di-diff (before/after) oleh siapa pun.
 *
 * Kontrak mock mengikuti `e2e/helpers.ts` (Opsi B, ADR 005): REST `/api/v1`
 * di-intercept lewat `page.route`, tanpa backend/seed. Satu catch-all
 * menangani seluruh envelope `{ success, data }` — persis pola
 * `e2e/__audit-admin.spec.ts`, tapi dengan data yang lebih lengkap supaya
 * state kaya (kalender/kanban/timeline, empty state) benar-benar ter-render.
 */

// ─── Cakupan audit ───────────────────────────────────────────────

/** Seluruh permukaan dashboard admin + hasil survey tenant (mode publik). */
export const AUDIT_ROUTES = [
  '/dashboard',
  '/dashboard/insights',
  '/dashboard/analytics',
  '/dashboard/events',
  '/dashboard/drafts',
  '/dashboard/themes',
  '/dashboard/exhibitions',
  '/dashboard/registrations',
  '/dashboard/survey',
  '/dashboard/tenant-surveys',
  '/dashboard/users',
  '/dashboard/activity-log',
  '/dashboard/content/landing',
  '/dashboard/content/galeri',
  '/dashboard/content/foto-area',
  '/dashboard/content/surat',
  '/dashboard/content/berita',
  '/dashboard/content/sponsorship',
  '/tenant-survey-results',
] as const;

/** Role yang diukur (keputusan grilling 2026-10-04). */
export const AUDIT_ROLES = ['superadmin', 'viewer', 'eo_tenant', 'tenant_relation'] as const;
export type AuditRole = (typeof AUDIT_ROLES)[number];

/** Viewport yang diukur: desktop kantor + HP. */
export const AUDIT_VIEWPORTS = [1440, 375] as const;
export const AUDIT_VIEWPORT_HEIGHT = 900;

export type AuditTheme = 'light' | 'dark';
export const AUDIT_THEMES: AuditTheme[] = ['light', 'dark'];

/** Slug rute untuk nama berkas bukti: `/dashboard/content/landing` → `dashboard-content-landing`. */
export function auditRouteSlug(route: string): string {
  return route.replace(/^\//, '').replace(/\//g, '-') || 'root';
}

/** Direktori bukti terukur (gitignored, sama seperti reports/a11y). */
export const AUDIT_REPORT_DIR = 'reports/audit';

// ─── Mock data (representatif, non-kosong) ───────────────────────
// Non-kosong itu penting: empty state menyembunyikan markup kartu/tabel yang
// membawa bug kontras/heading/overflow yang dicari audit.

const IMG = '/og-image.jpg';

const AREAS = [
  { id: 'era_1', name: 'Atrium Utama', slug: 'atrium-utama' },
  { id: 'era_2', name: 'Main Atrium', slug: 'main-atrium' },
  { id: 'era_3', name: 'Sky Garden', slug: 'sky-garden' },
];

function evt(
  n: number,
  over: Partial<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    id: `evt_${n}`,
    date_str: '2026-10-05',
    date_end: null,
    day: 'Senin',
    tanggal: '05 Okt 2026',
    jam: '10:00 - 22:00',
    acara: `Event Uji ${n}`,
    lokasi: 'Atrium Utama',
    area_id: 'era_1',
    eo: 'PT Contoh EO',
    pic: 'Andi',
    phone: '081234567890',
    keterangan: '',
    month: 'Oktober',
    status: 'upcoming',
    category: 'Exhibition',
    categories: ['Exhibition'],
    priority: 'medium',
    event_model: 'Paid',
    event_nominal: '25000000',
    event_model_notes: '',
    source_draft_id: '',
    is_multi_day: false,
    day_time_slots: null,
    event_type: 'single',
    recurrence_group_id: '',
    is_recurring: false,
    poster_url: null,
    ...over,
  };
}

// Ragam status/kategori/prioritas + satu event tanpa area (uji bucket
// "Lokasi Lainnya") + multi-day + recurring.
const EVENTS = [
  evt(1, { status: 'past', date_str: '2026-07-15', month: 'Juli', acara: 'Pameran Otomotif Bekasi 2026', priority: 'medium' }),
  evt(2, { status: 'ongoing', date_str: '2026-09-24', date_end: '2026-09-28', month: 'September', acara: 'Bazaar Kuliner Nusantara', category: 'Bazaar', categories: ['Bazaar', 'Food'], priority: 'high', is_multi_day: true, event_type: 'multi', event_model: 'Support', event_nominal: '' }),
  evt(3, { status: 'upcoming', date_str: '2026-10-05', month: 'Oktober', acara: 'Talkshow Brand Lokal', category: 'Community', categories: ['Community'] }),
  evt(4, { status: 'upcoming', date_str: '2026-11-12', month: 'November', acara: 'Launching Produk Elektronik', priority: 'high' }),
  evt(5, { status: 'upcoming', date_str: '2026-12-05', month: 'Desember', acara: 'Konser Akhir Tahun', area_id: null, lokasi: 'Lapangan Parkir Timur', category: 'Entertainment', categories: ['Entertainment'] }),
  evt(6, { status: 'upcoming', date_str: '2026-12-19', month: 'Desember', acara: 'Workshop Komunitas', is_recurring: true, recurrence_group_id: 'rg_1', category: 'Community', categories: ['Community'], area_id: 'era_3', lokasi: 'Sky Garden' }),
];

const DRAFTS = [
  { id: 'drf_1', date_str: '2026-10-20', day: 'Selasa', tanggal: '20 Okt 2026', jam: '10:00 - 22:00', acara: 'Festival Kopi Metmal', lokasi: 'Atrium Utama', eo: 'EO Kopi', pic: 'Rina', phone: '081234500001', keterangan: 'Menunggu konfirmasi venue', month: 'Oktober', status: 'draft', progress: 'confirm', published: false, deleted: false, category: 'Bazaar', categories: ['Bazaar'], event_model: 'Paid', event_nominal: '15000000', event_model_notes: '', created_at: '2026-09-10T08:00:00Z' },
  { id: 'drf_2', date_str: '2026-11-01', day: 'Minggu', tanggal: '01 Nov 2026', jam: '09:00 - 20:00', acara: 'Pameran UMKM Bekasi', lokasi: 'Main Atrium', eo: 'Dinas UMKM', pic: 'Tono', phone: '081234500002', keterangan: '', month: 'November', status: 'draft', progress: 'confirm', published: false, deleted: false, category: 'Exhibition', categories: ['Exhibition'], event_model: 'Support', event_nominal: '', event_model_notes: '', created_at: '2026-09-12T08:00:00Z' },
  { id: 'drf_3', date_str: '2026-12-05', day: 'Sabtu', tanggal: '05 Des 2026', jam: '10:00 - 21:00', acara: 'Konser Akhir Tahun', lokasi: 'Sky Garden', eo: 'EO Musik', pic: 'Lina', phone: '081234500003', keterangan: 'Perlu izin keramaian', month: 'Desember', status: 'draft', progress: 'followup', published: false, deleted: false, category: 'Entertainment', categories: ['Entertainment'], event_model: 'Paid', event_nominal: '75000000', event_model_notes: '', created_at: '2026-09-14T08:00:00Z' },
];

const REGISTRATIONS = [
  { id: 'reg_1', event_id: 'evt_3', event_name: 'Talkshow Brand Lokal', community_name: 'Komunitas Kreatif Bekasi', contact_name: 'Hendra', contact_email: 'hendra@example.com', contact_phone: '081200000001', participant_count: 45, status: 'pending', notes: 'Butuh 2 booth', created_at: '2026-09-15T08:00:00Z' },
  { id: 'reg_2', event_id: 'evt_2', event_name: 'Bazaar Kuliner Nusantara', community_name: 'Pasar Rakyat', contact_name: 'Wati', contact_email: 'wati@example.com', contact_phone: '081200000002', participant_count: 12, status: 'pending', notes: '', created_at: '2026-09-16T08:00:00Z' },
  { id: 'reg_3', event_id: 'evt_1', event_name: 'Pameran Otomotif Bekasi 2026', community_name: 'Otomotif Fans', contact_name: 'Gilang', contact_email: 'gilang@example.com', contact_phone: '081200000003', participant_count: 30, status: 'approved', notes: '', created_at: '2026-08-20T08:00:00Z' },
];

const EXHIBITIONS = [
  { id: 'exh_1', title: 'Casual Leasing Q3 2026', theme: 'Kuliner & FnB', description: 'Program casual leasing kuartal tiga untuk tenant FnB', location: 'Main Atrium', date_start: '2026-07-01', date_end: '2026-09-30', collaboration_brief: 'Bagi hasil 70:30', leasing_pic: 'Andi', marcomm_pic: 'Sari', publication: 'published', accepting_applications: true, activation_count: 2 },
  { id: 'exh_2', title: 'Pop-Up Brand Lokal', theme: 'Fashion', description: 'Ruang pop-up untuk brand fashion lokal', location: 'Sky Garden', date_start: '2026-10-01', date_end: '2026-12-31', collaboration_brief: '', leasing_pic: 'Budi', marcomm_pic: 'Dewi', publication: 'draft', accepting_applications: false, activation_count: 0 },
];

const EXH_LEADS = [
  { id: 'lead_1', exhibition_id: 'exh_1', brand_name: 'Kopi Kenangan', contact_name: 'Rudi', contact_email: 'rudi@example.com', contact_phone: '081300000001', proposal: 'Ingin buka booth 3x3', status: 'new', internal_notes: '', created_at: '2026-09-10T08:00:00Z' },
  { id: 'lead_2', exhibition_id: 'exh_1', brand_name: 'Fashion Hub', contact_name: 'Sari', contact_email: 'sari@example.com', contact_phone: '081300000002', proposal: 'Pop-up store 2 minggu', status: 'reviewed', internal_notes: 'Tunggu approval leasing', created_at: '2026-09-11T08:00:00Z' },
];

const USERS = [
  { id: 'usr_1', email: 'superadmin@metmal.test', display_name: 'Dev superadmin', role: 'superadmin', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'usr_2', email: 'admin@metmal.test', display_name: 'Admin Operasional', role: 'admin', is_active: true, created_at: '2026-02-01T00:00:00Z' },
  { id: 'usr_3', email: 'viewer@metmal.test', display_name: 'Staf Viewer', role: 'viewer', is_active: false, created_at: '2026-03-01T00:00:00Z' },
];

const ACTIVITY = [
  { id: 'act_1', user_email: 'admin@metmal.test', action: 'create_event', entity_type: 'event', entity_id: 'evt_3', created_at: '2026-09-15T09:00:00Z' },
  { id: 'act_2', user_email: 'superadmin@metmal.test', action: 'publish_draft', entity_type: 'draft_event', entity_id: 'drf_9', created_at: '2026-09-14T09:00:00Z' },
  { id: 'act_3', user_email: 'admin@metmal.test', action: 'update_user', entity_type: 'user', entity_id: 'usr_3', created_at: '2026-09-13T09:00:00Z' },
];

// Baris MENTAH seperti backend (`eventsApi.fetchEvents` memetakan snake→camel;
// `DbThemeRow` = { id, name, date_start, date_end, color }).
const THEMES = [
  { id: 'thm_1', name: 'Kebangkitan Komunitas', date_start: '2026-01-01', date_end: '2026-03-31', color: '#00918E' },
  { id: 'thm_2', name: 'Gaya Hidup & Kuliner', date_start: '2026-04-01', date_end: '2026-06-30', color: '#E24378' },
  { id: 'thm_3', name: 'Inovasi & Teknologi', date_start: '2026-07-01', date_end: '2026-09-30', color: '#00554C' },
  { id: 'thm_4', name: 'Festival Akhir Tahun', date_start: '2026-10-01', date_end: '2026-12-31', color: '#33A8A5' },
];

const ALBUMS = {
  albums: [
    { id: 'alb_1', name: 'Pameran Otomotif 2026', slug: 'pameran-otomotif-2026', description: 'Dokumentasi pameran otomotif', event_date: '2026-07-16', cover_photo_url: IMG, sort_order: 1, event_id: 'evt_1', lokasi: 'Atrium Utama', theme_id: '' },
    { id: 'alb_2', name: 'Bazaar Kuliner', slug: 'bazaar-kuliner', description: '', event_date: '2026-09-25', cover_photo_url: IMG, sort_order: 2, event_id: 'evt_2', lokasi: 'Main Atrium', theme_id: '' },
  ],
  photos: [
    { id: 'ph_1', url: IMG, caption: 'Pembukaan', event_date: '2026-07-16', sort_order: 1, album_id: 'alb_1', event_id: 'evt_1' },
    { id: 'ph_2', url: IMG, caption: 'Pengunjung', event_date: '2026-07-16', sort_order: 2, album_id: 'alb_1', event_id: 'evt_1' },
  ],
};

const AREAS_RESP = {
  areas: AREAS.map((a) => ({ ...a, photo_count: 3 })),
  photos: [{ id: 'aph_1', area_id: 'era_1', url: IMG, caption: 'Atrium' }],
};

const NEWS = [
  { id: 'news_1', title: 'Metmal Gelar Bazaar Kuliner Akhir Pekan', slug: 'bazaar-kuliner', excerpt: 'Lebih dari 40 tenant kuliner ikut meramaikan bazaar akhir pekan ini.', content: 'Isi artikel...', cover_image_url: IMG, author: 'Marcomm', status: 'published', published_at: '2026-09-10T08:00:00Z', created_at: '2026-09-10T08:00:00Z', updated_at: '2026-09-10T08:00:00Z' },
  { id: 'news_2', title: 'Program Casual Leasing Dibuka', slug: 'casual-leasing', excerpt: 'Pendaftaran casual leasing kuartal empat resmi dibuka.', content: 'Isi artikel...', cover_image_url: '', author: 'Leasing', status: 'draft', published_at: null, created_at: '2026-09-12T08:00:00Z' },
];

const SPONSOR_EVENTS = [
  { id: 'evt_3', acara: 'Talkshow Brand Lokal', date_str: '2026-10-05', proposal: { file_url: IMG, file_name: 'proposal.pdf', mime_type: 'application/pdf' } },
];

const SURVEY_STATS = {
  total_responses: 42,
  organizer_responses: 18,
  public_responses: 24,
  unique_events: 6,
  avg_overall: 4.2,
  nps_score: 52,
  mall_avg: { cleanliness: 8.6, staff_service: 8.4, coordination: 8.1, security: 9.0, overall: 8.5 },
  eo_avg: { event_quality: 8.5, organization: 8, committee_service: 8.5, promotion_accuracy: 7.5, recommendation: 9, overall: 8.3 },
  recent: [
    { id: 'srv_1', event_id: 'evt_1', survey_type: 'public', mall_cleanliness: 9, mall_staff_service: 9, mall_coordination: 8, mall_security: 10, eo_event_quality: 4, eo_organization: 4, eo_committee_service: 4, eo_promotion_accuracy: 4, eo_recommendation: 9, respondent_name: 'Pengunjung A', respondent_email: 'a@example.com', mall_comment: '', eo_comment: '', general_comment: 'Acara bagus dan rapi', created_at: '2026-07-16T10:00:00Z' },
    { id: 'srv_2', event_id: 'evt_1', survey_type: 'public', mall_cleanliness: 8, mall_staff_service: 8, mall_coordination: 7, mall_security: 9, eo_event_quality: 4, eo_organization: 3, eo_committee_service: 4, eo_promotion_accuracy: 4, eo_recommendation: 8, respondent_name: 'Pengunjung B', respondent_email: 'b@example.com', mall_comment: '', eo_comment: '', general_comment: 'Perlu tambah tempat parkir', created_at: '2026-07-16T11:00:00Z' },
  ],
};

const TENANT_SURVEYS = [
  { id: 'tsv_1', event_id: 'evt_1', event_name: 'Pameran Otomotif Bekasi 2026', tenant_name: 'Kopi Metmal', tenant_organization: 'Kopi Metmal', business_category: 'Food & Beverage', overall_rating: 4, status: 'submitted', submitted_at: '2026-07-16T10:00:00Z' },
  { id: 'tsv_2', event_id: 'evt_1', event_name: 'Pameran Otomotif Bekasi 2026', tenant_name: 'Fashion Hub', tenant_organization: 'Fashion Hub', business_category: 'Fashion', overall_rating: 5, status: 'reviewed', submitted_at: '2026-07-16T11:00:00Z' },
  { id: 'tsv_3', event_id: 'evt_2', event_name: 'Bazaar Kuliner Nusantara', tenant_name: 'Bakso Pak Kumis', tenant_organization: 'Bakso Pak Kumis', business_category: 'Food & Beverage', overall_rating: null, status: 'draft', submitted_at: null },
];

const ANALYTICS = [
  { month: 'Jan', count: 4 }, { month: 'Feb', count: 6 }, { month: 'Mar', count: 5 },
  { month: 'Apr', count: 8 }, { month: 'Mei', count: 7 }, { month: 'Jun', count: 9 },
  { month: 'Jul', count: 12 }, { month: 'Agu', count: 10 }, { month: 'Sep', count: 11 },
];

const STATS = {
  total_events: 47, total_drafts: 3, total_registrations: 3, pending_registrations: 2,
  total_users: 3, total_albums: 2, total_areas: 2, total_news: 2, total_sponsors: 2,
  total_exhibitions: 2,
};

// ─── Pemasangan mock ─────────────────────────────────────────────

/**
 * Pasang seluruh mock REST dashboard untuk satu role.
 *
 * `mode: 'empty'` mengosongkan semua koleksi supaya empty state ter-render
 * (empty/loading/error masuk cakupan audit — keputusan grilling).
 * `mode: 'error'` mengembalikan 500 untuk endpoint data, memunculkan error state.
 */
export async function installDashboardMocks(
  page: Page,
  role: AuditRole = 'superadmin',
  mode: 'rich' | 'empty' | 'error' = 'rich',
): Promise<void> {
  const user = {
    id: `user_${role}_001`,
    email: `${role}@metmal.test`,
    display_name: role === 'superadmin' ? 'Dev superadmin' : role,
    role,
    is_active: true,
  };

  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, json: body });
  const ok = (route: Route, data: unknown) => json(route, { success: true, data });
  // Satu titik keputusan empty-mode untuk semua koleksi — ~20 call site harus
  // berperilaku serempak, jadi ini bukan pembungkus sepele.
  function collection<T>(data: T): T | never[] {
    if (mode === 'empty') return [];
    return data;
  }

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace(/^\/api\/v1/, '');
    const method = route.request().method();

    // Auth selalu sukses — role dikontrol dari sini.
    if (p === '/auth/me' || p === '/auth/login') return json(route, { success: true, user });
    if (p === '/auth/logout') return json(route, { success: true });

    // Error state: endpoint data balas 500.
    if (mode === 'error' && !p.startsWith('/auth/') && (method === 'GET' || p.startsWith('/admin/'))) {
      return json(route, { success: false, error: 'Gagal memuat data (simulasi audit)' }, 500);
    }

    // Legacy action-style admin router (mirror server/src/routes/admin.js).
    if (p.startsWith('/admin/')) {
      const action = p.replace('/admin/', '');
      const table: Record<string, unknown> = {
        readDrafts: DRAFTS,
        readRegistrations: REGISTRATIONS,
        listExhibitions: EXHIBITIONS,
        listExhibitionLeads: EXH_LEADS,
        listExhibitionActivations: [{ event_id: 'evt_1', exhibition_id: 'exh_1', acara: 'Pameran Otomotif Bekasi 2026', date_str: '2026-07-15', date_end: null, jam: '10:00 - 22:00', lokasi: 'Atrium Utama', eo: 'PT Otomotif Indonesia' }],
        listLetters: [],
        readUsers: { users: USERS },
        readActivityLog: { logs: ACTIVITY, total: ACTIVITY.length },
        listThemes: THEMES,
      };
      return ok(route, collection(table[action] ?? []));
    }

    if (p.startsWith('/events')) return ok(route, collection(EVENTS));
    if (p.startsWith('/themes')) return ok(route, collection(THEMES));
    if (p.startsWith('/holidays')) return ok(route, collection([{ id: 'hol_1', tanggal: '17 Agustus 2026', date_str: '2026-08-17', day: 'Senin', month: 'Agustus', name: 'Hari Kemerdekaan', type: 'nasional' }]));
    if (p.startsWith('/users')) return ok(route, mode === 'empty' ? { users: [] } : { users: USERS });
    if (p.startsWith('/activity-log')) return ok(route, mode === 'empty' ? { logs: [], total: 0, page: 1, limit: 20 } : { logs: ACTIVITY, total: ACTIVITY.length, page: 1, limit: 20 });
    if (p.startsWith('/analytics')) return ok(route, collection(ANALYTICS));
    if (p.startsWith('/stats') || p.startsWith('/summary')) return ok(route, mode === 'empty' ? { ...STATS, total_events: 0, pending_registrations: 0 } : STATS);
    if (p.startsWith('/directory')) return ok(route, { tenants: [], stats: STATS });
    if (p.startsWith('/albums')) return ok(route, mode === 'empty' ? { albums: [], photos: [] } : ALBUMS);
    if (p.startsWith('/areas')) return ok(route, mode === 'empty' ? { areas: [], photos: [] } : AREAS_RESP);
    if (p.startsWith('/news')) return ok(route, collection(NEWS));
    if (p.startsWith('/sponsor/events')) return ok(route, collection(SPONSOR_EVENTS));
    if (p.startsWith('/sponsor-leads')) return ok(route, collection([{ id: 'spl_1', event_id: 'evt_3', name: 'Brand X', email: 'brand@example.com', phone: '0812', message: 'Tertarik support', status: 'pending', created_at: '2026-09-20T08:00:00Z' }]));
    if (p.startsWith('/exhibition-leads')) return ok(route, collection(EXH_LEADS));
    if (p.startsWith('/exhibitions')) return ok(route, collection(EXHIBITIONS));
    if (p.startsWith('/settings/instagram')) return ok(route, []);
    if (p.startsWith('/settings/hero_image')) return ok(route, null);
    if (p.startsWith('/settings/')) return ok(route, null);
    if (p.startsWith('/drafts') || p.startsWith('/draft_events')) return ok(route, collection(DRAFTS));
    if (p.startsWith('/registrations')) return ok(route, collection(REGISTRATIONS));
    if (p.startsWith('/survey/stats') || p.startsWith('/survey/summary')) return ok(route, SURVEY_STATS);
    if (p.startsWith('/survey/')) return ok(route, SURVEY_STATS);
    if (p.startsWith('/tenant/list')) return ok(route, collection(TENANT_SURVEYS));
    if (p.startsWith('/tenant/results-list')) return ok(route, collection(TENANT_SURVEYS));
    if (p.startsWith('/tenant/results-analytics')) return ok(route, SURVEY_STATS);
    if (p.startsWith('/tenant/results-roster')) return ok(route, collection([{ id: 'tnt_1', name: 'Kopi Metmal', floor: 'LTB', lot: 'A-12', category: 'Food & Beverage', logo: '' }]));
    if (p.startsWith('/tenant/config')) return ok(route, { is_active: true });
    if (p.startsWith('/tenant/')) return ok(route, { events: collection(EVENTS), results: collection(TENANT_SURVEYS), analytics: SURVEY_STATS });

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') return json(route, { success: true, data: null });
    return ok(route, []);
  });
}

/**
 * Semai tema sebelum navigasi pertama. `.dark` di-set dari
 * `localStorage['theme']` di `src/App.tsx` (bukan `mmb-dark-mode`); kita juga
 * men-toggle kelasnya langsung supaya aman walau hidrasi lambat.
 */
export async function seedTheme(page: Page, theme: AuditTheme): Promise<void> {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
}

/** Paksa `.dark` + localStorage setelah render (jaring pengaman). */
export async function applyTheme(page: Page, theme: AuditTheme): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    try {
      localStorage.setItem('theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
}
