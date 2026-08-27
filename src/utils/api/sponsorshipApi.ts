import { supabase } from '../../lib/supabase';
import { SupabaseApiError, adminAction } from './_shared';
import { uploadToR2 } from './albumsApi';
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
  const event = (row.events && typeof row.events === 'object' && !Array.isArray(row.events))
    ? (row.events as Record<string, unknown>)
    : null;
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    eventAcara: event ? String(event.acara || '') : undefined,
    eventDate: event ? String(event.date_str || '') : undefined,
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

/** Public submit — minat support via proxy service-role (validasi zod + rate limit server-side). */
export async function submitSponsorLead(data: SponsorLeadInput): Promise<void> {
  const response = await fetch('/api/sponsor-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      eventId: data.eventId,
      companyName: data.companyName,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      message: data.message,
    }),
  });
  if (!response.ok) {
    // 400 validasi / 429 rate limit / 500 — tampilkan pesan dari server
    let message = 'Submit sponsor lead failed';
    try {
      const body = (await response.json()) as { error?: unknown };
      if (body?.error) message = String(body.error);
    } catch {
      // non-JSON body — pakai pesan fallback
    }
    throw new SupabaseApiError(message);
  }
}

/** Upcoming (masa depan) events with embedded proposals (anon RLS). Date guard keeps stale-status rows out; landing filters `proposal.fileUrl`; admin uses all rows. */
export async function fetchSponsorEventsWithProposals(): Promise<EventProposalEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, date_str, acara, lokasi, jam, eo, event_proposals(id, file_url, file_name, mime_type)')
    .eq('status', 'upcoming')
    .gte('date_str', getTodayIsoLocal())
    .order('date_str', { ascending: true })
    .limit(100);
  if (error) throw new SupabaseApiError(`Fetch sponsor events failed: ${error.message}`);
  return (data || []).map(row => mapProposalEvent(row as Record<string, unknown>));
}

/** Admin list — all leads with event info via service-role proxy. */
export async function fetchAllSponsorLeads(): Promise<SponsorLead[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: unknown[] }>('listSponsorLeads', {});
  if (!result.success) throw new SupabaseApiError(result.error || 'Fetch sponsor leads failed');
  return (result.data || []).map(row => mapLead(row as Record<string, unknown>));
}

export async function updateSponsorLeadStatus(id: string, status: SponsorLeadStatus, internalNotes?: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>(
    'updateSponsorLeadStatus', { id, status, internalNotes }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Update sponsor lead failed');
}

export async function deleteSponsorLead(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteSponsorLead', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete sponsor lead failed');
}

/** Admin — upload a proposal file for an event (upsert 1-to-1). */
export async function setEventProposal(eventId: string, file: File): Promise<void> {
  const url = await uploadToR2(file, 'proposals/');
  const result = await adminAction<{ success: boolean; error?: string }>(
    'setEventProposal', { eventId, fileUrl: url, fileName: file.name, mimeType: file.type }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Set event proposal failed');
}

export async function deleteEventProposal(eventId: string): Promise<void> {
  // m-2 (audit): hapus file R2 ditangani server (deleteEventProposal di supabase-admin.js:
  // hapus R2 dulu dengan kepastian, baru row DB) — client tidak memanggil deleteFromR2 lagi.
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEventProposal', { eventId });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete event proposal failed');
}
