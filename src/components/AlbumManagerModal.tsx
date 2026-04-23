import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Upload, Star, ChevronLeft, Save } from 'lucide-react';
import { PhotoAlbum, EventPhoto } from '../types';
import { fetchAlbums, createAlbum, deleteAlbum, setAlbumCover, uploadAlbumPhoto, deleteAlbumPhoto, fetchAlbumBySlug } from '../utils/supabaseApi';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_PHOTOS = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AlbumManagerModal({ isOpen, onClose }: Props) {
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

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [previewUrl, setPreviewUrl] = useState('');
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

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearCreateForm = () => {
    setNewName('');
    setNewDesc('');
    setNewDate('');
  };

  const clearUploadForm = () => {
    setUploadFile(null);
    setUploadCaption('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      await createAlbum(newName.trim(), newDesc.trim(), newDate);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file maksimal 10MB');
      e.target.value = '';
      return;
    }

    setUploadFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadPhoto = async () => {
    if (!selectedAlbum || !uploadFile) return;
    if (!uploadCaption.trim()) {
      setError('Caption wajib diisi');
      return;
    }

    setUploading(true);
    setError('');
    try {
      await uploadAlbumPhoto(selectedAlbum.id, uploadFile, uploadCaption.trim());
      clearUploadForm();
      await refreshAlbumDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengupload foto');
    } finally {
      setUploading(false);
    }
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

  const isMaxPhotos = albumPhotos.length >= MAX_PHOTOS;

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
                  <div className="space-y-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nama Event *"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <input
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Deskripsi"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]"
                    />
                  </div>
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

                {isMaxPhotos && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Maksimal {MAX_PHOTOS} foto. Hapus foto yang ada untuk menambah yang baru.
                  </p>
                )}

                {/* File input + preview */}
                <div className="flex items-start gap-3">
                  {previewUrl ? (
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={clearUploadForm}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isMaxPhotos}
                      className="flex h-20 w-20 flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-violet-400 hover:text-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500 dark:hover:border-violet-400"
                    >
                      <Upload className="h-5 w-5" />
                      <span className="mt-1 text-[10px]">Pilih</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isMaxPhotos}
                  />

                  <div className="flex-1">
                    <input
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      placeholder="Caption foto *"
                      disabled={isMaxPhotos}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Upload button */}
                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  disabled={uploading || isMaxPhotos || !uploadFile || !uploadCaption.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-violet-900/30"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Mengupload...' : 'Upload Foto'}
                </button>
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
