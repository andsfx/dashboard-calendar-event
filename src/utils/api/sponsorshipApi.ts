import { adminAction } from './_shared';
import { uploadToR2 } from './albumsApi';
import { apiGet, apiPost, ApiError } from '../../lib/rest';
import type { SponsorLead, SponsorLeadInput, SponsorLeadStatus, EventProposalEvent } from '../../types';
import { getTodayIsoLocal } from '../eventDateTime';

// ─── Sponsorship / Akuisisi Sponsor ─────────────────────────────────

function mapProposalEvent(row: Record<string, unknown>): EventProposalEvent {
  const raw = row.event_proposals;
  const prop = (raw && typeof raw === 'object')
    ? (Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : (raw as Record<string, unknown>))
    : null;
  return {
    event: {
      id: String(row.id),
      dateStr: String(row.date_str || ''),
      acara: String(row.acara || ''),
      lokasi: String(row.lokasi || ''),
      jam: String(row.jam || ''),
      eo: String(row.eo || ''),
    },
    proposal: prop ? {
      id: String(prop.id),
      eventId: String(row.id),
      fileUrl: String(prop.file_url || ''),
      fileName: String(prop.file_name || ''),
      mimeType: String(prop.mime_type || ''),
    } : {
      id: '', eventId: String(row.id), fileUrl: '', fileName: '', mimeType: '',
    },
  };
}

function mapLead(row: Record<string, unknown>): SponsorLead {
  // server: sl.*, e.acara, e.date_str (flat)
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    eventAcara: row.acara ? String(row.acara) : undefined,
    eventDate: row.date_str ? String(row.date_str) : undefined,
    companyName: String(row.company_name || ''),
    contactName: String(row.contact_name || ''),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    message: String(row.message || ''),
    status: (['pending', 'contacted', 'agreed', 'declined'] as const).includes(row.status as SponsorLeadStatus)
      ? (row.status as SponsorLeadStatus)
      : 'pending',
    internalNotes: String(row.internal_notes || ''),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/** Public submit — minat support via REST VPS (validasi zod + rate limit server-side). */
export async function submitSponsorLead(data: SponsorLeadInput): Promise<void> {
  try {
    const result = await apiPost<{ success: boolean; error?: string }>('/sponsor-leads', {
      eventId: data.eventId,
      companyName: data.companyName,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      message: data.message,
    });
    if (!result.success) throw new ApiError(result.error || 'Gagal mengirim minat support');
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message || 'Gagal mengirim minat support');
    throw err;
  }
}

/** Upcoming (masa depan) events with embedded proposals (REST publik).
 *  Server filter date_str >= CURRENT_DATE (UTC) — client tetap guard ulang
 *  dengan getTodayIsoLocal() (Asia/Jakarta) supaya event lampau tak bocor
 *  ke landing sponsor. */
export async function fetchSponsorEventsWithProposals(): Promise<EventProposalEvent[]> {
  const data = await apiGet<unknown>('/sponsor/events');
  const rows = Array.isArray(data) ? data : [];
  const today = getTodayIsoLocal();
  return rows
    .filter(row => String((row as Record<string, unknown>).date_str || '') >= today)
    .map(row => mapProposalEvent(row as Record<string, unknown>));
}

/** Admin list — all leads with event info via service-role proxy. */
export async function fetchAllSponsorLeads(): Promise<SponsorLead[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: unknown[] }>('listSponsorLeads', {});
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat lead sponsor');
  return (result.data || []).map(row => mapLead(row as Record<string, unknown>));
}

export async function updateSponsorLeadStatus(id: string, status: SponsorLeadStatus, internalNotes?: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>(
    'updateSponsorLeadStatus', { id, status, internalNotes }
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui lead sponsor');
}

export async function deleteSponsorLead(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteSponsorLead', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus lead sponsor');
}

/** Admin — upload a proposal file for an event (upsert 1-to-1). */
export async function setEventProposal(eventId: string, file: File): Promise<void> {
  const url = await uploadToR2(file, 'proposals/');
  const result = await adminAction<{ success: boolean; error?: string }>(
    'setEventProposal', { eventId, fileUrl: url, fileName: file.name, mimeType: file.type }
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal menyimpan proposal event');
}

export async function deleteEventProposal(eventId: string): Promise<void> {
  // m-2 (audit): hapus file R2 ditangani server (deleteEventProposal di supabase-admin.js:
  // hapus R2 dulu dengan kepastian, baru row DB) — client tidak memanggil deleteFromR2 lagi.
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEventProposal', { eventId });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus proposal event');
}
