import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronDown, X, CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { PhotoAlbum, EventPhoto } from '../types';
import { fetchAlbumBySlug } from '../utils/supabaseApi';
import { GalleryHeader } from './GalleryHeader';
import { gridUrl, lightboxUrl } from '../utils/imageOptim';

/* ─── Standalone Lightbox ─────────────────────────────────── */
function PhotoLightbox({ photos, currentIndex, onClose, onPrev, onNext }: {
  photos: EventPhoto[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[currentIndex];
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
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

  // Focus trap
  useEffect(() => {
    if (!photo || !lightboxRef.current) return;
    const container = lightboxRef.current;
    const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Auto-focus close button
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

  if (!photo) return null;

  return (
    <div
      ref={lightboxRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto: ${photo.caption}`}
    >
      {/* Close button */}
      <button
        data-lightbox-close
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
        aria-label="Tutup lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev / Next — min 44x44 touch target */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20"
            aria-label="Foto sebelumnya"
          >
            <ChevronDown className="h-6 w-6 rotate-90" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20"
            aria-label="Foto berikutnya"
          >
            <ChevronDown className="h-6 w-6 -rotate-90" />
          </button>
        </>
      )}

      {/* Image + caption */}
      <div className="max-w-4xl px-16" onClick={(e) => e.stopPropagation()}>
        <img
          src={lightboxUrl(photo.url)}
          alt={photo.caption}
          className="max-h-[80vh] w-full rounded-lg object-contain"
        />
        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-white">{photo.caption}</p>
          {photo.eventDate && <p className="mt-1 text-sm text-white/60">{photo.eventDate}</p>}
          <p className="mt-2 text-xs text-white/40">{currentIndex + 1} / {photos.length}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Props ───────────────────────────────────────────────── */
interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export function GalleryAlbumPage({ isDark, onToggleDark }: Props) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [album, setAlbum] = useState<PhotoAlbum | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    fetchAlbumBySlug(slug)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setAlbum(result.album);
          setPhotos(result.photos);
        } else {
          setAlbum(null);
          setPhotos([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAlbum(null);
          setPhotos([]);
          setFetchError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug, retryCount]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIndex]);

  const notFound = !isLoading && !album && !fetchError;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <GalleryHeader isDark={isDark} onToggleDark={onToggleDark} />

      {/* ─── Main Content ───────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate('/gallery')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Gallery
        </button>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mb-1 h-4 w-1/3 rounded bg-slate-100 dark:bg-slate-700/60" />
            <div className="mb-8 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && fetchError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <RefreshCw className="h-7 w-7 text-red-500 dark:text-red-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">
              Gagal memuat album
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Terjadi kesalahan saat memuat data. Periksa koneksi internet Anda.
            </p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        )}

        {/* 404 state */}
        {notFound && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Camera className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">
              Album tidak ditemukan
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Album yang kamu cari tidak tersedia atau sudah dihapus.
            </p>
            <button
              onClick={() => navigate('/gallery')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Gallery
            </button>
          </div>
        )}

        {/* Album detail */}
        {!isLoading && album && (
          <>
            {/* Album header */}
            <div className="mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-500">
                Album
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {album.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                {album.eventDate && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {album.eventDate}
                  </span>
                )}
                {album.lokasi && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {album.lokasi}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  {photos.length} foto
                </span>
              </div>
              {album.description && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  {album.description}
                </p>
              )}
            </div>

            {/* Photo grid */}
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Camera className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
                  Belum ada foto di album ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="group relative cursor-pointer overflow-hidden rounded-xl aspect-[4/3] bg-slate-200 dark:bg-slate-700"
                  >
                    <img
                      src={gridUrl(photo.url)}
                      alt={photo.caption}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Hover overlay with caption */}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100">
                      <div className="p-3 sm:p-4">
                        <p className="text-sm font-semibold text-white line-clamp-2">{photo.caption}</p>
                        {photo.eventDate && <p className="mt-0.5 text-xs text-white/70">{photo.eventDate}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-[#fbfaf7] px-4 py-8 text-sm text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto max-w-7xl text-center">
          <p>&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life</p>
        </div>
      </footer>

      {/* ─── Lightbox ───────────────────────────────────────── */}
      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((prev) => prev !== null ? (prev - 1 + photos.length) % photos.length : 0)}
          onNext={() => setLightboxIndex((prev) => prev !== null ? (prev + 1) % photos.length : 0)}
        />
      )}
    </div>
  );
}
