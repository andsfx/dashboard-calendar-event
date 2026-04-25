import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { PhotoAlbum, AnnualTheme } from '../types';
import { fetchAlbums, fetchAnnualThemesPublic } from '../utils/supabaseApi';
import { GalleryHeader } from './GalleryHeader';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function formatThemeDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTH_SHORT[parseInt(m) - 1]} ${y}`;
}

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export function GalleryIndexPage({ isDark, onToggleDark }: Props) {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [themes, setThemes] = useState<AnnualTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    Promise.all([fetchAlbums(), fetchAnnualThemesPublic()])
      .then(([albumData, themeData]) => {
        if (!cancelled) {
          setAlbums(albumData);
          setThemes(themeData);
        }
      })
      .catch(() => {
        if (!cancelled) { setAlbums([]); setThemes([]); setFetchError(true); }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [retryCount]);

  const groupedByTheme = useMemo(() => {
    const groups: Array<{ theme: AnnualTheme | null; albums: PhotoAlbum[] }> = [];
    const usedAlbumIds = new Set<string>();

    // Sort themes by date_start descending (terbaru di atas)
    const sortedThemes = [...themes].sort((a, b) => b.dateStart.localeCompare(a.dateStart));

    for (const theme of sortedThemes) {
      const themeAlbums = albums.filter(a => {
        if (usedAlbumIds.has(a.id)) return false;
        // Match by theme_id first, then by date range
        if (a.themeId === theme.id) return true;
        if (a.themeId) return false;
        // Auto-match by event_date within theme date range
        if (!a.eventDate) return false;
        return a.eventDate >= theme.dateStart && a.eventDate <= theme.dateEnd;
      });

      if (themeAlbums.length > 0) {
        groups.push({ theme, albums: themeAlbums });
        themeAlbums.forEach(a => usedAlbumIds.add(a.id));
      }
    }

    // "Lainnya" group for unmatched albums
    const unmatched = albums.filter(a => !usedAlbumIds.has(a.id));
    if (unmatched.length > 0) {
      groups.push({ theme: null, albums: unmatched });
    }

    return groups;
  }, [albums, themes]);

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <GalleryHeader isDark={isDark} onToggleDark={onToggleDark} />

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

        {/* Error state */}
        {!isLoading && fetchError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <RefreshCw className="h-7 w-7 text-red-500 dark:text-red-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">
              Gagal memuat data
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Terjadi kesalahan saat memuat album. Periksa koneksi internet Anda.
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

        {/* Empty state */}
        {!isLoading && !fetchError && albums.length === 0 && (
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

        {/* Album grid grouped by theme */}
        {!isLoading && albums.length > 0 && (
          <div className="space-y-12">
            {groupedByTheme.map(({ theme, albums: groupAlbums }) => (
              <section key={theme?.id || 'other'}>
                {/* Theme header */}
                <div
                  className="mb-6 rounded-xl border-l-4 px-5 py-4"
                  style={{
                    borderLeftColor: theme?.color || '#64748b',
                    backgroundColor: `${theme?.color || '#64748b'}08`,
                  }}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {theme?.name || 'Lainnya'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {theme
                      ? `${formatThemeDate(theme.dateStart)} — ${formatThemeDate(theme.dateEnd)}`
                      : 'Album di luar tema tahunan'
                    }
                    {' · '}{groupAlbums.length} album
                  </p>
                </div>

                {/* Album grid */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                  {groupAlbums.map((album) => (
                    <Link
                      key={album.id}
                      to={`/gallery/${album.slug}`}
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100">
                          <span className="text-sm font-semibold text-white">Lihat Foto &rarr;</span>
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
                          {album.lokasi && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {album.lokasi}
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
                    </Link>
                  ))}
                </div>
              </section>
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
