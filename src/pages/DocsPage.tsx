import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Moon,
  Search,
  SunMedium,
  Wrench,
} from 'lucide-react';
import { DOC_SECTIONS, type DocFeature } from '../data/featureDocs';
import { usePageMeta } from '../utils/pageMeta';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const AUDIENCE_STYLE: Record<DocFeature['audience'], string> = {
  'Publik': 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  'Semua pengguna': 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  'Tenant': 'border-brand-primary-200 bg-brand-primary-50 text-brand-primary-700 dark:border-brand-primary-800 dark:bg-brand-primary-950/40 dark:text-brand-primary-300',
  'Viewer': 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  'Admin': 'border-brand-primary-200 bg-brand-primary-50 text-brand-primary-700 dark:border-brand-primary-800 dark:bg-brand-primary-950/40 dark:text-brand-primary-300',
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

  const navigate = useNavigate();
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
    <div className="ui-dashboard-page min-h-screen bg-[var(--brand-paper)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">
              Dokumentasi
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />Kembali
            </button>
          </div>
        </div>
      </header>

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-6 sm:py-12">
        <div className="mb-8 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-700 dark:text-brand-primary-300">
            Dokumentasi
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Panduan Fitur</h1>
          <p className="mt-3 text-base leading-7 ui-text-muted">
            Penjelasan dan tutorial singkat untuk setiap fitur Metropolitan Mall Bekasi — dari mencari jadwal event
            dan mendaftar sebagai komunitas, sampai mengelola dashboard sebagai admin. Pilih "Saya melihat sebagai"
            untuk menyaring sesuai peran Anda, atau cari langsung nama fiturnya.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Daftar isi */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <nav aria-label="Daftar isi dokumentasi" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--brand-card-light)] p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider ui-text-muted">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Daftar Isi
              </p>
              <ul className="mt-3 space-y-2">
                {DOC_SECTIONS.map(section => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-slate-800 transition hover:text-brand-primary-700 dark:text-slate-100 dark:hover:text-brand-primary-300"
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-primary-500" aria-hidden="true" />
                      {section.label}
                    </a>
                    <ul className="mt-1 space-y-0.5 pl-5">
                      {section.groups.map(group => (
                        <li key={group.id}>
                          <a
                            href={`#${group.id}`}
                            className="block rounded-sm py-0.5 text-[13px] ui-text-muted transition hover:text-brand-primary-700 dark:hover:text-brand-primary-300"
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
          </aside>

          <div className="min-w-0">
            {/* Saringan audiens */}
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider ui-text-muted">Saya melihat sebagai</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Saring dokumentasi menurut pengguna">
                {AUDIENCE_FILTERS.map(item => {
                  const active = item.id === audience;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAudience(item.id)}
                      aria-pressed={active}
                      title={item.hint}
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? 'border-brand-primary-600 bg-brand-primary-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-primary-300 hover:text-brand-primary-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-primary-700 dark:hover:text-brand-primary-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pencarian */}
            <div className="mb-6">
              <label htmlFor="docs-search" className="sr-only">
                Cari fitur
              </label>
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="docs-search"
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Cari fitur, mis. kalender, sponsor, survey…"
                  className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
                />
              </div>
              <p className="mt-2 text-xs ui-text-muted" role="status" aria-live="polite">
                {resultCount} fitur {isFiltering ? 'cocok dengan saringan' : 'terdokumentasi'}
                {query ? ` untuk "${query}"` : ''}
                {audience !== 'semua' ? ` · ${activeAudience.hint}` : ''}.
              </p>
            </div>

            {resultCount === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada fitur yang cocok</p>
                <p className="mt-1 text-sm ui-text-muted">
                  Coba kata kunci lain, ganti saringan pengguna, atau pilih bagian dari daftar isi.
                </p>
              </div>
            )}

            <div className="space-y-12">
              {filtered.map(section => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-2xl font-bold tracking-tight">{section.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 ui-text-muted">{section.intro}</p>

                  <div className="mt-6 space-y-10">
                    {section.groups.map(group => (
                      <div key={group.id} id={group.id} className="scroll-mt-24">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{group.label}</h3>
                        <p className="mt-1 text-sm ui-text-muted">{group.description}</p>

                        <div className="mt-4 space-y-4">
                          {group.features.map(feature => (
                            <article
                              key={feature.id}
                              id={feature.id}
                              className="scroll-mt-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--brand-card-light)] p-5 shadow-[var(--shadow-card-soft)] dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">{feature.name}</h4>
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
                                  <code className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {feature.path}
                                  </code>
                                  {!feature.path.includes(':') && (
                                    <Link
                                      to={feature.path}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary-700 transition hover:underline dark:text-brand-primary-300"
                                    >
                                      Buka halaman
                                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                    </Link>
                                  )}
                                </div>
                              )}

                              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{feature.summary}</p>

                              <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider ui-text-muted">Cara Pakai</p>
                                <ol className="mt-2 space-y-1.5">
                                  {feature.steps.map((step, index) => (
                                    <li key={index} className="flex gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary-50 text-[11px] font-bold text-brand-primary-700 dark:bg-brand-primary-950/50 dark:text-brand-primary-300">
                                        {index + 1}
                                      </span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {feature.notes && feature.notes.length > 0 && (
                                <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--brand-paper)] px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
                                  <p className="text-xs font-bold uppercase tracking-wider ui-text-muted">Catatan</p>
                                  <ul className="mt-1.5 space-y-1">
                                    {feature.notes.map((note, index) => (
                                      <li key={index} className="flex gap-2 text-xs leading-5 ui-text-muted">
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
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)] px-4 py-10 sm:px-6 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Metropolitan Mall Bekasi</p>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium ui-text-muted">
            <Link to="/" className="transition hover:text-brand-primary-700 dark:hover:text-brand-primary-300">
              Beranda
            </Link>
            <Link to="/events" className="transition hover:text-brand-primary-700 dark:hover:text-brand-primary-300">
              Jadwal Event
            </Link>
            <Link to="/sponsor" className="transition hover:text-brand-primary-700 dark:hover:text-brand-primary-300">
              Sponsor
            </Link>
            <Link to="/tenant-survey" className="transition hover:text-brand-primary-700 dark:hover:text-brand-primary-300">
              Evaluasi Tenant
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
