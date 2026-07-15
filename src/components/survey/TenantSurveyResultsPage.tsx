import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  Loader2,
  MapPin,
  MessageSquareText,
  Store,
  Tag,
  TrendingUp,
  DollarSign,
  Search,
  RotateCcw,
  Inbox,
  X,
  Check,
  CircleDashed,
} from 'lucide-react';
import type { EventItem, TenantEventSurvey } from '../../types';
import { useTenantSurveys } from '../../hooks/useTenantSurveys';
import TenantSurveyTrendChart from './TenantSurveyTrendChart';
import { SURVEY_OPTIONS } from '../../constants/survey-options';
import {
  EMPTY_FILTER,
  aggregateResults,
  filterSurveys,
  type ResultsFilter,
  type DistMap,
} from '../../utils/tenantSurveyResultsAggregate';
import { downloadTenantSurveyResultsPdf } from '../../utils/tenantSurveyResultsPdf';
import {
  fetchTenantRoster,
  type TenantRosterItem,
} from '../../utils/supabaseApi';

interface Props {
  events: EventItem[];
  canExport?: boolean;
}

const FIELD =
  'ui-focus-ring w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

const TRAFFIC_COLORS: Record<string, string> = {
  Signifikan: 'bg-emerald-500',
  'Sedikit Naik': 'bg-green-400',
  'Tidak Ada': 'bg-amber-400',
  Menurun: 'bg-red-500',
};

const SALES_COLORS: Record<string, string> = {
  '> 50%': 'bg-emerald-500',
  '30% - 50%': 'bg-green-400',
  '10% - 30%': 'bg-lime-400',
  '< 10%': 'bg-amber-400',
  'Tidak ada kenaikan / Sama saja': 'bg-orange-400',
};

const DEFAULT_BAR = [
  'bg-brand-primary-500',
  'bg-brand-primary-400',
  'bg-sky-500',
  'bg-cyan-500',
  'bg-indigo-400',
  'bg-violet-400',
];

function DistBars({
  title,
  icon,
  dist,
  total,
  colorMap,
}: {
  title: string;
  icon: React.ReactNode;
  dist: DistMap;
  total: number;
  colorMap?: Record<string, string>;
}) {
  const max = Math.max(1, ...dist.labels.map((l) => dist.counts[l] || 0));
  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <div className="ui-dashboard-muted flex items-center gap-2 border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/50 dark:text-brand-primary-400">
          {icon}
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          {title}
        </h3>
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
                <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
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

function KpiCard({
  label,
  value,
  icon,
  tone = 'neutral',
  helper,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
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
    <div className={`ui-dashboard-surface border-l-[3px] p-3.5 sm:p-4 ${accent}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${pill}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className={`mt-0.5 text-2xl font-bold tabular-nums tracking-tight ${valueClass}`}>
            {value}
          </p>
          {helper ? (
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{helper}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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

function pctTone(n: number): 'good' | 'warn' | 'bad' | 'neutral' {
  if (n <= 0) return 'neutral';
  if (n >= 60) return 'good';
  if (n >= 30) return 'warn';
  return 'bad';
}

function isFilterActive(f: ResultsFilter): boolean {
  return (
    f.eventId !== EMPTY_FILTER.eventId ||
    f.dateFrom !== EMPTY_FILTER.dateFrom ||
    f.dateTo !== EMPTY_FILTER.dateTo ||
    f.zona !== EMPTY_FILTER.zona ||
    f.kategori !== EMPTY_FILTER.kategori ||
    f.status !== EMPTY_FILTER.status
  );
}

type RosterTab = 'all' | 'done' | 'pending';

export default function TenantSurveyResultsPage({ events, canExport = true }: Props) {
  const { surveys, isLoading, error } = useTenantSurveys();
  const [filter, setFilter] = useState<ResultsFilter>(EMPTY_FILTER);
  const [feedbackQ, setFeedbackQ] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [roster, setRoster] = useState<TenantRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState('');
  const [rosterTab, setRosterTab] = useState<RosterTab>('pending');
  const [rosterQ, setRosterQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    setRosterLoading(true);
    setRosterError('');
    void fetchTenantRoster().then((list) => {
      if (cancelled) return;
      setRoster(list);
      setRosterLoading(false);
      if (list.length === 0) {
        setRosterError('Roster tenant kosong atau gagal dimuat. Cek MID_API_KEY / koneksi.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const eventMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events) m.set(e.id, e.acara);
    return m;
  }, [events]);

  const eventOptions = useMemo(() => {
    const ids = new Set(surveys.map((s) => s.event_id));
    return events
      .filter((e) => ids.has(e.id))
      .map((e) => ({ id: e.id, label: e.acara }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'));
  }, [events, surveys]);

  const filtered = useMemo(() => filterSurveys(surveys, filter), [surveys, filter]);
  const agg = useMemo(() => aggregateResults(filtered), [filtered]);

  /** tenant_id + normalized name from filtered surveys (scope = current filter, esp. event) */
  const filledKeys = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const s of filtered) {
      if (s.tenant_id) ids.add(String(s.tenant_id));
      const n = (s.nama_gerai || s.tenant_name || '').trim().toLowerCase();
      if (n) names.add(n);
    }
    return { ids, names };
  }, [filtered]);

  const checklist = useMemo(() => {
    return roster.map((t) => {
      const byId = filledKeys.ids.has(t.id);
      const byName = filledKeys.names.has(t.name.trim().toLowerCase());
      return { ...t, filled: byId || byName };
    });
  }, [roster, filledKeys]);

  const checklistStats = useMemo(() => {
    const done = checklist.filter((t) => t.filled).length;
    const total = checklist.length;
    return { done, pending: total - done, total };
  }, [checklist]);

  const checklistView = useMemo(() => {
    const q = rosterQ.trim().toLowerCase();
    return checklist
      .filter((t) => {
        if (rosterTab === 'done' && !t.filled) return false;
        if (rosterTab === 'pending' && t.filled) return false;
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          t.floor.toLowerCase().includes(q) ||
          t.lot.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.filled !== b.filled) return a.filled ? 1 : -1; // pending first in "all"
        return a.name.localeCompare(b.name, 'id');
      });
  }, [checklist, rosterQ, rosterTab]);

  const trendEventId = filter.eventId === 'all' ? null : filter.eventId;

  const feedbackFiltered = useMemo(() => {
    const q = feedbackQ.trim().toLowerCase();
    if (!q) return agg.feedback;
    return agg.feedback.filter(
      (f) => f.text.toLowerCase().includes(q) || f.gerai.toLowerCase().includes(q),
    );
  }, [agg.feedback, feedbackQ]);

  const eventLabel =
    filter.eventId === 'all'
      ? 'Semua event'
      : eventMap.get(filter.eventId) || filter.eventId;

  const setField = useCallback(<K extends keyof ResultsFilter>(key: K, value: ResultsFilter[K]) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilter(EMPTY_FILTER);
  }, []);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof ResultsFilter; label: string }> = [];
    if (filter.eventId !== 'all') {
      chips.push({ key: 'eventId', label: eventMap.get(filter.eventId) || filter.eventId });
    }
    if (filter.dateFrom) chips.push({ key: 'dateFrom', label: `Dari ${filter.dateFrom}` });
    if (filter.dateTo) chips.push({ key: 'dateTo', label: `Sampai ${filter.dateTo}` });
    if (filter.zona !== 'all') chips.push({ key: 'zona', label: filter.zona });
    if (filter.kategori !== 'all') chips.push({ key: 'kategori', label: filter.kategori });
    if (filter.status !== 'all') {
      chips.push({
        key: 'status',
        label: filter.status === 'submitted' ? 'Submitted' : 'Reviewed',
      });
    }
    return chips;
  }, [filter, eventMap]);

  const clearChip = useCallback((key: keyof ResultsFilter) => {
    setFilter((prev) => ({
      ...prev,
      [key]: key === 'dateFrom' || key === 'dateTo' ? '' : key === 'status' ? 'all' : 'all',
    }));
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (!canExport) return;
    setExporting(true);
    setExportError('');
    try {
      await downloadTenantSurveyResultsPdf({
        aggregate: agg,
        filter,
        eventLabel,
        generatedAt: new Date().toLocaleString('id-ID'),
      });
    } catch (err) {
      console.error(err);
      setExportError('Gagal membuat PDF. Coba lagi.');
    } finally {
      setExporting(false);
    }
  }, [agg, canExport, eventLabel, filter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary-50 dark:bg-brand-primary-950/40">
          <Loader2 className="h-5 w-5 animate-spin text-brand-primary-600 dark:text-brand-primary-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Memuat hasil evaluasi tenant…
        </p>
        <p className="text-xs text-slate-400">Mengambil data submisi v3</p>
      </div>
    );
  }

  const filterDirty = isFilterActive(filter);

  return (
    <div className="space-y-5">
      {/* Report header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-primary-600 dark:text-brand-primary-400">
            Laporan analisa
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Hasil Evaluasi Tenant
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dampak event ke gerai · read-only · tanpa data PIC
          </p>
        </div>
        {canExport && (
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting || agg.total === 0}
            className="ui-btn-primary ui-focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Export PDF
          </button>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
        >
          {error}
        </div>
      )}
      {exportError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
        >
          {exportError}
        </div>
      )}

      {/* Filter toolbar */}
      <section
        className="ui-dashboard-surface sticky top-14 z-20 overflow-hidden shadow-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--brand-card-light)_92%,transparent)] supports-[backdrop-filter]:backdrop-blur-md dark:supports-[backdrop-filter]:bg-slate-900/90"
        aria-labelledby="filter-heading"
      >
        <div className="ui-dashboard-muted flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.04] px-3.5 py-2 dark:border-slate-700 sm:px-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Filter className="h-3.5 w-3.5 text-brand-primary-500" aria-hidden />
            <h2 id="filter-heading" className="text-[11px] font-bold uppercase tracking-wide">
              Filter
            </h2>
            <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {agg.total} data
            </span>
          </div>
          {filterDirty && (
            <button
              type="button"
              onClick={resetFilter}
              className="ui-focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-primary-700 transition hover:bg-brand-primary-50 dark:text-brand-primary-300 dark:hover:bg-brand-primary-950/40"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset filter
            </button>
          )}
        </div>

        <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Event
            </span>
            <select
              value={filter.eventId}
              onChange={(e) => setField('eventId', e.target.value)}
              className={FIELD}
            >
              <option value="all">Semua event</option>
              {eventOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Dari tanggal
            </span>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setField('dateFrom', e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Sampai tanggal
            </span>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setField('dateTo', e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Zona
            </span>
            <select
              value={filter.zona}
              onChange={(e) => setField('zona', e.target.value)}
              className={FIELD}
            >
              <option value="all">Semua zona</option>
              {SURVEY_OPTIONS.lokasi_zona.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Kategori
            </span>
            <select
              value={filter.kategori}
              onChange={(e) => setField('kategori', e.target.value)}
              className={FIELD}
            >
              <option value="all">Semua kategori</option>
              {SURVEY_OPTIONS.kategori.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Status
            </span>
            <select
              value={filter.status}
              onChange={(e) => setField('status', e.target.value as ResultsFilter['status'])}
              className={FIELD}
            >
              <option value="all">Submitted + Reviewed</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-black/[0.04] px-3.5 py-2.5 dark:border-slate-700 sm:px-4">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Aktif
            </span>
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => clearChip(c.key)}
                className="ui-focus-ring inline-flex max-w-[220px] items-center gap-1 rounded-full bg-brand-primary-50 px-2 py-0.5 text-[11px] font-medium text-brand-primary-800 ring-1 ring-inset ring-brand-primary-200 transition hover:bg-brand-primary-100 dark:bg-brand-primary-950/40 dark:text-brand-primary-200 dark:ring-brand-primary-800 dark:hover:bg-brand-primary-900/40"
                title="Hapus filter ini"
              >
                <span className="truncate">{c.label}</span>
                <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* KPI strip */}
      <section aria-label="Ringkasan KPI" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Submisi"
          value={agg.total}
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          helper="Survey v3 final"
        />
        <KpiCard
          label="Tenant yang sudah isi"
          value={
            rosterLoading
              ? '…'
              : checklistStats.total > 0
                ? `${checklistStats.done}/${checklistStats.total}`
                : agg.uniqueGerai
          }
          icon={<Store className="h-4 w-4" aria-hidden />}
          helper={
            checklistStats.total > 0
              ? `${checklistStats.pending} belum isi`
              : 'Jumlah tenant berbeda'
          }
          tone={
            checklistStats.total === 0
              ? 'neutral'
              : checklistStats.pending === 0
                ? 'good'
                : checklistStats.done === 0
                  ? 'bad'
                  : 'warn'
          }
        />
        <KpiCard
          label="Traffic Positif"
          value={agg.total > 0 ? `${agg.trafficPosPct}%` : '—'}
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
          tone={pctTone(agg.trafficPosPct)}
          helper="Signifikan + Sedikit Naik"
        />
        <KpiCard
          label="Sales Positif"
          value={agg.total > 0 ? `${agg.salesPosPct}%` : '—'}
          icon={<DollarSign className="h-4 w-4" aria-hidden />}
          tone={pctTone(agg.salesPosPct)}
          helper="Kenaikan ≥ 10%"
        />
      </section>

      {/* Tenant checklist — roster MID × survey status */}
      <section
        aria-label="Checklist tenant"
        className="ui-dashboard-surface overflow-hidden"
      >
        <div className="ui-dashboard-muted flex flex-col gap-3 border-b border-black/[0.04] px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/50 dark:text-brand-primary-400">
              <Store className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Checklist tenant
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {filter.eventId === 'all'
                  ? 'Status isi survey (semua event di filter)'
                  : `Status isi untuk: ${eventLabel}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['pending', 'done', 'all'] as const).map((tab) => {
              const count =
                tab === 'pending'
                  ? checklistStats.pending
                  : tab === 'done'
                    ? checklistStats.done
                    : checklistStats.total;
              const active = rosterTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRosterTab(tab)}
                  className={`ui-focus-ring rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-brand-primary-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab === 'pending' ? 'Belum isi' : tab === 'done' ? 'Sudah isi' : 'Semua'}
                  <span className={`ml-1 tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            <div className="relative min-w-[140px] flex-1 sm:max-w-[200px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={rosterQ}
                onChange={(e) => setRosterQ(e.target.value)}
                placeholder="Cari tenant…"
                className="ui-focus-ring w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {rosterLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-primary-500" aria-hidden />
            Memuat daftar tenant…
          </div>
        ) : rosterError && roster.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500">{rosterError}</p>
        ) : checklistView.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500">
            Tidak ada tenant di tab ini{rosterQ ? ' / hasil pencarian' : ''}.
          </p>
        ) : (
          <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {checklistView.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    t.filled
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                  title={t.filled ? 'Sudah isi' : 'Belum isi'}
                  aria-label={t.filled ? 'Sudah isi' : 'Belum isi'}
                >
                  {t.filled ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <CircleDashed className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                {t.logo ? (
                  <img
                    src={t.logo}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-600"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 dark:border-slate-600 dark:bg-slate-800">
                    {(t.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {[t.floor, t.lot].filter(Boolean).join(' · ') || '—'}
                    {t.category ? ` · ${t.category}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    t.filled
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {t.filled ? 'Sudah' : 'Belum'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {agg.total === 0 ? (
        <div className="ui-empty-panel px-6 py-14">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Inbox className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Belum ada data sesuai filter
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Hanya menampilkan survey v3 yang sudah submitted/reviewed. Longgarkan filter atau tunggu
            submisi baru.
          </p>
          {filterDirty && (
            <button
              type="button"
              onClick={resetFilter}
              className="ui-focus-ring mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Distributions */}
          <section aria-label="Distribusi" className="grid gap-3 lg:grid-cols-2">
            <DistBars
              title="Traffic"
              icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
              dist={agg.trafficDist}
              total={agg.total}
              colorMap={TRAFFIC_COLORS}
            />
            <DistBars
              title="Sales"
              icon={<DollarSign className="h-3.5 w-3.5" aria-hidden />}
              dist={agg.salesDist}
              total={agg.total}
              colorMap={SALES_COLORS}
            />
            <DistBars
              title="Kategori"
              icon={<Tag className="h-3.5 w-3.5" aria-hidden />}
              dist={agg.kategoriDist}
              total={agg.total}
            />
            <DistBars
              title="Zona"
              icon={<MapPin className="h-3.5 w-3.5" aria-hidden />}
              dist={agg.zonaDist}
              total={agg.total}
            />
          </section>

          {/* Top + cross-tab */}
          <section className="grid gap-3 lg:grid-cols-2">
            <div className="ui-dashboard-surface overflow-hidden">
              <div className="ui-dashboard-muted border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  Top Gerai
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Skor = sinyal traffic+ dan sales+
                </p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/80">
                {agg.topGerai.map((g, i) => (
                  <div
                    key={g.nama_gerai}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                        i === 0
                          ? 'bg-brand-primary-500 text-white'
                          : i < 3
                            ? 'bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/50 dark:text-brand-primary-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {g.nama_gerai}
                      </p>
                      <p className="text-[11px] text-slate-400">{g.count} respons</p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-slate-500 dark:text-slate-400">
                      <p>
                        T+ {g.trafficPos} · S+ {g.salesPos}
                      </p>
                      <p className="font-bold text-brand-primary-600 dark:text-brand-primary-400">
                        skor {g.score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ui-dashboard-surface overflow-hidden">
              <div className="ui-dashboard-muted border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  Kategori × Sales
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400">Cross-tab frekuensi</p>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="ui-dashboard-muted border-b border-black/[0.04] text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th scope="col" className="px-4 py-2 font-semibold">
                        Kategori
                      </th>
                      <th scope="col" className="px-2 py-2 font-semibold">
                        Sales
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">
                        N
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agg.crossTab.slice(0, 15).map((c, idx) => (
                      <tr
                        key={`${c.kategori}-${c.sales}`}
                        className={`border-b border-slate-50 dark:border-slate-800/80 ${
                          idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                        } hover:bg-brand-primary-50/40 dark:hover:bg-brand-primary-950/20`}
                      >
                        <td className="max-w-[140px] truncate px-4 py-2 text-slate-700 dark:text-slate-300">
                          {c.kategori}
                        </td>
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{c.sales}</td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                          {c.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Trend */}
          <TenantSurveyTrendChart eventFilter={trendEventId} />

          {/* Feedback wall */}
          <section className="ui-dashboard-surface overflow-hidden" aria-labelledby="feedback-heading">
            <div className="ui-dashboard-muted flex flex-col gap-2.5 border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/50 dark:text-brand-primary-400">
                  <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                </span>
                <h3
                  id="feedback-heading"
                  className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200"
                >
                  Feedback Gerai
                  <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-400">
                    ({feedbackFiltered.length})
                  </span>
                </h3>
              </div>
              <div className="relative max-w-xs flex-1">
                <label htmlFor="feedback-search" className="sr-only">
                  Cari feedback atau gerai
                </label>
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  id="feedback-search"
                  type="search"
                  value={feedbackQ}
                  onChange={(e) => setFeedbackQ(e.target.value)}
                  placeholder="Cari feedback / gerai…"
                  className={`${FIELD} py-1.5 pl-8 pr-3`}
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto p-3 sm:p-4">
              {feedbackFiltered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                  <MessageSquareText
                    className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600"
                    aria-hidden
                  />
                  <p className="mt-2 text-xs font-medium text-slate-500">Tidak ada feedback teks</p>
                </div>
              ) : (
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {feedbackFiltered.slice(0, 50).map((f) => (
                    <li
                      key={f.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 dark:border-slate-700/80 dark:bg-slate-800/40"
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-brand-primary-700 dark:text-brand-primary-300">
                          {f.gerai}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="truncate">
                          {eventMap.get(f.event_id) || f.event_id}
                        </span>
                      </div>
                      <p className="line-clamp-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        <span className="mr-0.5 text-lg leading-none text-brand-primary-300 dark:text-brand-primary-700">
                          “
                        </span>
                        {f.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Detail table */}
          <section className="ui-dashboard-surface overflow-hidden" aria-labelledby="detail-heading">
            <div className="ui-dashboard-muted border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
              <h3
                id="detail-heading"
                className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200"
              >
                Detail Respons
                <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-400">
                  ({agg.rows.length})
                </span>
              </h3>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="ui-dashboard-muted border-b border-black/[0.04] text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Gerai
                    </th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">
                      Event
                    </th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">
                      Zona
                    </th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">
                      Kategori
                    </th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">
                      Traffic
                    </th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">
                      Sales
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agg.rows.slice(0, 100).map((s: TenantEventSurvey, idx) => (
                    <tr
                      key={s.id}
                      className={`border-b border-slate-50 transition dark:border-slate-800/80 ${
                        idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-800/25' : ''
                      } hover:bg-brand-primary-50/50 dark:hover:bg-brand-primary-950/20`}
                    >
                      <td className="max-w-[140px] truncate px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                        {s.nama_gerai || s.tenant_name || '—'}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2 text-slate-600 dark:text-slate-400">
                        {eventMap.get(s.event_id) || s.event_id}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400">
                        {s.lokasi_zona || '—'}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-slate-600 dark:text-slate-400">
                        {s.kategori || '—'}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400">
                        {s.kenaikan_traffic || '—'}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400">
                        {s.kenaikan_sales || '—'}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {agg.rows.length > 100 && (
              <p className="border-t border-black/[0.04] px-4 py-2 text-[11px] text-slate-400 dark:border-slate-700">
                Menampilkan 100 dari {agg.rows.length} baris
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
