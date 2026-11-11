import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Search,
  Wrench,
} from 'lucide-react';
import { DOC_SECTIONS, type DocFeature } from '../data/featureDocs';
import { usePageMeta } from '../utils/pageMeta';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const AUDIENCE_STYLE: Record<DocFeature['audience'], string> = {
  'Publik': 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]',
  'Semua pengguna': 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]',
  'Tenant': 'border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]',
  'Viewer': 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  'Admin': 'border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]',
  'Superadmin': 'border-brand-secondary-200 bg-brand-secondary-50 text-brand-secondary-700 dark:border-brand-secondary-800 dark:bg-brand-secondary-950/40 dark:text-brand-secondary-300',
  'Demo': 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

function matches(
  feature: DocFeature,
  query: string,
  audienceMatch: (audience: DocFeature['audience']) => boolean,
): boolean {
  if (!audienceMatch(feature.audience)) return false;
  if (!query) return true;
  const haystack = [
    feature.name,
    feature.summary,
    feature.path ?? '',
    feature.audience,
    ...feature.steps,
    ...(feature.notes ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/**
 * Saringan audiens di halaman /docs. "Pengunjung" menggabungkan halaman publik
 * dan hal yang berlaku untuk semua; "Pengelola" menggabungkan admin, superadmin,
 * dan demo supaya tidak memaksa pengunjung memilih istilah internal.
 */
const AUDIENCE_FILTERS: Array<{
  id: string;
  label: string;
  hint: string;
  match: (audience: DocFeature['audience']) => boolean;
}> = [
  { id: 'semua', label: 'Semua', hint: 'Seluruh dokumentasi', match: () => true },
  {
    id: 'pengunjung',
    label: 'Pengunjung',
    hint: 'Untuk pengunjung, komunitas, dan brand',
    match: audience => audience === 'Publik' || audience === 'Semua pengguna',
  },
  { id: 'tenant', label: 'Tenant', hint: 'Untuk tenant mall', match: audience => audience === 'Tenant' },
  { id: 'viewer', label: 'Viewer', hint: 'Akun hanya-lihat', match: audience => audience === 'Viewer' },
  {
    id: 'pengelola',
    label: 'Pengelola',
    hint: 'Admin, superadmin, dan demo',
    match: audience => audience === 'Admin' || audience === 'Superadmin' || audience === 'Demo',
  },
];

/**
 * /docs — dokumentasi fitur + tutorial singkat.
 *
 * Permukaan PUBLIK (tanpa login), jadi tunduk pada DESIGN.md: kertas hangat,
 * kartu lembut, tosca sebagai aksen struktur, radius kampanye hanya untuk kartu
 * besar. Isi berasal dari `src/data/featureDocs.ts` supaya satu sumber dengan
 * apa yang benar-benar ada di UI.
 */
export function DocsPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Dokumentasi Fitur - Metropolitan Mall Bekasi',
    description:
      'Panduan lengkap fitur dan tutorial singkat dashboard event Metropolitan Mall Bekasi, untuk admin, tenant, dan pengunjung.',
  });

  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('semua');

  const activeAudience = AUDIENCE_FILTERS.find(item => item.id === audience) ?? AUDIENCE_FILTERS[0]!;

  const filtered = useMemo(
    () =>
      DOC_SECTIONS.map(section => ({
        ...section,
        groups: section.groups
          .map(group => ({
            ...group,
            features: group.features.filter(feature => matches(feature, query, activeAudience.match)),
          }))
          .filter(group => group.features.length > 0),
      })).filter(section => section.groups.length > 0),
    [query, activeAudience],
  );

  const resultCount = filtered.reduce(
    (total, section) => total + section.groups.reduce((sum, group) => sum + group.features.length, 0),
    0,
  );

  const isFiltering = Boolean(query) || audience !== 'semua';

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-6 sm:py-12">
        <RevealSection as="div" className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Panduan Fitur</h1>
          <p className="mt-3 text-base leading-7 text-[var(--wf-ink-muted)]">
            Penjelasan dan tutorial singkat untuk setiap fitur Metropolitan Mall Bekasi: dari mencari jadwal event
            dan mendaftar sebagai komunitas, sampai mengelola dashboard sebagai admin. Pilih "Saya melihat sebagai"
            untuk menyaring sesuai peran Anda, atau cari langsung nama fiturnya.
          </p>
        </RevealSection>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Daftar isi */}
          <RevealSection as="aside" className="lg:sticky lg:top-20 lg:self-start">
            <nav aria-label="Daftar isi dokumentasi" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--wf-board)] p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Daftar Isi
              </p>
              <ul className="mt-3 space-y-2">
                {DOC_SECTIONS.map(section => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-[var(--wf-ink)] transition hover:text-[var(--wf-accent)]"
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--wf-accent)]" aria-hidden="true" />
                      {section.label}
                    </a>
                    <ul className="mt-1 space-y-0.5 pl-5">
                      {section.groups.map(group => (
                        <li key={group.id}>
                          <a
                            href={`#${group.id}`}
                            className="block rounded-sm py-0.5 text-[13px] text-[var(--wf-ink-muted)] transition hover:text-[var(--wf-accent)]"
                          >
                            {group.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </nav>
          </RevealSection>

          <div className="min-w-0">
            {/* Saringan audiens */}
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--wf-ink-muted)]">Saya melihat sebagai</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Saring dokumentasi menurut pengguna">
                {AUDIENCE_FILTERS.map(item => {
                  const active = item.id === audience;
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      onClick={() => setAudience(item.id)}
                      aria-pressed={active}
                      title={item.hint}
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition h-auto rounded-full! active:translate-y-0! ${
                        active
                          ? 'border-[var(--wf-accent)]! bg-[var(--wf-accent)] text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]!'
                          : 'border-[var(--wf-rule)]! bg-[var(--wf-board)] text-[var(--wf-ink-muted)] hover:border-[var(--wf-accent)]! hover:text-[var(--wf-accent)]! hover:bg-[var(--wf-board)]!'
                      }`}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Pencarian */}
            <div className="mb-6">
              <Label htmlFor="docs-search" className="sr-only">
                Cari fitur
              </Label>
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" aria-hidden="true" />
                <Input
                  id="docs-search"
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Cari fitur, mis. kalender, sponsor, survey…"
                  className="w-full rounded-full border border-[var(--wf-rule)]! bg-[var(--wf-board)]! py-2.5 pl-10 pr-4 text-sm text-[var(--wf-ink)] outline-none transition focus-visible:ring-2! focus-visible:ring-[var(--wf-accent)]! dark:placeholder-slate-400 h-auto rounded-full! dark:bg-[var(--wf-board)]!"
                />
              </div>
              <p className="mt-2 text-xs text-[var(--wf-ink-muted)]" role="status" aria-live="polite">
                {resultCount} fitur {isFiltering ? 'cocok dengan saringan' : 'terdokumentasi'}
                {query ? ` untuk "${query}"` : ''}
                {audience !== 'semua' ? ` · ${activeAudience.hint}` : ''}.
              </p>
            </div>

            {resultCount === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--wf-rule-strong)] px-6 py-16 text-center">
                <p className="font-semibold text-[var(--wf-ink-muted)]">Tidak ada fitur yang cocok</p>
                <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">
                  Coba kata kunci lain, ganti saringan pengguna, atau pilih bagian dari daftar isi.
                </p>
              </div>
            )}

            <div className="space-y-12">
              {filtered.map(section => (
                <RevealSection
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24"
                  refreshKey={`${filtered.length}:${filtered[0]?.id ?? ''}`}
                >
                  <h2 data-reveal-item className="text-2xl font-bold tracking-tight">{section.label}</h2>
                  <p data-reveal-item className="mt-2 max-w-3xl text-sm leading-6 text-[var(--wf-ink-muted)]">{section.intro}</p>

                  <div className="mt-6 space-y-10">
                    {section.groups.map(group => (
                      <div key={group.id} id={group.id} className="scroll-mt-24">
                        <h3 className="text-lg font-bold text-[var(--wf-ink)]">{group.label}</h3>
                        <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">{group.description}</p>

                        <div className="mt-4 space-y-4">
                          {group.features.map(feature => (
                            <article
                              key={feature.id}
                              id={feature.id}
                              data-reveal-item
                              className="scroll-mt-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--wf-board)] p-5 shadow-[var(--shadow-card-soft)] sm:p-6"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-bold text-[var(--wf-ink)]">{feature.name}</h4>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${AUDIENCE_STYLE[feature.audience]}`}>
                                  {feature.audience}
                                </span>
                                {feature.status === 'maintenance' && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                    <Wrench className="h-3 w-3" aria-hidden="true" />
                                    Sedang Diperbaiki
                                  </span>
                                )}
                              </div>

                              {feature.path && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <code className="rounded-md bg-[var(--wf-board-2)] px-2 py-0.5 text-xs font-medium text-[var(--wf-ink-muted)]">
                                    {feature.path}
                                  </code>
                                  {!feature.path.includes(':') && (
                                    <Link
                                      to={feature.path}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wf-accent)] transition hover:underline"
                                    >
                                      Buka halaman
                                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                    </Link>
                                  )}
                                </div>
                              )}

                              <p className="mt-3 text-sm leading-6 text-[var(--wf-ink-muted)]">{feature.summary}</p>

                              <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-[var(--wf-ink-muted)]">Cara Pakai</p>
                                <ol className="mt-2 space-y-1.5">
                                  {feature.steps.map((step, index) => (
                                    <li key={index} className="flex gap-2.5 text-sm leading-6 text-[var(--wf-ink-muted)]">
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--wf-accent-soft)] text-[11px] font-bold text-[var(--wf-accent)]">
                                        {index + 1}
                                      </span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {feature.notes && feature.notes.length > 0 && (
                                <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--wf-page)] px-4 py-3">
                                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--wf-ink-muted)]">Catatan</p>
                                  <ul className="mt-1.5 space-y-1">
                                    {feature.notes.map((note, index) => (
                                      <li key={index} className="flex gap-2 text-xs leading-5 text-[var(--wf-ink-muted)]">
                                        <span aria-hidden="true">•</span>
                                        <span>{note}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)] px-4 py-10 sm:px-6 ">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--wf-ink-muted)]">Metropolitan Mall Bekasi</p>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--wf-ink-muted)]">
            <Link to="/" className="transition hover:text-[var(--wf-accent)]">
              Beranda
            </Link>
            <Link to="/events" className="transition hover:text-[var(--wf-accent)]">
              Jadwal Event
            </Link>
            <Link to="/sponsor" className="transition hover:text-[var(--wf-accent)]">
              Sponsor
            </Link>
            <Link to="/tenant-survey" className="transition hover:text-[var(--wf-accent)]">
              Evaluasi Tenant
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
