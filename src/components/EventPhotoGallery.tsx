import { useState, useEffect, useCallback } from 'react';
import { Camera, Upload, Trash2, Loader2, X, ImagePlus, Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PhotoAlbum } from '../types';

interface EventPhoto {
  id: string;
  url: string;
  caption: string;
  event_id: string;
  sort_order: number;
  created_at: string;
}

interface EventPhotoGalleryProps {
  eventId: string;
  eventName: string;
  canUpload?: boolean;
}

export function EventPhotoGallery({ eventId, eventName, canUpload = false }: EventPhotoGalleryProps) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [linkedAlbum, setLinkedAlbum] = useState<PhotoAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);

  // Fetch photos + linked album
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const [photosRes, albumRes] = await Promise.all([
        supabase.from('event_photos').select('*').eq('event_id', eventId).order('sort_order'),
        supabase.from('photo_albums').select('*').eq('event_id', eventId).limit(1).single(),
      ]);
      setPhotos(photosRes.data || []);
      setLinkedAlbum(albumRes.data || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // Upload photo
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files).slice(0, 10)) {
        // Get presigned URL from R2
        const token = getToken();
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `events/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const presignRes = await fetch('/api/r2-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ fileName, contentType: file.type }),
        });
        const presignData = await presignRes.json();
        if (!presignData.success) continue;

        // Upload to R2
        await fetch(presignData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        // Save to database
        await supabase.from('event_photos').insert({
          url: presignData.publicUrl,
          caption: '',
          event_id: eventId,
          event_date: '',
          sort_order: photos.length,
        });
      }
      fetchPhotos();
    } catch { /* ignore */ }
    finally { setUploading(false); }
  }, [eventId, photos.length, fetchPhotos]);

  // Delete photo
  const handleDelete = useCallback(async (photoId: string) => {
    if (!confirm('Hapus foto ini?')) return;
    await supabase.from('event_photos').delete().eq('id', photoId);
    fetchPhotos();
  }, [fetchPhotos]);

  // Link existing album
  const handleLinkAlbum = useCallback(async (albumId: string) => {
    const token = getToken();
    // Update album's event_id
    await supabase.from('photo_albums').update({ event_id: eventId }).eq('id', albumId);
    setShowLinkForm(false);
    fetchPhotos();
  }, [eventId, fetchPhotos]);

  // Fetch all albums for linking
  useEffect(() => {
    if (!showLinkForm) return;
    supabase.from('photo_albums').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setAlbums(data || []);
    });
  }, [showLinkForm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
      </div>
    );
  }

  const hasContent = photos.length > 0 || linkedAlbum;

  if (!hasContent && !canUpload) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Dokumentasi Foto
          </h3>
          {photos.length > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {photos.length}
            </span>
          )}
        </div>
        {canUpload && (
          <div className="flex gap-1.5">
            <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-violet-700">
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
        <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Mengupload foto...
        </div>
      )}

      {/* Link album form */}
      {showLinkForm && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-950/20">
          <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">Pilih album untuk di-link:</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {albums.filter(a => !a.eventId || a.eventId === eventId).map(a => (
              <button
                key={a.id}
                onClick={() => handleLinkAlbum(a.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-violet-100 dark:text-slate-300 dark:hover:bg-violet-900/30"
              >
                {a.coverPhotoUrl && <img src={a.coverPhotoUrl} alt="" className="h-8 w-8 rounded object-cover" />}
                <span className="truncate">{a.name}</span>
              </button>
            ))}
            {albums.length === 0 && <p className="text-[10px] text-slate-400">Belum ada album</p>}
          </div>
        </div>
      )}

      {/* Linked album */}
      {linkedAlbum && (
        <a
          href={`/gallery/${linkedAlbum.slug}`}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-600"
        >
          {linkedAlbum.coverPhotoUrl && (
            <img src={linkedAlbum.coverPhotoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{linkedAlbum.name}</p>
            <p className="text-[10px] text-slate-400">{linkedAlbum.photoCount || 0} foto · Lihat album →</p>
          </div>
        </a>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl">
              <img
                src={photo.url}
                alt={photo.caption || `Foto ${idx + 1}`}
                className="h-full w-full cursor-pointer object-cover transition group-hover:scale-105"
                onClick={() => setLightboxIdx(idx)}
                loading="lazy"
              />
              {canUpload && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasContent && canUpload && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 transition hover:border-violet-300 dark:border-slate-700 dark:hover:border-violet-600">
          <ImagePlus className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Klik untuk upload foto dokumentasi</p>
          <p className="text-[10px] text-slate-400">JPG, PNG, WebP · Maks 10 foto</p>
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
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>

      {currentIdx > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <img
        src={photo.url}
        alt={photo.caption || ''}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {currentIdx < photos.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {currentIdx + 1} / {photos.length}
      </div>
    </div>
  );
}

function getToken(): string {
  try {
    const keys = Object.keys(localStorage);
    const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) { return JSON.parse(localStorage.getItem(sbKey) || '{}').access_token || ''; }
  } catch {}
  return '';
}
