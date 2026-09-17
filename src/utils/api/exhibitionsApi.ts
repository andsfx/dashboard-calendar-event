import { adminAction } from './_shared';
import { apiGet, apiPost, ApiError } from '../../lib/rest';
import type {
  Exhibition, ExhibitionInput, ExhibitionLead, ExhibitionLeadInput, ExhibitionActivation,
} from '../../types';

// ─── Pameran & kolaborasi ─────────────────────────────────────────
// Boundary snake_case (DB) ↔ camelCase (client) berhenti di file ini.

/** Admin row memuat activation_count hasil agregasi; publik tidak. */
export interface AdminExhibition extends Exhibition {
  activationCount: number;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function mapExhibition(row: Record<string, unknown>): Exhibition {
  return {
    id: str(row.id),
    title: str(row.title),
    theme: str(row.theme),
    description: str(row.description),
    location: str(row.location),
    dateStart: str(row.date_start),
    dateEnd: str(row.date_end),
    collaborationBrief: str(row.collaboration_brief),
    leasingPic: str(row.leasing_pic),
    marcommPic: str(row.marcomm_pic),
    publication: (str(row.publication) || 'draft') as Exhibition['publication'],
    acceptingApplications: row.accepting_applications === true,
    createdAt: str(row.created_at),
  };
}

function mapLead(row: Record<string, unknown>): ExhibitionLead {
  return {
    id: str(row.id),
    exhibitionId: str(row.exhibition_id),
    organizationName: str(row.organization_name),
    organizationType: (str(row.organization_type) || 'brand') as ExhibitionLead['organizationType'],
    participation: (str(row.participation) || 'booth') as ExhibitionLead['participation'],
    contactName: str(row.contact_name),
    phone: str(row.phone),
    email: str(row.email),
    proposal: str(row.proposal),
    status: (str(row.status) || 'pending') as ExhibitionLead['status'],
    internalNotes: str(row.internal_notes),
    createdAt: str(row.created_at),
  };
}

function mapActivation(row: Record<string, unknown>): ExhibitionActivation {
  const dateStart = str(row.date_str);
  return {
    eventId: str(row.event_id),
    exhibitionId: str(row.exhibition_id),
    title: str(row.acara),
    dateStart,
    dateEnd: str(row.date_end) || dateStart,
    time: str(row.jam),
    location: str(row.lokasi),
    organizer: str(row.eo),
  };
}

// ─── Public reads ────────────────────────────────────────────────

export async function fetchPublicExhibitions(): Promise<Exhibition[]> {
  const rows = await apiGet<Record<string, unknown>[]>('/exhibitions');
  return (rows || []).map(mapExhibition);
}

export async function fetchPublicExhibition(
  id: string,
): Promise<{ exhibition: Exhibition; activations: ExhibitionActivation[] }> {
  const data = await apiGet<{ exhibition: Record<string, unknown>; activations: Record<string, unknown>[] }>(
    `/exhibitions/${encodeURIComponent(id)}`,
  );
  return {
    exhibition: mapExhibition(data.exhibition),
    activations: (data.activations || []).map(mapActivation),
  };
}

/** Public submit — minat kolaborasi brand/EO (tanpa login). */
export async function submitExhibitionLead(input: ExhibitionLeadInput): Promise<void> {
  const result = await apiPost<{ success: boolean; error?: string }>('/exhibition-leads', input, {
    errorMessageFallback: (status) => `Gagal mengirim pengajuan (HTTP ${status})`,
  });
  if (!result.success) throw new ApiError(result.error || 'Gagal mengirim pengajuan kolaborasi');
}

// ─── Admin ───────────────────────────────────────────────────────

export async function fetchExhibitions(): Promise<AdminExhibition[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: Record<string, unknown>[] }>(
    'listExhibitions', {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat pameran');
  return (result.data || []).map(row => ({
    ...mapExhibition(row),
    activationCount: Number(row.activation_count) || 0,
  }));
}

export async function fetchExhibitionActivations(): Promise<ExhibitionActivation[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: Record<string, unknown>[] }>(
    'listExhibitionActivations', {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat event aktivasi');
  return (result.data || []).map(mapActivation);
}

export async function createExhibition(data: ExhibitionInput): Promise<string> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createExhibition', { data });
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat pameran');
  return result.id || '';
}

export async function updateExhibition(id: string, data: ExhibitionInput): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateExhibition', { id, data });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui pameran');
}

export async function deleteExhibition(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteExhibition', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus pameran');
}

export async function fetchExhibitionLeads(exhibitionId?: string): Promise<ExhibitionLead[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: Record<string, unknown>[] }>(
    'listExhibitionLeads', exhibitionId ? { exhibitionId } : {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat pengajuan kolaborasi');
  return (result.data || []).map(mapLead);
}

export async function updateExhibitionLead(
  id: string,
  status: ExhibitionLead['status'],
  internalNotes?: string,
): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateExhibitionLead', {
    id, status, ...(internalNotes !== undefined ? { internalNotes } : {}),
  });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui pengajuan');
}

export async function linkExhibitionActivation(exhibitionId: string, eventId: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('linkExhibitionActivation', {
    exhibitionId, eventId,
  });
  if (!result.success) throw new ApiError(result.error || 'Gagal menautkan event aktivasi');
}

export async function unlinkExhibitionActivation(eventId: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('unlinkExhibitionActivation', { eventId });
  if (!result.success) throw new ApiError(result.error || 'Gagal melepas event aktivasi');
}
