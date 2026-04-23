import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronDown, X, Moon, SunMedium, CalendarDays } from 'lucide-react';
import { PhotoAlbum, EventPhoto } from '../types';
import { fetchAlbumBySlug } from '../utils/supabaseApi';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

/* ─── Standalone Lightbox ─────────────────────────────────── */
function PhotoLightbox({ photos, currentIndex, onClose, onPrev, onNext }: {
  photos: EventPhoto[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[currentIndex];

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

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev / Next */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          >
            <ChevronDown className="h-6 w-6 rotate-90" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          >
            <ChevronDown className="h-6 w-6 -rotate-90" />
          </button>
        </>
      )}

      {/* Image + caption */}
      <div className="max-w-4xl px-12" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setIsLoading(true);
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
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIndex]);

  const notFound = !isLoading && !album;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-black/6 bg-[#fbfaf7]/96 backdrop-blur-md dark:bg-slate-950/96 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <button
            onClick={() => navigate('/')}
            className="shrink-0 flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-auto w-[88px] sm:w-[124px]" />
          </button>
          <span className="hidden text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200 sm:block">
            Gallery Event
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDark}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700"
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)' }}
            >
              <CalendarDays className="h-4 w-4" /> Dashboard
            </button>
          </div>
        </div>
      </header>

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
                      src={photo.url}
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
