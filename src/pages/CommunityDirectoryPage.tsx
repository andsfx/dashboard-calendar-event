import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, Search, Sparkles } from 'lucide-react';
import { fetchPublicCommunityDirectory } from '../utils/domainApi';
import type { CommunityDirectoryOrganization, OrganizationType } from '../types';
import { ORG_TYPE_LABELS } from '../components/community/organizationTypeLabels';
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

// Aksen pastel per tipe organisasi (warna avatar).
// Kontras teks dihitung terhadap latarnya sendiri. Badge ini `aria-hidden`, yang
// mengeluarkannya dari accessibility tree, tetapi TIDAK menyembunyikannya dari
// axe: pemeriksaan kontras axe bersifat visual dan tetap mengevaluasi elemen ini
// (terbukti eksperimen c1–c4). Semua pasangan harus >= 4.5:1 karena teksnya 12px
// bold, bukan "large text".
// Diekspor agar bisa dikunci unit test: test itu menghitung rasio dari token
// asli dan memberi kegagalan yang presisi, serta mencakup seluruh 8 pasangan
// sekaligus — bukan karena axe buta terhadap badge ini.
export const TYPE_ACCENT: Record<OrganizationType, string> = {
  community: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]',
  school: 'bg-sky-100 text-sky-700',
  company: 'bg-violet-100 text-violet-700',
  // 600 (#c92d62) hanya 4.42:1 di atas secondary-100; 700 (#a82150) = 5.94:1.
  eo: 'bg-brand-secondary-100 text-brand-secondary-700',
  campus: 'bg-amber-100 text-amber-700',
  government: 'bg-emerald-100 text-emerald-700',
  ngo: 'bg-rose-100 text-rose-700',
  other: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]',
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
    title: 'Direktori Komunitas - Metropolitan Mall Bekasi',
    description: 'Direktori komunitas aktif yang bekerja sama dengan Metropolitan Mall Bekasi.',
  });

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
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      {/* Header */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 outline-none">
        {/* Hero */}
        <RevealSection as="div" className="mb-5" refreshKey={organizations.length}>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Komunitas Metropolitan Mall Bekasi</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--wf-ink-muted)]">EO, sekolah, dan komunitas yang pernah mengadakan acara di Metropolitan Mall Bekasi.</p>
          {!isLoading && !fetchError && (
            <div className="mt-4 grid max-w-xl grid-cols-3 gap-1">
              <div className="bg-[var(--wf-board)]/80 px-3 py-2 ">
                <p className="text-2xl font-bold tabular-nums text-[var(--wf-ink)]">{stats.totalOrgs}</p>
                <p className="text-xs text-[var(--wf-ink-muted)]">Organisasi</p>
              </div>
              <div className="bg-[var(--wf-board)]/80 px-3 py-2 ">
                <p className="text-2xl font-bold tabular-nums text-[var(--wf-ink)]">{stats.totalEvents}</p>
                <p className="text-xs text-[var(--wf-ink-muted)]">Total Acara</p>
              </div>
              <div className="bg-[var(--wf-board)]/80 px-3 py-2 ">
                <p className="text-2xl font-bold tabular-nums text-[var(--wf-accent)]">{stats.upcomingEvents}</p>
                <p className="text-xs text-[var(--wf-ink-muted)]">Acara Mendatang</p>
              </div>
            </div>
          )}
        </RevealSection>

        {/* Loading / error / empty */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--wf-rule)]" />
            ))}
          </div>
        )}
        {!isLoading && fetchError && (
          <div className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-700 shadow-sm dark:bg-red-950/30 dark:text-red-300">
            Gagal memuat direktori organisasi. Silakan coba lagi.
          </div>
        )}
        {!isLoading && !fetchError && organizations.length === 0 && (
          <div className="rounded-2xl bg-[var(--wf-board)]/80 p-10 text-center shadow-sm text-[var(--wf-ink-muted)]">
            Belum ada komunitas terdaftar.
          </div>
        )}

        {/* Sticky toolbar: search + category pills */}
        {!isLoading && !fetchError && organizations.length > 0 && (
          <div className="sticky top-16 z-30 -mx-4 mb-5 bg-[color-mix(in_srgb,var(--wf-board)_90%,transparent)] px-4 py-2 backdrop-blur  sm:-mx-6 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama komunitas, EO, atau kategori…"
                aria-label="Cari komunitas"
                className="ui-focus-ring w-full rounded-lg bg-[var(--wf-board)]! py-2 pl-9 pr-3 text-sm text-[var(--wf-ink)] shadow-sm placeholder:text-[var(--wf-ink-muted)]! h-auto border-0 dark:bg-[var(--wf-board)]!"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label="Filter kategori">
              {[ALL_CATEGORIES, ...categories].map((cat) => {
                const count = cat === ALL_CATEGORIES ? organizations.length : (categoryCounts.get(cat) ?? 0);
                return (
                  <Button
                    key={cat}
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                    className={`ui-focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] md:text-[11px] font-semibold transition h-auto border-0 gap-1! rounded-full! leading-normal active:translate-y-0! ${
                      activeCategory === cat
                        ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)] shadow-sm hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]!'
                        : 'text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board)]! hover:shadow-sm hover:text-[var(--wf-ink-muted)]!'
                    }`}
                  >
                    {cat === ALL_CATEGORIES ? ALL_CATEGORIES : ORG_TYPE_LABELS[cat as OrganizationType] ?? cat}
                    <span className={`tabular-nums ${activeCategory === cat ? 'text-[var(--wf-accent-ink)]' : 'text-[var(--wf-ink-muted)] '}`}>{count}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty result for active filter */}
        {!isLoading && !fetchError && hasActiveFilter && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--wf-board)]/60 p-10 text-center shadow-sm ">
            <Search className="h-8 w-8 text-[var(--wf-rule-strong)]" aria-hidden />
            <p className="text-sm font-medium text-[var(--wf-ink-muted)]">Tidak ada hasil</p>
            <p className="text-xs text-[var(--wf-ink-muted)]">Coba kata kunci lain atau pilih kategori berbeda.</p>
          </div>
        )}

        {/* Grouped listing */}
        {grouped.map(([type, orgs]) => (
          <RevealSection key={type} className="mb-6" refreshKey={`${orgs.length}:${orgs[0]?.id ?? ''}`}>
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--wf-accent)]" aria-hidden />
              <h2 className="text-lg font-bold tracking-tight">
                {ORG_TYPE_LABELS[type as OrganizationType] ?? type}
                <span className="ml-2 text-xs font-medium text-[var(--wf-ink-muted)]">({orgs.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  data-reveal-item
                  className="group flex flex-col rounded-xl bg-[var(--wf-board)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md "
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${TYPE_ACCENT[org.type] ?? TYPE_ACCENT.other}`}
                      aria-hidden
                    >
                      {initials(org.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--wf-ink)]">{org.name}</h3>
                      {org.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--wf-ink-muted)]">{org.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wf-board-2)] px-2 py-0.5 font-medium text-[var(--wf-ink-muted)]">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {org.eventCount} acara
                    </span>
                    {org.upcomingEventCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 font-medium text-[var(--wf-accent)]">
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
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--wf-accent)] hover:underline"
                    >
                      Profil Instagram
                    </a>
                  )}
                </div>
              ))}
            </div>
          </RevealSection>
        ))}
      </main>
    </div>
  );
}