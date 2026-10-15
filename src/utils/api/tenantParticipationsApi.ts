import { adminAction } from './_shared';
import { apiGet, apiPost, ApiError } from '../../lib/rest';
import type {
  TenantParticipation,
  TenantParticipationEligibleEvent,
  TenantParticipationInput,
  TenantParticipationPublicItem,
  TenantParticipationStatus,
  TenantParticipationStatusResult,
} from '../../types';

// ─── Partisipasi tenant (open booth & voucher) ────────────────────
// Boundary snake_case (DB) ↔ camelCase (client) berhenti di file ini.
// Submit, daftar approved per event, dropdown event, dan cek status bersifat
// PUBLIK (tanpa sesi); baca/ubah antrean lewat adminAction ber-guard.

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapPublicItem(row: Record<string, unknown>): TenantParticipationPublicItem {
  return {
    tenantName: str(row.tenant_name),
    unitNumber: str(row.unit_number),
    tenantCategory: str(row.tenant_category),
    tenantLogo: str(row.tenant_logo),
    kind: (str(row.kind) || 'both') as TenantParticipationPublicItem['kind'],
    boothArea: str(row.booth_area),
    boothStart: str(row.booth_start),
    boothEnd: str(row.booth_end),
    boothSize: str(row.booth_size),
    boothProducts: str(row.booth_products),
    voucherType: (str(row.voucher_type) || 'other') as TenantParticipationPublicItem['voucherType'],
    voucherTerms: str(row.voucher_terms),
    voucherQuota: num(row.voucher_quota),
    voucherFormat: (str(row.voucher_format) || 'both') as TenantParticipationPublicItem['voucherFormat'],
  };
}

function mapParticipation(row: Record<string, unknown>): TenantParticipation {
  return {
    id: str(row.id),
    code: str(row.code),
    tenantId: str(row.tenant_id),
    tenantName: str(row.tenant_name),
    unitNumber: str(row.unit_number),
    tenantCategory: str(row.tenant_category),
    tenantLogo: str(row.tenant_logo),
    contactName: str(row.contact_name),
    phone: str(row.phone),
    email: str(row.email),
    eventId: str(row.event_id),
    eventTitle: str(row.event_title),
    eventDate: str(row.event_date),
    kind: (str(row.kind) || 'both') as TenantParticipation['kind'],
    boothArea: str(row.booth_area),
    boothStart: str(row.booth_start),
    boothEnd: str(row.booth_end),
    boothSize: str(row.booth_size),
    boothProducts: str(row.booth_products),
    boothScheme: (str(row.booth_scheme) || 'solo') as TenantParticipation['boothScheme'],
    boothNeeds: str(row.booth_needs),
    voucherType: (str(row.voucher_type) || 'other') as TenantParticipation['voucherType'],
    voucherTerms: str(row.voucher_terms),
    voucherQuota: num(row.voucher_quota),
    voucherFormat: (str(row.voucher_format) || 'both') as TenantParticipation['voucherFormat'],
    status: (str(row.status) || 'pending') as TenantParticipation['status'],
    internalNotes: str(row.internal_notes),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

// ─── Publik ───────────────────────────────────────────────────────

/** Event eligible untuk dropdown: published + belum mulai (cutoff H-1 di server). */
export async function fetchTenantParticipationEvents(): Promise<TenantParticipationEligibleEvent[]> {
  const rows = await apiGet<Record<string, unknown>[]>('/tenant-participations/events');
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: str(row.id),
    acara: str(row.acara),
    tanggal: str(row.tanggal),
    dateStr: str(row.date_str),
    dateEnd: (row.date_end == null ? null : str(row.date_end)),
    lokasi: str(row.lokasi),
    categories: Array.isArray(row.categories) ? (row.categories as string[]) : null,
  }));
}

/** Booth & voucher approved untuk satu event — kolom aman saja (tanpa kontak). */
export async function fetchEventTenantParticipations(eventId: string): Promise<TenantParticipationPublicItem[]> {
  const rows = await apiGet<Record<string, unknown>[]>(
    `/tenant-participations?event_id=${encodeURIComponent(eventId)}`,
  );
  return (Array.isArray(rows) ? rows : []).map(mapPublicItem);
}

/** Submit publik — balas kode pengajuan (ditampilkan sekali ke tenant). */
export async function submitTenantParticipation(input: TenantParticipationInput): Promise<string> {
  const result = await apiPost<{ success: boolean; error?: string; code?: string }>(
    '/tenant-participations',
    input,
    { errorMessageFallback: (status) => `Gagal mengirim pengajuan (HTTP ${status})` },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal mengirim pengajuan partisipasi');
  return result.code || '';
}

/** Cek status via kode + nomor telepon. 404 = kode/nomor tidak cocok. */
export async function fetchTenantParticipationStatus(
  code: string,
  phone: string,
): Promise<TenantParticipationStatusResult | null> {
  let result: { success: boolean; error?: string; data?: Record<string, unknown> };
  try {
    result = await apiPost<{ success: boolean; error?: string; data?: Record<string, unknown> }>(
      '/tenant-participations/status',
      { code, phone },
      { errorMessageFallback: () => 'Gagal memeriksa status pengajuan' },
    );
  } catch (err) {
    // 404 dari server = kode atau nomor tidak cocok. Itu jawaban yang sah untuk
    // panel ("tidak ditemukan"), bukan kegagalan teknis — kembalikan null
    // supaya panel tidak menampilkan pesan error sistem.
    if (err instanceof ApiError && err.code === '404') return null;
    throw err;
  }
  if (!result.success || !result.data) return null;
  const row = result.data;
  return {
    code: str(row.code),
    tenantName: str(row.tenant_name),
    eventTitle: str(row.event_title),
    eventDate: row.event_date == null ? null : str(row.event_date),
    kind: (str(row.kind) || 'both') as TenantParticipationStatusResult['kind'],
    status: (str(row.status) || 'pending') as TenantParticipationStatusResult['status'],
    boothArea: str(row.booth_area),
    boothStart: row.booth_start == null ? null : str(row.booth_start),
    boothEnd: row.booth_end == null ? null : str(row.booth_end),
    voucherType: (str(row.voucher_type) || 'other') as TenantParticipationStatusResult['voucherType'],
    voucherTerms: str(row.voucher_terms),
    voucherFormat: (str(row.voucher_format) || 'both') as TenantParticipationStatusResult['voucherFormat'],
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

// ─── Admin (antrean review) ──────────────────────────────────────

export async function fetchTenantParticipations(): Promise<TenantParticipation[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: Record<string, unknown>[] }>(
    'listTenantParticipations', {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat pengajuan partisipasi tenant');
  return (result.data || []).map(mapParticipation);
}

/** Patch review: status, catatan internal, dan/atau koreksi isian (K10). */
export type TenantParticipationPatch = Partial<{
  status: TenantParticipationStatus;
  internalNotes: string;
  boothArea: string;
  boothStart: string;
  boothEnd: string;
  boothSize: string;
  boothProducts: string;
  boothScheme: TenantParticipation['boothScheme'];
  boothNeeds: string;
  voucherType: TenantParticipation['voucherType'];
  voucherTerms: string;
  voucherQuota: number | '';
  voucherFormat: TenantParticipation['voucherFormat'];
}>;

export async function updateTenantParticipation(
  id: string,
  patch: TenantParticipationPatch,
): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateTenantParticipation', { id, ...patch });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui pengajuan');
}

export async function deleteTenantParticipation(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteTenantParticipation', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus pengajuan');
}
