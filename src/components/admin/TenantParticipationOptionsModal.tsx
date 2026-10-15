import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { ModalWrapper } from '../modals/ModalWrapper';
import { MdButton, MdIconButton, MdSelect, MdSwitch, MdTextField } from '../md';
import { InfoTip } from '../ui/InfoTip';
import type { TenantParticipationOption, TenantParticipationOptionGroup } from '../../types';
import { ApiError } from '../../lib/rest';
import {
  createTenantParticipationOption,
  deleteTenantParticipationOption,
  fetchAllTenantParticipationOptions,
  updateTenantParticipationOption,
} from '../../utils/domainApi';
import { useConfirmDialog } from '../modals/useConfirmDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** true bila server menerima perubahan (pemanggil me-refresh data). */
  onSaved: () => void;
}

const GROUP_LABELS: Record<TenantParticipationOptionGroup, string> = {
  booth_scheme: 'Skema booth',
  booth_size: 'Ukuran booth',
  voucher_type: 'Jenis voucher',
  voucher_format: 'Format voucher',
};

const GROUP_ORDER: TenantParticipationOptionGroup[] = [
  'booth_scheme', 'booth_size', 'voucher_type', 'voucher_format',
];

/** Slug yang boleh diketik admin — sama seperti validasi server. */
const VALUE_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** Batas urutan yang diterima server (0–9999, bilangan bulat). */
const SORT_MIN = 0;
const SORT_MAX = 9999;

/**
 * Input padat untuk baris opsi.
 *
 * Baris opsi adalah editor inline: dua kontrol per baris plus saklar dan aksi.
 * `md-outlined-text-field` tingginya 56px (top/bottom space 16px) sehingga satu
 * baris opsi langsung ~120px dan daftar 10 opsi jadi tak terbaca. `MdSelect`
 * juga mengunci `:host { min-width: 210px }` yang tidak muat di kolom grid.
 * Karena itu baris memakai input native dengan token board (`--wf-*`), pola
 * yang sama dengan `ExhibitionManager`. Saklar, tombol, dan ikon tetap
 * komponen `md` (lihat `MdSwitch`/`MdButton`/`MdIconButton`).
 *
 * Lebar sengaja TIDAK ada di sini: `w-full` dan `w-20` sama-sama utility
 * `width`, jadi yang menang adalah urutan di CSS hasil build, bukan urutan di
 * atribut class. Tiap pemakai menambahkan tepat satu kelas lebar.
 */
const rowInputClass = 'rounded-[var(--wf-radius-control)] border border-[var(--wf-rule-strong)] bg-[var(--wf-board)] px-2.5 py-1.5 text-sm text-[var(--wf-ink)] outline-none transition placeholder:text-[var(--wf-ink-muted)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] disabled:opacity-60';

/**
 * Badge keadaan saklar — titik penuh (aktif) vs titik kosong, jadi bukan warna saja.
 *
 * Lebar dikunci (`min-w-20`): tanpa itu label "Nonaktif" yang lebih panjang
 * menyempitkan kolom input label di barisnya sendiri, sehingga tepi kanan input
 * tidak sejajar antar baris.
 */
function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex min-w-20 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        isActive
          ? 'border-[var(--wf-live)]/40 bg-[var(--wf-live)]/10 text-[var(--wf-live)]'
          : 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[var(--wf-live)]' : 'border border-[var(--wf-ink-muted)]'}`}
      />
      {isActive ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

/**
 * Kelola opsi form partisipasi tenant (skema/ukuran booth, jenis/format voucher).
 *
 * Opsi dimatikan tetap terlihat di sini (dengan saklar untuk menyalakan ulang);
 * hanya menghilang dari form publik dan submit. Menghapus opsi TIDAK menyentuh
 * pengajuan yang sudah memakai nilainya — nilai lama tetap terbaca.
 *
 * Tata letak: panel flex setinggi maksimum 90vh dengan header, daftar, form
 * tambah, dan footer sebagai baris terpisah. HANYA daftar opsi yang menggulung
 * (`flex-1 min-h-0 overflow-y-auto`, dibatasi 55vh), sehingga judul dan tombol
 * Tutup selalu terlihat dan tidak pernah ada dua scrollbar.
 */
export function TenantParticipationOptionsModal({ isOpen, onClose, onSaved }: Props) {
  const [options, setOptions] = useState<TenantParticipationOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [sortDrafts, setSortDrafts] = useState<Record<string, string>>({});
  const [newGroup, setNewGroup] = useState<TenantParticipationOptionGroup>('booth_scheme');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();

  const load = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setOptions(await fetchAllTenantParticipationOptions());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat opsi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen]);

  const grouped = useMemo(() => {
    const map: Record<TenantParticipationOptionGroup, TenantParticipationOption[]> = {
      booth_scheme: [], booth_size: [], voucher_type: [], voucher_format: [],
    };
    for (const option of options) {
      map[option.group]?.push(option);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    }
    return map;
  }, [options]);

  const labelFor = (option: TenantParticipationOption) => labelDrafts[option.id] ?? option.label;

  /** Draft label dibandingkan setelah trim — spasi di ujung tidak dianggap perubahan. */
  const labelDirty = (option: TenantParticipationOption) => {
    const draft = labelDrafts[option.id];
    return draft !== undefined && draft.trim() !== option.label;
  };

  const sortDirty = (option: TenantParticipationOption) => {
    const draft = sortDrafts[option.id];
    return draft !== undefined && draft.trim() !== String(option.sortOrder);
  };

  /**
   * Satu tombol Simpan untuk label DAN urutan: keduanya dikirim sebagai satu
   * patch, jadi server tidak menerima dua tulisan terpisah untuk satu baris.
   * Nilai tidak valid tidak dikirim — pesannya muncul di banner error.
   */
  const handleSaveRow = async (option: TenantParticipationOption) => {
    setFormError('');
    const patch: Partial<{ label: string; sortOrder: number }> = {};

    if (labelDirty(option)) {
      const label = labelFor(option).trim();
      if (!label) {
        setFormError(`Label opsi "${option.value}" tidak boleh kosong.`);
        return;
      }
      patch.label = label;
    }

    if (sortDirty(option)) {
      const raw = (sortDrafts[option.id] ?? String(option.sortOrder)).trim();
      const parsed = Number(raw);
      if (raw === '' || !Number.isInteger(parsed) || parsed < SORT_MIN || parsed > SORT_MAX) {
        setFormError(`Urutan opsi "${labelFor(option)}" harus bilangan bulat ${SORT_MIN}–${SORT_MAX}.`);
        return;
      }
      patch.sortOrder = parsed;
    }

    // Tidak ada perubahan bersih (mis. hanya spasi): buang draft tanpa memanggil API.
    if (Object.keys(patch).length === 0) {
      setLabelDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      setSortDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      return;
    }

    setBusyId(option.id);
    try {
      await updateTenantParticipationOption(option.id, patch);
      setLabelDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      setSortDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      // Baris diperbarui lokal supaya nilai tersimpan langsung terlihat; tanpa
      // ini input kembali ke nilai server lama setelah draft dibuang.
      setOptions((prev) => prev.map((row) => (row.id === option.id ? { ...row, ...patch } : row)));
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan opsi');
    } finally {
      setBusyId('');
    }
  };

  const handleToggle = async (option: TenantParticipationOption, isActive: boolean) => {
    setFormError('');
    setBusyId(option.id);
    try {
      await updateTenantParticipationOption(option.id, { isActive });
      setOptions((prev) => prev.map((row) => (row.id === option.id ? { ...row, isActive } : row)));
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal mengubah status opsi');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (option: TenantParticipationOption) => {
    const ok = await confirm({
      title: 'Hapus opsi?',
      message: `"${option.label}" (${GROUP_LABELS[option.group]}) dihapus dari daftar. Pengajuan yang sudah memakai nilai ini tidak ikut terhapus.`,
      confirmLabel: 'Hapus',
    });
    if (!ok) return;
    setFormError('');
    setBusyId(option.id);
    try {
      await deleteTenantParticipationOption(option.id);
      setOptions((prev) => prev.filter((row) => row.id !== option.id));
      setLabelDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      setSortDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menghapus opsi');
    } finally {
      setBusyId('');
    }
  };

  const handleCreate = async () => {
    setFormError('');
    const value = newValue.trim().toLowerCase();
    const label = newLabel.trim();
    if (!VALUE_RE.test(value)) {
      setFormError('Value hanya huruf kecil, angka, tanda hubung, atau garis bawah.');
      return;
    }
    if (!label) {
      setFormError('Label wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTenantParticipationOption(newGroup, value, label);
      setNewValue('');
      setNewLabel('');
      await load();
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menambah opsi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="tpo-modal-title"
      maxWidth="max-w-2xl"
    >
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] text-[var(--wf-ink)]">

        {/* ── Header (tidak menggulung) ───────────────────────────── */}
        <div className="shrink-0 border-b border-[var(--wf-rule)] px-4 pb-3 pt-4 sm:px-6">
          <h2 id="tpo-modal-title" className="text-base font-bold text-[var(--wf-ink)]">
            Kelola opsi form partisipasi
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--wf-ink-muted)]">
            Opsi yang dimatikan tidak muncul di form publik dan tidak bisa dikirim tenant.
            Pengajuan yang sudah masuk tidak ikut berubah.
          </p>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mx-4 mt-3 flex shrink-0 items-center justify-between gap-3 rounded-[var(--wf-radius-control)] border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 sm:mx-6"
          >
            <span className="min-w-0">{loadError}</span>
            <MdButton variant="outlined" onClick={() => void load()}>Coba lagi</MdButton>
          </div>
        )}

        {/* ── Daftar opsi: satu-satunya area yang menggulung ──────── */}
        <div className="min-h-0 max-h-[55vh] flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          {isLoading && options.length === 0 ? (
            <p className="flex items-center gap-2 py-6 text-sm text-[var(--wf-ink-muted)]">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Memuat opsi…
            </p>
          ) : (
            <div className="space-y-5">
              {GROUP_ORDER.map((group) => {
                const list = grouped[group] ?? [];
                const activeCount = list.filter((option) => option.isActive).length;
                return (
                  <section key={group}>
                    <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">
                      {GROUP_LABELS[group]}
                      <span className="font-normal normal-case tracking-normal">
                        {activeCount} aktif dari {list.length}
                      </span>
                    </h3>
                    <ul className="space-y-2">
                      {list.map((option) => {
                        const busy = busyId === option.id;
                        const dirty = labelDirty(option) || sortDirty(option);
                        const currentLabel = labelFor(option);
                        return (
                          <li
                            key={option.id}
                            className={`rounded-[var(--wf-radius-control)] border px-3 py-2.5 transition-colors ${
                              option.isActive
                                ? 'border-[var(--wf-rule)] bg-[var(--wf-board)]'
                                : 'border-dashed border-[var(--wf-rule)] bg-[var(--wf-board-2)]'
                            }`}
                          >
                            {/* Baris 1 — label + keadaan + saklar + hapus */}
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <div className="min-w-0 sm:flex-1">
                                <label className="sr-only" htmlFor={`opt-label-${option.id}`}>
                                  Label {option.label}
                                </label>
                                <input
                                  id={`opt-label-${option.id}`}
                                  className={`${rowInputClass} w-full`}
                                  value={currentLabel}
                                  maxLength={100}
                                  disabled={busy}
                                  onChange={(e) => setLabelDrafts((prev) => ({ ...prev, [option.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveRow(option); }}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2 sm:justify-end">
                                <ActiveBadge isActive={option.isActive} />
                                <MdSwitch
                                  selected={option.isActive}
                                  ariaLabel={`${option.isActive ? 'Matikan' : 'Nyalakan'} opsi ${currentLabel}`}
                                  disabled={busy}
                                  onChange={(selected) => void handleToggle(option, selected)}
                                />
                                <MdIconButton
                                  ariaLabel={`Hapus opsi ${currentLabel}`}
                                  title="Hapus opsi"
                                  disabled={busy}
                                  onClick={() => void handleDelete(option)}
                                  className="shrink-0 [--md-icon-button-icon-color:#9f1239] dark:[--md-icon-button-icon-color:#fda4af]"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </MdIconButton>
                              </div>
                            </div>

                            {/* Baris 2 — slug + urutan + simpan */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                              <span className="min-w-0 basis-full truncate font-mono text-[11px] text-[var(--wf-ink-muted)] sm:basis-0 sm:flex-1">
                                {option.value}
                              </span>
                              <span aria-hidden="true" className="text-[11px] font-semibold text-[var(--wf-ink-muted)]">
                                Urutan
                              </span>
                              <label className="sr-only" htmlFor={`opt-sort-${option.id}`}>Urutan {option.label}</label>
                              <input
                                id={`opt-sort-${option.id}`}
                                type="number"
                                inputMode="numeric"
                                min={SORT_MIN}
                                max={SORT_MAX}
                                step={1}
                                className={`${rowInputClass} w-20 shrink-0 text-center`}
                                value={sortDrafts[option.id] ?? String(option.sortOrder)}
                                disabled={busy}
                                onChange={(e) => setSortDrafts((prev) => ({ ...prev, [option.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveRow(option); }}
                              />
                              {dirty && (
                                <MdButton
                                  variant="outlined"
                                  className="shrink-0"
                                  disabled={busy}
                                  ariaLabel={`Simpan perubahan ${currentLabel}`}
                                  onClick={() => void handleSaveRow(option)}
                                >
                                  {busy
                                    ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                    : <Save className="h-4 w-4" aria-hidden="true" />}
                                  Simpan
                                </MdButton>
                              )}
                            </div>
                          </li>
                        );
                      })}
                      {list.length === 0 && (
                        <li className="rounded-[var(--wf-radius-control)] border border-dashed border-[var(--wf-rule)] px-3 py-2 text-xs text-[var(--wf-ink-muted)]">
                          Belum ada opsi.
                        </li>
                      )}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Tambah opsi (tidak menggulung) ──────────────────────── */}
        <section className="shrink-0 border-t border-[var(--wf-rule)] px-4 py-3 sm:px-6">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tambah opsi
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <MdSelect
              id="opt-new-group"
              label="Grup"
              value={newGroup}
              disabled={isSubmitting}
              // `min-w-0` menang atas `:host { min-width: 210px }` md-select
              // (aturan outer tree mengalahkan shadow tree) supaya kolom grid
              // tidak meluber di lebar sempit.
              className="min-w-0 w-full"
              onChange={(next) => setNewGroup(next as TenantParticipationOptionGroup)}
              options={GROUP_ORDER.map((group) => ({ value: group, label: GROUP_LABELS[group] }))}
            />
            <div className="flex items-center gap-1.5">
              <MdTextField
                id="opt-new-value"
                label="Value (slug)"
                value={newValue}
                maxLength={50}
                disabled={isSubmitting}
                placeholder="mis. outdoor"
                className="min-w-0 flex-1"
                onChange={setNewValue}
              />
              <InfoTip
                label="Penjelasan value"
                content="Kode internal yang disimpan di data pengajuan. Huruf kecil, angka, tanda hubung, atau garis bawah. Tidak tampil ke tenant."
              />
            </div>
            <div className="flex items-center gap-1.5">
              <MdTextField
                id="opt-new-label"
                label="Label tampil"
                value={newLabel}
                maxLength={100}
                disabled={isSubmitting}
                placeholder="mis. Outdoor / halaman"
                className="min-w-0 flex-1"
                onChange={setNewLabel}
              />
              <InfoTip
                label="Penjelasan label"
                content="Teks yang dilihat tenant di dropdown form publik."
              />
            </div>
          </div>
          {/* Urutan dan saklar Aktif hanya ada di baris opsi, bukan di form
              tambah. Panduannya cukup sekali di sini: menaruh ikon info di
              setiap baris berarti empat ikon per baris untuk dua kontrol. */}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--wf-ink-muted)]">
            <span>Per baris opsi di atas:</span>
            <span className="inline-flex items-center gap-1">
              Urutan
              <InfoTip
                label="Penjelasan urutan"
                content="Urutan tampil di dropdown form publik. Angka lebih kecil tampil lebih dulu."
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Aktif
              <InfoTip
                label="Penjelasan aktif"
                content="Nonaktif berarti tidak muncul di form untuk pengajuan baru. Pengajuan yang sudah masuk tetap terbaca dan ditandai nonaktif di antrean."
              />
            </span>
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {formError ? (
              <p role="alert" className="min-w-0 flex-1 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {formError}
              </p>
            ) : (
              <span className="flex-1" />
            )}
            <MdButton variant="outlined" disabled={isSubmitting} onClick={() => void handleCreate()}>
              {isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                : <Plus className="h-4 w-4" aria-hidden="true" />}
              Tambah
            </MdButton>
          </div>
        </section>

        {/* ── Footer (tidak menggulung) ───────────────────────────── */}
        <div className="flex shrink-0 justify-end border-t border-[var(--wf-rule)] px-4 py-3 sm:px-6">
          <MdButton variant="text" onClick={onClose}>Tutup</MdButton>
        </div>
      </div>

      {confirmDialogEl}
    </ModalWrapper>
  );
}
