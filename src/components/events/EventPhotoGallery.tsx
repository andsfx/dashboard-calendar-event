import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Upload, Trash2, Loader2, X, ImagePlus, Link2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { apiGet } from '../../lib/rest';
import {
  uploadToR2,
  createEventPhotoRecord,
  deleteEventPhoto,
  linkAlbumToEvent,
  fetchAlbums,
} from '../../utils/domainApi';
import type { PhotoAlbum } from '../../types';
import { useConfirmDialog } from '../modals/useConfirmDialog';
import { useBackgroundInert } from '../media/overlayLayer';

interface EventPhoto {
  id: string;
  url: string;
  caption: string;
  event_id: string;
  sort_order: number;
  created_at: string;
}

// Row mentah snake_case dari /albums (GET publik {success,data:{albums,photos}}).
interface DbAlbumRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  event_date: string;
  cover_photo_url: string;
  sort_order: number;
  event_id: string;
  lokasi: string;
  theme_id: string;
}

interface DbPhotoRow {
  id: string;
  url: string;
  caption: string;
  event_date: string;
  sort_order: number;
  album_id: string | null;
  event_id: string;
  created_at: string;
}

interface EventPhotoGalleryProps {
  eventId: string;
  eventName: string;
  canUpload?: boolean;
}

function GalleryErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-800 dark:bg-red-950/30">
      <Camera className="mx-auto h-6 w-6 text-red-700 dark:text-red-300" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Gagal memuat foto</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="ui-focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--brand-tosca-dark)]"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Coba lagi
      </button>
    </div>
  );
}

export function EventPhotoGallery({ eventId, eventName, canUpload = false }: EventPhotoGalleryProps) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();
  const [linkedAlbum, setLinkedAlbum] = useState<PhotoAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);

  // Reads stay public REST (GET /albums — RLS must allow public read)
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { albums, photos } = await apiGet<{ albums: DbAlbumRow[]; photos: DbPhotoRow[] }>('/albums');
      // Filter eventId client-side (backend /albums kirim semua album + foto).
      const eventPhotos = (photos || [])
        .filter(p => p.event_id === eventId)
        .map(p => ({
          id: p.id,
          url: p.url,
          caption: p.caption || '',
          event_id: p.event_id,
          sort_order: p.sort_order || 0,
          created_at: p.created_at || '',
        }));
      setPhotos(eventPhotos);
      const albumRows = (albums || []).filter(a => a.event_id === eventId);
      const row = albumRows.length > 0 ? albumRows[0] : undefined;
      setLinkedAlbum(
        row
          ? {
              id: row.id,
              name: row.name,
              slug: row.slug,
              description: row.description || '',
              eventDate: row.event_date || '',
              coverPhotoUrl: row.cover_photo_url || '',
              sortOrder: row.sort_order || 0,
              eventId: row.event_id || '',
              lokasi: row.lokasi || '',
              themeId: row.theme_id || '',
            }
          : null
      );
    } catch {
      setLoadError('Foto tidak bisa dimuat. Periksa koneksi lalu coba lagi.');
    }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // Writes go through auth'd admin proxy + R2 presign
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const url = await uploadToR2(file, `events/${eventId}/`);
        await createEventPhotoRecord({
          url,
          caption: '',
          event_id: eventId,
          event_date: '',
        });
      }
      await fetchPhotos();
    } catch (err) {
      console.error('[EventPhotoGallery] upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [eventId, fetchPhotos]);

  const handleDelete = useCallback(async (photoId: string) => {
    const ok = await confirm({ title: 'Hapus foto ini?', message: 'Foto akan dihapus permanen dari galeri event.' });
    if (!ok) return;
    const photo = photos.find((p) => p.id === photoId);
    try {
      await deleteEventPhoto(photoId, photo?.url || '');
      await fetchPhotos();
    } catch (err) {
      console.error('[EventPhotoGallery] delete failed:', err);
    }
  }, [confirm, photos, fetchPhotos]);

  const handleLinkAlbum = useCallback(async (albumId: string) => {
    try {
      await linkAlbumToEvent(albumId, eventId);
      setShowLinkForm(false);
      await fetchPhotos();
    } catch (err) {
      console.error('[EventPhotoGallery] link album failed:', err);
    }
  }, [eventId, fetchPhotos]);

  useEffect(() => {
    if (!showLinkForm) return;
    fetchAlbums()
      .then(setAlbums)
      .catch(() => setAlbums([]));
  }, [showLinkForm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-brand-primary-500" aria-hidden="true" />
        <p className="text-xs ui-text-muted">Memuat foto...</p>
      </div>
    );
  }

  const hasContent = photos.length > 0 || linkedAlbum;

  // Gagal muat dibedakan dari kosong: publik mendapat sebab + aksi coba lagi,
  // bukan ruang kosong senyap.
  if (loadError && !hasContent && !canUpload) {
    return <GalleryErrorState message={loadError} onRetry={() => { void fetchPhotos(); }} />;
  }

  if (!hasContent && !canUpload) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-brand-primary-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Dokumentasi Foto
          </h2>
          {photos.length > 0 && (
<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium ui-text-muted dark:bg-slate-800">
              {photos.length}
            </span>
          )}
        </div>
        {!!canUpload && (
          <div className="flex gap-1.5">
            <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-brand-primary-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-brand-primary-700">
              <Upload className="h-3 w-3" />
              Upload
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
              />
            </label>
            {!linkedAlbum && (
              <button
                onClick={() => setShowLinkForm(!showLinkForm)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Link2 className="h-3 w-3" />
                Link Album
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-primary-50 px-3 py-2 text-xs text-brand-primary-700 dark:bg-brand-primary-900/20 dark:text-brand-primary-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Mengupload foto…
        </div>
      )}
      {/* Galat muat untuk admin: sebab + retry, upload tetap tersedia */}
      {!!canUpload && loadError && (
        <GalleryErrorState message={loadError} onRetry={() => { void fetchPhotos(); }} />
      )}

      {/* Link album form */}
      {showLinkForm && (
        <div className="rounded-xl border border-brand-primary-200 bg-brand-primary-50/50 p-3 dark:border-brand-primary-800 dark:bg-brand-primary-950/20">
          <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">Pilih album untuk di-link:</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {albums.filter(a => !a.eventId || a.eventId === eventId).map(a => (
              <button
                key={a.id}
                onClick={() => handleLinkAlbum(a.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-brand-primary-100 dark:text-slate-300 dark:hover:bg-brand-primary-900/30"
              >
                {a.coverPhotoUrl && <img src={a.coverPhotoUrl} alt="" className="h-8 w-8 rounded object-cover" />}
                <span className="truncate">{a.name}</span>
              </button>
            ))}
            {albums.length === 0 && <p className="text-[10px] text-slate-500 dark:text-slate-300">Belum ada album</p>}
          </div>
        </div>
      )}

      {/* Linked album */}
      {linkedAlbum && (
        <a
          href={`/gallery/${linkedAlbum.slug}`}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-brand-primary-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-primary-600"
        >
          {linkedAlbum.coverPhotoUrl && (
            <img src={linkedAlbum.coverPhotoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{linkedAlbum.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-300">{linkedAlbum.photoCount || 0} foto · Lihat album →</p>
          </div>
        </a>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => setLightboxIdx(idx)}
                data-gallery-thumb={idx}
                className="ui-focus-ring block h-full w-full cursor-pointer rounded-xl"
                aria-label={`Buka foto ${idx + 1} dari ${photos.length}${photo.caption ? `: ${photo.caption}` : ''}`}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || `Foto ${idx + 1}`}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              </button>
              {!!canUpload && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 md:right-1.5 md:top-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasContent && !!canUpload && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 transition hover:border-brand-primary-300 dark:border-slate-700 dark:hover:border-brand-primary-600">
          <ImagePlus className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-xs ui-text-muted">Klik untuk upload foto dokumentasi</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-300">JPG, PNG, WebP · Maks 10 foto</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={uploading}
          />
        </label>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          currentIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx(i => i !== null && i > 0 ? i - 1 : i)}
          onNext={() => setLightboxIdx(i => i !== null && i < photos.length - 1 ? i + 1 : i)}
        />
      )}
      {confirmDialogEl}
    </div>
  );
}

/* ─── Lightbox ─────────────────────────────────────────────────── */

function Lightbox({ photos, currentIdx, onClose, onPrev, onNext }: {
  photos: EventPhoto[];
  currentIdx: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[currentIdx];
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const idxRef = useRef(currentIdx);
  useEffect(() => { idxRef.current = currentIdx; }, [currentIdx]);

  // Simpan pembuka untuk pengembalian fokus saat dialog ditutup.
  // Kembali ke thumbnail posisi terakhir (bukan selalu pembuka awal).
  // Pengembaliannya di efek terpisah SESUDAH `useBackgroundInert` — cleanup
  // berjalan sesuai urutan deklarasi, jadi `#root` harus dilepas dari `inert`
  // lebih dulu; `focus()` di dalam subtree `inert` diabaikan browser.
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  useBackgroundInert(Boolean(photo));

  useEffect(() => () => {
    const current = document.querySelector<HTMLElement>(`[data-gallery-thumb="${idxRef.current}"]`);
    (current ?? openerRef.current)?.focus();
  }, []);

  // Tutup via Escape, navigasi via panah kiri/kanan.
  useEffect(() => {
    if (!photo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photo, onClose, onPrev, onNext]);

  // Trap fokus di dalam dialog + fokus awal ke tombol tutup.
  useEffect(() => {
    if (!photo || !dialogRef.current) return;
    const container = dialogRef.current;
    const focusableSelector = 'button:not([disabled])';

    const closeBtn = container.querySelector<HTMLElement>('[data-lightbox-close]');
    closeBtn?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (first && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (last && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [photo]);

  useBackgroundInert(Boolean(photo));

  if (!photo) return null;

  // Portal ke `document.body`: latar `#root` bisa di-`inert`, dan overlay
  // `fixed` tidak terjebak di ancestor ber-`transform`.
  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption ? `Foto: ${photo.caption}` : `Foto ${currentIdx + 1} dari ${photos.length}`}
    >
      <button
        type="button"
        data-lightbox-close
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="ui-focus-ring absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Tutup lightbox"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {currentIdx > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="ui-focus-ring absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Foto sebelumnya"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      <img
        src={photo.url}
        alt={photo.caption || ''}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {currentIdx < photos.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="ui-focus-ring absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Foto berikutnya"
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {currentIdx + 1} / {photos.length}
      </div>
    </div>,
    document.body,
  );
}

