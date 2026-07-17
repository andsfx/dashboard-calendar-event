import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock3, MapPin, Search, X } from 'lucide-react';
import { EventItem, EventStatus } from '../types';
import { CATEGORY_COLORS, STATUS_ORDER } from '../utils/eventUtils';

interface Props {
  events: EventItem[];
  isLoading?: boolean;
  onDetail: (ev: EventItem) => void;
}

/** Status chip: "all" = ongoing+upcoming (hide past). Explicit past via "past". */
type StatusChip = 'all' | EventStatus;

const STATUS_CHIPS: { id: StatusChip; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'ongoing', label: 'Live' },
  { id: 'upcoming', label: 'Coming Soon' },
  { id: 'past', label: 'Selesai' },
];

const PUBLIC_STATUS_LABEL: Record<'ongoing' | 'upcoming' | 'past', string> = {
  ongoing: 'Live',
  upcoming: 'Coming Soon',
  past: 'Selesai',
};

const PUBLIC_STATUS_CLASS: Record<'ongoing' | 'upcoming' | 'past', string> = {
  ongoing:
    'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700',
  upcoming:
    'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700',
  past: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
};

const PUBLIC_STATUS_DOT: Record<'ongoing' | 'upcoming' | 'past', string> = {
  ongoing: 'bg-emerald-500 motion-safe:animate-pulse',
  upcoming: 'bg-amber-500',
  past: 'bg-slate-400',
};

/** Exported for unit tests — status-aware public list sort. */
export function sortPublicList(list: EventItem[]): EventItem[] {
  return [...list].sort((a, b) => {
    const byStatus = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    if (a.status === 'past' && b.status === 'past') {
      return b.dateStr.localeCompare(a.dateStr);
    }
    return a.dateStr.localeCompare(b.dateStr);
  });
}

/** Exported for unit tests — "all" hides past; draft never shown. */
export function filterPublicEvents(
  events: EventItem[],
  statusChip: StatusChip,
  category: string,
  month: string,
  search: string,
): EventItem[] {
  let result = events.filter(e => e.status !== 'draft');

  if (statusChip === 'all') {
    result = result.filter(e => e.status === 'ongoing' || e.status === 'upcoming');
  } else {
    result = result.filter(e => e.status === statusChip);
  }

  if (category !== 'Semua') {
    result = result.filter(e => e.categories.includes(category) || e.category === category);
  }
  if (month !== 'Semua') {
    result = result.filter(e => e.month === month);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      e =>
        e.acara.toLowerCase().includes(q) ||
        e.lokasi.toLowerCase().includes(q) ||
        e.eo.toLowerCase().includes(q) ||
        e.keterangan.toLowerCase().includes(q) ||
        e.categories.some(c => c.toLowerCase().includes(q)),
    );
  }

  return sortPublicList(result);
}

function PublicStatusPill({ status }: { status: EventStatus }) {
  if (status === 'draft') return null;
  const key = status as 'ongoing' | 'upcoming' | 'past';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${PUBLIC_STATUS_CLASS[key]}`}
      aria-label={PUBLIC_STATUS_LABEL[key]}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${PUBLIC_STATUS_DOT[key]}`} aria-hidden="true" />
      {PUBLIC_STATUS_LABEL[key]}
    </span>
  );
}

export function PublicEventList({ events, isLoading, onDetail }: Props) {
  const [search, setSearch] = useState('');
  const [statusChip, setStatusChip] = useState<StatusChip>('all');
  const [category, setCategory] = useState('Semua');
  const [month, setMonth] = useState('Semua');

  const categories = useMemo(() => {
    const unique = [...new Set(events.flatMap(e => e.categories?.length ? e.categories : [e.category]).filter(Boolean))];
    return ['Semua', ...unique.sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const months = useMemo(() => {
    const unique = [...new Set(events.map(e => e.month).filter(Boolean))];
    return ['Semua', ...unique];
  }, [events]);

  const filtered = useMemo(
    () => filterPublicEvents(events, statusChip, category, month, search),
    [events, statusChip, category, month, search],
  );

  const hasActiveFilters =
    statusChip !== 'all' || category !== 'Semua' || month !== 'Semua' || search.trim() !== '';

  const resetFilters = () => {
    setSearch('');
    setStatusChip('all');
    setCategory('Semua');
    setMonth('Semua');
  };

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Memuat daftar event">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="h-[4.5rem] animate-pulse rounded-[1.25rem] border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]">
            Jadwal lengkap
          </p>
          <h2
            id="event-list-heading"
            className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl"
          >
            Daftar Event
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base sm:leading-8">
            Cari dan filter semua event publik Metropolitan Mall Bekasi.
          </p>
        </div>
        <p className="shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">
          {filtered.length} acara
        </p>
      </div>

      <div className="space-y-3 rounded-[1.5rem] border border-black/[0.06] bg-[var(--brand-card)] p-3 shadow-[var(--shadow-card-soft)] dark:border-slate-700 dark:bg-slate-900 sm:p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari acara, lokasi, EO…"
            maxLength={100}
            aria-label="Cari acara, lokasi, atau EO"
            className="h-11 w-full rounded-xl border border-black/[0.08] bg-white py-2 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-[var(--brand-tosca)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-tosca)_25%,transparent)] dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-[var(--brand-tosca-soft)]"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white ui-focus-ring"
              aria-label="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter status"
          >
            {STATUS_CHIPS.map(chip => {
              const active = statusChip === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusChip(chip.id)}
                  className={`inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-xs font-semibold transition ui-focus-ring sm:min-h-9 sm:py-1.5 ${
                    active
                      ? 'bg-[var(--brand-tosca)] text-white shadow-sm'
                      : 'border border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="public-list-category">
              Kategori
            </label>
            <select
              id="public-list-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="min-h-11 rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[var(--brand-tosca)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-tosca)_25%,transparent)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:min-h-9"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c === 'Semua' ? 'Semua kategori' : c}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="public-list-month">
              Bulan
            </label>
            <select
              id="public-list-month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="min-h-11 rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[var(--brand-tosca)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-tosca)_25%,transparent)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:min-h-9"
            >
              {months.map(m => (
                <option key={m} value={m}>
                  {m === 'Semua' ? 'Semua bulan' : m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
          {events.length === 0 ? (
            <>
              <CalendarDays className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">Belum ada event</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Jadwal akan muncul di sini setelah event dipublikasikan.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Tidak ada event yang cocok
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Coba ubah kata kunci atau filter.
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--brand-tosca)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"
                >
                  Reset filter
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-2" role="list" aria-labelledby="event-list-heading">
          {filtered.map(ev => {
            const cat = (ev.categories?.length ? ev.categories[0] : ev.category) || 'Umum';
            const catColor = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Umum ?? '#00918e';
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onDetail(ev)}
                  className="group flex w-full min-h-11 items-start gap-3 rounded-[1.25rem] border border-black/[0.06] bg-white px-4 py-3.5 text-left shadow-[var(--shadow-card-soft)] transition hover:border-[color-mix(in_srgb,var(--brand-tosca)_35%,transparent)] hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[color-mix(in_srgb,var(--brand-tosca)_45%,black)] ui-focus-ring sm:items-center sm:gap-4 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PublicStatusPill status={ev.status} />
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${catColor} 14%, white)`,
                          color: catColor,
                        }}
                      >
                        {cat}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-bold text-slate-900 group-hover:text-[var(--brand-tosca-dark)] dark:text-white dark:group-hover:text-[var(--brand-tosca-soft)] sm:text-base">
                      {ev.acara}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {ev.tanggal}
                      </span>
                      {ev.jam ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {ev.jam}
                        </span>
                      ) : null}
                      {ev.lokasi ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{ev.lokasi}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight
                    className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand-tosca)] dark:text-slate-600 dark:group-hover:text-[var(--brand-tosca-soft)] motion-reduce:transform-none sm:mt-0"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
