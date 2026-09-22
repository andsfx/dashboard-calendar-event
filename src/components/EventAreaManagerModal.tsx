import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { AreaPhoto, EventArea } from '../types';
import {
  createEventArea,
  deleteEventArea,
  deleteAreaPhoto,
  fetchEventAreas,
  fetchAreaPhotos,
  fetchLocationMapping,
  applyLocationMapping,
  updateAreaPhotoOrder,
  updateEventArea,
  uploadAreaPhoto,
  type LocationMappingRow,
} from '../utils/domainApi';
import { suggestAreaId } from '../utils/areaGrouping';
import { adminThumbUrl } from '../utils/imageOptim';
import { useConfirmDialog } from './ConfirmDialog';

interface Props {
  /** Akun demo: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

const MAX_PHOTOS = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function EventAreaManagerModal({ readOnly = false }: Props) {
  const [view, setView] = useState<'list' | 'detail' | 'mapping'>('list');
  const [areas, setAreas] = useState<EventArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<EventArea | null>(null);
  const [areaPhotos, setAreaPhotos] = useState<AreaPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  /**
   * Mode "buat area baru" dipisah dari `editing`. Sebelumnya tombol "Tambah
   * Area Baru" hanya mengosongkan `editing`, padahal form buat dirender saat
   * `editing || areas.length === 0` — jadi begitu sudah ada area, tombol itu
   * tidak memunculkan form apa pun (tidak ada yang bisa dibuat).
   */
  const [isCreating, setIsCreating] = useState(false);

  // Create/Edit form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();

  // ─── Location mapping (backfill) ───
  const [mappingRows, setMappingRows] = useState<LocationMappingRow[]>([]);
  const [mappingChoice, setMappingChoice] = useState<Record<string, string>>({});
  /** Centang = seragamkan teks `lokasi` ke `mappingTarget`. */
  const [mappingRename, setMappingRename] = useState<Record<string, boolean>>({});
  const [mappingTarget, setMappingTarget] = useState<Record<string, string>>({});
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [mappingResult, setMappingResult] = useState<string>('');

  const loadMapping = useCallback(async () => {
    setIsMappingLoading(true);
    setError('');
    setMappingResult('');
    try {
      const rows = await fetchLocationMapping();
      setMappingRows(rows);
      // Prefill: current mapping bila ada, else saran dari normalisasi nama
      const choices: Record<string, string> = {};
      const targets: Record<string, string> = {};
      for (const r of rows) {
        const chosen = r.currentAreaId || suggestAreaId(r.lokasi, areas) || '';
        choices[r.lokasi] = chosen;
        // Target teks default = nama area terpilih (kalau ada)
        targets[r.lokasi] = areas.find(a => a.id === chosen)?.name ?? '';
      }
      setMappingChoice(choices);
      setMappingTarget(targets);
      setMappingRename({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pemetaan lokasi');
    } finally {
      setIsMappingLoading(false);
    }
  }, [areas]);

  const handleApplyMapping = async () => {
    const mappings = Object.entries(mappingChoice)
      .filter(([, areaId]) => Boolean(areaId))
      .map(([lokasi, areaId]) => {
        const target = (mappingTarget[lokasi] || '').trim();
        const doRename = mappingRename[lokasi] && target.length > 0 && target !== lokasi.trim();
        return { lokasi, areaId, ...(doRename ? { targetLokasi: target } : {}) };
      });
    if (mappings.length === 0) {
      setMappingResult('Belum ada lokasi yang dipilih.');
      return;
    }
    setIsApplying(true);
    setError('');
    setMappingResult('');
    try {
      const { updated, renamed } = await applyLocationMapping(mappings);
      const parts = [`${updated} event dipetakan ke area`];
      if (renamed > 0) parts.push(`${renamed} teks lokasi diseragamkan`);
      setMappingResult(`${parts.join(' · ')}.`);
      await loadMapping();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerapkan pemetaan');
    } finally {
      setIsApplying(false);
    }
  };

  const loadAreas = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setAreas(await fetchEventAreas());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat area');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAreas();
    setView('list');
    setSelectedArea(null);
    setAreaPhotos([]);
    setEditing(null);
    setIsCreating(false);
    resetForm();
    clearUpload();
  }, [loadAreas]);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
  };

  const clearUpload = () => {
    setUploadFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCreate = () => {
    setEditing(null);
    setIsCreating(true);
    resetForm();
    setError('');
  };

  const cancelForm = () => {
    setEditing(null);
    setIsCreating(false);
    resetForm();
    setError('');
  };

  const startEdit = (area: EventArea) => {
    setIsCreating(false);
    setEditing({ id: area.id });
    setFormName(area.name);
    setFormDesc(area.description);
    setError('');
  };

  // ─── CRUD ────────────────────────────────────────────────────

  const handleSaveArea = async () => {
    if (!formName.trim()) {
      setError('Nama area wajib diisi');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (editing) {
        await updateEventArea(editing.id, { name: formName.trim(), description: formDesc.trim() });
      } else {
        await createEventArea(formName.trim(), formDesc.trim());
      }
      setEditing(null);
      setIsCreating(false);
      resetForm();
      setIsLoading(true);
      await loadAreas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArea = async (area: EventArea) => {
    const ok = await confirm({
      title: 'Hapus area?',
      message: 'Semua foto di dalamnya juga akan dihapus.',
      subject: area.name,
    });
    if (!ok) return;
    setIsLoading(true);
    setError('');
    try {
      await deleteEventArea(area.id);
      if (selectedArea?.id === area.id) {
        setSelectedArea(null);
        setAreaPhotos([]);
        setView('list');
      }
      await loadAreas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus area');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (area: EventArea) => {
    setError('');
    try {
      await updateEventArea(area.id, { isActive: !area.isActive });
      setAreas(prev => prev.map(a => a.id === area.id ? { ...a, isActive: !area.isActive } : a));
      if (selectedArea?.id === area.id) {
        setSelectedArea({ ...selectedArea, isActive: !area.isActive });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status area');
    }
  };

  const handleMoveArea = async (area: EventArea, dir: -1 | 1) => {
    const idx = areas.findIndex(a => a.id === area.id);
    const target = areas[idx + dir];
    if (idx < 0 || !target) return;
    const next = [...areas];
    next[idx] = { ...target, sortOrder: area.sortOrder };
    next[idx + dir] = { ...area, sortOrder: target.sortOrder };
    setAreas(next);
    try {
      await updateEventArea(area.id, { sortOrder: target.sortOrder });
      await updateEventArea(target.id, { sortOrder: area.sortOrder });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah urutan');
      loadAreas();
    }
  };

  // ─── Detail / Foto ───────────────────────────────────────────

  const loadAreaPhotos = useCallback(async (area: EventArea) => {
    setIsLoading(true);
    setError('');
    try {
      const latest = await fetchEventAreas();
      const fresh = latest.find(a => a.id === area.id) ?? area;
      setSelectedArea(fresh);
      setAreas(latest);
      setAreaPhotos(await fetchAreaPhotos(area.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat foto area');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openAreaDetail = async (area: EventArea) => {
    setEditing(null);
    resetForm();
    await loadAreaPhotos(area);
    setView('detail');
  };

  const goBackToList = () => {
    setView('list');
    setSelectedArea(null);
    setAreaPhotos([]);
    setEditing(null);
    resetForm();
    clearUpload();
    setError('');
  };

  const handleSetCover = async (photoUrl: string) => {
    if (!selectedArea) return;
    setError('');
    try {
      await updateEventArea(selectedArea.id, { coverPhotoUrl: photoUrl });
      setSelectedArea({ ...selectedArea, coverPhotoUrl: photoUrl });
      setAreas(prev => prev.map(a => a.id === selectedArea.id ? { ...a, coverPhotoUrl: photoUrl } : a));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengatur cover');
    }
  };

  const handleDeletePhoto = async (photo: AreaPhoto) => {
    const ok = await confirm({ title: 'Hapus foto ini?', message: 'Foto akan dihapus permanen dari area.' });
    if (!ok) return;
    setError('');
    try {
      await deleteAreaPhoto(photo.id, photo.url);
      const next = areaPhotos.filter(p => p.id !== photo.id);
      setAreaPhotos(next);
      if (selectedArea?.coverPhotoUrl === photo.url) {
        setSelectedArea({ ...selectedArea, coverPhotoUrl: '' });
      }
      // Reorder remaining photos to stay contiguous
      if (next.length > 0) {
        try {
          await updateAreaPhotoOrder(next.map((p, i) => ({ id: p.id, sortOrder: i })));
          setAreaPhotos(next.map((p, i) => ({ ...p, sortOrder: i })));
        } catch { /* reorder best-effort */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto');
    }
  };

  const handleMovePhoto = async (photo: AreaPhoto, dir: -1 | 1) => {
    const idx = areaPhotos.findIndex(p => p.id === photo.id);
    const target = areaPhotos[idx + dir];
    if (idx < 0 || !target) return;
    const next = [...areaPhotos];
    next[idx] = { ...target, sortOrder: photo.sortOrder };
    next[idx + dir] = { ...photo, sortOrder: target.sortOrder };
    setAreaPhotos(next);
    try {
      await updateAreaPhotoOrder(next.map((p, i) => ({ id: p.id, sortOrder: i })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah urutan foto');
      loadAreaPhotos(selectedArea!);
    }
  };

  // ─── Upload ──────────────────────────────────────────────────

  const handleFilesSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = MAX_PHOTOS - areaPhotos.length - uploadFiles.length;
    const valid = fileArray.filter(f => f.type.startsWith('image/') && f.size <= MAX_FILE_SIZE);
    const limited = valid.slice(0, Math.max(0, remaining));
    if (valid.length > remaining) {
      setError(`Hanya ${remaining} slot tersisa. ${valid.length - remaining} foto dilewati.`);
    } else if (valid.length < fileArray.length) {
      setError(`${fileArray.length - valid.length} file dilewati (bukan gambar atau terlalu besar).`);
    }
    if (limited.length > 0) {
      setError('');
      setUploadFiles(prev => [...prev, ...limited]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFilesSelect(e.dataTransfer.files);
  };

  const handleBatchUpload = async () => {
    if (!selectedArea || uploadFiles.length === 0) return;
    setUploading(true);
    setError('');
    setUploadProgress({ current: 0, total: uploadFiles.length });
    let success = 0;
    let failed = 0;
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      if (!file) continue;
      try {
        await uploadAreaPhoto(selectedArea.id, file);
        success++;
      } catch {
        failed++;
      }
      setUploadProgress({ current: i + 1, total: uploadFiles.length });
    }
    clearUpload();
    await loadAreaPhotos(selectedArea);
    if (failed > 0) setError(`${success} foto berhasil, ${failed} gagal diupload.`);
    setUploading(false);
  };

  const isMaxPhotos = areaPhotos.length + uploadFiles.length >= MAX_PHOTOS;

  return (
    <div className="wf-page space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {view !== 'list' && (
            <button
              type="button"
              onClick={goBackToList}
              aria-label="Kembali"
              className="mt-1 rounded-xl p-2 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0">
            {view !== 'list' && (
              <h2 className="truncate text-base font-bold text-[var(--wf-ink)]">
                {view === 'mapping' ? 'Pemetaan Lokasi' : selectedArea?.name || 'Detail Area'}
              </h2>
            )}
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wf-accent)]">
          <MapPin className="h-4 w-4 text-[var(--wf-accent-ink)]" />
        </div>
      </header>

      <div className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)]">
        <div className="space-y-3 px-4 py-4 sm:px-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wf-accent)] border-t-transparent" />
              <span className="ml-3 text-sm text-[var(--wf-ink-muted)]">Memuat…</span>
            </div>
          )}

          {/* ===== VIEW 1: Area List ===== */}
          {view === 'list' && !isLoading && (
            <>
              {!readOnly && !editing && !isCreating && areas.length > 0 && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--wf-rule-strong)] py-3 text-sm font-semibold text-[var(--wf-ink-muted)] transition-colors hover:border-[var(--wf-accent)] hover:text-[var(--wf-accent)]"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Area Baru
                </button>
              )}

              {!editing && !isCreating && areas.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setView('mapping'); loadMapping(); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] py-3 text-sm font-semibold text-[var(--wf-ink)] transition-colors hover:border-[var(--wf-accent)] hover:text-[var(--wf-accent)]"
                >
                  <Layers className="h-4 w-4" />
                  Pemetaan Lokasi
                </button>
              )}

              {/* Create/Edit form */}
              {(editing || isCreating || (areas.length === 0 && !readOnly)) && (
                <div className="space-y-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
                  <p className="text-xs font-semibold text-[var(--wf-accent)]">
                    {editing ? 'Ubah Area' : 'Area Baru'}
                  </p>
                  <div>
                    <label htmlFor="area-name" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Nama Area *</label>
                    <input
                      id="area-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Atrium, Main Lobby, dsb."
                      className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus-visible:border-[var(--wf-accent)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="area-desc" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Deskripsi</label>
                    <input
                      id="area-desc"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Deskripsi singkat area (opsional)"
                      className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus-visible:border-[var(--wf-accent)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {(editing || isCreating) && (
                      <button
                        type="button"
                        onClick={cancelForm}
                        className="rounded-xl border border-[var(--wf-rule)] px-4 py-2 text-sm font-medium text-[var(--wf-ink)] transition-colors hover:bg-[var(--wf-board-2)]"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveArea}
                      disabled={!formName.trim() || isSaving}
                      className="flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-4 py-2 text-sm font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="h-3.5 w-3.5" />}
                      {editing ? 'Simpan' : 'Buat Area'}
                    </button>
                  </div>
                </div>
              )}

              {areas.length === 0 && !editing && !isCreating && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--wf-rule)] py-10">
                  <MapPin className="mb-3 h-10 w-10 text-[var(--wf-ink-muted)]" />
                  <p className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada area</p>
                  <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">Tambah area pertama untuk mulai mengelola foto</p>
                </div>
              )}

              {areas.length > 0 && (
                <div className="space-y-2">
                  {areas.map((area, idx) => (
                    <div
                      key={area.id}
                      className="group flex items-center gap-3 rounded-xl border border-[var(--wf-rule)] p-3 transition-colors hover:border-[var(--wf-accent)] hover:bg-[var(--wf-accent-soft)]"
                    >
                      <div
                        className="h-14 w-14 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-[var(--wf-board-2)]"
                        onClick={() => openAreaDetail(area)}
                      >
                        {area.coverPhotoUrl ? (
                          <img
                            src={adminThumbUrl(area.coverPhotoUrl)}
                            alt={area.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = area.coverPhotoUrl; }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Camera className="h-5 w-5 text-[var(--wf-ink-muted)]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openAreaDetail(area)}>
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                            {area.name}
                          </p>
                          {!area.isActive && (
                            <span className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-ink-muted)]">
                              <EyeOff className="h-3 w-3" aria-hidden="true" />
                              Disembunyikan
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--wf-ink-muted)]">
                          <span>{area.photoCount ?? 0} foto</span>
                          {editing?.id === area.id && <span>• sedang diubah</span>}
                        </div>
                      </div>

                      {/* Reorder */}
                      {!readOnly && <div className="flex flex-col opacity-0 transition-[opacity] group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleMoveArea(area, -1)}
                          disabled={idx === 0}
                          title="Naik"
                          aria-label="Naik"
                          className="-m-1 rounded p-1 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveArea(area, 1)}
                          disabled={idx === areas.length - 1}
                          title="Turun"
                          aria-label="Turun"
                          className="-m-1 rounded p-1 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4 -rotate-90" />
                        </button>
                      </div>}

                      {/* Toggle active */}
                      {!readOnly && <button
                        type="button"
                        onClick={() => handleToggleActive(area)}
                        title={area.isActive ? 'Sembunyikan dari landing' : 'Tampilkan di landing'}
                        className="rounded-lg p-2 text-[var(--wf-ink-muted)] opacity-0 transition-[background-color,color,opacity] hover:bg-[var(--wf-action)]/10 hover:text-[var(--wf-action)] group-hover:opacity-100"
                      >
                        {area.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>}

                      {/* Edit */}
                      {!readOnly && <button
                        type="button"
                        onClick={() => startEdit(area)}
                        className="rounded-lg p-2 text-[var(--wf-ink-muted)] opacity-0 transition-[background-color,color,opacity] hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>}

                      {/* Delete */}
                      {!readOnly && <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteArea(area); }}
                        className="rounded-lg p-2 text-[var(--wf-ink-muted)] opacity-0 transition-[background-color,color,opacity] hover:bg-red-600/10 hover:text-red-700 dark:hover:text-red-300 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== VIEW 3: Location Mapping (backfill) ===== */}
          {view === 'mapping' && !isLoading && (
            <>
              <p className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-4 py-3 text-xs leading-6 text-[var(--wf-ink-muted)]">
                Teks lokasi lama dipetakan ke area kanonis. Hanya event yang <strong>belum</strong> punya area
                yang akan diisi. Pemetaan manual sebelumnya tidak ditimpa. Centang
                <strong> Seragamkan teks lokasi</strong> bila ejaan lama juga ingin diganti (berlaku untuk semua
                event dengan teks itu, termasuk yang sudah punya area).
              </p>

              {mappingResult && (
                <p className="rounded-xl border border-[var(--wf-live)]/30 bg-[var(--wf-live)]/10 px-4 py-2.5 text-xs font-semibold text-[var(--wf-live)]">
                  {mappingResult}
                </p>
              )}

              {isMappingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--wf-accent)] motion-reduce:animate-none" />
                  <span className="ml-3 text-sm text-[var(--wf-ink-muted)]">Memuat lokasi…</span>
                </div>
              ) : mappingRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--wf-rule)] px-4 py-8 text-center text-sm text-[var(--wf-ink-muted)]">
                  Tidak ada teks lokasi yang perlu dipetakan.
                </div>
              ) : (
                <>
                  <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                    {mappingRows.map(row => {
                      const chosen = mappingChoice[row.lokasi] || '';
                      const suggested = suggestAreaId(row.lokasi, areas);
                      return (
                        <div
                          key={row.lokasi}
                          className="flex flex-col gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-3 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                              {row.lokasi}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--wf-ink-muted)]">
                              {row.eventCount} event{row.draftCount > 0 ? ` · ${row.draftCount} draft` : ''}
                              {row.currentAreaId ? ' · sudah dipetakan' : ''}
                            </p>
                          </div>
                          <select
                            value={chosen}
                            onChange={e => {
                              const next = e.target.value;
                              setMappingChoice(prev => ({ ...prev, [row.lokasi]: next }));
                              // Ikutkan target teks ke nama area baru (bila belum diubah manual)
                              const areaName = areas.find(a => a.id === next)?.name ?? '';
                              setMappingTarget(prev => ({ ...prev, [row.lokasi]: areaName }));
                            }}
                            aria-label={`Area untuk ${row.lokasi}`}
                            className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] sm:w-52 ${
                              chosen ? 'border-[var(--wf-accent)]' : 'border-[var(--wf-rule)]'
                            }`}
                          >
                            <option value="">- Abaikan -</option>
                            {areas.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name}{a.id === suggested ? ' (saran)' : ''}
                              </option>
                            ))}
                          </select>

                          {chosen && (
                            <label className="flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2 sm:w-64">
                              <span className="flex items-center gap-2 text-[11px] font-semibold text-[var(--wf-ink-muted)]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(mappingRename[row.lokasi])}
                                  onChange={e =>
                                    setMappingRename(prev => ({ ...prev, [row.lokasi]: e.target.checked }))
                                  }
                                  className="h-3.5 w-3.5 accent-[var(--wf-accent)]"
                                />
                                Seragamkan teks lokasi
                              </span>
                              <input
                                type="text"
                                value={mappingTarget[row.lokasi] || ''}
                                onChange={e =>
                                  setMappingTarget(prev => ({ ...prev, [row.lokasi]: e.target.value }))
                                }
                                disabled={!mappingRename[row.lokasi]}
                                placeholder="Nama lokasi baru"
                                aria-label={`Teks lokasi baru untuk ${row.lokasi}`}
                                className="w-full rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-2.5 py-1.5 text-xs text-[var(--wf-ink)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!readOnly && <button
                    type="button"
                    onClick={handleApplyMapping}
                    disabled={isApplying}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wf-accent)] py-3 text-sm font-bold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] disabled:opacity-60 ui-focus-ring"
                  >
                    {isApplying ? (
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isApplying ? 'Menerapkan…' : 'Terapkan Pemetaan'}
                  </button>}
                </>
              )}
            </>
          )}

          {/* ===== VIEW 2: Area Detail (Photos) ===== */}
          {view === 'detail' && !isLoading && selectedArea && (
            <>
              {/* Active toggle */}
              <button
                type="button"
                onClick={() => handleToggleActive(selectedArea)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedArea.isActive
                    ? 'border-[var(--wf-live)]/30 bg-[var(--wf-live)]/10 text-[var(--wf-live)]'
                    : 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]'
                }`}
              >
                {selectedArea.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {selectedArea.isActive ? 'Tampil di landing' : 'Disembunyikan dari landing'}
              </button>

              {areaPhotos.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold text-[var(--wf-ink-muted)]">
                    Foto ({areaPhotos.length}/{MAX_PHOTOS})
                  </p>
                  <div className="grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                    {areaPhotos.map((photo, idx) => {
                      const isCover = selectedArea.coverPhotoUrl === photo.url;
                      return (
                        <div
                          key={photo.id}
                          className="group relative overflow-hidden rounded-xl border border-[var(--wf-rule)]"
                        >
                          {isCover && (
                            <div className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--wf-action)] text-[var(--wf-accent-ink)]">
                              <Star className="h-3.5 w-3.5 fill-current" />
                            </div>
                          )}
                          {!readOnly && !isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(photo.url)}
                              title="Jadikan Cover"
                              className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 text-white opacity-0 backdrop-blur-sm transition-[background-color,opacity] hover:bg-[var(--wf-action)] group-hover:opacity-100"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!readOnly && <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo)}
                            className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-red-600/90 text-white opacity-0 backdrop-blur-sm transition-[background-color,opacity] hover:bg-red-700 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>}

                          <div className="aspect-[4/3] w-full">
                            <img
                              src={adminThumbUrl(photo.url)}
                              alt={photo.caption}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).src = photo.url; }}
                            />
                          </div>

                          <div className="flex items-center gap-1 bg-[var(--wf-board-2)] px-2.5 py-2">
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--wf-ink-muted)]" aria-hidden="true" />
                            <div className="flex flex-1 flex-col">
                              <p className="truncate text-xs font-medium text-[var(--wf-ink)]">
                                {photo.caption}
                              </p>
                              <p className="text-[10px] text-[var(--wf-ink-muted)]">
                                Posisi {idx + 1} dari {areaPhotos.length}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col">
                              <button
                                type="button"
                                onClick={() => handleMovePhoto(photo, -1)}
                                disabled={idx === 0}
                                title="Naik"
                                aria-label="Naik"
                                className="-m-1 rounded p-1 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] disabled:opacity-30"
                              >
                                <ChevronLeft className="h-4 w-4 rotate-90" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMovePhoto(photo, 1)}
                                disabled={idx === areaPhotos.length - 1}
                                title="Turun"
                                aria-label="Turun"
                                className="-m-1 rounded p-1 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] disabled:opacity-30"
                              >
                                <ChevronLeft className="h-4 w-4 -rotate-90" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {areaPhotos.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--wf-rule)] py-10">
                  <Camera className="mb-3 h-10 w-10 text-[var(--wf-ink-muted)]" />
                  <p className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada foto</p>
                  <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">Upload foto pertama di bawah</p>
                </div>
              )}

              {/* Upload Section */}
              {!readOnly && <div className="space-y-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
                <p className="text-xs font-semibold text-[var(--wf-ink-muted)]">Upload Foto Baru</p>
                {isMaxPhotos && uploadFiles.length === 0 && (
                  <p className="text-xs text-[var(--wf-action)]">
                    Maksimal {MAX_PHOTOS} foto. Hapus foto yang ada untuk menambah yang baru.
                  </p>
                )}
                {!isMaxPhotos && !uploading && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 text-center transition-colors ${
                      isDragOver
                        ? 'border-[var(--wf-accent)] bg-[var(--wf-accent-soft)]'
                        : 'border-[var(--wf-rule-strong)] hover:border-[var(--wf-accent)] hover:bg-[var(--wf-board-2)]'
                    }`}
                  >
                    <Upload className="h-7 w-7 text-[var(--wf-ink-muted)]" />
                    <p className="mt-2 text-sm font-medium text-[var(--wf-ink-muted)]">
                      Drag & drop foto di sini
                    </p>
                    <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
                      atau klik untuk pilih · max {MAX_PHOTOS - areaPhotos.length} foto · 10MB/file
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => { if (e.target.files) handleFilesSelect(e.target.files); e.target.value = ''; }}
                  className="hidden"
                  disabled={isMaxPhotos}
                />
                {uploadFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {uploadFiles.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--wf-board-2)]">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-full w-full object-cover"
                          />
                          {!uploading && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setUploadFiles(prev => prev.filter((_, i) => i !== idx)); }}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-[opacity] group-hover:opacity-100"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--wf-ink-muted)]">{uploadFiles.length} foto dipilih</p>
                    {uploading && uploadProgress.total > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--wf-board-2)]">
                          <div
                            className="h-full rounded-full bg-[var(--wf-accent)] transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-[var(--wf-ink-muted)]">{uploadProgress.current}/{uploadProgress.total} foto terupload</p>
                      </div>
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={handleBatchUpload}
                        disabled={uploadFiles.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wf-accent)] py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        Upload {uploadFiles.length} Foto
                      </button>
                    )}
                  </div>
                )}
              </div>}

              {/* Edit area info */}
              {(editing?.id === selectedArea.id) && (
                <div className="space-y-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
                  <p className="text-xs font-semibold text-[var(--wf-accent)]">Ubah Area</p>
                  <div>
                    <label htmlFor="area-name-edit" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Nama Area *</label>
                    <input
                      id="area-name-edit"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus-visible:border-[var(--wf-accent)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="area-desc-edit" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Deskripsi</label>
                    <input
                      id="area-desc-edit"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus-visible:border-[var(--wf-accent)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(null); resetForm(); }}
                      className="rounded-xl border border-[var(--wf-rule)] px-4 py-2 text-sm font-medium text-[var(--wf-ink)] transition-colors hover:bg-[var(--wf-board-2)]"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveArea}
                      disabled={!formName.trim() || isSaving}
                      className="flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-4 py-2 text-sm font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="h-3.5 w-3.5" />}
                      Simpan
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[var(--wf-rule)] px-4 py-4 text-xs text-[var(--wf-ink-muted)] sm:px-6">
          {view === 'detail' && selectedArea
            ? `${areaPhotos.length} / ${MAX_PHOTOS} foto`
            : `${areas.length} area`}
        </div>
      </div>
      {confirmDialogEl}
    </div>
  );
}