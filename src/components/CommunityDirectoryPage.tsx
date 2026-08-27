import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Moon, Search, SunMedium } from 'lucide-react';
import { fetchPublicCommunityDirectory } from '../utils/supabaseApi';
import type { CommunityDirectoryOrganization, OrganizationType } from '../types';
import { ORG_TYPE_LABELS } from './community/organizationTypeLabels';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const ALL_CATEGORIES = 'Semua';

export function CommunityDirectoryPage({ isDark, onToggleDark }: Props) {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<CommunityDirectoryOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    fetchPublicCommunityDirectory()
      .then(({ organizations }) => { if (!cancelled) setOrganizations(organizations); })
      .catch(() => {
        if (!cancelled) { setOrganizations([]); setFetchError(true); }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<OrganizationType>();
    organizations.forEach((o) => set.add(o.type));
    return Array.from(set).sort((a, b) =>
      (ORG_TYPE_LABELS[a] ?? a).localeCompare(ORG_TYPE_LABELS[b] ?? b, 'id'));
  }, [organizations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations.filter((o) => {
      if (activeCategory !== ALL_CATEGORIES && o.type !== activeCategory) return false;
      if (!q) return true;
      const typeLabel = (ORG_TYPE_LABELS[o.type] ?? o.type).toLowerCase();
      return (
        o.name.toLowerCase().includes(q) ||
        typeLabel.includes(q)
      );
    });
  }, [organizations, query, activeCategory]);

  // Group by category (preserves categori order above)
  const grouped = useMemo(() => {
    const map = new Map<string, CommunityDirectoryOrganization[]>();
    for (const o of filtered) {
      const arr = map.get(o.type) ?? [];
      arr.push(o);
      map.set(o.type, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="ui-dashboard-page min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Komunitas</span>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Komunitas</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Komunitas Metropolitan Mall Bekasi</h1>
          <p className="mt-2 text-base ui-text-muted">EO, sekolah, dan komunitas yang pernah menggelar acara di Metropolitan Mall Bekasi</p>
          {!isLoading && !fetchError && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{organizations.length}</p>
                <p className="text-xs ui-text-muted">Total Komunitas</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{categories.length}</p>
                <p className="text-xs ui-text-muted">Kategori</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading / error / empty */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800" />
            ))}
          </div>
        )}
        {!isLoading && fetchError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            Gagal memuat direktori organisasi. Silakan coba lagi.
          </div>
        )}
        {!isLoading && !fetchError && organizations.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center ui-text-muted dark:border-slate-700 dark:bg-slate-800">
            Belum ada komunitas terdaftar.
          </div>
        )}

        {/* Toolbar: search + category pills */}
        {!isLoading && !fetchError && organizations.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama komunitas atau kategori…"
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
                  {cat === ALL_CATEGORIES ? ALL_CATEGORIES : ORG_TYPE_LABELS[cat as OrganizationType] ?? cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grouped listing */}
        {grouped.map(([type, orgs]) => (
          <section key={type} className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-primary-500" aria-hidden />
              <h2 className="text-lg font-bold tracking-tight">
                {ORG_TYPE_LABELS[type as OrganizationType] ?? type}
                <span className="ml-2 text-xs font-medium ui-text-muted">({orgs.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{org.name}</h3>
                  {org.description && (
                    <p className="mt-2 line-clamp-3 text-sm ui-text-muted">{org.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {org.eventCount} acara
                    </span>
                    {org.upcomingEventCount > 0 && (
                      <span className="rounded-full bg-brand-primary-50 px-2.5 py-1 font-medium text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                        {org.upcomingEventCount} mendatang
                      </span>
                    )}
                  </div>
                  {org.link && (
                    <a
                      href={org.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-primary-600 hover:underline dark:text-brand-primary-400"
                    >
                      Profil Instagram
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}