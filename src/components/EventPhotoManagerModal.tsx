import { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { EventPhoto } from '../types';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  photos: EventPhoto[];
  onUpload: (file: File, caption: string, eventDate: string) => Promise<EventPhoto>;
  onDelete: (id: string, url: string) => Promise<void>;
  onReorder: (photos: Array<{ id: string; sortOrder: number }>) => Promise<void>;
  onRefresh: () => void;
}

const MAX_PHOTOS = 9;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function EventPhotoManagerModal({ isOpen, onClose, photos, onUpload, onDelete, onReorder, onRefresh }: Props) {
  const [localPhotos, setLocalPhotos] = useState<EventPhoto[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with props
  useEffect(() => {
    setLocalPhotos(photos);
    setOrderChanged(false);
  }, [photos, isOpen]);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file maksimal 10MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearForm = () => {
    setSelectedFile(null);
    setCaption('');
    setEventDate('');
    setError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    setError('');

    if (!selectedFile) {
      setError('Pilih file foto terlebih dahulu');
      return;
    }
    if (!caption.trim()) {
      setError('Caption wajib diisi');
      return;
    }

    setUploading(true);
    try {
      await onUpload(selectedFile, caption.trim(), eventDate);
      onRefresh();
      clearForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengupload foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    try {
      await onDelete(id, url);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto');
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await onReorder(localPhotos.map((p, i) => ({ id: p.id, sortOrder: i })));
      onRefresh();
      setOrderChanged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan urutan');
    } finally {
      setSaving(false);
    }
  };

  const isMaxPhotos = localPhotos.length >= MAX_PHOTOS;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <ImageIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">Kelola Foto Event</p>
              <p className="text-xs text-slate-400">Upload dan atur urutan foto event</p>
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

          {/* Photo Grid */}
          {localPhotos.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Foto ({localPhotos.length}/{MAX_PHOTOS}) — seret untuk mengatur urutan
              </p>
              <div className="grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                {localPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => {
                      setDragIdx(index);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIdx(index);
                    }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIdx === null || dragIdx === index) return;
                      const newPhotos = [...localPhotos];
                      const [moved] = newPhotos.splice(dragIdx, 1);
                      newPhotos.splice(index, 0, moved);
                      setLocalPhotos(newPhotos);
                      setOrderChanged(true);
                      setDragIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDragEnd={() => {
                      setDragIdx(null);
                      setDragOverIdx(null);
                    }}
                    className={`group relative overflow-hidden rounded-xl border transition ${
                      dragIdx === index
                        ? 'opacity-50'
                        : dragOverIdx === index
                          ? 'ring-2 ring-violet-400 border-violet-400'
                          : 'border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 cursor-grab items-center justify-center rounded-lg bg-black/40 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.id, photo.url)}
                      className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/80 text-white opacity-0 backdrop-blur-sm transition hover:bg-red-600 group-hover:opacity-100"
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

                    {/* Info */}
                    <div className="bg-slate-50 px-2.5 py-2 dark:bg-slate-700/50">
                      <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                        {photo.caption}
                      </p>
                      {photo.eventDate && (
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {photo.eventDate}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {localPhotos.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
              <ImageIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada foto</p>
              <p className="mt-1 text-xs text-slate-400">Upload foto event pertama di bawah</p>
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
                    onClick={clearForm}
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

              <div className="flex-1 space-y-2">
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Nama event / deskripsi foto *"
                  disabled={isMaxPhotos}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={isMaxPhotos}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Upload button */}
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || isMaxPhotos || !selectedFile || !caption.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-violet-900/30"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Mengupload...' : 'Upload Foto'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveOrder}
            disabled={!orderChanged || saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-violet-900/30"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Simpan Urutan'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
