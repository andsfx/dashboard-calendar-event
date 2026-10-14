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

/**
 * Nada status memakai empat kunci yang sudah ada di sistem signage
 * (`dashboard-wayfinding.css`): `action` untuk yang menunggu tindakan, `accent`
 * untuk yang sedang ditangani, `live` untuk yang berhasil, dan `idle` untuk yang
 * sudah selesai. Sebelumnya keempat status memakai `wf-code` yang berarti "nilai
 * terukur", sehingga Menunggu/Dihubungi/Disetujui/Ditolak tampil identik.
 */
const STATUS_TONES: Record<TenantEventProposalStatus, string> = {
  pending: 'action',
  contacted: 'accent',
  approved: 'live',
  rejected: 'idle',
};

/** Label tipe berkas lampiran. MIME di luar daftar ditampilkan apa adanya. */
const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
};

/** Ukuran berkas dengan pemisah desimal koma (kaidah Indonesia). */
function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Dua status yang mengubah nasib pengajuan: ditolak memberi tahu tenant, dan
 * disetujui adalah pintu masuk penjadwalan. Keduanya dikonfirmasi; menghubungi
 * dan mengembalikan ke Menunggu tidak (murah dan mudah dibalik).
 */
const STATUS_CONFIRM: Partial<Record<TenantEventProposalStatus, (item: TenantEventProposal) => {
  title: string; message: string; confirmLabel: string;
}>> = {
  approved: (item) => ({
    title: 'Setujui pengajuan ini?',
    message: `Pengajuan "${item.eventTitle}" dari ${item.tenantName} akan ditandai disetujui. Menyetujui tidak membuat event otomatis, jadwalnya tetap disusun di Jadwal Event.`,
    confirmLabel: 'Setujui',
  }),
  rejected: (item) => ({
    title: 'Tolak pengajuan ini?',
    message: `Pengajuan "${item.eventTitle}" dari ${item.tenantName} akan ditandai ditolak, dan tenant akan diberi tahu lewat kontak PIC yang dicantumkan.`,
    confirmLabel: 'Tolak',
  }),
};

/** Sumber tunggal nilai status yang sah; `satisfies` memvalidasi tiap anggota. */
const STATUSES = ['pending', 'contacted', 'approved', 'rejected'] as const satisfies readonly TenantEventProposalStatus[];

interface Props {
  proposals: TenantEventProposal[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onReview: (id: string, status: TenantEventProposalStatus) => Promise<boolean>;
  onSaveNotes: (id: string, notes: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onConfirm: (options: { title: string; message: string; subject?: string; confirmLabel?: string }) => Promise<boolean>;
  /** Akun demo / viewer: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
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
  proposals, isLoading, error, onRetry, onReview, onSaveNotes, onDelete, onConfirm, readOnly = false,
}: Props) {
  /**
   * Catatan internal yang sedang disunting, disimpan bersama nilai server saat
   * pengetikan dimulai (`base`). Bila reload latar membawa catatan server yang
   * berbeda, draft lokal dianggap basi dan dibuang; kalau tidak, tombol Simpan
   * akan menimpa catatan terbaru dari staff lain dengan teks lama.
   */
  const [notesDraft, setNotesDraft] = useState<Record<string, { value: string; base: string }>>({});
  const [busyId, setBusyId] = useState('');

  const pendingCount = proposals.filter((item) => item.status === 'pending').length;

  /** Draft yang masih sejalan dengan catatan server; selain itu `undefined`. */
  const liveDraft = (item: TenantEventProposal) => {
    const draft = notesDraft[item.id];
    return draft !== undefined && draft.base === item.internalNotes ? draft : undefined;
  };

  const handleReview = async (id: string, status: TenantEventProposalStatus, item: TenantEventProposal) => {
    const confirmCopy = STATUS_CONFIRM[status];
    if (confirmCopy && !(await onConfirm(confirmCopy(item)))) return;
    setBusyId(id);
    await onReview(id, status);
    setBusyId('');
  };

  const handleSaveNotes = async (item: TenantEventProposal) => {
    const draft = liveDraft(item);
    if (!draft) return;
    setBusyId(item.id);
    const ok = await onSaveNotes(item.id, draft.value);
    if (ok) setNotesDraft((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
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
    const deleted = await onDelete(item.id);
    // Baris sudah hilang di server; draft catatannya tidak akan pernah dipakai lagi.
    if (deleted) setNotesDraft((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
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
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <span>{error}</span>
          <MdButton variant="outlined" onClick={() => onRetry()}>Coba lagi</MdButton>
        </div>
      )}

      {isLoading && proposals.length === 0 && (
        <p className="text-sm text-[var(--wf-ink-muted)]">Memuat pengajuan…</p>
      )}

      {!isLoading && proposals.length === 0 && !error && (
        <p className="text-sm text-[var(--wf-ink-muted)]">
          Belum ada pengajuan. Tenant mengirim pengajuan lewat halaman publik <span className="wf-code">/kolaborasi-tenant</span>.
        </p>
      )}

      <ul className="space-y-3">
        {proposals.map((item) => {
          const draft = liveDraft(item);
          const notes = draft ? draft.value : item.internalNotes;
          const notesDirty = notes !== item.internalNotes;
          const busy = busyId === item.id;
          const fileMeta = [
            MIME_LABELS[item.proposalMimeType] || item.proposalMimeType,
            formatFileSize(item.proposalFileSize),
          ].filter(Boolean).join(' · ');

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
                    {/* ID master MID: tenant yang dipilih dari daftar bisa ditelusuri
                        walau nama diketik ulang berbeda. */}
                    {item.tenantId && (
                      <span className="ml-1 font-mono text-[11px]">· ID tenant {item.tenantId}</span>
                    )}
                    {!item.tenantId && <span className="ml-1">· diisi manual</span>}
                  </p>
                </div>
                <span className={`wf-key wf-key--${STATUS_TONES[item.status]}`}>
                  <span className="wf-dot" aria-hidden />
                  {STATUS_LABELS[item.status]}
                </span>
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

              <p className="mt-2 whitespace-pre-line text-sm text-[var(--wf-ink)] [overflow-wrap:anywhere]">{item.eventDescription}</p>

              {item.needs && (
                <p className="mt-2 text-xs text-[var(--wf-ink-muted)] [overflow-wrap:anywhere]">Kebutuhan fasilitas: {item.needs}</p>
              )}

              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                <span className="[overflow-wrap:anywhere]">{item.contactName}</span>
                <a
                  href={`tel:${item.phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1 py-1 text-[var(--wf-accent)] underline-offset-2 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {item.phone}
                </a>
                {item.email && (
                  <a
                    href={`mailto:${item.email}`}
                    className="inline-flex items-center gap-1 py-1 text-[var(--wf-accent)] underline-offset-2 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-all">{item.email}</span>
                  </a>
                )}
              </p>

              {item.proposalFileUrl && (
                <p className="mt-2">
                  <a
                    href={item.proposalFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 py-1 text-sm font-semibold text-[var(--wf-accent)] underline-offset-2 hover:underline"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-all">{item.proposalFileName || 'Lampiran proposal'}</span>
                    {fileMeta && <span className="shrink-0 text-xs font-normal text-[var(--wf-ink-muted)]">{fileMeta}</span>}
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
                          ariaLabel={`${STATUS_LABELS[status]} - ${item.tenantName}`}
                          onClick={() => void handleReview(item.id, status, item)}
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
                      onChange={(value) => setNotesDraft((prev) => ({ ...prev, [item.id]: { value, base: item.internalNotes } }))}
                    />
                    <MdButton
                      variant="text"
                      disabled={busy || !notesDirty}
                      ariaLabel={`Simpan catatan - ${item.tenantName}`}
                      onClick={() => void handleSaveNotes(item)}
                    >
                      Simpan catatan
                    </MdButton>
                    <MdButton
                      variant="text"
                      danger
                      disabled={busy}
                      ariaLabel={`Hapus - ${item.tenantName}`}
                      onClick={() => void handleDelete(item)}
                    >
                      Hapus
                    </MdButton>
                  </div>

                  <p className="text-[11px] text-[var(--wf-ink-muted)]">
                    Menyetujui pengajuan tidak membuat event. Susun jadwalnya di Jadwal Event setelah tanggal disepakati.
                  </p>
                </div>
              )}

              {readOnly && item.internalNotes && (
                <p className="mt-3 border-t border-[var(--wf-rule)] pt-3 text-xs text-[var(--wf-ink-muted)] [overflow-wrap:anywhere]">
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
