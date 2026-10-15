import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { ModalWrapper } from '../modals/ModalWrapper';
import { MdButton, MdSelect, MdSwitch, MdTextField } from '../md';
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

const inputClass = 'w-full rounded-[var(--radius-control)] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400';
const labelClass = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

/**
 * Kelola opsi form partisipasi tenant (skema/ukuran booth, jenis/format voucher).
 *
 * Opsi dimatikan tetap terlihat di sini (dengan saklar untuk menyalakan ulang);
 * hanya menghilang dari form publik dan submit. Menghapus opsi TIDAK menyentuh
 * pengajuan yang sudah memakai nilainya — nilai lama tetap terbaca.
 */
export function TenantParticipationOptionsModal({ isOpen, onClose, onSaved }: Props) {
  const [options, setOptions] = useState<TenantParticipationOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [sortDrafts, setSortDrafts] = useState<Record<string, string>>({});
  const [newGroup, setNewGroup] = useState<TenantParticipationOptionGroup>('booth_scheme');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmDialog = useConfirmDialog();

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      setOptions(await fetchAllTenantParticipationOptions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat opsi');
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
  const labelDirty = (option: TenantParticipationOption) => {
    const draft = labelDrafts[option.id];
    return draft !== undefined && draft !== option.label;
  };

  /** Pola sama dengan label: draft + tombol Simpan saat dirty. Kosong/negatif/NaN tidak dikirim. */
  const handleSaveSort = async (option: TenantParticipationOption) => {
    const parsed = Number(sortDrafts[option.id]);
    if (sortDrafts[option.id] === undefined || !Number.isInteger(parsed) || parsed < 0 || parsed > 9999) return;
    if (parsed === option.sortOrder) {
      setSortDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      return;
    }
    setBusyId(option.id);
    try {
      await updateTenantParticipationOption(option.id, { sortOrder: parsed });
      setSortDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      setOptions((prev) => prev.map((row) => (row.id === option.id ? { ...row, sortOrder: parsed } : row)));
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan urutan');
    } finally {
      setBusyId('');
    }
  };

  const handleSaveLabel = async (option: TenantParticipationOption) => {
    const label = labelFor(option).trim();
    if (!label || label === option.label) return;
    setBusyId(option.id);
    try {
      await updateTenantParticipationOption(option.id, { label });
      setLabelDrafts((prev) => { const next = { ...prev }; delete next[option.id]; return next; });
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan label');
    } finally {
      setBusyId('');
    }
  };

  const handleToggle = async (option: TenantParticipationOption, isActive: boolean) => {
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
    const ok = await confirmDialog.confirm({
      title: 'Hapus opsi?',
      message: `"${option.label}" (${GROUP_LABELS[option.group]}) dihapus dari daftar. Pengajuan yang sudah memakai nilai ini tidak ikut terhapus.`,
      confirmLabel: 'Hapus',
    });
    if (!ok) return;
    setBusyId(option.id);
    try {
      await deleteTenantParticipationOption(option.id);
      setOptions((prev) => prev.filter((row) => row.id !== option.id));
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} ariaLabel="Kelola opsi form partisipasi" maxWidth="max-w-2xl">
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Kelola opsi form partisipasi</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Opsi yang dimatikan tidak muncul di form publik dan tidak bisa dikirim tenant.
          Pengajuan yang sudah masuk tidak ikut berubah.
        </p>

        {loadError && (
          <div role="alert" className="mt-3 flex items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <span>{loadError}</span>
            <MdButton variant="outlined" onClick={() => void load()}>Coba lagi</MdButton>
          </div>
        )}

        {isLoading && options.length === 0 ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memuat opsi…
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {GROUP_ORDER.map((group) => {
              const list = grouped[group] ?? [];
              return (
                <section key={group}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    {GROUP_LABELS[group]}
                    <span className="ml-2 font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
                      {list.filter((option) => option.isActive).length} aktif dari {list.length}
                    </span>
                  </h3>
                  <ul className="space-y-2">
                    {list.map((option) => {
                      const busy = busyId === option.id;
                      const sortDraft = sortDrafts[option.id];
                      const sortDirty = sortDraft !== undefined && sortDraft.trim() !== String(option.sortOrder);
                      return (
                        <li
                          key={option.id}
                          className={`flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 ${option.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'}`}
                        >
                          <div className="min-w-0 flex-1">
                            <label className="sr-only" htmlFor={`opt-label-${option.id}`}>Label {option.label}</label>
                            <input
                              id={`opt-label-${option.id}`}
                              className={`${inputClass} py-1.5`}
                              value={labelFor(option)}
                              maxLength={100}
                              onChange={(e) => setLabelDrafts((prev) => ({ ...prev, [option.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveLabel(option); }}
                              disabled={busy}
                            />
                            <p className="mt-0.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">{option.value}</p>
                          </div>
                          <div className="w-20 shrink-0">
                            <label className="sr-only" htmlFor={`opt-sort-${option.id}`}>Urutan {option.label}</label>
                            <input
                              id={`opt-sort-${option.id}`}
                              type="number"
                              min={0}
                              max={9999}
                              step={1}
                              className={`${inputClass} py-1.5 text-center`}
                              value={sortDraft ?? String(option.sortOrder)}
                              onChange={(e) => setSortDrafts((prev) => ({ ...prev, [option.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveSort(option); }}
                              disabled={busy}
                            />
                          </div>
                          {sortDirty && (
                            <MdButton variant="outlined" disabled={busy} ariaLabel={`Simpan urutan ${option.label}`} onClick={() => void handleSaveSort(option)}>
                              Simpan
                            </MdButton>
                          )}
                          {labelDirty(option) && (
                            <MdButton variant="outlined" disabled={busy} ariaLabel={`Simpan label ${option.label}`} onClick={() => void handleSaveLabel(option)}>
                              Simpan
                            </MdButton>
                          )}
                          <MdSwitch
                            selected={option.isActive}
                            ariaLabel={`${option.isActive ? 'Matikan' : 'Nyalakan'} opsi ${option.label}`}
                            disabled={busy}
                            onChange={(selected) => void handleToggle(option, selected)}
                          />
                          <MdButton variant="text" disabled={busy} ariaLabel={`Hapus opsi ${option.label}`} onClick={() => void handleDelete(option)}>
                            Hapus
                          </MdButton>
                        </li>
                      );
                    })}
                    {list.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">Belum ada opsi.</li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {/* Tambah opsi */}
        <section className="mt-6 rounded-[var(--radius-control)] border border-slate-200 p-3 dark:border-slate-700">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tambah opsi
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="opt-new-group">Grup</label>
              <select id="opt-new-group" className={inputClass} value={newGroup} onChange={(e) => setNewGroup(e.target.value as TenantParticipationOptionGroup)}>
                {GROUP_ORDER.map((group) => (
                  <option key={group} value={group}>{GROUP_LABELS[group]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="opt-new-value">Value (slug)</label>
              <input
                id="opt-new-value"
                className={inputClass}
                value={newValue}
                maxLength={50}
                placeholder="mis. outdoor"
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="opt-new-label">Label tampil</label>
              <input
                id="opt-new-label"
                className={inputClass}
                value={newLabel}
                maxLength={100}
                placeholder="mis. Outdoor / halaman"
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
          </div>
          {formError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-400">{formError}</p>}
          <div className="mt-3">
            <MdButton variant="outlined" disabled={isSubmitting} onClick={() => void handleCreate()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              Tambah
            </MdButton>
          </div>
        </section>
      </div>

      <div className="mt-4 flex justify-end">
        <MdButton variant="text" onClick={onClose}>Tutup</MdButton>
      </div>
    </ModalWrapper>
  );
}
