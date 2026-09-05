import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Moon, Search, Store, SunMedium } from 'lucide-react';
import { fetchPublicTenantDirectory } from '../utils/supabaseApi';
import type { TenantRosterItem } from '../utils/api/surveysApi';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const ALL_CATEGORIES = 'Semua';

export function TenantDirectoryPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Direktori Tenant — Metropolitan Mall Bekasi',
    description: 'Direktori penyewa gerai (tenant) resmi di Metropolitan Mall Bekasi.',
  });

  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const [brokenLogos, setBrokenLogos] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    fetchPublicTenantDirectory()
      .then((data) => { if (!cancelled) setTenants(data); })
      .catch(() => {
        if (!cancelled) { setTenants([]); setFetchError(true); }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    tenants.forEach((t) => {
      const cat = t.category.trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      if (activeCategory !== ALL_CATEGORIES && t.category.trim() !== activeCategory) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.floor.toLowerCase().includes(q)
      );
    });
  }, [tenants, query, activeCategory]);

  const handleLogoError = (id: string) => {
    setBrokenLogos((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="ui-dashboard-page min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Direktori Tenant</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />Kembali
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Direktori Tenant</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Direktori Tenant Metropolitan Mall Bekasi</h1>
          <p className="mt-2 text-base ui-text-muted">Jelajahi gerai yang tersedia di Metropolitan Mall Bekasi</p>
          {!isLoading && !fetchError && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{tenants.length}</p>
                <p className="text-xs ui-text-muted">Total Tenant</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{categories.length}</p>
                <p className="text-xs ui-text-muted">Kategori</p>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar: search + category pills */}
        {!isLoading && !fetchError && tenants.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama tenant, kategori, atau lantai…"
                className="ui-focus-ring w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kategori">
              {[ALL_CATEGORIES, ...categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`ui-focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    activeCategory === cat
                      ? 'border-brand-primary-600 bg-brand-primary-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <div className="h-32 rounded-t-2xl bg-slate-200 dark:bg-slate-700" />
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
              <Store className="h-7 w-7 text-red-500 dark:text-red-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Direktori tenant sedang tidak tersedia. Coba lagi nanti.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && tenants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Store className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Belum ada data tenant.</p>
          </div>
        )}

        {/* Filter empty */}
        {!isLoading && !fetchError && tenants.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Search className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Tidak ada tenant cocok.</p>
          </div>
        )}

        {/* Tenant grid */}
        {!isLoading && !fetchError && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {filtered.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800">
                <div className="flex h-32 items-center justify-center bg-slate-50 p-4 dark:bg-slate-700/40">
                  {t.logo && !brokenLogos.has(t.id) ? (
                    <img
                      src={t.logo}
                      alt={t.name}
                      loading="lazy"
                      onError={() => handleLogoError(t.id)}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Store className="h-10 w-10 text-slate-300 dark:text-slate-500" aria-hidden="true" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1 dark:text-white">{t.name}</p>
                  {t.category.trim() && (
                    <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-brand-primary-50 px-2 py-0.5 text-[10px] font-semibold text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-400">
                      {t.category.trim()}
                    </span>
                  )}
                  {(t.floor || t.lot) && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{[t.floor, t.lot].filter(Boolean).join(' · ')}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
      </footer>
    </div>
  );
}
