import { apiGet, apiPost, ApiError } from '../../lib/rest';
import { adminAction } from './_shared';
import { uploadToR2 } from './albumsApi';
import type {
  CommunityRegistration, TenantEventSurvey, TenantSurveyFormData,
  LetterRequestItem, GeneratedLetter,
  TenantSurveyAnalytics, TenantSurveyEventAnalytics,
  TenantSurveyMonthlyTrend, TenantSurveyEventSummary,
  CommunityDirectoryOrganization, OrganizationType,
} from '../../types';

// ─── Community Registrations ────────────────────────────────────

export async function fetchCommunityRegistrations(): Promise<CommunityRegistration[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: unknown[] }>('readRegistrations', {});
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat pendaftaran');
  return (result.data || []).map(row => {
    const r = row as Record<string, unknown>;
    const typeSpecific = (typeof r.type_specific_data === 'object' && r.type_specific_data !== null)
      ? r.type_specific_data as Record<string, string | number>
      : {};
    return {
      id: String(r.id || ''),
      communityName: String(r.community_name || ''),
      communityType: String(r.community_type || ''),
      pic: String(r.pic || ''),
      phone: String(r.phone || ''),
      email: String(r.email || ''),
      instagram: String(r.instagram || ''),
      description: String(r.description || ''),
      preferredDate: String(r.preferred_date || ''),
      status: String(r.status || 'pending') as CommunityRegistration['status'],
      adminNote: String(r.admin_note || ''),
      createdAt: String(r.created_at || ''),
      organizationType: mapOrganizationType(typeof r.organization_type === 'string' ? r.organization_type : undefined) as CommunityRegistration['organizationType'],
      organizationName: String(r.organization_name || r.community_name || ''),
      typeSpecificData: typeSpecific,
      proposalFileUrl: String(r.proposal_file_url || ''),
      proposalFileName: String(r.proposal_file_name || ''),
      proposalFileSize: typeof r.proposal_file_size === 'number' ? r.proposal_file_size : 0,
    };
  });
}

export interface RegistrationProposalUpload {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Presign + PUT a registration proposal / company profile straight to R2.
 * Only metadata passes through the backend REST.
 *
 * TODO (backend): route presign publik untuk registrasi (legacy
 * mode='presign-registration-file' di api/community-registration.js) BELUM ada
 * di extra.js. /r2/presign VPS saat ini staff-only — form publik tanpa sesi
 * akan gagal 401 sampai route publik tersedia. Upload via uploadToR2 (REST)
 * supaya kontraknya sama saat route publik dibuka.
 */
export async function uploadRegistrationAttachment(file: File): Promise<RegistrationProposalUpload> {
  const fileUrl = await uploadToR2(file, 'registrations/');
  return { fileUrl, fileName: file.name, fileSize: file.size };
}

export async function updateRegistrationStatus(id: string, status: string, adminNote: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateRegistrationStatus', { id, status, adminNote });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui pendaftaran');
}

function mapOrganizationType(frontendType?: string): string {
  // Canonical enum is the 8 English values (must match backend validateOrganizationType).
  const valid = ['community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other'];
  if (frontendType && valid.includes(frontendType)) return frontendType;
  // Legacy Indonesian values -> English (backward-compat for older clients)
  const legacy: Record<string, string> = {
    'komunitas': 'community', 'umkm': 'company', 'organisasi': 'ngo', 'lainnya': 'other',
  };
  return legacy[frontendType || ''] || 'other';
}

export async function submitCommunityRegistration(data: {
  communityName: string; communityType: string; pic: string; phone: string;
  email?: string; instagram?: string; description?: string; preferredDate?: string;
  organizationType?: string; organizationName?: string;
  typeSpecificData?: Record<string, string | number>;
  proposalFileUrl?: string; proposalFileName?: string; proposalFileSize?: number;
}): Promise<{ id: string }> {
  try {
    const result = await apiPost<{ success: boolean; error?: string; id?: string }>('/registrations', {
      organization_type: mapOrganizationType(data.organizationType),
      organization_name: data.organizationName || data.communityName,
      pic: data.pic, phone: data.phone, email: data.email || '',
      instagram: data.instagram || '', description: data.description || '',
      preferred_date: data.preferredDate || '',
      community_name: data.communityName, community_type: data.communityType,
      type_specific_data: data.typeSpecificData || {},
      proposal_file_url: data.proposalFileUrl || '',
      proposal_file_name: data.proposalFileName || '',
      proposal_file_size: data.proposalFileSize || 0,
    });
    if (!result.success) throw new ApiError(result.error || 'Gagal mendaftar');
    return { id: result.id || '' };
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Gagal mendaftar');
    throw err;
  }
}

// ─── Generated Letters ──────────────────────────────────────────
// REST: adminAction 'listLetters' | 'createLetter' | 'updateLetter' | 'deleteLetter'
// (di server: admin.js switch + ACTION_SCHEMAS). Mapper dbGeneratedLetterToGeneratedLetter
// tetap dipakai.

interface DbGeneratedLetter {
  id: string; event_id?: string; draft_event_id?: string; letter_data: LetterRequestItem;
  pdf_url?: string; pdf_base64?: string; created_at: string; created_by?: string;
  status: 'active' | 'archived' | 'deleted';
}

function dbGeneratedLetterToGeneratedLetter(row: DbGeneratedLetter): GeneratedLetter {
  return {
    id: row.id, eventId: row.event_id || undefined, draftEventId: row.draft_event_id || undefined,
    letterData: row.letter_data, pdfUrl: row.pdf_url || undefined, pdfBase64: row.pdf_base64 || undefined,
    createdAt: row.created_at, createdBy: row.created_by || undefined, status: row.status,
  };
}

export async function fetchGeneratedLetters(eventId?: string, draftEventId?: string): Promise<GeneratedLetter[]> {
  try {
    const result = await adminAction<{ success: boolean; error?: string; data?: unknown[] }>(
      'listLetters',
      { eventId, draftEventId },
    );
    if (!result.success) return [];
    return (result.data || []).map(row => dbGeneratedLetterToGeneratedLetter(row as DbGeneratedLetter));
  } catch {
    // degradasi: kosong (route mungkin belum tersedia)
    return [];
  }
}

export async function createGeneratedLetter(params: {
  eventId?: string; draftEventId?: string; letterData: LetterRequestItem;
  pdfBase64?: string; pdfUrl?: string; createdBy?: string;
}): Promise<GeneratedLetter> {
  const result = await adminAction<{ success: boolean; error?: string; data?: unknown }>('createLetter', {
    eventId: params.eventId,
    draftEventId: params.draftEventId,
    letterData: params.letterData,
    pdfBase64: params.pdfBase64,
    pdfUrl: params.pdfUrl,
    createdBy: params.createdBy,
  });
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat surat');
  if (!result.data) throw new ApiError('Data surat tidak tersedia setelah disimpan');
  return dbGeneratedLetterToGeneratedLetter(result.data as DbGeneratedLetter);
}

export async function updateGeneratedLetter(
  id: string,
  updates: Partial<Pick<GeneratedLetter, 'letterData' | 'pdfUrl' | 'pdfBase64' | 'status'>>,
): Promise<GeneratedLetter> {
  const result = await adminAction<{ success: boolean; error?: string; data?: unknown }>('updateLetter', { id, updates });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui surat');
  if (!result.data) throw new ApiError('Data surat tidak tersedia setelah diperbarui');
  return dbGeneratedLetterToGeneratedLetter(result.data as DbGeneratedLetter);
}

export async function deleteGeneratedLetter(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteLetter', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus surat');
}

// ─── Tenant Surveys ─────────────────────────────────────────────

interface DbTenantSurvey {
  id: string; event_id: string; tenant_user_id: string | null; tenant_name: string;
  tenant_organization: string; tenant_email: string; tenant_phone: string;
  business_category: 'fnb' | 'retail' | 'jasa' | 'other'; business_subcategory: string;
  sales_lift_pct: number | null; traffic_lift_pct: number | null;
  venue_rating: number | null; management_rating: number | null;
  event_organization_rating: number | null; booth_facility_rating: number | null;
  overall_rating: number | null; feedback_comment: string; improvement_suggestion: string;
  status: string; submitted_at: string | null; reviewed_by: string | null;
  reviewed_at: string | null; review_notes: string; created_at: string; updated_at: string;
  nama_gerai: string | null; lokasi_zona: string | null; kategori: string | null;
  kenaikan_traffic: string | null; kenaikan_sales: string | null;
  feedback_teks: string | null; tenant_id: string | null; pic_name: string | null;
  pic_phone: string | null;
}

function dbTenantSurveyToTenantSurvey(row: DbTenantSurvey): TenantEventSurvey {
  return {
    id: row.id, event_id: row.event_id, tenant_user_id: row.tenant_user_id,
    tenant_name: row.tenant_name || '', tenant_organization: row.tenant_organization || '',
    tenant_email: row.tenant_email || '', tenant_phone: row.tenant_phone || '',
    business_category: row.business_category || 'other', business_subcategory: row.business_subcategory || '',
    sales_lift_pct: row.sales_lift_pct || 0, traffic_lift_pct: row.traffic_lift_pct || 0,
    venue_rating: row.venue_rating, management_rating: row.management_rating,
    event_organization_rating: row.event_organization_rating,
    booth_facility_rating: row.booth_facility_rating, overall_rating: row.overall_rating,
    feedback_comment: row.feedback_comment || '', improvement_suggestion: row.improvement_suggestion || '',
    status: (row.status as TenantEventSurvey['status']) || 'draft',
    submitted_at: row.submitted_at, reviewed_by: row.reviewed_by, reviewed_at: row.reviewed_at,
    review_notes: row.review_notes || '', created_at: row.created_at, updated_at: row.updated_at,
    nama_gerai: row.nama_gerai, lokasi_zona: row.lokasi_zona, kategori: row.kategori,
    kenaikan_traffic: row.kenaikan_traffic, kenaikan_sales: row.kenaikan_sales,
    feedback_teks: row.feedback_teks, tenant_id: row.tenant_id,
    pic_name: row.pic_name, pic_phone: row.pic_phone,
  };
}

function tenantSurveyFormToDbRow(data: TenantSurveyFormData, userId?: string): Record<string, unknown> {
  return {
    event_id: data.event_id, tenant_user_id: userId || null,
    tenant_name: data.tenant_name || '', tenant_organization: data.tenant_organization || '',
    tenant_email: data.tenant_email || '', tenant_phone: data.tenant_phone || '',
    nama_gerai: data.nama_gerai || '', lokasi_zona: data.lokasi_zona || null,
    kategori: data.kategori || null, kenaikan_traffic: data.kenaikan_traffic || null,
    kenaikan_sales: data.kenaikan_sales || null, feedback_teks: data.feedback_teks || '',
    tenant_id: data.tenant_id || null, pic_name: data.pic_name || '', pic_phone: data.pic_phone || '',
    business_category: data.business_category || 'other', business_subcategory: data.business_subcategory || '',
    sales_lift_pct: data.sales_lift_pct ?? null, traffic_lift_pct: data.traffic_lift_pct ?? null,
    venue_rating: data.venue_rating ?? null, management_rating: data.management_rating ?? null,
    event_organization_rating: data.event_organization_rating ?? null,
    booth_facility_rating: data.booth_facility_rating ?? null,
    overall_rating: data.overall_rating ?? null,
    feedback_comment: data.feedback_comment || '', improvement_suggestion: data.improvement_suggestion || '',
    status: 'draft',
  };
}

export async function fetchTenantSurveys(eventId?: string): Promise<TenantEventSurvey[]> {
  const params = new URLSearchParams();
  if (eventId) params.set('event_id', eventId);
  const qs = params.toString();
  const data = await apiGet<unknown>(`/tenant/list${qs ? `?${qs}` : ''}`);
  if (!Array.isArray(data)) return [];
  return data.map(row => dbTenantSurveyToTenantSurvey(row as DbTenantSurvey));
}

export async function fetchPublicTenantSurveyResults(eventId?: string): Promise<TenantEventSurvey[]> {
  const params = new URLSearchParams();
  if (eventId) params.set('event_id', eventId);
  const qs = params.toString();
  const data = await apiGet<unknown>(`/tenant/results-list${qs ? `?${qs}` : ''}`);
  if (!Array.isArray(data)) return [];
  return data.map(row => dbTenantSurveyToTenantSurvey(row as DbTenantSurvey));
}

export async function fetchTenantSurveyById(id: string): Promise<TenantEventSurvey> {
  try {
    const data = await apiGet<unknown>(`/tenant/get?id=${encodeURIComponent(id)}`);
    if (!data) throw new ApiError('Survey tidak ditemukan');
    return dbTenantSurveyToTenantSurvey(data as DbTenantSurvey);
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Survey tidak ditemukan');
    throw err;
  }
}

export async function checkTenantSurveyDuplicate(eventId: string, tenantUserId: string): Promise<{ alreadySubmitted: boolean; existingSurveyId?: string }> {
  // /tenant/list tidak punya filter tenant_user_id — filter client dari row
  // mentah (mirror maybeSingle legacy: id survey submitted milik user).
  const data = await apiGet<unknown>(`/tenant/list?event_id=${encodeURIComponent(eventId)}`);
  const rows = Array.isArray(data) ? data as DbTenantSurvey[] : [];
  const hit = rows.find(r => r.tenant_user_id === tenantUserId && r.status === 'submitted');
  return { alreadySubmitted: !!hit, existingSurveyId: hit?.id };
}

export async function createTenantSurvey(formData: TenantSurveyFormData): Promise<TenantEventSurvey> {
  // User id dari /auth/me (cookie) — server /tenant/create menetapkan
  // tenant_user_id dari sesi auth; mapper tetap pemilik snake→camel.
  let userId: string | undefined;
  try {
    const me = await apiGet<{ success: boolean; user: { id: string } | null }>('/auth/me');
    userId = me?.user?.id ?? undefined;
  } catch {
    // Sesi tak terbaca (mis. JWT belum dikonfigurasi) — biarkan null; server
    // tetap menetapkan tenant_user_id dari auth cookie.
  }
  const row = tenantSurveyFormToDbRow(formData, userId);
  try {
    const result = await apiPost<{ success: boolean; error?: string; data?: unknown }>('/tenant/create', row);
    if (!result.success) throw new ApiError(result.error || 'Gagal membuat survey');
    if (!result.data) throw new ApiError('Data survey tidak tersedia setelah disimpan');
    return dbTenantSurveyToTenantSurvey(result.data as DbTenantSurvey);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === '409') throw new ApiError('Anda sudah pernah mengirimkan survey untuk event ini.');
      throw new ApiError(err.message || 'Gagal membuat survey');
    }
    throw err;
  }
}

export async function updateTenantSurvey(id: string, updates: Partial<TenantSurveyFormData> & { status?: TenantEventSurvey['status'] }): Promise<TenantEventSurvey> {
  const dbUpdates: Record<string, unknown> = {};
  const ratingKeys = ['venue_rating', 'management_rating', 'event_organization_rating', 'booth_facility_rating', 'overall_rating'] as const;
  for (const key of ratingKeys) { if (key in updates) dbUpdates[key] = (updates as Record<string, unknown>)[key] ?? null; }
  const textKeys = ['tenant_name', 'tenant_organization', 'tenant_email', 'tenant_phone', 'nama_gerai', 'lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales', 'business_category', 'business_subcategory', 'feedback_comment', 'improvement_suggestion', 'feedback_teks', 'pic_name', 'pic_phone'] as const;
  for (const key of textKeys) {
    if (key in updates) {
      dbUpdates[key] = (key === 'business_category' || key === 'business_subcategory') ? ((updates as Record<string, unknown>)[key] ?? '') : ((updates as Record<string, unknown>)[key] || '');
    }
  }
  if (updates.status !== undefined) { dbUpdates.status = updates.status; if (updates.status === 'submitted') dbUpdates.submitted_at = new Date().toISOString(); }
  try {
    const result = await apiPost<{ success: boolean; error?: string; data?: unknown }>('/tenant/update', { id, ...dbUpdates });
    if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui survey');
    if (!result.data) throw new ApiError('Data survey tidak tersedia setelah diperbarui');
    return dbTenantSurveyToTenantSurvey(result.data as DbTenantSurvey);
  } catch (err) {
    if (err instanceof ApiError) {
      // 23505 (unique event+user) — server kirim 409 dengan pesan ramah.
      if (err.code === '409') throw new ApiError('Survey sudah pernah dikirim untuk event ini.');
      throw new ApiError(err.message || 'Gagal memperbarui survey');
    }
    throw err;
  }
}

export async function submitTenantSurvey(id: string): Promise<TenantEventSurvey> {
  return updateTenantSurvey(id, { status: 'submitted' });
}

export async function reviewTenantSurvey(id: string, reviewNotes = ''): Promise<TenantEventSurvey> {
  try {
    const result = await apiPost<{ success: boolean; error?: string; data?: unknown }>('/tenant/review', { id, review_notes: reviewNotes });
    if (!result.success) throw new ApiError(result.error || 'Gagal me-review survey');
    return dbTenantSurveyToTenantSurvey(result.data as DbTenantSurvey);
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Gagal me-review survey');
    throw err;
  }
}

export async function deleteTenantSurvey(id: string): Promise<void> {
  try {
    const result = await apiPost<{ success: boolean; error?: string }>('/tenant/delete', { id });
    if (!result.success) throw new ApiError(result.error || 'Gagal menghapus survey');
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Gagal menghapus survey');
    throw err;
  }
}

// ─── Tenant Survey Analytics ─────────────────────────────────────

type AnalyticsGroupMode = 'tenant' | 'event' | 'month';
interface AnalyticsFetchOptions { group?: AnalyticsGroupMode; eventId?: string; }

export function fetchTenantSurveyAnalytics(opts: { eventId?: string }): Promise<TenantSurveyAnalytics[]>;
export function fetchTenantSurveyAnalytics(): Promise<TenantSurveyAnalytics[]>;
export function fetchTenantSurveyAnalytics(opts: { group: 'event'; eventId?: string }): Promise<TenantSurveyEventAnalytics[]>;
export function fetchTenantSurveyAnalytics(opts: { group: 'month'; eventId?: string }): Promise<TenantSurveyMonthlyTrend[]>;
export function fetchTenantSurveyAnalytics(opts?: AnalyticsFetchOptions): Promise<TenantSurveyAnalytics[] | TenantSurveyEventAnalytics[] | TenantSurveyMonthlyTrend[]> {
  return fetchTenantSurveyAnalyticsImpl(opts) as Promise<TenantSurveyAnalytics[] | TenantSurveyEventAnalytics[] | TenantSurveyMonthlyTrend[]>;
}

async function fetchTenantSurveyAnalyticsImpl(opts?: AnalyticsFetchOptions): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (opts?.group) params.set('group', opts.group);
  if (opts?.eventId) params.set('event_id', opts.eventId);
  const qs = params.toString();
  const data = await apiGet<unknown>(`/tenant/analytics${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? data : [];
}

export function fetchTenantSurveyEventAnalytics(eventId?: string): Promise<TenantSurveyEventAnalytics[]> {
  return fetchTenantSurveyAnalyticsImpl({ group: 'event', eventId }) as Promise<TenantSurveyEventAnalytics[]>;
}

export function fetchTenantSurveyMonthlyTrend(eventId?: string): Promise<TenantSurveyMonthlyTrend[]> {
  return fetchTenantSurveyAnalyticsImpl({ group: 'month', eventId }) as Promise<TenantSurveyMonthlyTrend[]>;
}

export async function fetchPublicTenantSurveyMonthlyTrend(eventId?: string): Promise<TenantSurveyMonthlyTrend[]> {
  const params = new URLSearchParams({ group: 'month' });
  if (eventId) params.set('event_id', eventId);
  try {
    const data = await apiGet<unknown>(`/tenant/results-analytics?${params.toString()}`);
    return Array.isArray(data) ? data as TenantSurveyMonthlyTrend[] : [];
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Gagal memuat trend bulanan');
    throw err;
  }
}

export async function fetchTenantSurveyEventSummary(eventId: string): Promise<TenantSurveyEventSummary | null> {
  const data = await apiGet<Record<string, unknown>>(`/tenant/summary?event_id=${encodeURIComponent(eventId)}`);
  if (!data || data.tenant_survey_status === 'none') return null;
  return data as unknown as TenantSurveyEventSummary;
}

// ─── Public Tenant Survey ────────────────────────────────────────

export interface PublicTenantSurveyEventInfo {
  id: string; acara: string; tanggal: string; lokasi: string; eo: string; status: string; is_active?: boolean;
}

export async function fetchPublicTenantSurveyEvent(eventId: string): Promise<PublicTenantSurveyEventInfo | null> {
  try {
    const data = await apiGet<PublicTenantSurveyEventInfo & { is_active?: boolean }>(`/tenant/event-info?event_id=${encodeURIComponent(eventId)}`);
    return data || null;
  } catch (err) {
    // 404 event tak ada / error lain — null (mirror fallback legacy).
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export async function fetchPublicTenantSurveyEvents(): Promise<PublicTenantSurveyEventInfo[]> {
  const data = await apiGet<unknown>('/tenant/events');
  // /tenant/events mengembalikan array; saat tanpa config aktif data = { events: [] }.
  let rows: unknown = data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const rec = data as { events?: unknown };
    rows = Array.isArray(rec.events) ? rec.events : [];
  }
  if (!Array.isArray(rows)) return [];
  return rows as PublicTenantSurveyEventInfo[];
}

export interface TenantDropdownOption {
  id: string; name: string; floor: string; lot: string; category: string;
  pic: string; picTelp: string; logo: string; status: string; participantEvoucher: string;
}

export async function fetchTenantDetail(id: string): Promise<{ id: string; name: string; pic: string; picTelp: string } | null> {
  const tid = (id || '').trim(); if (!tid) return null;
  try {
    const data = await apiGet<{ id: string; name: string; pic: string; picTelp: string }>(`/tenant/tenant-detail?id=${encodeURIComponent(tid)}`);
    return data || null;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export async function fetchActiveTenants(query?: string): Promise<TenantDropdownOption[]> {
  const q = (query || '').trim(); if (q.length < 2) return [];
  try {
    const data = await apiGet<unknown>(`/tenant/tenants?q=${encodeURIComponent(q)}`);
    return Array.isArray(data) ? data as TenantDropdownOption[] : [];
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export interface TenantRosterItem { id: string; name: string; floor: string; lot: string; category: string; logo: string; }

export async function fetchTenantRoster(): Promise<TenantRosterItem[]> {
  try {
    const data = await apiGet<unknown>('/tenant/roster');
    return Array.isArray(data) ? data as TenantRosterItem[] : [];
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export async function fetchPublicTenantRoster(): Promise<TenantRosterItem[]> {
  try {
    const data = await apiGet<unknown>('/tenant/results-roster');
    return Array.isArray(data) ? data as TenantRosterItem[] : [];
  } catch (err) {
    // Semua ApiError → [] (degradasi): konsumen TenantSurveyResultsPage menampilkan
    // pesan rosterError untuk list kosong — tidak menyesatkan seperti direktori.
    if (err instanceof ApiError) return [];
    throw err;
  }
}

/** Direktori tenant publik — MID proxy, tanpa PIC/telp. Error 429/limit atau 5xx tetap []
 *  (degradasi), 4xx lain diteruskan agar UI bisa menampilkan tombol Coba lagi. */
export async function fetchPublicTenantDirectory(): Promise<TenantRosterItem[]> {
  try {
    const data = await apiGet<unknown>('/tenant/directory');
    return Array.isArray(data) ? data as TenantRosterItem[] : [];
  } catch (err) {
    // 429/5xx → degradasi (tampilkan kosong); 4xx lain → rethrow agar UI
    // menampilkan error state + tombol Coba lagi (ApiError.code = HTTP status).
    if (err instanceof ApiError) {
      const status = Number(err.code);
      if (status === 429 || status >= 500) return [];
    }
    throw err;
  }
}

export async function checkPublicTenantSurveyDuplicate(eventId: string, deviceFingerprint: string): Promise<boolean> {
  try {
    const data = await apiGet<{ submitted?: boolean }>(`/tenant/check?event_id=${encodeURIComponent(eventId)}&fingerprint=${encodeURIComponent(deviceFingerprint)}`);
    return data?.submitted === true;
  } catch (err) {
    if (err instanceof ApiError) return false;
    throw err;
  }
}

export interface PublicTenantSurveySubmission extends Omit<TenantSurveyFormData, 'tenant_user_id'> {
  device_fingerprint: string; ip_address?: string; user_agent?: string;
  nama_gerai?: string | null; lokasi_zona?: string | null; kategori?: string | null;
  kenaikan_traffic?: string | null; kenaikan_sales?: string | null; feedback_teks?: string | null;
  tenant_id?: string | null; pic_name?: string | null; pic_phone?: string | null;
  venue_rating?: number | null; management_rating?: number | null;
  event_organization_rating?: number | null; booth_facility_rating?: number | null;
  overall_rating?: number | null; sales_lift_pct?: number | null; traffic_lift_pct?: number | null;
}

export async function submitPublicTenantSurvey(data: PublicTenantSurveySubmission): Promise<{ id: string; created_at: string }> {
  try {
    const result = await apiPost<{ success: boolean; error?: string; id?: string; created_at?: string }>('/tenant/submit', data);
    if (!result.success) {
      // 409 duplikat → server kirim error "Anda sudah pernah mengirimkan survey..."
      throw new ApiError(result.error || 'Gagal mengirim survey');
    }
    return { id: result.id || '', created_at: result.created_at || '' };
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Gagal mengirim survey');
    throw err;
  }
}

export async function fetchPublicCommunityDirectory(): Promise<{
  organizations: CommunityDirectoryOrganization[];
  categories: OrganizationType[];
}> {
  try {
    return await apiGet<{ organizations: CommunityDirectoryOrganization[]; categories: OrganizationType[] }>('/directory');
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Gagal memuat direktori organisasi');
    throw err;
  }
}