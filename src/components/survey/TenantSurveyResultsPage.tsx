import { useMemo, useState, useCallback } from 'react';
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

interface Props {
  events: EventItem[];
  canExport?: boolean;
}

function DistBars({ title, icon, dist, total }: { title: string; icon: React.ReactNode; dist: DistMap; total: number }) {
  const max = Math.max(1, ...dist.labels.map((l) => dist.counts[l] || 0));
  return (
    <div className="ui-dashboard-surface p-4">
      <div className="mb-3 flex items-center gap-2 text-brand-primary-600 dark:text-brand-primary-400">
        {icon}
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="space-y-2">
        {dist.labels.map((label) => {
          const n = dist.counts[label] || 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          const w = Math.round((n / max) * 100);
          return (
            <div key={label}>
              <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-slate-600 dark:text-slate-300">{label}</span>
                <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">
                  {n} · {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-teal-400/90 transition-all duration-500 dark:bg-teal-500/80"
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
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'bad'
          ? 'text-red-600 dark:text-red-400'
          : 'text-slate-800 dark:text-slate-100';
  return (
    <div className="ui-dashboard-surface p-4">
      <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
        {icon}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function pctTone(n: number): 'good' | 'warn' | 'bad' | 'neutral' {
  if (n <= 0) return 'neutral';
  if (n >= 60) return 'good';
  if (n >= 30) return 'warn';
  return 'bad';
}

export default function TenantSurveyResultsPage({ events, canExport = true }: Props) {
  const { surveys, isLoading, error } = useTenantSurveys();
  const [filter, setFilter] = useState<ResultsFilter>(EMPTY_FILTER);
  const [feedbackQ, setFeedbackQ] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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
      <div className="flex items-center justify-center py-16 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Memuat hasil evaluasi tenant…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hasil Evaluasi Tenant</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Analisa dampak event ke gerai · read-only · tanpa data PIC
          </p>
        </div>
        {canExport && (
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting || agg.total === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export PDF
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
      {exportError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {exportError}
        </div>
      )}

      {/* Filters */}
      <div className="ui-dashboard-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Filter</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block text-xs">
            <span className="mb-1 block text-slate-500">Event</span>
            <select
              value={filter.eventId}
              onChange={(e) => setField('eventId', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">Semua event</option>
              {eventOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-500">Dari tanggal</span>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setField('dateFrom', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-500">Sampai tanggal</span>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setField('dateTo', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-500">Zona</span>
            <select
              value={filter.zona}
              onChange={(e) => setField('zona', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">Semua zona</option>
              {SURVEY_OPTIONS.lokasi_zona.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-500">Kategori</span>
            <select
              value={filter.kategori}
              onChange={(e) => setField('kategori', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">Semua kategori</option>
              {SURVEY_OPTIONS.kategori.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-500">Status</span>
            <select
              value={filter.status}
              onChange={(e) => setField('status', e.target.value as ResultsFilter['status'])}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">Submitted + Reviewed</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Submisi (v3)" value={agg.total} icon={<BarChart3 className="h-4 w-4" />} />
        <KpiCard label="Gerai Unik" value={agg.uniqueGerai} icon={<Store className="h-4 w-4" />} />
        <KpiCard
          label="Traffic Positif"
          value={agg.total > 0 ? `${agg.trafficPosPct}%` : '—'}
          icon={<TrendingUp className="h-4 w-4" />}
          tone={pctTone(agg.trafficPosPct)}
        />
        <KpiCard
          label="Sales Positif"
          value={agg.total > 0 ? `${agg.salesPosPct}%` : '—'}
          icon={<DollarSign className="h-4 w-4" />}
          tone={pctTone(agg.salesPosPct)}
        />
      </div>

      {agg.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-500">Belum ada data sesuai filter</p>
          <p className="mt-1 text-xs text-slate-400">Hanya menampilkan survey v3 yang sudah submitted/reviewed</p>
        </div>
      ) : (
        <>
          {/* Distributions */}
          <div className="grid gap-4 lg:grid-cols-2">
            <DistBars title="Traffic" icon={<TrendingUp className="h-4 w-4" />} dist={agg.trafficDist} total={agg.total} />
            <DistBars title="Sales" icon={<DollarSign className="h-4 w-4" />} dist={agg.salesDist} total={agg.total} />
            <DistBars title="Kategori" icon={<Tag className="h-4 w-4" />} dist={agg.kategoriDist} total={agg.total} />
            <DistBars title="Zona" icon={<MapPin className="h-4 w-4" />} dist={agg.zonaDist} total={agg.total} />
          </div>

          {/* Top + cross-tab */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="ui-dashboard-surface">
              <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Top Gerai</h3>
                <p className="text-[11px] text-slate-400">Skor = jumlah sinyal traffic+ dan sales+</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {agg.topGerai.map((g, i) => (
                  <div key={g.nama_gerai} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{g.nama_gerai}</p>
                      <p className="text-[11px] text-slate-400">{g.count} respons</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <p>T+ {g.trafficPos} · S+ {g.salesPos}</p>
                      <p className="font-bold text-teal-600 dark:text-teal-400">skor {g.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ui-dashboard-surface overflow-x-auto">
              <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Kategori × Sales</h3>
                <p className="text-[11px] text-slate-400">Cross-tab frekuensi</p>
              </div>
              <table className="w-full min-w-[320px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 dark:border-slate-700">
                    <th className="px-4 py-2 font-medium">Kategori</th>
                    <th className="px-2 py-2 font-medium">Sales</th>
                    <th className="px-4 py-2 font-medium text-right">N</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.crossTab.slice(0, 15).map((c) => (
                    <tr key={`${c.kategori}-${c.sales}`} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="max-w-[140px] truncate px-4 py-2 text-slate-700 dark:text-slate-300">{c.kategori}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{c.sales}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-slate-200">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trend (component owns its surface + data fetch) */}
          <TenantSurveyTrendChart eventFilter={trendEventId} />

          {/* Feedback wall */}
          <div className="ui-dashboard-surface">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Feedback Gerai ({feedbackFiltered.length})
                </h3>
              </div>
              <div className="relative max-w-xs flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={feedbackQ}
                  onChange={(e) => setFeedbackQ(e.target.value)}
                  placeholder="Cari feedback / gerai…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
              {feedbackFiltered.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">Tidak ada feedback teks</p>
              ) : (
                feedbackFiltered.slice(0, 50).map((f) => (
                  <div key={f.id} className="px-4 py-3">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{f.gerai}</span>
                      <span>·</span>
                      <span>{eventMap.get(f.event_id) || f.event_id}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{f.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail table */}
          <div className="ui-dashboard-surface overflow-x-auto">
            <div className="border-b border-slate-200 p-4 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Detail Respons ({agg.rows.length})
              </h3>
            </div>
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 dark:border-slate-700">
                  <th className="px-4 py-2 font-medium">Gerai</th>
                  <th className="px-2 py-2 font-medium">Event</th>
                  <th className="px-2 py-2 font-medium">Zona</th>
                  <th className="px-2 py-2 font-medium">Kategori</th>
                  <th className="px-2 py-2 font-medium">Traffic</th>
                  <th className="px-2 py-2 font-medium">Sales</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {agg.rows.slice(0, 100).map((s: TenantEventSurvey) => (
                  <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="max-w-[140px] truncate px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                      {s.nama_gerai || s.tenant_name || '—'}
                    </td>
                    <td className="max-w-[140px] truncate px-2 py-2 text-slate-600 dark:text-slate-400">
                      {eventMap.get(s.event_id) || s.event_id}
                    </td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{s.lokasi_zona || '—'}</td>
                    <td className="max-w-[120px] truncate px-2 py-2 text-slate-600 dark:text-slate-400">{s.kategori || '—'}</td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{s.kenaikan_traffic || '—'}</td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{s.kenaikan_sales || '—'}</td>
                    <td className="px-4 py-2 capitalize text-slate-500">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agg.rows.length > 100 && (
              <p className="px-4 py-2 text-[11px] text-slate-400">Menampilkan 100 dari {agg.rows.length} baris</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
