import { supabase } from '../../lib/supabase';
import { SupabaseApiError, adminAction } from './_shared';
import type {
  CommunityRegistration, TenantEventSurvey, TenantSurveyFormData,
  LetterRequestItem, GeneratedLetter,
  TenantSurveyAnalytics, TenantSurveyEventAnalytics,
  TenantSurveyMonthlyTrend, TenantSurveyEventSummary,
  CommunityDirectoryOrganization, OrganizationType,
} from '../../types';

// ─── Community Registrations ────────────────────────────────────

export async function fetchCommunityRegistrations(): Promise<CommunityRegistration[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: any[] }>('readRegistrations', {});
  if (!result.success) throw new SupabaseApiError(result.error || 'Fetch registrations failed');
  return (result.data || []).map(row => ({
    id: row.id, communityName: row.community_name || '', communityType: row.community_type || '',
    pic: row.pic || '', phone: row.phone || '', email: row.email || '', instagram: row.instagram || '',
    description: row.description || '', preferredDate: row.preferred_date || '',
    status: row.status || 'pending', adminNote: row.admin_note || '', createdAt: row.created_at || '',
    organizationType: mapOrganizationType(row.organization_type) as CommunityRegistration['organizationType'],
    organizationName: row.organization_name || row.community_name || '',
    typeSpecificData: row.type_specific_data || {},
    proposalFileUrl: row.proposal_file_url || '',
    proposalFileName: row.proposal_file_name || '',
    proposalFileSize: typeof row.proposal_file_size === 'number' ? row.proposal_file_size : 0,
  }));
}

export interface RegistrationProposalUpload {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Presign + PUT a registration proposal / company profile straight to R2.
 * Only metadata passes through the serverless function.
 */
export async function uploadRegistrationAttachment(file: File): Promise<RegistrationProposalUpload> {
  const presignRes = await fetch('/api/community-registration', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'presign-registration-file', fileName: file.name, contentType: file.type, fileSize: file.size }),
  });
  const presignResult = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok || !presignResult.success) {
    throw new SupabaseApiError(presignResult.error || 'Gagal menyiapkan unggahan file.');
  }
  const putRes = await fetch(presignResult.uploadUrl, {
    method: 'PUT', headers: { 'Content-Type': file.type }, body: file,
  });
  if (!putRes.ok) throw new SupabaseApiError(`Gagal mengunggah file (${putRes.status}).`);
  return { fileUrl: presignResult.publicUrl, fileName: presignResult.fileName, fileSize: file.size };
}

export async function updateRegistrationStatus(id: string, status: string, adminNote: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateRegistrationStatus', { id, status, adminNote });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update registration failed');
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
  const response = await fetch('/api/community-registration', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
    }),
  });
  if (!response.ok) {
    let errorMsg = 'Registration failed';
    try { const errBody = await response.json(); errorMsg = errBody.error || errorMsg; }
    catch { errorMsg = `Server error (${response.status})`; }
    throw new SupabaseApiError(errorMsg);
  }
  const result = await response.json();
  if (!result.success) throw new SupabaseApiError(result.error || 'Registration failed');
  return { id: result.id || '' };
}

// ─── Generated Letters ──────────────────────────────────────────

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
  let query = supabase.from('generated_letters').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (eventId) query = query.eq('event_id', eventId);
  if (draftEventId) query = query.eq('draft_event_id', draftEventId);
  const { data, error } = await query;
  if (error) throw new SupabaseApiError(error.message);
  return (data || []).map(dbGeneratedLetterToGeneratedLetter);
}

export async function createGeneratedLetter(params: {
  eventId?: string; draftEventId?: string; letterData: LetterRequestItem;
  pdfBase64?: string; pdfUrl?: string; createdBy?: string;
}): Promise<GeneratedLetter> {
  const { data, error } = await supabase.from('generated_letters').insert({
    event_id: params.eventId || null, draft_event_id: params.draftEventId || null,
    letter_data: params.letterData, pdf_base64: params.pdfBase64 || null,
    pdf_url: params.pdfUrl || null, created_by: params.createdBy || null, status: 'active',
  }).select().single();
  if (error) throw new SupabaseApiError(error.message);
  if (!data) throw new SupabaseApiError('Data surat tidak tersedia setelah disimpan');
  return dbGeneratedLetterToGeneratedLetter(data as DbGeneratedLetter);
}

export async function updateGeneratedLetter(
  id: string, updates: Partial<Pick<GeneratedLetter, 'letterData' | 'pdfUrl' | 'pdfBase64' | 'status'>>
): Promise<GeneratedLetter> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.letterData !== undefined) dbUpdates.letter_data = updates.letterData;
  if (updates.pdfUrl !== undefined) dbUpdates.pdf_url = updates.pdfUrl;
  if (updates.pdfBase64 !== undefined) dbUpdates.pdf_base64 = updates.pdfBase64;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  const { data, error } = await supabase.from('generated_letters')
    .update(dbUpdates).eq('id', id).select().single();
  if (error) throw new SupabaseApiError(error.message);
  if (!data) throw new SupabaseApiError('Data surat tidak tersedia setelah diperbarui');
  return dbGeneratedLetterToGeneratedLetter(data as DbGeneratedLetter);
}

export async function deleteGeneratedLetter(id: string): Promise<void> {
  const { error } = await supabase.from('generated_letters').update({ status: 'deleted' }).eq('id', id);
  if (error) throw new SupabaseApiError(error.message);
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
  try {
    const params = new URLSearchParams({ action: 'list' });
    if (eventId) params.set('event_id', eventId);
    const res = await fetch(`/api/tenant-survey?${params}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((row: DbTenantSurvey) => dbTenantSurveyToTenantSurvey(row));
      }
    }
  } catch { /* fall through */ }
  let query = supabase.from('tenant_event_surveys').select('*').order('created_at', { ascending: false });
  if (eventId) query = query.eq('event_id', eventId);
  const { data, error } = await query;
  if (error) throw new SupabaseApiError(error.message);
  return (data || []).map((row) => dbTenantSurveyToTenantSurvey(row as DbTenantSurvey));
}

export async function fetchPublicTenantSurveyResults(eventId?: string): Promise<TenantEventSurvey[]> {
  const params = new URLSearchParams({ mode: 'public', action: 'results-list' });
  if (eventId) params.set('event_id', eventId);
  const res = await fetch(`/api/tenant-survey?${params}`);
  if (res.status === 429) throw new SupabaseApiError('Terlalu banyak permintaan. Coba lagi sebentar.');
  if (!res.ok) throw new SupabaseApiError('Gagal memuat hasil survey');
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) throw new SupabaseApiError(json.error || 'Gagal memuat hasil survey');
  return json.data.map((row: DbTenantSurvey) => dbTenantSurveyToTenantSurvey(row));
}

export async function fetchTenantSurveyById(id: string): Promise<TenantEventSurvey> {
  const { data, error } = await supabase.from('tenant_event_surveys').select('*').eq('id', id).single();
  if (error) throw new SupabaseApiError(error.message);
  if (!data) throw new SupabaseApiError('Survey tidak ditemukan');
  return dbTenantSurveyToTenantSurvey(data as DbTenantSurvey);
}

export async function checkTenantSurveyDuplicate(eventId: string, tenantUserId: string): Promise<{ alreadySubmitted: boolean; existingSurveyId?: string }> {
  const { data, error } = await supabase.from('tenant_event_surveys')
    .select('id').eq('event_id', eventId).eq('tenant_user_id', tenantUserId)
    .eq('status', 'submitted').maybeSingle();
  if (error) throw new SupabaseApiError(error.message);
  return { alreadySubmitted: !!data, existingSurveyId: data?.id };
}

export async function createTenantSurvey(formData: TenantSurveyFormData): Promise<TenantEventSurvey> {
  const { data: { user } } = await supabase.auth.getUser();
  const row = tenantSurveyFormToDbRow(formData, user?.id);
  const { data, error } = await supabase.from('tenant_event_surveys').insert(row).select().single();
  if (error) {
    if (error.code === '23505') throw new SupabaseApiError('Anda sudah pernah mengirimkan survey untuk event ini.');
    throw new SupabaseApiError(error.message);
  }
  if (!data) throw new SupabaseApiError('Data survey tidak tersedia setelah disimpan');
  return dbTenantSurveyToTenantSurvey(data as DbTenantSurvey);
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
  const { data, error } = await supabase.from('tenant_event_surveys').update(dbUpdates).eq('id', id).select().single();
  if (error) { if (error.code === '23505') throw new SupabaseApiError('Survey sudah pernah dikirim untuk event ini.'); throw new SupabaseApiError(error.message); }
  if (!data) throw new SupabaseApiError('Data survey tidak tersedia setelah diperbarui');
  return dbTenantSurveyToTenantSurvey(data as DbTenantSurvey);
}

export async function submitTenantSurvey(id: string): Promise<TenantEventSurvey> {
  return updateTenantSurvey(id, { status: 'submitted' });
}

async function getTenantSurveyAccessToken(): Promise<string> {
  try { const { data } = await supabase.auth.getSession(); if (data.session?.access_token) return data.session.access_token; } catch {}
  try { const keys = Object.keys(localStorage); const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token')); if (sbKey) { const raw = JSON.parse(localStorage.getItem(sbKey) || '{}') as { access_token?: string }; return raw.access_token || ''; } } catch {}
  return '';
}

export async function reviewTenantSurvey(id: string, reviewNotes = ''): Promise<TenantEventSurvey> {
  const token = await getTenantSurveyAccessToken();
  const res = await fetch('/api/tenant-survey?action=review', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ id, review_notes: reviewNotes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new SupabaseApiError(json.error || 'Gagal me-review survey');
  return dbTenantSurveyToTenantSurvey(json.data as DbTenantSurvey);
}

export async function deleteTenantSurvey(id: string): Promise<void> {
  const token = await getTenantSurveyAccessToken();
  const res = await fetch('/api/tenant-survey?action=delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ id }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new SupabaseApiError(json.error || 'Gagal menghapus survey');
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
  const params = new URLSearchParams({ action: 'analytics' });
  if (opts?.group) params.set('group', opts.group);
  if (opts?.eventId) params.set('event_id', opts.eventId);
  try {
    const res = await fetch(`/api/tenant-survey?${params}`);
    if (res.ok) { const json = await res.json(); if (json.success && Array.isArray(json.data)) return json.data; }
  } catch {}
  const { data, error } = await supabase.rpc('get_tenant_survey_analytics');
  if (error) throw new SupabaseApiError(error.message);
  return (data || []) as unknown[];
}

export function fetchTenantSurveyEventAnalytics(eventId?: string): Promise<TenantSurveyEventAnalytics[]> {
  return fetchTenantSurveyAnalyticsImpl({ group: 'event', eventId }) as Promise<TenantSurveyEventAnalytics[]>;
}

export function fetchTenantSurveyMonthlyTrend(eventId?: string): Promise<TenantSurveyMonthlyTrend[]> {
  return fetchTenantSurveyAnalyticsImpl({ group: 'month', eventId }) as Promise<TenantSurveyMonthlyTrend[]>;
}

export async function fetchPublicTenantSurveyMonthlyTrend(eventId?: string): Promise<TenantSurveyMonthlyTrend[]> {
  const params = new URLSearchParams({ mode: 'public', action: 'results-analytics', group: 'month' });
  if (eventId) params.set('event_id', eventId);
  const res = await fetch(`/api/tenant-survey?${params}`);
  if (res.status === 429) throw new SupabaseApiError('Terlalu banyak permintaan. Coba lagi sebentar.');
  if (!res.ok) throw new SupabaseApiError('Gagal memuat trend bulanan');
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return [];
  return json.data as TenantSurveyMonthlyTrend[];
}

export async function fetchTenantSurveyEventSummary(eventId: string): Promise<TenantSurveyEventSummary | null> {
  try {
    const res = await fetch(`/api/tenant-survey?action=summary&event_id=${encodeURIComponent(eventId)}`);
    if (res.ok) { const json = await res.json(); if (json.success && json.data) return json.data as TenantSurveyEventSummary; }
  } catch {}
  const { data, error } = await supabase.rpc('get_tenant_survey_event_summary', { p_event_id: eventId });
  if (error) throw new SupabaseApiError(error.message);
  if (!data || (data as TenantSurveyEventSummary).tenant_survey_status === 'none') return null;
  return data as TenantSurveyEventSummary;
}

// ─── Public Tenant Survey ────────────────────────────────────────

export interface PublicTenantSurveyEventInfo {
  id: string; acara: string; tanggal: string; lokasi: string; eo: string; status: string; is_active?: boolean;
}

export async function fetchPublicTenantSurveyEvent(eventId: string): Promise<PublicTenantSurveyEventInfo | null> {
  try {
    const res = await fetch(`/api/tenant-survey?mode=public&action=event-info&event_id=${encodeURIComponent(eventId)}`);
    if (res.ok) { const json = await res.json(); if (json.success && json.event) return { ...json.event, is_active: json.is_active === true }; }
    if (res.status === 404) return null;
  } catch {}
  const { data, error } = await supabase.from('events').select('id, acara, tanggal, lokasi, eo, status').eq('id', eventId).single();
  if (error || !data) return null;
  return { ...(data as PublicTenantSurveyEventInfo), is_active: false };
}

export async function fetchPublicTenantSurveyEvents(): Promise<PublicTenantSurveyEventInfo[]> {
  try {
    const res = await fetch('/api/tenant-survey?mode=public&action=events');
    if (res.ok) { const json = await res.json(); if (json.success && Array.isArray(json.events)) return json.events; }
  } catch {}
  const { data, error } = await supabase.from('events').select('id, acara, tanggal, lokasi, eo, status')
    .in('status', ['past', 'ongoing']).order('tanggal', { ascending: false }).limit(200);
  if (error || !data) return [];
  return data as PublicTenantSurveyEventInfo[];
}

export interface TenantDropdownOption {
  id: string; name: string; floor: string; lot: string; category: string;
  pic: string; picTelp: string; logo: string; status: string; participantEvoucher: string;
}

export async function fetchTenantDetail(id: string): Promise<{ id: string; name: string; pic: string; picTelp: string } | null> {
  const tid = (id || '').trim(); if (!tid) return null;
  try {
    const res = await fetch(`/api/tenant-survey?mode=public&action=tenant-detail&id=${encodeURIComponent(tid)}`);
    if (res.ok) { const json = await res.json(); if (json.success && json.tenant) return json.tenant; }
  } catch {}
  return null;
}

export async function fetchActiveTenants(query?: string): Promise<TenantDropdownOption[]> {
  const q = (query || '').trim(); if (q.length < 2) return [];
  try {
    const res = await fetch(`/api/tenant-survey?mode=public&action=tenants&q=${encodeURIComponent(q)}`);
    if (res.ok) { const json = await res.json(); if (json.success && Array.isArray(json.tenants)) return json.tenants; }
  } catch {}
  return [];
}

export interface TenantRosterItem { id: string; name: string; floor: string; lot: string; category: string; logo: string; }

export async function fetchTenantRoster(): Promise<TenantRosterItem[]> {
  try {
    const res = await fetch('/api/tenant-survey?action=tenant-roster', { credentials: 'include' });
    if (res.ok) { const json = await res.json(); if (json.success && Array.isArray(json.tenants)) return json.tenants as TenantRosterItem[]; }
  } catch {}
  return [];
}

export async function fetchPublicTenantRoster(): Promise<TenantRosterItem[]> {
  try {
    const res = await fetch('/api/tenant-survey?mode=public&action=results-roster');
    if (res.status === 429) return [];
    if (res.ok) { const json = await res.json(); if (json.success && Array.isArray(json.tenants)) return json.tenants as TenantRosterItem[]; }
  } catch {}
  return [];
}

/** Direktori tenant publik — MID proxy, tanpa PIC/telp. 429/error → [] (degradasi UI). */
export async function fetchPublicTenantDirectory(): Promise<TenantRosterItem[]> {
  try {
    const res = await fetch('/api/tenant-survey?mode=public&action=directory');
    if (res.status === 429) return [];
    if (res.ok) { const json = await res.json(); if (json.success && Array.isArray(json.tenants)) return json.tenants as TenantRosterItem[]; }
  } catch {}
  return [];
}

export async function checkPublicTenantSurveyDuplicate(eventId: string, deviceFingerprint: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenant-survey?mode=public&action=check&event_id=${encodeURIComponent(eventId)}&fingerprint=${encodeURIComponent(deviceFingerprint)}`);
    if (res.ok) { const json = await res.json(); return !!json.submitted; }
  } catch {}
  const { data, error } = await supabase.rpc('check_tenant_survey_submitted_public', { p_event_id: eventId, p_device_fingerprint: deviceFingerprint });
  if (error) return false;
  return !!data;
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
  const res = await fetch('/api/tenant-survey?mode=public&action=submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errMsg = 'Gagal mengirim survey';
    try { const errBody = await res.json(); if (errBody.already_submitted) throw new SupabaseApiError('Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.'); errMsg = errBody.errors?.join(', ') || errBody.error || errMsg; }
    catch (e) { if (e instanceof SupabaseApiError) throw e; errMsg = `Server error (${res.status})`; }
    throw new SupabaseApiError(errMsg);
  }
  const json = await res.json();
  if (!json.success) { if (json.already_submitted) throw new SupabaseApiError('Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.'); throw new SupabaseApiError(json.error || 'Gagal mengirim survey'); }
  return { id: json.id, created_at: json.created_at };
}

export async function fetchPublicCommunityDirectory(): Promise<{
  organizations: CommunityDirectoryOrganization[];
  categories: OrganizationType[];
}> {
  const res = await fetch('/api/community-registration', { method: 'GET' });
  if (!res.ok) throw new SupabaseApiError(`Gagal memuat direktori organisasi (${res.status})`);
  const json = await res.json();
  if (!json.success) throw new SupabaseApiError(json.error || 'Gagal memuat direktori organisasi');
  return { organizations: json.organizations || [], categories: json.categories || [] };
}