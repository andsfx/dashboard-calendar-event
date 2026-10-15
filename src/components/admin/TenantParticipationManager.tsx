import { useMemo, useState } from 'react';
import {
  Building2, CalendarDays, ChevronDown, ChevronUp, Mail, MapPin, Phone, Settings2, Store, Tag, Users,
} from 'lucide-react';
import { MdButton, MdChip, MdSelect, MdTextField } from '../md';
import type {
  TenantParticipation, TenantParticipationKind, TenantParticipationStatus,
} from '../../types';
import { formatDateRange } from '../../utils/eventUtils';
import {
  fetchTenantParticipationOptions,
  TENANT_PARTICIPATION_FALLBACK_OPTIONS,
  type TenantParticipationPatch,
} from '../../utils/api/tenantParticipationsApi';
import type { TenantParticipationOptionPublic } from '../../types';
import { TenantParticipationOptionsModal } from './TenantParticipationOptionsModal';

const KIND_LABELS: Record<TenantParticipationKind, string> = {
  booth: 'Open booth',
  voucher: 'Voucher',
  both: 'Booth + voucher',
};

const STATUS_LABELS: Record<TenantParticipationStatus, string> = {
  pending: 'Menunggu',
  contacted: 'Dihubungi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

/**
 * Nada status memakai empat kunci signage yang sama dengan antrean Kolaborasi
 * Tenant: `action` menunggu tindakan, `accent` sedang ditangani, `live` berhasil,
 * `idle` selesai.
 */
const STATUS_TONES: Record<TenantParticipationStatus, string> = {
  pending: 'action',
  contacted: 'accent',
  approved: 'live',
  rejected: 'idle',
};

const TONE_DOTS: Record<string, string> = {
  action: 'bg-[var(--wf-action)]',
  accent: 'bg-[var(--wf-accent)]',
  live: 'bg-[var(--wf-live)]',
  idle: 'bg-[var(--wf-ink-muted)]',
};

/**
 * Label nilai opsi dari fallback bawaan (seed DB). Nilai di luar daftar
 * (opsi custom admin, atau nilai lama yang opsinya sudah dihapus) tampil
 * apa adanya — bukan hilang.
 */
const OPTION_LABELS: Record<string, string> = Object.fromEntries(
  TENANT_PARTICIPATION_FALLBACK_OPTIONS.map((option) => [option.value, option.label]),
);

const optionLabel = (value: string): string => OPTION_LABELS[value] ?? value;

/**
 * Dua status yang mengubah nasib pengajuan dikonfirmasi; Menghubungi dan
 * kembali ke Menunggu tidak (murah dan mudah dibalik).
 */
const STATUS_CONFIRM: Partial<Record<TenantParticipationStatus, (item: TenantParticipation) => {
  title: string; message: string; confirmLabel: string;
}>> = {
  approved: (item) => ({
    title: 'Setujui partisipasi ini?',
    message: `Partisipasi ${item.tenantName} (${KIND_LABELS[item.kind]}) untuk "${item.eventTitle}" akan ditandai disetujui dan tampil di halaman event publik.`,
    confirmLabel: 'Setujui',
  }),
  rejected: (item) => ({
    title: 'Tolak partisipasi ini?',
    message: `Partisipasi ${item.tenantName} untuk "${item.eventTitle}" akan ditandai ditolak. Tenant dapat memantau statusnya lewat kode pengajuan.`,
    confirmLabel: 'Tolak',
  }),
};

const STATUSES = ['pending', 'contacted', 'approved', 'rejected'] as const satisfies readonly TenantParticipationStatus[];

const STATUS_FILTERS: Array<{ key: TenantParticipationStatus | 'all'; label: string; dot?: string }> = [
  { key: 'all', label: 'Semua' },
  ...STATUSES.map((status) => ({
    key: status,
    label: STATUS_LABELS[status],
    dot: TONE_DOTS[STATUS_TONES[status]],
  })),
];

/** Draft koreksi isian per kartu — base = nilai server saat pengetikan dimulai. */
interface CorrectionDraft {
  base: string;
  boothArea: string;
  boothStart: string;
  boothEnd: string;
  boothSize: string;
  boothProducts: string;
  boothScheme: TenantParticipation['boothScheme'];
  boothNeeds: string;
  voucherType: TenantParticipation['voucherType'];
  voucherTerms: string;
  voucherQuota: string;
  voucherFormat: TenantParticipation['voucherFormat'];
}

function correctionFrom(item: TenantParticipation): CorrectionDraft {
  return {
    base: `${item.updatedAt}`,
    boothArea: item.boothArea,
    boothStart: item.boothStart,
    boothEnd: item.boothEnd,
    boothSize: item.boothSize,
    boothProducts: item.boothProducts,
    boothScheme: item.boothScheme,
    boothNeeds: item.boothNeeds,
    voucherType: item.voucherType,
    voucherTerms: item.voucherTerms,
    voucherQuota: item.voucherQuota === null ? '' : String(item.voucherQuota),
    voucherFormat: item.voucherFormat,
  };
}

/** Perubahan draft vs baris server, dalam bentuk patch yang dikirim ke API. */
function diffCorrection(item: TenantParticipation, draft: CorrectionDraft): TenantParticipationPatch {
  const patch: TenantParticipationPatch = {};
  if (item.kind !== 'voucher') {
    if (draft.boothArea !== item.boothArea) patch.boothArea = draft.boothArea;
    if (draft.boothStart !== item.boothStart) patch.boothStart = draft.boothStart;
    if (draft.boothEnd !== item.boothEnd) patch.boothEnd = draft.boothEnd;
    if (draft.boothSize !== item.boothSize) patch.boothSize = draft.boothSize;
    if (draft.boothProducts !== item.boothProducts) patch.boothProducts = draft.boothProducts;
    if (draft.boothScheme !== item.boothScheme) patch.boothScheme = draft.boothScheme;
    if (draft.boothNeeds !== item.boothNeeds) patch.boothNeeds = draft.boothNeeds;
  }
  if (item.kind !== 'booth') {
    if (draft.voucherType !== item.voucherType) patch.voucherType = draft.voucherType;
    if (draft.voucherTerms !== item.voucherTerms) patch.voucherTerms = draft.voucherTerms;
    const serverQuota = item.voucherQuota === null ? '' : String(item.voucherQuota);
    if (draft.voucherQuota !== serverQuota) {
      patch.voucherQuota = draft.voucherQuota === '' ? '' : Number(draft.voucherQuota);
    }
    if (draft.voucherFormat !== item.voucherFormat) patch.voucherFormat = draft.voucherFormat;
  }
  return patch;
}

interface Props {
  participations: TenantParticipation[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onReview: (id: string, status: TenantParticipationStatus) => Promise<boolean>;
  onSaveNotes: (id: string, notes: string) => Promise<boolean>;
  onSaveCorrection: (id: string, patch: TenantParticipationPatch) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onConfirm: (options: { title: string; message: string; subject?: string; confirmLabel?: string }) => Promise<boolean>;
  /** Akun demo / viewer: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

/**
 * Antrean partisipasi tenant — open booth & voucher (`/dashboard/tenant-participations`).
 *
 * Satu kartu per pengajuan, urut terbaru dari server. Kartu ringkas memuat
 * identitas, event, kontak, dan kode pengajuan; koreksi isian, catatan, dan
 * tombol status ada di balik "Lihat detail lengkap" supaya antrean panjang
 * tidak merender puluhan editor sekaligus. Marcomm boleh mengoreksi isian
 * (K10) lewat panel koreksi — dikirim sebagai patch per-field, bukan seluruh
 * baris, sehingga dua staf yang menyunting field berbeda tidak saling menimpa.
 */
export function TenantParticipationManager({
  participations, isLoading, error, onRetry, onReview, onSaveNotes, onSaveCorrection, onDelete, onConfirm, readOnly = false,
}: Props) {
  const [filter, setFilter] = useState<TenantParticipationStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, { value: string; base: string }>>({});
  const [corrections, setCorrections] = useState<Record<string, CorrectionDraft>>({});
  const [busyId, setBusyId] = useState('');
  // Opsi form dinamis (dikelola admin lewat modal); fallback bawaan dipakai
  // sampai daftar server tiba atau bila gagal — dropdown koreksi tetap terisi.
  const [options, setOptions] = useState<TenantParticipationOptionPublic[]>(TENANT_PARTICIPATION_FALLBACK_OPTIONS);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const loadOptions = async () => {
    setOptions(await fetchTenantParticipationOptions());
  };

  const handleOptionsOpen = () => {
    setOptionsOpen(true);
    void loadOptions();
  };

  const pendingCount = participations.filter((item) => item.status === 'pending').length;
  const visibleParticipations = useMemo(
    () => (filter === 'all' ? participations : participations.filter((item) => item.status === filter)),
    [participations, filter],
  );

  const liveDraft = (item: TenantParticipation) => {
    const draft = notesDraft[item.id];
    return draft !== undefined && draft.base === item.internalNotes ? draft : undefined;
  };

  const liveCorrection = (item: TenantParticipation) => {
    const draft = corrections[item.id];
    return draft !== undefined && draft.base === item.updatedAt ? draft : undefined;
  };

  const handleReview = async (id: string, status: TenantParticipationStatus, item: TenantParticipation) => {
    const confirmCopy = STATUS_CONFIRM[status];
    if (confirmCopy && !(await onConfirm(confirmCopy(item)))) return;
    setBusyId(id);
    await onReview(id, status);
    setBusyId('');
  };

  const handleSaveNotes = async (item: TenantParticipation) => {
    const draft = liveDraft(item);
    if (!draft) return;
    setBusyId(item.id);
    const ok = await onSaveNotes(item.id, draft.value);
    if (ok) setNotesDraft((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
    setBusyId('');
  };

  const handleSaveCorrection = async (item: TenantParticipation) => {
    const draft = liveCorrection(item);
    if (!draft) return;
    const patch = diffCorrection(item, draft);
    if (Object.keys(patch).length === 0) return;
    setBusyId(item.id);
    const ok = await onSaveCorrection(item.id, patch);
    if (ok) setCorrections((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
    setBusyId('');
  };

  const handleDelete = async (item: TenantParticipation) => {
    const ok = await onConfirm({
      title: 'Hapus pengajuan?',
      message: `Partisipasi ${item.tenantName} untuk "${item.eventTitle}" akan dihapus permanen.`,
      confirmLabel: 'Hapus',
    });
    if (!ok) return;
    setBusyId(item.id);
    const deleted = await onDelete(item.id);
    if (deleted) {
      setNotesDraft((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
      setCorrections((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
      setExpanded((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
    }
    setBusyId('');
  };

  const setCorrection = (item: TenantParticipation, patch: Partial<CorrectionDraft>) => {
    setCorrections((prev) => ({
      ...prev,
      [item.id]: { ...(prev[item.id] ?? correctionFrom(item)), ...patch },
    }));
  };

  /** Pilihan aktif per grup + nilai sekarang bila tak ada di daftar (opsi mati/hapus). */
  const optionChoices = (group: TenantParticipationOptionPublic['group'], current: string) => {
    const active = options
      .filter((option) => option.group === group)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    if (current !== '' && !active.some((option) => option.value === current)) {
      return [...active, { group, value: current, label: `${current} (tidak tersedia lagi)`, sortOrder: 0 }];
    }
    return active;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-bold text-[var(--wf-ink)]">Partisipasi Tenant</h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-[var(--wf-ink-muted)]">
            {pendingCount > 0
              ? `${pendingCount} dari ${participations.length} pengajuan menunggu tinjauan.`
              : `${participations.length} pengajuan, tidak ada yang menunggu tinjauan.`}
          </p>
          {!readOnly && (
            <MdButton variant="outlined" onClick={handleOptionsOpen}>
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Kelola opsi
            </MdButton>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((tab) => (
          <MdChip
            key={tab.key}
            label={tab.label}
            selected={filter === tab.key}
            onClick={() => setFilter((current) => (current === tab.key ? 'all' : tab.key))}
            leadingIcon={tab.dot ? <span className={`h-2 w-2 rounded-full ${tab.dot}`} aria-hidden="true" /> : undefined}
          />
        ))}
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

      {isLoading && participations.length === 0 && (
        <p className="text-sm text-[var(--wf-ink-muted)]">Memuat pengajuan…</p>
      )}

      {!isLoading && participations.length === 0 && !error && (
        <p className="text-sm text-[var(--wf-ink-muted)]">
          Belum ada pengajuan. Tenant mengirim pengajuan lewat halaman publik <span className="wf-code">/partisipasi-tenant</span>.
        </p>
      )}

      {!isLoading && participations.length > 0 && visibleParticipations.length === 0 && (
        <p className="text-sm text-[var(--wf-ink-muted)]">Tidak ada pengajuan dengan status ini.</p>
      )}

      <ul className="space-y-3">
        {visibleParticipations.map((item) => {
          const draft = liveDraft(item);
          const notes = draft ? draft.value : item.internalNotes;
          const notesDirty = notes !== item.internalNotes;
          const correction = liveCorrection(item);
          const correctionPatch = correction ? diffCorrection(item, correction) : {};
          const correctionDirty = Object.keys(correctionPatch).length > 0;
          const busy = busyId === item.id;
          const isOpen = expanded[item.id] === true;
          const showBooth = item.kind !== 'voucher';
          const showVoucher = item.kind !== 'booth';

          return (
            <li key={item.id} className="rounded-[var(--radius-card)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
              {/* Zona ringkas */}
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-[var(--wf-ink)]">
                    <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.tenantName}
                    {item.unitNumber && <span className="font-normal text-[var(--wf-ink-muted)]">· {item.unitNumber}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
                    {item.tenantCategory}
                    <span className="ml-1 font-mono text-[11px]">· {item.code}</span>
                    {item.tenantId && <span className="ml-1 font-mono text-[11px]">· ID tenant {item.tenantId}</span>}
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
                <span className="ml-2 rounded-full bg-[var(--wf-ink-muted)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--wf-ink-muted)]">
                  {KIND_LABELS[item.kind]}
                </span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                {item.eventDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Event {item.eventDate}
                  </span>
                )}
                {showBooth && item.boothArea && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.boothArea}
                  </span>
                )}
                {showBooth && item.boothStart && (
                  <span className="inline-flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                    Booth {formatDateRange(item.boothStart, item.boothEnd || item.boothStart)}
                  </span>
                )}
                {showVoucher && (
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    {optionLabel(item.voucherType)}
                    {item.voucherQuota !== null && ` · ${item.voucherQuota} voucher`}
                  </span>
                )}
              </p>

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

              <div className="mt-2">
                <MdButton
                  variant="text"
                  ariaLabel={`${isOpen ? 'Sembunyikan detail' : 'Lihat detail lengkap'} - ${item.tenantName}`}
                  onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !isOpen }))}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                  {isOpen ? 'Sembunyikan detail' : 'Lihat detail lengkap'}
                </MdButton>
              </div>

              {/* Zona detail: isian lengkap, koreksi, catatan, dan aksi review. */}
              {isOpen && (
                <div className="mt-3 space-y-3 border-t border-[var(--wf-rule)] pt-3">
                  {showBooth && (
                    <div className="space-y-1 text-sm text-[var(--wf-ink)]">
                      <p className="text-xs font-semibold text-[var(--wf-ink-muted)]">Booth</p>
                      <p className="[overflow-wrap:anywhere]">
                        {item.boothProducts || '—'}
                        {item.boothSize && <span className="ml-2 text-xs text-[var(--wf-ink-muted)]">· {item.boothSize}</span>}
                      </p>
                      <p className="text-xs text-[var(--wf-ink-muted)]">
                        Skema: {optionLabel(item.boothScheme)}
                        {item.boothNeeds && <span> · Kebutuhan: {item.boothNeeds}</span>}
                      </p>
                    </div>
                  )}
                  {showVoucher && (
                    <div className="space-y-1 text-sm text-[var(--wf-ink)]">
                      <p className="text-xs font-semibold text-[var(--wf-ink-muted)]">Voucher</p>
                      <p className="[overflow-wrap:anywhere]">{item.voucherTerms || '—'}</p>
                      <p className="text-xs text-[var(--wf-ink-muted)]">
                        {optionLabel(item.voucherType)} · {optionLabel(item.voucherFormat)}
                        {item.voucherQuota !== null && ` · kuota ${item.voucherQuota}`}
                      </p>
                    </div>
                  )}

                  {readOnly && item.internalNotes && (
                    <p className="text-xs text-[var(--wf-ink-muted)] [overflow-wrap:anywhere]">
                      Catatan internal: {item.internalNotes}
                    </p>
                  )}

                  {!readOnly && (
                    <>
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

                      {/* Koreksi isian (K10): patch per-field, bukan seluruh baris. */}
                      {(() => {
                        const c = correction ?? correctionFrom(item);
                        return (
                          <details className="rounded-[var(--radius-control)] border border-[var(--wf-rule)] p-3">
                            <summary className="cursor-pointer text-xs font-semibold text-[var(--wf-ink)]">
                              Koreksi isian tenant
                            </summary>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {showBooth && (
                                <>
                                  <MdTextField
                                    label="Area booth"
                                    value={c.boothArea}
                                    maxLength={200}
                                    onChange={(value) => setCorrection(item, { boothArea: value })}
                                  />
                                  <MdSelect
                                    label="Ukuran booth"
                                    value={c.boothSize}
                                    options={optionChoices('booth_size', c.boothSize).map((option) => ({ value: option.value, label: option.label }))}
                                    onChange={(value) => setCorrection(item, { boothSize: value })}
                                  />
                                  <MdTextField
                                    label="Mulai booth (YYYY-MM-DD)"
                                    value={c.boothStart}
                                    onChange={(value) => setCorrection(item, { boothStart: value })}
                                  />
                                  <MdTextField
                                    label="Selesai booth (YYYY-MM-DD)"
                                    value={c.boothEnd}
                                    onChange={(value) => setCorrection(item, { boothEnd: value })}
                                  />
                                  <MdTextField
                                    className="sm:col-span-2"
                                    type="textarea"
                                    rows={2}
                                    label="Produk atau jasa"
                                    value={c.boothProducts}
                                    maxLength={1000}
                                    onChange={(value) => setCorrection(item, { boothProducts: value })}
                                  />
                                  <MdSelect
                                    label="Skema booth"
                                    value={c.boothScheme}
                                    options={optionChoices('booth_scheme', c.boothScheme).map((option) => ({ value: option.value, label: option.label }))}
                                    onChange={(value) => setCorrection(item, { boothScheme: value as TenantParticipation['boothScheme'] })}
                                  />
                                  <MdTextField
                                    label="Kebutuhan fasilitas"
                                    value={c.boothNeeds}
                                    maxLength={2000}
                                    onChange={(value) => setCorrection(item, { boothNeeds: value })}
                                  />
                                </>
                              )}
                              {showVoucher && (
                                <>
                                  <MdSelect
                                    label="Jenis voucher"
                                    value={c.voucherType}
                                    options={optionChoices('voucher_type', c.voucherType).map((option) => ({ value: option.value, label: option.label }))}
                                    onChange={(value) => setCorrection(item, { voucherType: value as TenantParticipation['voucherType'] })}
                                  />
                                  <MdSelect
                                    label="Format voucher"
                                    value={c.voucherFormat}
                                    options={optionChoices('voucher_format', c.voucherFormat).map((option) => ({ value: option.value, label: option.label }))}
                                    onChange={(value) => setCorrection(item, { voucherFormat: value as TenantParticipation['voucherFormat'] })}
                                  />
                                  <MdTextField
                                    label="Kuota voucher (kosongkan bila tanpa kuota)"
                                    value={c.voucherQuota}
                                    onChange={(value) => setCorrection(item, { voucherQuota: value.replace(/[^\d]/g, '') })}
                                  />
                                  <MdTextField
                                    className="sm:col-span-2"
                                    type="textarea"
                                    rows={3}
                                    label="Ketentuan voucher"
                                    value={c.voucherTerms}
                                    maxLength={2000}
                                    onChange={(value) => setCorrection(item, { voucherTerms: value })}
                                  />
                                </>
                              )}
                            </div>
                            <div className="mt-3">
                              <MdButton
                                variant="outlined"
                                disabled={busy || !correctionDirty}
                                ariaLabel={`Simpan koreksi - ${item.tenantName}`}
                                onClick={() => void handleSaveCorrection(item)}
                              >
                                Simpan koreksi
                              </MdButton>
                            </div>
                          </details>
                        );
                      })()}

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
                        Menyetujui partisipasi tidak membuat event baru; event tujuan sudah dipilih tenant.
                        Booth dan voucher yang disetujui tampil di halaman detail event publik.
                      </p>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!readOnly && (
        <TenantParticipationOptionsModal
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          onSaved={() => void loadOptions()}
        />
      )}
    </div>
  );
}
