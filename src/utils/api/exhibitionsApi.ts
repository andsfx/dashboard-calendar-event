import { adminAction } from './_shared';
import { apiGet, apiPost, ApiError } from '../../lib/rest';
import type {
  Exhibition, ExhibitionInput, ExhibitionLead, ExhibitionLeadInput, ExhibitionActivation,
  ExhibitionSlot, ExhibitionSubmissionResult, PublicAgendaItem,
  CollaborationContributionType, EstimatedParticipants, ExhibitionOrganizationType,
  ExhibitionProgramStatus, ExhibitionSlotStatus, TechnicalNeed,
} from '../../types';

// ─── Pameran & kolaborasi ─────────────────────────────────────────
// Boundary snake_case (DB) ↔ camelCase (client) berhenti di file ini.

/** Admin row memuat activation_count hasil agregasi; publik tidak. */
export interface AdminExhibition extends Exhibition {
  activationCount: number;
}

export interface PublicExhibitionDetail {
  exhibition: Exhibition;
  activations: ExhibitionActivation[];
  slots: ExhibitionSlot[];
  agenda: PublicAgendaItem[];
}

export interface ExhibitionSlotInput {
  slotDate: string;
  startTime: string;
  endTime: string;
  zoneName: string;
  capacity: number;
  slotStatus: ExhibitionSlotStatus;
  publicNote: string;
}

export interface CollaborationReviewPatch {
  status?: ExhibitionLead['status'];
  internalNotes?: string;
  publicActivityTitle?: string;
  publicActivitySummary?: string;
  isPublicAgenda?: boolean;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function strArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(str);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(str) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function jsonObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapExhibition(row: Record<string, unknown>): Exhibition {
  return {
    id: str(row.id),
    slug: str(row.slug),
    title: str(row.title),
    subtitle: str(row.subtitle),
    programType: (str(row.program_type) || 'pameran') as Exhibition['programType'],
    theme: str(row.theme),
    description: str(row.description),
    location: str(row.location),
    dateStart: str(row.date_start),
    dateEnd: str(row.date_end),
    scheduleNote: str(row.schedule_note),
    targetAudience: str(row.target_audience),
    collaborationBrief: str(row.collaboration_brief),
    lookingForSummary: str(row.looking_for_summary),
    lookingForTags: strArray(row.looking_for_tags),
    benefits: Array.isArray(row.benefits) ? (row.benefits as Exhibition['benefits']) : [],
    coverImageUrl: str(row.cover_image_url),
    leasingPic: str(row.leasing_pic),
    marcommPic: str(row.marcomm_pic),
    publication: (str(row.publication) || 'draft') as Exhibition['publication'],
    status: (str(row.status) || 'draft') as ExhibitionProgramStatus,
    isFeatured: row.is_featured === true,
    acceptingApplications: row.accepting_applications === true,
    defaultOrganizationType: (str(row.default_organization_type) || 'komunitas') as ExhibitionOrganizationType,
    formConfig: jsonObject<Exhibition['formConfig']>(row.form_config, {}),
    createdAt: str(row.created_at),
  };
}

function mapSlot(row: Record<string, unknown>): ExhibitionSlot {
  return {
    id: str(row.id),
    exhibitionId: str(row.exhibition_id),
    slotDate: str(row.slot_date),
    startTime: str(row.start_time).slice(0, 5),
    endTime: str(row.end_time).slice(0, 5),
    zoneName: str(row.zone_name),
    capacity: num(row.capacity, 1),
    slotStatus: (str(row.slot_status) || 'open') as ExhibitionSlotStatus,
    publicNote: str(row.public_note),
  };
}

function mapAgenda(row: Record<string, unknown>): PublicAgendaItem {
  return {
    id: str(row.id),
    programId: str(row.program_id),
    slotId: str(row.slot_id),
    organizationName: str(row.organization_name),
    organizationType: (str(row.organization_type) || 'komunitas') as ExhibitionOrganizationType,
    contributionType: (str(row.contribution_type) || 'pengisi_aktivasi') as CollaborationContributionType,
    publicActivityTitle: str(row.public_activity_title),
    publicActivitySummary: str(row.public_activity_summary),
    status: (str(row.status) || 'approved') as PublicAgendaItem['status'],
    slotDate: str(row.slot_date),
    startTime: str(row.start_time).slice(0, 5),
    endTime: str(row.end_time).slice(0, 5),
    zoneName: str(row.zone_name),
  };
}

function mapLead(row: Record<string, unknown>): ExhibitionLead {
  return {
    id: str(row.id),
    exhibitionId: str(row.exhibition_id),
    referenceCode: str(row.reference_code),
    slotId: str(row.slot_id),
    organizationName: str(row.organization_name),
    organizationType: (str(row.organization_type) || 'komunitas') as ExhibitionOrganizationType,
    participation: (str(row.participation) || 'booth') as ExhibitionLead['participation'],
    contributionType: (str(row.contribution_type) || 'pengisi_aktivasi') as CollaborationContributionType,
    socialMediaHandle: str(row.social_media_handle),
    preferredDateNote: str(row.preferred_date_note),
    estimatedParticipants: (str(row.estimated_participants) || null) as EstimatedParticipants | null,
    technicalNeeds: strArray(row.technical_needs) as TechnicalNeed[],
    technicalNeedsNote: str(row.technical_needs_note),
    contactName: str(row.contact_name),
    phone: str(row.phone),
    email: str(row.email),
    proposal: str(row.proposal),
    status: (str(row.status) || 'submitted') as ExhibitionLead['status'],
    publicActivityTitle: str(row.public_activity_title),
    publicActivitySummary: str(row.public_activity_summary),
    isPublicAgenda: row.is_public_agenda === true,
    syncedEventId: str(row.synced_event_id),
    internalNotes: str(row.internal_notes),
    reviewedAt: str(row.reviewed_at),
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

export async function fetchPublicExhibition(idOrSlug: string): Promise<PublicExhibitionDetail> {
  const data = await apiGet<{
    exhibition: Record<string, unknown>;
    activations?: Record<string, unknown>[];
    slots?: Record<string, unknown>[];
    agenda?: Record<string, unknown>[];
  }>(`/exhibitions/${encodeURIComponent(idOrSlug)}`);
  return {
    exhibition: mapExhibition(data.exhibition),
    activations: (data.activations || []).map(mapActivation),
    slots: (data.slots || []).map(mapSlot),
    agenda: (data.agenda || []).map(mapAgenda),
  };
}

/** Public submit: pengajuan kolaborasi (tanpa login). Balikan hanya kode referensi. */
export async function submitExhibitionLead(input: ExhibitionLeadInput): Promise<ExhibitionSubmissionResult> {
  const result = await apiPost<{ success: boolean; error?: string; id?: string; referenceCode?: string }>(
    '/exhibition-leads', input,
    { errorMessageFallback: (status) => `Gagal mengirim pengajuan (HTTP ${status})` },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal mengirim pengajuan kolaborasi');
  return { id: result.id || '', referenceCode: result.referenceCode || '' };
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

export async function setExhibitionPublication(id: string, published: boolean): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('setExhibitionPublication', { id, published });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui publikasi program');
}

export async function fetchExhibitionLeads(exhibitionId?: string): Promise<ExhibitionLead[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: Record<string, unknown>[] }>(
    'listExhibitionLeads', exhibitionId ? { exhibitionId } : {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat pengajuan kolaborasi');
  return (result.data || []).map(mapLead);
}

export async function updateExhibitionLead(id: string, patch: CollaborationReviewPatch): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateExhibitionLead', {
    id,
    status: patch.status || 'submitted',
    ...(patch.internalNotes !== undefined ? { internalNotes: patch.internalNotes } : {}),
    ...(patch.publicActivityTitle !== undefined ? { publicActivityTitle: patch.publicActivityTitle } : {}),
    ...(patch.publicActivitySummary !== undefined ? { publicActivitySummary: patch.publicActivitySummary } : {}),
    ...(patch.isPublicAgenda !== undefined ? { isPublicAgenda: patch.isPublicAgenda } : {}),
  });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui pengajuan');
}

export async function publishCollaborationToEvent(id: string): Promise<string> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>(
    'publishCollaborationToEvent', { id },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal menerbitkan ke jadwal event');
  return result.id || '';
}

export async function fetchExhibitionSlots(exhibitionId?: string): Promise<ExhibitionSlot[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: Record<string, unknown>[] }>(
    'listExhibitionSlots', exhibitionId ? { exhibitionId } : {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat slot tanggal');
  return (result.data || []).map(mapSlot);
}

export async function createExhibitionSlot(exhibitionId: string, data: ExhibitionSlotInput): Promise<string> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>(
    'createExhibitionSlot', { exhibitionId, data },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal menambah slot tanggal');
  return result.id || '';
}

export async function updateExhibitionSlot(id: string, data: ExhibitionSlotInput): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateExhibitionSlot', { id, data });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui slot tanggal');
}

export async function deleteExhibitionSlot(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteExhibitionSlot', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus slot tanggal');
}

export async function generateExhibitionSlots(
  exhibitionId: string,
  options: Pick<ExhibitionSlotInput, 'startTime' | 'endTime' | 'zoneName' | 'capacity'>,
): Promise<number> {
  const result = await adminAction<{ success: boolean; error?: string; created?: number }>(
    'generateExhibitionSlots', { exhibitionId, data: options },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat slot hari Minggu');
  return Number(result.created) || 0;
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
