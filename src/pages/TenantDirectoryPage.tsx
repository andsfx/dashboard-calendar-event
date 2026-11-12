import { useEffect, useMemo, useState } from 'react';
import { MapPin, RefreshCw, Search, Store } from 'lucide-react';
import { fetchPublicTenantDirectory } from '../utils/domainApi';
import type { TenantRosterItem } from '../utils/api/surveysApi';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const ALL_CATEGORIES = 'Semua';

export function TenantDirectoryPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Direktori tenant - Metropolitan Mall Bekasi',
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
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      {/* Header */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 outline-none">
        {/* Hero */}
        <RevealSection as="div" className="mb-8" refreshKey={tenants.length}>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Direktori tenant Metropolitan Mall Bekasi</h1>
          <p className="mt-2 text-base text-[var(--wf-ink-muted)]">Jelajahi tenant yang tersedia di Metropolitan Mall Bekasi</p>
          {!isLoading && !fetchError && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl bg-[var(--wf-board)] px-4 py-3 shadow-sm ">
                <p className="text-2xl font-bold tabular-nums text-[var(--wf-ink)]">{tenants.length}</p>
                <p className="text-xs text-[var(--wf-ink-muted)]">Total tenant</p>
              </div>
              <div className="rounded-xl bg-[var(--wf-board)] px-4 py-3 shadow-sm ">
                <p className="text-2xl font-bold tabular-nums text-[var(--wf-ink)]">{categories.length}</p>
                <p className="text-xs text-[var(--wf-ink-muted)]">Kategori</p>
              </div>
            </div>
          )}
        </RevealSection>

        {/* Toolbar: search + category pills */}
        {!isLoading && !fetchError && tenants.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama tenant, kategori, atau lantai…"
                aria-label="Cari tenant"
                className="ui-focus-ring h-auto w-full rounded-xl border border-[var(--wf-rule)]! bg-[var(--wf-board)] py-2.5 pl-9! pr-3! text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] focus-visible:border-[var(--wf-rule)]!"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kategori">
              {[ALL_CATEGORIES, ...categories].map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`ui-focus-ring h-auto whitespace-normal! rounded-full! border px-3 py-1.5 text-xs font-semibold transition active:translate-y-0! ${
                    activeCategory === cat
                      ? 'border-[var(--wf-accent)]! bg-[var(--wf-accent)] text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]! focus-visible:border-[var(--wf-accent)]!'
                      : 'border-[var(--wf-rule)]! bg-[var(--wf-board)] text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink-muted)]! focus-visible:border-[var(--wf-rule)]!'
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-[var(--wf-board)] shadow-sm ">
                <div className="h-32 rounded-t-2xl bg-[var(--wf-rule)]" />
                <div className="p-4">
                  <div className="h-4 w-3/4 rounded bg-[var(--wf-rule)]" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-[var(--wf-board-2)]" />
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
            <p className="mt-4 text-lg font-semibold text-[var(--wf-ink-muted)]">Direktori tenant sedang tidak tersedia. Coba lagi nanti.</p>
            <Button
              variant="ghost"
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex h-auto items-center gap-2 whitespace-normal! rounded-full! bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-medium text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0!"
            >
              <RefreshCw className="size-4" />
              Coba lagi
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && tenants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-board-2)]">
              <Store className="h-7 w-7 text-[var(--wf-ink-muted)]" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[var(--wf-ink-muted)]">Belum ada data tenant.</p>
          </div>
        )}

        {/* Filter empty */}
        {!isLoading && !fetchError && tenants.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-board-2)]">
              <Search className="h-7 w-7 text-[var(--wf-ink-muted)]" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[var(--wf-ink-muted)]">Tidak ada tenant yang cocok.</p>
          </div>
        )}

        {/* Tenant grid */}
        {!isLoading && !fetchError && filtered.length > 0 && (
          <RevealSection as="div" refreshKey={`${filtered.length}:${filtered[0]?.id ?? ''}`}>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {filtered.map((t) => (
              <div key={t.id} data-reveal-item className="overflow-hidden rounded-2xl bg-[var(--wf-board)] shadow-sm transition hover:shadow-lg ">
                <div className="flex h-32 items-center justify-center bg-[var(--wf-board-2)] p-4">
                  {t.logo && !brokenLogos.has(t.id) ? (
                    <img
                      src={t.logo}
                      alt={t.name}
                      loading="lazy"
                      onError={() => handleLogoError(t.id)}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Store className="h-10 w-10 text-[var(--wf-rule-strong)]" aria-hidden="true" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-[var(--wf-ink)] line-clamp-1">{t.name}</p>
                  {t.category.trim() && (
                    <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)]">
                      {t.category.trim()}
                    </span>
                  )}
                  {(t.floor || t.lot) && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-[var(--wf-ink-muted)]">
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

      <footer className="border-t border-[var(--wf-rule)] py-8 text-center text-xs text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
