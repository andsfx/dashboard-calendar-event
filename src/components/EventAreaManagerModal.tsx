import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  Eye,
  EyeOff,
  GripVertical,
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
  updateAreaPhotoOrder,
  updateEventArea,
  uploadAreaPhoto,
} from '../utils/supabaseApi';
import { ModalWrapper } from './ModalWrapper';
import { ModalHeader } from './ui/ModalHeader';
import { adminThumbUrl } from '../utils/imageOptim';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_PHOTOS = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function EventAreaManagerModal({ isOpen, onClose }: Props) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [areas, setAreas] = useState<EventArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<EventArea | null>(null);
  const [areaPhotos, setAreaPhotos] = useState<AreaPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string } | null>(null);

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
    if (isOpen) {
      loadAreas();
      setView('list');
      setSelectedArea(null);
      setAreaPhotos([]);
      setEditing(null);
      resetForm();
      clearUpload();
    }
  }, [isOpen, loadAreas]);

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
    resetForm();
    setError('');
  };

  const startEdit = (area: EventArea) => {
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
    if (!confirm(`Hapus area "${area.name}"? Semua foto di dalamnya juga akan dihapus.`)) return;
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
    if (!confirm('Hapus foto ini?')) return;
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" ariaLabelledBy="event-area-manager-title">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800">
        <ModalHeader
          titleId="event-area-manager-title"
          title={view === 'list' ? 'Foto Area Event' : selectedArea?.name || 'Detail Area'}
          subtitle={
            view === 'list'
              ? 'Kelola area event di Metropolitan Mall Bekasi'
              : `${areaPhotos.length} / ${MAX_PHOTOS} foto`
          }
          icon={<MapPin />}
          onClose={onClose}
          closeAriaLabel="Tutup"
          leading={
            view === 'detail' ? (
              <button
                type="button"
                onClick={goBackToList}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : undefined
          }
        />

        <div className="space-y-3 px-4 py-4 sm:px-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary-500 border-t-transparent" />
              <span className="ml-3 text-sm ui-text-muted">Memuat...</span>
            </div>
          )}

          {/* ===== VIEW 1: Area List ===== */}
          {view === 'list' && !isLoading && (
            <>
              {!editing && areas.length > 0 && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold ui-text-muted transition hover:border-brand-primary-400 hover:text-brand-primary-600 dark:border-slate-600 dark:hover:border-brand-primary-400 dark:hover:text-brand-primary-400"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Area Baru
                </button>
              )}

              {/* Create/Edit form */}
              {(editing || areas.length === 0) && (
                <div className="space-y-3 rounded-xl border border-brand-primary-200 bg-brand-primary-50/50 p-4 dark:border-brand-primary-900/50 dark:bg-brand-primary-900/10">
                  <p className="text-xs font-semibold text-brand-primary-700 dark:text-brand-primary-300">
                    {editing ? 'Ubah Area' : 'Area Baru'}
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Area *</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="cth: Panggung Lt. 3, Atrium 2, Foodventure Lt. 2"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Deskripsi</label>
                    <input
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Deskripsi singkat area (opsional)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(null); resetForm(); }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveArea}
                      disabled={!formName.trim() || isSaving}
                      className="flex items-center gap-2 rounded-xl bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-primary-200 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-brand-primary-900/30"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="h-3.5 w-3.5" />}
                      {editing ? 'Simpan' : 'Buat Area'}
                    </button>
                  </div>
                </div>
              )}

              {areas.length === 0 && !editing && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
                  <MapPin className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium ui-text-muted">Belum ada area</p>
                  <p className="mt-1 text-xs text-slate-500">Tambah area pertama untuk mulai mengelola foto</p>
                </div>
              )}

              {areas.length > 0 && (
                <div className="space-y-2">
                  {areas.map((area, idx) => (
                    <div
                      key={area.id}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-primary-300 hover:bg-brand-primary-50/30 dark:border-slate-600 dark:hover:border-brand-primary-500/50 dark:hover:bg-brand-primary-900/10"
                    >
                      <div
                        className="h-14 w-14 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700"
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
                            <Camera className="h-5 w-5 text-slate-300 dark:text-slate-500" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openAreaDetail(area)}>
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                            {area.name}
                          </p>
                          {!area.isActive && (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              <EyeOff className="h-3 w-3" aria-hidden="true" />
                              Disembunyikan
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span>{area.photoCount ?? 0} foto</span>
                          {editing?.id === area.id && <span>• sedang diubah</span>}
                        </div>
                      </div>

                      {/* Reorder */}
                      <div className="flex flex-col opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleMoveArea(area, -1)}
                          disabled={idx === 0}
                          title="Naik"
                          className="rounded p-0.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveArea(area, 1)}
                          disabled={idx === areas.length - 1}
                          title="Turun"
                          className="rounded p-0.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 -rotate-90" />
                        </button>
                      </div>

                      {/* Toggle active */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(area)}
                        title={area.isActive ? 'Sembunyikan dari landing' : 'Tampilkan di landing'}
                        className="rounded-lg p-2 text-slate-500 opacity-0 transition hover:bg-amber-50 hover:text-amber-500 group-hover:opacity-100 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                      >
                        {area.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => startEdit(area)}
                        className="rounded-lg p-2 text-slate-500 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteArea(area); }}
                        className="rounded-lg p-2 text-slate-500 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedArea.isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {selectedArea.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {selectedArea.isActive ? 'Tampil di landing' : 'Disembunyikan dari landing'}
              </button>

              {areaPhotos.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Foto ({areaPhotos.length}/{MAX_PHOTOS})
                  </p>
                  <div className="grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                    {areaPhotos.map((photo, idx) => {
                      const isCover = selectedArea.coverPhotoUrl === photo.url;
                      return (
                        <div
                          key={photo.id}
                          className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600"
                        >
                          {isCover && (
                            <div className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-white shadow-sm">
                              <Star className="h-3.5 w-3.5 fill-current" />
                            </div>
                          )}
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(photo.url)}
                              title="Jadikan Cover"
                              className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 text-white opacity-0 backdrop-blur-sm transition hover:bg-amber-500 group-hover:opacity-100"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo)}
                            className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/80 text-white opacity-0 backdrop-blur-sm transition hover:bg-red-600 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <div className="aspect-[4/3] w-full">
                            <img
                              src={adminThumbUrl(photo.url)}
                              alt={photo.caption}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).src = photo.url; }}
                            />
                          </div>

                          <div className="flex items-center gap-1 bg-[var(--brand-card)] px-2.5 py-2 dark:bg-slate-700/50">
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-500" aria-hidden="true" />
                            <div className="flex flex-1 flex-col">
                              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                                {photo.caption}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Posisi {idx + 1} dari {areaPhotos.length}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col">
                              <button
                                type="button"
                                onClick={() => handleMovePhoto(photo, -1)}
                                disabled={idx === 0}
                                title="Naik"
                                className="rounded p-0.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                              >
                                <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMovePhoto(photo, 1)}
                                disabled={idx === areaPhotos.length - 1}
                                title="Turun"
                                className="rounded p-0.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                              >
                                <ChevronLeft className="h-3.5 w-3.5 -rotate-90" />
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
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
                  <Camera className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium ui-text-muted">Belum ada foto</p>
                  <p className="mt-1 text-xs text-slate-500">Upload foto pertama di bawah</p>
                </div>
              )}

              {/* Upload Section */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-[var(--brand-card)] p-4 dark:border-slate-600 dark:bg-slate-700/30">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload Foto Baru</p>
                {isMaxPhotos && uploadFiles.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Maksimal {MAX_PHOTOS} foto. Hapus foto yang ada untuk menambah yang baru.
                  </p>
                )}
                {!isMaxPhotos && !uploading && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 text-center transition ${
                      isDragOver
                        ? 'border-brand-primary-400 bg-brand-primary-50 dark:border-brand-primary-500 dark:bg-brand-primary-900/20'
                        : 'border-slate-300 hover:border-brand-primary-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-brand-primary-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Upload className="h-7 w-7 text-slate-500" />
                    <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      Drag & drop foto di sini
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
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
                        <div key={`${file.name}-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-full w-full object-cover"
                          />
                          {!uploading && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setUploadFiles(prev => prev.filter((_, i) => i !== idx)); }}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs ui-text-muted">{uploadFiles.length} foto dipilih</p>
                    {uploading && uploadProgress.total > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-brand-primary-500 transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs ui-text-muted">{uploadProgress.current}/{uploadProgress.total} foto terupload</p>
                      </div>
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={handleBatchUpload}
                        disabled={uploadFiles.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-primary-200 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-brand-primary-900/30"
                      >
                        <Upload className="h-4 w-4" />
                        Upload {uploadFiles.length} Foto
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Edit area info */}
              {(editing?.id === selectedArea.id) && (
                <div className="space-y-3 rounded-xl border border-brand-primary-200 bg-brand-primary-50/50 p-4 dark:border-brand-primary-900/50 dark:bg-brand-primary-900/10">
                  <p className="text-xs font-semibold text-brand-primary-700 dark:text-brand-primary-300">Ubah Area</p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Area *</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Deskripsi</label>
                    <input
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(null); resetForm(); }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveArea}
                      disabled={!formName.trim() || isSaving}
                      className="flex items-center gap-2 rounded-xl bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-primary-200 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-brand-primary-900/30"
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
        <div className="flex items-center justify-end border-t border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}