import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Moon, SunMedium, CalendarDays } from 'lucide-react';
import { PhotoAlbum } from '../types';
import { fetchAlbums } from '../utils/supabaseApi';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export function GalleryIndexPage({ isDark, onToggleDark }: Props) {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAlbums()
      .then((data) => {
        if (!cancelled) setAlbums(data);
      })
      .catch(() => {
        if (!cancelled) setAlbums([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Community
        </button>

        {/* Page title */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-500">
            Gallery
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Galeri Event
          </h1>
          <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
            Dokumentasi event di Metropolitan Mall Bekasi
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <div className="aspect-[16/9] rounded-t-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="p-4">
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && albums.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Camera className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">
              Belum ada album foto
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Album foto event akan muncul di sini.
            </p>
          </div>
        )}

        {/* Album grid */}
        {!isLoading && albums.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => navigate(`/gallery/${album.slug}`)}
                className="group cursor-pointer overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:shadow-lg dark:bg-slate-800"
              >
                {/* Cover image */}
                <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl bg-slate-200 dark:bg-slate-700">
                  {album.coverPhotoUrl ? (
                    <img
                      src={album.coverPhotoUrl}
                      alt={album.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-slate-700">
                      <Camera className="h-10 w-10 text-violet-300 dark:text-violet-500" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100">
                    <span className="text-sm font-semibold text-white">
                      Lihat Foto &rarr;
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-3 sm:p-4">
                  <h3 className="text-sm font-semibold leading-snug text-slate-800 line-clamp-2 dark:text-white sm:text-base">
                    {album.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                    {album.eventDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {album.eventDate}
                      </span>
                    )}
                    {typeof album.photoCount === 'number' && (
                      <span className="flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        {album.photoCount} foto
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-[#fbfaf7] px-4 py-8 text-sm text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto max-w-7xl text-center">
          <p>&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life</p>
        </div>
      </footer>
    </div>
  );
}
