import { useMemo, useState, useCallback, useEffect, useRef, lazy, Suspense, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDashed,
  CircleHelp,
  DollarSign,
  Link2,
  Loader2,
  MapPin,
  QrCode,
  Search,
  Store,
  Tag,
  TrendingUp,
} from 'lucide-react';
import type { EventItem } from '../../types';
import {
  EMPTY_FILTER,
  type ResultsFilter,
  type DistMap,
} from '../../utils/tenantSurveyResultsAggregate';

const SurveyQRCode = lazy(() => import('./SurveyQRCode'));

export const FIELD =
  'ui-focus-ring w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

export const TRAFFIC_COLORS: Record<string, string> = {
  Signifikan: 'bg-emerald-500',
  'Sedikit Naik': 'bg-green-400',
  'Tidak Ada': 'bg-amber-400',
  Menurun: 'bg-red-500',
};

export const SALES_COLORS: Record<string, string> = {
  '> 50%': 'bg-emerald-500',
  '30% - 50%': 'bg-green-400',
  '10% - 30%': 'bg-lime-400',
  '< 10%': 'bg-amber-400',
  'Tidak ada kenaikan / Sama saja': 'bg-orange-400',
};

export const DEFAULT_BAR = [
  'bg-brand-primary-500',
  'bg-brand-primary-400',
  'bg-sky-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-brand-secondary-400',
];

export function DistBars({
  title,
  icon,
  dist,
  total,
  colorMap,
  hint,
}: {
  title: string;
  icon: ReactNode;
  dist: DistMap;
  total: number;
  colorMap?: Record<string, string>;
  hint?: string;
}) {
  const max = Math.max(1, ...dist.labels.map((l) => dist.counts[l] || 0));
  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <div className="ui-dashboard-muted flex items-center gap-2 border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/50 dark:text-brand-primary-400">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            {title}
          </h3>
          {hint ? (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">{hint}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        {dist.labels.map((label, i) => {
          const n = dist.counts[label] || 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          const w = Math.round((n / max) * 100);
          const bar =
            (colorMap ? colorMap[label] : undefined) || DEFAULT_BAR[i % DEFAULT_BAR.length];
          return (
            <div key={label}>
              <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-slate-600 dark:text-slate-300">{label}</span>
                <span className="shrink-0 tabular-nums ui-text-muted">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{n}</span>
                  <span className="text-slate-400"> · {pct}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${bar}`}
                  style={{ width: `${w}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  tone = 'neutral',
  helper,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  helper?: string;
}) {
  const accent =
    tone === 'good'
      ? 'border-l-emerald-400 dark:border-l-emerald-500'
      : tone === 'warn'
        ? 'border-l-amber-400 dark:border-l-amber-500'
        : tone === 'bad'
          ? 'border-l-red-400 dark:border-l-red-500'
          : 'border-l-brand-primary-400 dark:border-l-brand-primary-500';
  const valueClass =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'bad'
          ? 'text-red-600 dark:text-red-400'
          : 'text-slate-900 dark:text-slate-50';
  const pill =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
        : tone === 'bad'
          ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
          : 'bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-400';

  return (
    <div className={`ui-dashboard-surface border-l-[3px] p-2.5 sm:p-3.5 ${accent}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${pill}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase leading-tight tracking-wide ui-text-muted sm:text-[11px]">
            {label}
          </p>
          <p className={`mt-0.5 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${valueClass}`}>
            {value}
          </p>
          {helper ? (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">{helper}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === 'reviewed'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800'
      : s === 'submitted'
        ? 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800'
        : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  );
}

export function pctTone(n: number): 'good' | 'warn' | 'bad' | 'neutral' {
  if (n <= 0) return 'neutral';
  if (n >= 60) return 'good';
  if (n >= 30) return 'warn';
  return 'bad';
}

export function isFilterActive(f: ResultsFilter): boolean {
  return (
    f.eventId !== EMPTY_FILTER.eventId ||
    f.dateFrom !== EMPTY_FILTER.dateFrom ||
    f.dateTo !== EMPTY_FILTER.dateTo ||
    f.zona !== EMPTY_FILTER.zona ||
    f.kategori !== EMPTY_FILTER.kategori ||
    f.status !== EMPTY_FILTER.status
  );
}

const GUIDE_COLLAPSED_KEY = 'tsr_guide_collapsed';

/** Collapsible how-to for reading / analysing survey results. */
export function ResultsReadingGuide() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_COLLAPSED_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(GUIDE_COLLAPSED_KEY, next ? '0' : '1');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <section
      className="rounded-xl border border-sky-200/80 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/25"
      aria-labelledby="results-guide-heading"
    >
      <button
        type="button"
        onClick={toggle}
        className="ui-focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left sm:px-4 sm:py-3"
        aria-expanded={open}
        aria-controls="results-guide-body"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
          <BookOpen className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="results-guide-heading"
            className="text-sm font-semibold text-sky-900 dark:text-sky-100"
          >
            Panduan membaca hasil survey
          </h2>
          <p className="text-[11px] text-sky-700/80 dark:text-sky-400">
            Ringkasan langkah dan arti angka di halaman ini
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-sky-600 transition dark:text-sky-400 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id="results-guide-body"
          className="space-y-3 border-t border-sky-200/70 px-3 pb-3.5 pt-3 dark:border-sky-900/40 sm:px-4 sm:pb-4"
        >
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '1',
                t: 'Pilih event',
                d: 'Pilih event terlebih dahulu. Rentang tanggal, zona, dan kategori gerai dapat digunakan untuk mempersempit data.',
              },
              {
                n: '2',
                t: 'Baca angka ringkasan',
                d: 'Hijau: 60% atau lebih. Kuning: 30% sampai 59%. Merah: di bawah 30%.',
              },
              {
                n: '3',
                t: 'Buka tab Ringkasan',
                d: 'Tab ini menampilkan sebaran jawaban, peringkat gerai, dan tren bulanan.',
              },
              {
                n: '4',
                t: 'Tindak lanjut',
                d: 'Checklist untuk tenant yang belum mengisi. Bagikan untuk mengirim tautan atau kode QR. Detail untuk membaca komentar.',
              },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-lg border border-sky-100/90 bg-white/70 px-2.5 py-2 dark:border-sky-900/40 dark:bg-slate-900/40"
              >
                <p className="text-[11px] font-bold text-sky-800 dark:text-sky-200">
                  <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-200/80 text-[10px] tabular-nums text-sky-900 dark:bg-sky-800 dark:text-sky-100">
                    {s.n}
                  </span>
                  {s.t}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                  {s.d}
                </p>
              </li>
            ))}
          </ol>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-sky-100/90 bg-white/70 px-2.5 py-2 dark:border-sky-900/40 dark:bg-slate-900/40">
              <p className="flex items-center gap-1 text-[11px] font-bold text-sky-800 dark:text-sky-200">
                <CircleHelp className="h-3 w-3 shrink-0" aria-hidden />
                Keterangan angka ringkasan
              </p>
              <ul className="mt-1 space-y-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                <li>
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    Total submisi
                  </strong>
                  {': '}
                  jumlah formulir yang telah dikirim (bukan draf).
                </li>
                <li>
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    Tenant yang sudah isi
                  </strong>
                  {': '}
                  dari daftar tenant mall, berapa yang telah mengisi sesuai filter. Pilih satu event agar angkanya lebih akurat.
                </li>
                <li>
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    Traffic positif
                  </strong>
                  {': '}
                  persentase yang menyatakan pengunjung meningkat (Signifikan atau Sedikit Naik).
                </li>
                <li>
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    Sales positif
                  </strong>
                  {': '}
                  persentase yang menyatakan omzet meningkat minimal 10%.
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-sky-100/90 bg-white/70 px-2.5 py-2 dark:border-sky-900/40 dark:bg-slate-900/40">
              <p className="flex items-center gap-1 text-[11px] font-bold text-sky-800 dark:text-sky-200">
                <BarChart3 className="h-3 w-3 shrink-0" aria-hidden />
                Catatan untuk analisis
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-3.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                <li>
                  Jika pengunjung meningkat tetapi omzet tidak, periksa kategori atau zona yang lemah.
                </li>
                <li>
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    Top Gerai
                  </strong>
                  {' '}
                  diurut berdasarkan frekuensi laporan kenaikan pengunjung atau omzet, bukan nilai omzet tertinggi.
                </li>
                <li>
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    Kategori × Sales
                  </strong>
                  {' '}
                  menunjukkan jenis gerai yang paling sering melaporkan kenaikan omzet, beserta besarannya.
                </li>
                <li>
                  Untuk laporan singkat, pilih satu event kemudian ekspor PDF.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function publicSurveyUrl(eventId: string): string {
  if (typeof window === 'undefined') return `/tenant-survey/${eventId}`;
  return `${window.location.origin}/tenant-survey/${eventId}`;
}

export type EventFilterOption = {
  id: string;
  label: string;
  status: EventItem['status'] | string;
  dateStr: string;
};

/** Searchable event picker — newest first, type-to-filter (no long scroll). */
export function EventFilterSearch({
  value,
  options,
  onChange,
}: {
  value: string;
  options: EventFilterOption[];
  onChange: (eventId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value === 'all' ? null : options.find((o) => o.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.dateStr.includes(q) ||
        String(o.status).toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    // focus search when open
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative z-50 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${FIELD} flex items-center gap-2 text-left`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter nama event"
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="font-medium text-slate-800 dark:text-slate-100">{selected.label}</span>
              {selected.status === 'ongoing' && (
                <span className="ml-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  live
                </span>
              )}
            </>
          ) : (
            <span className="ui-text-muted">Semua event</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="ui-dashboard-surface absolute left-0 right-0 z-[60] mt-1 flex max-h-[min(28rem,65dvh)] w-full flex-col overflow-hidden shadow-xl sm:left-0 sm:right-auto sm:min-w-[22rem] sm:max-w-[min(100vw-2rem,28rem)]"
          role="listbox"
        >
          <div className="shrink-0 border-b border-slate-100 p-2 dark:border-slate-700">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama event…"
                className="ui-focus-ring w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                aria-label="Cari event"
              />
            </div>
            <p className="mt-1.5 px-0.5 text-[10px] text-slate-400">
              {filtered.length} event · terbaru dulu
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
            <button
              type="button"
              role="option"
              aria-selected={value === 'all'}
              onClick={() => pick('all')}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                value === 'all'
                  ? 'bg-brand-primary-50 font-semibold text-brand-primary-800 dark:bg-brand-primary-950/40 dark:text-brand-primary-200'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              Semua event
              <span className="ml-auto text-[10px] font-normal text-slate-400">{options.length}</span>
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11px] ui-text-muted">
                Tidak ada event cocok “{query}”
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={value === o.id}
                  onClick={() => pick(o.id)}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    value === o.id
                      ? 'bg-brand-primary-50 dark:bg-brand-primary-950/40'
                      : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-xs font-medium ${
                        value === o.id
                          ? 'text-brand-primary-800 dark:text-brand-primary-200'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {o.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-slate-400">
                      {o.dateStr || '—'}
                      {o.status === 'ongoing'
                        ? ' · berlangsung'
                        : o.status === 'past'
                          ? ' · selesai'
                          : o.status
                            ? ` · ${o.status}`
                            : ''}
                    </span>
                  </span>
                  {value === o.id && (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary-600" aria-hidden />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** One event row: name + copy link + QR (same pattern as admin dashboard). */
export function EventShareRow({
  event,
  responseCount,
  defaultOpen = false,
}: {
  event: Pick<EventItem, 'id' | 'acara' | 'status' | 'dateStr' | 'tanggal'>;
  responseCount?: number;
  defaultOpen?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(defaultOpen);
  const url = publicSurveyUrl(event.id);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [url]);

  const statusLabel =
    event.status === 'ongoing' ? 'Berlangsung' : event.status === 'past' ? 'Selesai' : event.status;

  return (
    <div className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
      <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/50 dark:text-brand-primary-400">
            <CalendarDays className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100 [overflow-wrap:anywhere]">
              {event.acara}
            </p>
            <p className="mt-0.5 text-[11px] ui-text-muted">
              {event.tanggal || event.dateStr || '—'}
              {' · '}
              {statusLabel}
              {typeof responseCount === 'number' ? ` · ${responseCount} respons` : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className="ui-focus-ring inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Salin link form survey"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
            ) : (
              <Link2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? 'Tersalin' : 'Salin link'}
          </button>
          <button
            type="button"
            onClick={() => setShowQR((v) => !v)}
            className={`ui-focus-ring inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition ${
              showQR
                ? 'border-brand-primary-300 bg-brand-primary-50 text-brand-primary-700 dark:border-brand-primary-700 dark:bg-brand-primary-950/40 dark:text-brand-primary-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
            title="Tampilkan QR form survey"
            aria-expanded={showQR}
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden />
            QR
          </button>
        </div>
      </div>
      {showQR && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:px-4">
          <p className="mb-3 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
            Form survey:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100 [overflow-wrap:anywhere]">
              {event.acara}
            </span>
          </p>
          <Suspense
            fallback={
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-brand-primary-500" aria-hidden />
              </div>
            }
          >
            <SurveyQRCode
              eventId={event.id}
              eventName={event.acara}
              basePath="/tenant-survey"
              label="Self-Assessment Tenant"
              showTypeTabs={false}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}