import { useState } from 'react';
import { Building2, CalendarDays, FileText, Mail, MapPin, Phone, Users } from 'lucide-react';
import { MdButton, MdTextField } from '../md';
import type { TenantEventProposal, TenantEventProposalStatus, TenantEventProposalType } from '../../types';
import { formatDateRange } from '../../utils/eventUtils';

const EVENT_TYPE_LABELS: Record<TenantEventProposalType, string> = {
  promo: 'Promo',
  workshop: 'Workshop',
  exhibition: 'Pameran produk',
  performance: 'Pertunjukan',
  launching: 'Peluncuran',
  other: 'Lainnya',
};

const STATUS_LABELS: Record<TenantEventProposalStatus, string> = {
  pending: 'Menunggu',
  contacted: 'Dihubungi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

/** Sumber tunggal nilai status yang sah; `satisfies` memvalidasi tiap anggota. */
const STATUSES = ['pending', 'contacted', 'approved', 'rejected'] as const satisfies readonly TenantEventProposalStatus[];

interface Props {
  proposals: TenantEventProposal[];
  isLoading: boolean;
  error: string;
  onReview: (id: string, status: TenantEventProposalStatus) => Promise<boolean>;
  onSaveNotes: (id: string, notes: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onConfirm: (options: { title: string; message: string; subject?: string; confirmLabel?: string }) => Promise<boolean>;
  /** Akun demo: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

/**
 * Antrean pengajuan kolaborasi tenant (`/dashboard/tenant-proposals`).
 *
 * Satu kartu per pengajuan, urut terbaru dari server. Menyetujui pengajuan
 * TIDAK membuat Event/Draft (ADR 003) — jadwal tetap disusun eksplisit di
 * Jadwal Event, dan catatan itu ditulis di kartunya supaya tidak dikira bug.
 */
export function TenantProposalManager({
  proposals, isLoading, error, onReview, onSaveNotes, onDelete, onConfirm, readOnly = false,
}: Props) {
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');

  const pendingCount = proposals.filter((item) => item.status === 'pending').length;

  const handleReview = async (id: string, status: TenantEventProposalStatus) => {
    setBusyId(id);
    await onReview(id, status);
    setBusyId('');
  };

  const handleSaveNotes = async (id: string) => {
    const notes = notesDraft[id];
    if (notes === undefined) return;
    setBusyId(id);
    const ok = await onSaveNotes(id, notes);
    if (ok) setNotesDraft((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setBusyId('');
  };

  const handleDelete = async (item: TenantEventProposal) => {
    const ok = await onConfirm({
      title: 'Hapus pengajuan?',
      message: `Pengajuan "${item.eventTitle}" dari ${item.tenantName} akan dihapus permanen, termasuk lampiran proposalnya.`,
      confirmLabel: 'Hapus',
    });
    if (!ok) return;
    setBusyId(item.id);
    await onDelete(item.id);
    setBusyId('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-bold text-[var(--wf-ink)]">Kolaborasi Tenant</h2>
        <p className="text-xs text-[var(--wf-ink-muted)]">
          {pendingCount > 0
            ? `${pendingCount} dari ${proposals.length} pengajuan menunggu tinjauan.`
            : `${proposals.length} pengajuan, tidak ada yang menunggu tinjauan.`}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      {isLoading && proposals.length === 0 && (
        <p className="text-sm text-[var(--wf-ink-muted)]">Memuat pengajuan…</p>
      )}

      {!isLoading && proposals.length === 0 && !error && (
        <p className="text-sm text-[var(--wf-ink-muted)]">
          Belum ada pengajuan. Gerai mengirim pengajuan lewat halaman publik <span className="wf-code">/kolaborasi-tenant</span>.
        </p>
      )}

      <ul className="space-y-3">
        {proposals.map((item) => {
          const notes = notesDraft[item.id] ?? item.internalNotes;
          const notesDirty = notes !== item.internalNotes;
          const busy = busyId === item.id;

          return (
            <li key={item.id} className="rounded-[var(--radius-card)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-[var(--wf-ink)]">
                    <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.tenantName}
                    {item.unitNumber && <span className="font-normal text-[var(--wf-ink-muted)]">· {item.unitNumber}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
                    {item.tenantCategory}
                    {/* ID master MID: gerai yang dipilih dari daftar bisa ditelusuri
                        walau nama diketik ulang berbeda. */}
                    {item.tenantId && (
                      <span className="ml-1 font-mono text-[11px]">· ID gerai {item.tenantId}</span>
                    )}
                    {!item.tenantId && <span className="ml-1">· diisi manual</span>}
                  </p>
                </div>
                <span className="wf-code shrink-0">{STATUS_LABELS[item.status]}</span>
              </div>

              <p className="mt-3 text-sm font-semibold text-[var(--wf-ink)]">
                {item.eventTitle}
                <span className="ml-2 text-xs font-normal text-[var(--wf-ink-muted)]">{EVENT_TYPE_LABELS[item.eventType]}</span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDateRange(item.proposedStart, item.proposedEnd || item.proposedStart)}
                </span>
                {item.preferredArea && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.preferredArea}
                  </span>
                )}
                {item.expectedVisitors && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.expectedVisitors}
                  </span>
                )}
              </p>

              <p className="mt-2 whitespace-pre-line text-sm text-[var(--wf-ink)]">{item.eventDescription}</p>

              {item.needs && (
                <p className="mt-2 text-xs text-[var(--wf-ink-muted)]">Kebutuhan fasilitas: {item.needs}</p>
              )}

              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                <span>{item.contactName}</span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.phone}
                </span>
                {item.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.email}
                  </span>
                )}
              </p>

              {item.proposalFileUrl && (
                <p className="mt-2">
                  <a
                    href={item.proposalFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--wf-accent)] underline-offset-2 hover:underline"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    {item.proposalFileName || 'Lampiran proposal'}
                  </a>
                </p>
              )}

              {!readOnly && (
                <div className="mt-3 space-y-3 border-t border-[var(--wf-rule)] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--wf-ink)]">Ubah status</span>
                    {STATUSES
                      .filter((status) => status !== item.status)
                      .map((status) => (
                        <MdButton
                          key={status}
                          variant="outlined"
                          disabled={busy}
                          onClick={() => void handleReview(item.id, status)}
                        >
                          {STATUS_LABELS[status]}
                        </MdButton>
                      ))}
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <MdTextField
                      className="min-w-[260px] flex-1"
                      type="textarea"
                      rows={2}
                      label="Catatan internal"
                      maxLength={2000}
                      value={notes}
                      onChange={(value) => setNotesDraft((prev) => ({ ...prev, [item.id]: value }))}
                    />
                    <MdButton
                      variant="text"
                      disabled={busy || !notesDirty}
                      onClick={() => void handleSaveNotes(item.id)}
                    >
                      Simpan catatan
                    </MdButton>
                    <MdButton variant="text" danger disabled={busy} onClick={() => void handleDelete(item)}>
                      Hapus
                    </MdButton>
                  </div>

                  <p className="text-[11px] text-[var(--wf-ink-muted)]">
                    Menyetujui pengajuan tidak membuat event. Susun jadwalnya di Jadwal Event setelah tanggal disepakati.
                  </p>
                </div>
              )}

              {readOnly && item.internalNotes && (
                <p className="mt-3 border-t border-[var(--wf-rule)] pt-3 text-xs text-[var(--wf-ink-muted)]">
                  Catatan internal: {item.internalNotes}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
