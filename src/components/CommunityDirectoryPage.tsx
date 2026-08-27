import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, Moon, Search, Sparkles, SunMedium } from 'lucide-react';
import { fetchPublicCommunityDirectory } from '../utils/supabaseApi';
import type { CommunityDirectoryOrganization, OrganizationType } from '../types';
import { ORG_TYPE_LABELS } from './community/organizationTypeLabels';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const ALL_CATEGORIES = 'Semua';

// Aksen pastel per tipe organisasi (warna avatar).
const TYPE_ACCENT: Record<OrganizationType, string> = {
  community: 'bg-brand-primary-100 text-brand-primary-700',
  school: 'bg-sky-100 text-sky-700',
  company: 'bg-violet-100 text-violet-700',
  eo: 'bg-brand-secondary-100 text-brand-secondary-600',
  campus: 'bg-amber-100 text-amber-700',
  government: 'bg-emerald-100 text-emerald-700',
  ngo: 'bg-rose-100 text-rose-700',
  other: 'bg-slate-200 text-slate-600',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

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

  // Jumlah org per kategori untuk ditampilkan di pill filter.
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    organizations.forEach((o) => map.set(o.type, (map.get(o.type) ?? 0) + 1));
    return map;
  }, [organizations]);

  const stats = useMemo(() => {
    const totalEvents = organizations.reduce((acc, o) => acc + o.eventCount, 0);
    const upcomingEvents = organizations.reduce((acc, o) => acc + o.upcomingEventCount, 0);
    return { totalOrgs: organizations.length, totalEvents, upcomingEvents };
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

  // Sortir: paling aktif (banyak acara) dulu, lalu alfabetis.
  const grouped = useMemo(() => {
    const map = new Map<string, CommunityDirectoryOrganization[]>();
    const sorted = [...filtered].sort((a, b) => {
      if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount;
      return a.name.localeCompare(b.name, 'id');
    });
    for (const o of sorted) {
      const arr = map.get(o.type) ?? [];
      arr.push(o);
      map.set(o.type, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const hasActiveFilter = query.trim().length > 0 || activeCategory !== ALL_CATEGORIES;

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
          <p className="mt-2 max-w-2xl text-base ui-text-muted">EO, sekolah, dan komunitas yang pernah menggelar acara di Metropolitan Mall Bekasi.</p>
          {!isLoading && !fetchError && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalOrgs}</p>
                <p className="text-xs ui-text-muted">Organisasi</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalEvents}</p>
                <p className="text-xs ui-text-muted">Total Acara</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <p className="text-2xl font-bold tabular-nums text-brand-primary-600 dark:text-brand-primary-400">{stats.upcomingEvents}</p>
                <p className="text-xs ui-text-muted">Acara Mendatang</p>
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

        {/* Sticky toolbar: search + category pills */}
        {!isLoading && !fetchError && organizations.length > 0 && (
          <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-slate-200/70 bg-[#fbfaf7]/90 px-4 py-3 backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/90 sm:-mx-6 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama komunitas, EO, atau kategori…"
                className="ui-focus-ring w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter kategori">
              {[ALL_CATEGORIES, ...categories].map((cat) => {
                const count = cat === ALL_CATEGORIES ? organizations.length : (categoryCounts.get(cat) ?? 0);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                    className={`ui-focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      activeCategory === cat
                        ? 'border-brand-primary-600 bg-brand-primary-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat === ALL_CATEGORIES ? ALL_CATEGORIES : ORG_TYPE_LABELS[cat as OrganizationType] ?? cat}
                    <span className={`tabular-nums ${activeCategory === cat ? 'text-white/70' : 'text-slate-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty result for active filter */}
        {!isLoading && !fetchError && hasActiveFilter && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-600 dark:bg-slate-800/40">
            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Tidak ada hasil</p>
            <p className="text-xs ui-text-muted">Coba kata kunci lain atau pilih kategori berbeda.</p>
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
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-primary-700"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${TYPE_ACCENT[org.type] ?? TYPE_ACCENT.other}`}
                      aria-hidden
                    >
                      {initials(org.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-white">{org.name}</h3>
                      {org.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{org.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {org.eventCount} acara
                    </span>
                    {org.upcomingEventCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary-50 px-2.5 py-1 font-medium text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
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