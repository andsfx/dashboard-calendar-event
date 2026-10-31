import { useEffect, useMemo, useState } from 'react';
import { MapPin, RefreshCw, Search, Store } from 'lucide-react';
import { fetchPublicTenantDirectory } from '../utils/domainApi';
import type { TenantRosterItem } from '../utils/api/surveysApi';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const ALL_CATEGORIES = 'Semua';

export function TenantDirectoryPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Direktori Tenant - Metropolitan Mall Bekasi',
    description: 'Direktori tenant resmi di Metropolitan Mall Bekasi.',
  });

  const [tenants, setTenants] = useState<TenantRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
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
  }, [retryCount]);

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
    <div className="ui-dashboard-page min-h-screen bg-[var(--brand-paper)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 outline-none">
        {/* Hero */}
        <RevealSection as="div" className="mb-8" refreshKey={tenants.length}>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Direktori Tenant Metropolitan Mall Bekasi</h1>
          <p className="mt-2 text-base ui-text-muted">Jelajahi tenant yang tersedia di Metropolitan Mall Bekasi</p>
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
        </RevealSection>

        {/* Toolbar: search + category pills */}
        {!isLoading && !fetchError && tenants.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama tenant, kategori, atau lantai…"
                aria-label="Cari tenant"
                className="ui-focus-ring w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && tenants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Store className="h-7 w-7 text-slate-500 dark:text-slate-300" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Belum ada data tenant.</p>
          </div>
        )}

        {/* Filter empty */}
        {!isLoading && !fetchError && tenants.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Search className="h-7 w-7 text-slate-500 dark:text-slate-300" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Tidak ada tenant cocok.</p>
          </div>
        )}

        {/* Tenant grid */}
        {!isLoading && !fetchError && filtered.length > 0 && (
          <RevealSection as="div" refreshKey={`${filtered.length}:${filtered[0]?.id ?? ''}`}>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {filtered.map((t) => (
              <div key={t.id} data-reveal-item className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800">
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
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{[t.floor, t.lot].filter(Boolean).join(' · ')}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          </RevealSection>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
