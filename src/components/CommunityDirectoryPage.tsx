import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, Moon, Search, Sparkles, SunMedium } from 'lucide-react';
import { fetchPublicCommunityDirectory } from '../utils/supabaseApi';
import type { CommunityDirectoryOrganization, OrganizationType } from '../types';
import { ORG_TYPE_LABELS } from './community/organizationTypeLabels';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { usePageMeta } from '../utils/pageMeta';

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
  usePageMeta({
    title: 'Direktori Komunitas — Metropolitan Mall Bekasi',
    description: 'Direktori komunitas aktif yang bekerja sama dengan Metropolitan Mall Bekasi.',
  });

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
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <header className="ui-dashboard-chrome sticky top-0 z-40">
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
              className="ui-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-600 shadow-sm transition hover:bg-white dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
              className="ui-focus-ring inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />Kembali
            </button>
          </div>
        </div>
      </header>

      <main id="konten-utama" className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Hero */}
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Komunitas</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Komunitas Metropolitan Mall Bekasi</h1>
          <p className="mt-1 max-w-2xl text-sm ui-text-muted">EO, sekolah, dan komunitas yang pernah menggelar acara di Metropolitan Mall Bekasi.</p>
          {!isLoading && !fetchError && (
            <div className="mt-4 grid max-w-xl grid-cols-3 gap-1">
              <div className="bg-white/80 px-3 py-2 dark:bg-slate-800/80">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalOrgs}</p>
                <p className="text-xs ui-text-muted">Organisasi</p>
              </div>
              <div className="bg-white/80 px-3 py-2 dark:bg-slate-800/80">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalEvents}</p>
                <p className="text-xs ui-text-muted">Total Acara</p>
              </div>
              <div className="bg-white/80 px-3 py-2 dark:bg-slate-800/80">
                <p className="text-2xl font-bold tabular-nums text-brand-primary-600 dark:text-brand-primary-400">{stats.upcomingEvents}</p>
                <p className="text-xs ui-text-muted">Acara Mendatang</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading / error / empty */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800" />
            ))}
          </div>
        )}
        {!isLoading && fetchError && (
          <div className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-600 shadow-sm dark:bg-red-950/30 dark:text-red-300">
            Gagal memuat direktori organisasi. Silakan coba lagi.
          </div>
        )}
        {!isLoading && !fetchError && organizations.length === 0 && (
          <div className="rounded-2xl bg-white/80 p-10 text-center shadow-sm ui-text-muted dark:bg-slate-800/80">
            Belum ada komunitas terdaftar.
          </div>
        )}

        {/* Sticky toolbar: search + category pills */}
        {!isLoading && !fetchError && organizations.length > 0 && (
          <div className="sticky top-16 z-30 -mx-4 mb-5 bg-[#fbfaf7]/90 px-4 py-2 backdrop-blur dark:bg-slate-950/90 sm:-mx-6 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama komunitas, EO, atau kategori…"
                className="ui-focus-ring w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label="Filter kategori">
              {[ALL_CATEGORIES, ...categories].map((cat) => {
                const count = cat === ALL_CATEGORIES ? organizations.length : (categoryCounts.get(cat) ?? 0);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                    className={`ui-focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      activeCategory === cat
                        ? 'bg-brand-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat === ALL_CATEGORIES ? ALL_CATEGORIES : ORG_TYPE_LABELS[cat as OrganizationType] ?? cat}
                    <span className={`tabular-nums ${activeCategory === cat ? 'text-white/70' : 'text-slate-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty result for active filter */}
        {!isLoading && !fetchError && hasActiveFilter && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/60 p-10 text-center shadow-sm dark:bg-slate-800/40">
            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Tidak ada hasil</p>
            <p className="text-xs ui-text-muted">Coba kata kunci lain atau pilih kategori berbeda.</p>
          </div>
        )}

        {/* Grouped listing */}
        {grouped.map(([type, orgs]) => (
          <section key={type} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-primary-500" aria-hidden />
              <h2 className="text-lg font-bold tracking-tight">
                {ORG_TYPE_LABELS[type as OrganizationType] ?? type}
                <span className="ml-2 text-xs font-medium ui-text-muted">({orgs.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="group flex flex-col rounded-xl bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${TYPE_ACCENT[org.type] ?? TYPE_ACCENT.other}`}
                      aria-hidden
                    >
                      {initials(org.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-white">{org.name}</h3>
                      {org.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-300">{org.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {org.eventCount} acara
                    </span>
                    {org.upcomingEventCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary-50 px-2 py-0.5 font-medium text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
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
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary-600 hover:underline dark:text-brand-primary-400"
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