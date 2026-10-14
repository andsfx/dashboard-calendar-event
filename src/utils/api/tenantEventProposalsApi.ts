import { adminAction } from './_shared';
import { apiPost, ApiError } from '../../lib/rest';
import type {
  TenantEventProposal, TenantEventProposalInput, TenantEventProposalStatus, TenantProposalUpload,
} from '../../types';

// ─── Kolaborasi tenant ────────────────────────────────────────────
// Boundary snake_case (DB) ↔ camelCase (client) berhenti di file ini.
// Submit & presign lampiran bersifat PUBLIK (tanpa sesi); baca/ubah antrean
// lewat adminAction ber-guard.

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function mapProposal(row: Record<string, unknown>): TenantEventProposal {
  return {
    id: str(row.id),
    tenantId: str(row.tenant_id),
    tenantName: str(row.tenant_name),
    unitNumber: str(row.unit_number),
    tenantCategory: str(row.tenant_category),
    contactName: str(row.contact_name),
    phone: str(row.phone),
    email: str(row.email),
    eventTitle: str(row.event_title),
    eventType: (str(row.event_type) || 'other') as TenantEventProposal['eventType'],
    eventDescription: str(row.event_description),
    proposedStart: str(row.proposed_start),
    proposedEnd: str(row.proposed_end),
    preferredArea: str(row.preferred_area),
    expectedVisitors: str(row.expected_visitors),
    needs: str(row.needs),
    proposalFileUrl: str(row.proposal_file_url),
    proposalFileName: str(row.proposal_file_name),
    proposalMimeType: str(row.proposal_mime_type),
    proposalFileSize: Number(row.proposal_file_size) || 0,
    status: (str(row.status) || 'pending') as TenantEventProposal['status'],
    internalNotes: str(row.internal_notes),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

/** Payload form (camelCase) → kolom DB (snake_case) untuk POST publik. */
function toDbRow(input: TenantEventProposalInput): Record<string, unknown> {
  return {
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    unitNumber: input.unitNumber,
    tenantCategory: input.tenantCategory,
    contactName: input.contactName,
    phone: input.phone,
    email: input.email,
    eventTitle: input.eventTitle,
    eventType: input.eventType,
    eventDescription: input.eventDescription,
    proposedStart: input.proposedStart,
    proposedEnd: input.proposedEnd,
    preferredArea: input.preferredArea,
    expectedVisitors: input.expectedVisitors,
    needs: input.needs,
    proposalFileUrl: input.proposalFileUrl,
    proposalFileName: input.proposalFileName,
    proposalMimeType: input.proposalMimeType,
  };
}

/**
 * Presign lampiran ke R2 lalu PUT langsung dari browser.
 *
 * Route presign publik terbatas ini hanya menerima dokumen (PDF/DOC/DOCX) dan
 * memaksa folder `tenant-proposals/`; server memverifikasi ulang objeknya saat
 * submit.
 */
export async function uploadTenantProposalAttachment(file: File): Promise<TenantProposalUpload> {
  const presign = await apiPost<{ success: boolean; error?: string; uploadUrl?: string; publicUrl?: string }>(
    '/tenant-event-proposals/attachment',
    { originalName: file.name, contentType: file.type },
    { errorMessageFallback: () => 'Gagal menyiapkan unggahan lampiran' },
  );
  if (!presign.success) throw new ApiError(presign.error || 'Gagal menyiapkan unggahan lampiran');
  if (!presign.uploadUrl || !presign.publicUrl) throw new ApiError('Gagal menyiapkan unggahan lampiran');

  const uploadRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new ApiError('Gagal mengunggah lampiran');

  return { fileUrl: presign.publicUrl, fileName: file.name, mimeType: file.type };
}

/** Submit publik — pengajuan kolaborasi tenant (tanpa login). */
export async function submitTenantEventProposal(input: TenantEventProposalInput): Promise<void> {
  const result = await apiPost<{ success: boolean; error?: string }>(
    '/tenant-event-proposals',
    toDbRow(input),
    { errorMessageFallback: (status) => `Gagal mengirim pengajuan (HTTP ${status})` },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal mengirim pengajuan kolaborasi');
}

// ─── Admin (antrean review) ──────────────────────────────────────

export async function fetchTenantEventProposals(): Promise<TenantEventProposal[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: Record<string, unknown>[] }>(
    'listTenantEventProposals', {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat pengajuan kolaborasi tenant');
  return (result.data || []).map(mapProposal);
}

export async function updateTenantEventProposal(
  id: string,
  patch: { status?: TenantEventProposalStatus; internalNotes?: string },
): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateTenantEventProposal', { id, ...patch });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui pengajuan');
}

export async function deleteTenantEventProposal(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteTenantEventProposal', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus pengajuan');
}
