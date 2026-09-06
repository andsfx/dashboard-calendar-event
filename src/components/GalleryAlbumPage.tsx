import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { PhotoAlbum, EventPhoto } from '../types';
import { fetchAlbumBySlug } from '../utils/supabaseApi';
import { GalleryHeader } from './GalleryHeader';
import { usePageMeta } from '../utils/pageMeta';
import { PhotoLightbox } from './PhotoLightbox';
import { gridUrl } from '../utils/imageOptim';

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

  usePageMeta({
    title: album ? `${album.name} — Galeri Metropolitan Mall Bekasi` : 'Galeri Foto — Metropolitan Mall Bekasi',
    description: album?.description || 'Galeri foto momen dan kegiatan event di Metropolitan Mall Bekasi.',
  });

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
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>
      <GalleryHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate('/gallery')}
className="mb-6 inline-flex items-center gap-2 text-sm font-medium ui-text-muted transition hover:text-slate-800 dark:hover:text-white"
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
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Terjadi kesalahan saat memuat data. Periksa koneksi internet Anda.
            </p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700"
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
              <Camera className="h-7 w-7 text-slate-500 dark:text-slate-300" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">
              Album tidak ditemukan
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Album yang kamu cari tidak tersedia atau sudah dihapus.
            </p>
            <button
              onClick={() => navigate('/gallery')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700"
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">
                Album
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {album.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ui-text-muted">
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
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  {album.description}
                </p>
              )}
            </div>

            {/* Photo grid */}
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Camera className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
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
                      onError={(e) => { (e.target as HTMLImageElement).src = photo.url; }}
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
<footer className="border-t border-slate-200 bg-[#fbfaf7] px-4 py-8 text-sm ui-text-muted dark:bg-slate-950 dark:border-slate-800 sm:px-6">
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
