import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Upload, Star, ChevronLeft, Save } from 'lucide-react';
import { PhotoAlbum, EventPhoto, EventItem, AnnualTheme } from '../types';
import { fetchAlbums, createAlbum, deleteAlbum, setAlbumCover, uploadAlbumPhoto, deleteAlbumPhoto, fetchAlbumBySlug } from '../utils/supabaseApi';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pastEvents?: EventItem[];
  annualThemes?: AnnualTheme[];
}

const MAX_PHOTOS = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AlbumManagerModal({ isOpen, onClose, pastEvents, annualThemes }: Props) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<EventPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [newLokasi, setNewLokasi] = useState('');
  const [isCustomEvent, setIsCustomEvent] = useState(false);

  // Upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load albums when modal opens
  const loadAlbums = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAlbums();
      setAlbums(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat album');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAlbums();
      setView('list');
      setSelectedAlbum(null);
      setAlbumPhotos([]);
      setShowCreateForm(false);
      clearCreateForm();
      clearUploadForm();
    }
  }, [isOpen, loadAlbums]);

  const clearCreateForm = () => {
    setNewName('');
    setNewDesc('');
    setNewDate('');
    setNewLokasi('');
    setSelectedEventId('');
    setSelectedThemeId('');
    setIsCustomEvent(false);
  };

  const clearUploadForm = () => {
    setUploadFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Helpers ---

  const autoMatchTheme = (dateStr: string): string => {
    if (!dateStr || !annualThemes) return '';
    const theme = annualThemes.find(t => dateStr >= t.dateStart && dateStr <= t.dateEnd);
    return theme?.id || '';
  };

  const handleEventSelect = (eventId: string) => {
    if (eventId === '__custom__') {
      setIsCustomEvent(true);
      setSelectedEventId('');
      setNewName('');
      setNewDesc('');
      setNewDate('');
      setNewLokasi('');
      setSelectedThemeId('');
      return;
    }
    setIsCustomEvent(false);
    setSelectedEventId(eventId);
    const event = pastEvents?.find(e => e.id === eventId);
    if (event) {
      setNewName(event.acara);
      setNewDesc(event.keterangan || '');
      setNewDate(event.dateStr);
      setNewLokasi(event.lokasi || '');
      setSelectedThemeId(autoMatchTheme(event.dateStr));
    }
  };

  // --- Album CRUD ---

  const handleCreateAlbum = async () => {
    if (!newName.trim()) {
      setError('Nama event wajib diisi');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await createAlbum(
        newName.trim(),
        newDesc.trim(),
        newDate,
        selectedEventId || undefined,
        newLokasi.trim() || undefined,
        selectedThemeId || undefined
      );
      setShowCreateForm(false);
      clearCreateForm();
      await loadAlbums();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAlbum = async (album: PhotoAlbum) => {
    if (!confirm(`Hapus album "${album.name}"? Semua foto di dalamnya juga akan dihapus.`)) return;
    setIsLoading(true);
    setError('');
    try {
      await deleteAlbum(album.id);
      await loadAlbums();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus album');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Album Detail ---

  const openAlbumDetail = async (album: PhotoAlbum) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await fetchAlbumBySlug(album.slug);
      if (result) {
        setSelectedAlbum(result.album);
        setAlbumPhotos(result.photos);
        setView('detail');
      } else {
        setError('Album tidak ditemukan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail album');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAlbumDetail = async () => {
    if (!selectedAlbum) return;
    try {
      const result = await fetchAlbumBySlug(selectedAlbum.slug);
      if (result) {
        setSelectedAlbum(result.album);
        setAlbumPhotos(result.photos);
      }
    } catch {
      // silent refresh failure
    }
  };

  const goBackToList = () => {
    setView('list');
    setSelectedAlbum(null);
    setAlbumPhotos([]);
    clearUploadForm();
    setError('');
    loadAlbums();
  };

  // --- Photo operations ---

  const handleFilesSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = MAX_PHOTOS - albumPhotos.length - uploadFiles.length;

    const valid = fileArray.filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });

    const limited = valid.slice(0, Math.max(0, remaining));

    if (valid.length > remaining) {
      setError(`Hanya ${remaining} slot tersisa. ${valid.length - remaining} foto dilewati.`);
    } else if (valid.length < fileArray.length) {
      setError(`${fileArray.length - valid.length} file dilewati (bukan gambar atau terlalu besar).`);
    }

    if (limited.length > 0) {
      setUploadFiles(prev => [...prev, ...limited]);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setError('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleBatchUpload = async () => {
    if (!selectedAlbum || uploadFiles.length === 0) return;

    setUploading(true);
    setError('');
    setUploadProgress({ current: 0, total: uploadFiles.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      try {
        const file = uploadFiles[i];
        if (!file) continue;
        await uploadAlbumPhoto(selectedAlbum.id, file);
        successCount++;
      } catch {
        failCount++;
      }
      setUploadProgress({ current: i + 1, total: uploadFiles.length });
    }

    clearUploadForm();
    await refreshAlbumDetail();

    // Auto-set cover if album doesn't have one yet
    if (selectedAlbum && !selectedAlbum.coverPhotoUrl && successCount > 0) {
      try {
        const updated = await fetchAlbumBySlug(selectedAlbum.slug);
        if (updated && updated.photos.length > 0) {
          const firstPhoto = updated.photos[0];
          if (firstPhoto) {
            await setAlbumCover(selectedAlbum.id, firstPhoto.url);
            await refreshAlbumDetail();
          }
        }
      } catch { /* silently fail */ }
    }

    if (failCount > 0) {
      setError(`${successCount} foto berhasil, ${failCount} gagal diupload.`);
    }

    setUploading(false);
  };

  const handleSetCover = async (photoUrl: string) => {
    if (!selectedAlbum) return;
    setError('');
    try {
      await setAlbumCover(selectedAlbum.id, photoUrl);
      await refreshAlbumDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengatur cover');
    }
  };

  const handleDeletePhoto = async (id: string, url: string) => {
    if (!confirm('Hapus foto ini?')) return;
    setError('');
    try {
      await deleteAlbumPhoto(id, url);
      await refreshAlbumDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto');
    }
  };

  const isMaxPhotos = albumPhotos.length + uploadFiles.length >= MAX_PHOTOS;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {view === 'detail' && (
              <button
                onClick={goBackToList}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <ImageIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">
                {view === 'list' ? 'Album Gallery' : selectedAlbum?.name || 'Detail Album'}
              </p>
              <p className="text-xs text-slate-400">
                {view === 'list'
                  ? 'Kelola album foto event'
                  : `${albumPhotos.length} / ${MAX_PHOTOS} foto`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Memuat...</span>
            </div>
          )}

          {/* ===== VIEW 1: Album List ===== */}
          {view === 'list' && !isLoading && (
            <>
              {/* Create Album Button */}
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(true); setError(''); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 transition hover:border-violet-400 hover:text-violet-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-violet-400 dark:hover:text-violet-400"
                >
                  <Plus className="h-4 w-4" />
                  Buat Album Baru
                </button>
              )}

              {/* Create Album Form */}
              {showCreateForm && (
                <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Album Baru</p>
                  <div className="space-y-3">
                    {/* Event dropdown */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Pilih Event</label>
                      <select
                        value={isCustomEvent ? '__custom__' : selectedEventId}
                        onChange={(e) => handleEventSelect(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Pilih event yang sudah berlangsung...</option>
                        {(pastEvents || [])
                          .filter(e => !albums.some(a => a.eventId === e.id))
                          .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
                          .map(e => (
                            <option key={e.id} value={e.id}>{e.acara} — {e.tanggal}</option>
                          ))
                        }
                        <option value="__custom__">✏ Custom (ketik manual)</option>
                      </select>
                    </div>

                    {/* Theme dropdown */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tema Tahunan</label>
                      <select
                        value={selectedThemeId}
                        onChange={(e) => setSelectedThemeId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Pilih tema (opsional)...</option>
                        {(annualThemes || []).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.dateStart} — {t.dateEnd})</option>
                        ))}
                      </select>
                      {selectedThemeId && !isCustomEvent && (
                        <p className="mt-1 text-xs text-violet-500">Auto-matched berdasarkan tanggal event</p>
                      )}
                    </div>

                    {/* Name */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Event *</label>
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nama event"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Deskripsi</label>
                      <input
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Deskripsi event"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    {/* Date + Location row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tanggal</label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => {
                            setNewDate(e.target.value);
                            if (!isCustomEvent) setSelectedThemeId(autoMatchTheme(e.target.value));
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Lokasi</label>
                        <input
                          value={newLokasi}
                          onChange={(e) => setNewLokasi(e.target.value)}
                          placeholder="Lokasi event"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowCreateForm(false); clearCreateForm(); setError(''); }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAlbum}
                      disabled={!newName.trim() || isLoading}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-violet-900/30"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Buat Album
                    </button>
                  </div>
                </div>
              )}

              {/* Album List */}
              {albums.length === 0 && !showCreateForm && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
                  <ImageIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada album</p>
                  <p className="mt-1 text-xs text-slate-400">Buat album pertama untuk mulai mengelola foto</p>
                </div>
              )}

              {albums.length > 0 && (
                <div className="space-y-2">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-violet-300 hover:bg-violet-50/30 dark:border-slate-600 dark:hover:border-violet-500/50 dark:hover:bg-violet-900/10"
                    >
                      {/* Cover thumbnail */}
                      <div
                        className="h-14 w-14 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700"
                        onClick={() => openAlbumDetail(album)}
                      >
                        {album.coverPhotoUrl ? (
                          <img
                            src={album.coverPhotoUrl}
                            alt={album.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-slate-300 dark:text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => openAlbumDetail(album)}
                      >
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                          {album.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                          {album.eventDate && <span>{album.eventDate}</span>}
                          <span>{album.photoCount ?? 0} foto</span>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album); }}
                        className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== VIEW 2: Album Detail (Photos) ===== */}
          {view === 'detail' && !isLoading && selectedAlbum && (
            <>
              {/* Photo Grid */}
              {albumPhotos.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Foto ({albumPhotos.length}/{MAX_PHOTOS})
                  </p>
                  <div className="grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                    {albumPhotos.map((photo) => {
                      const isCover = selectedAlbum.coverPhotoUrl === photo.url;
                      return (
                        <div
                          key={photo.id}
                          className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600"
                        >
                          {/* Cover badge */}
                          {isCover && (
                            <div className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-white shadow-sm">
                              <Star className="h-3.5 w-3.5 fill-current" />
                            </div>
                          )}

                          {/* Set cover button */}
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

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id, photo.url)}
                            className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/80 text-white opacity-0 backdrop-blur-sm transition hover:bg-red-600 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Thumbnail */}
                          <div className="aspect-[4/3] w-full">
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          {/* Caption */}
                          <div className="bg-slate-50 px-2.5 py-2 dark:bg-slate-700/50">
                            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                              {photo.caption}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {albumPhotos.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
                  <ImageIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada foto</p>
                  <p className="mt-1 text-xs text-slate-400">Upload foto pertama di bawah</p>
                </div>
              )}

              {/* Upload Section */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/30">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload Foto Baru</p>

                {isMaxPhotos && uploadFiles.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Maksimal {MAX_PHOTOS} foto. Hapus foto yang ada untuk menambah yang baru.
                  </p>
                )}

                {/* Drag & drop upload zone */}
                {!isMaxPhotos && !uploading && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 text-center transition ${
                      isDragOver
                        ? 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-900/20'
                        : 'border-slate-300 hover:border-violet-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-violet-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Upload className="h-7 w-7 text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      Drag & drop foto di sini
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      atau klik untuk pilih · max {MAX_PHOTOS - albumPhotos.length} foto · 10MB/file
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

                {/* Preview grid */}
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
                              onClick={(e) => { e.stopPropagation(); removeUploadFile(idx); }}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">{uploadFiles.length} foto dipilih</p>

                    {/* Progress bar */}
                    {uploading && uploadProgress.total > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{uploadProgress.current}/{uploadProgress.total} foto terupload</p>
                      </div>
                    )}

                    {/* Upload button */}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={handleBatchUpload}
                        disabled={uploadFiles.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-violet-900/30"
                      >
                        <Upload className="h-4 w-4" />
                        Upload {uploadFiles.length} Foto
                      </button>
                    )}
                  </div>
                )}
              </div>
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
