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
  Share2,
  CalendarDays,
  ChevronDown,
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
} from '../../utils/tenantSurveyResultsAggregate';
import { downloadTenantSurveyResultsPdf } from '../../utils/tenantSurveyResultsPdf';
import {
  fetchPublicTenantRoster,
  type TenantRosterItem,
} from '../../utils/supabaseApi';
import { usePageMeta } from '../../utils/pageMeta';
import {
  FIELD,
  TRAFFIC_COLORS,
  SALES_COLORS,
  DistBars,
  KpiCard,
  StatusBadge,
  pctTone,
  isFilterActive,
  ResultsReadingGuide,
  EventFilterSearch,
  EventShareRow,
  type EventFilterOption,
} from './TenantSurveyResultsParts';

interface Props {
  events: EventItem[];
  canExport?: boolean;
  /** Use rate-limited public APIs (no login). Default true for standalone page. */
  publicMode?: boolean;
}

type RosterTab = 'all' | 'done' | 'pending';

export default function TenantSurveyResultsPage({
  events,
  canExport = false,
  publicMode = true,
}: Props) {
  usePageMeta({
    title: 'Hasil Survey Tenant — Metropolitan Mall Bekasi',
    description: 'Hasil survey traffic dan sales tenant setelah event di Metropolitan Mall Bekasi.',
  });
  const { surveys, isLoading, error } = useTenantSurveys(undefined, { publicMode });
  const [filter, setFilter] = useState<ResultsFilter>(EMPTY_FILTER);
  const [feedbackQ, setFeedbackQ] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [roster, setRoster] = useState<TenantRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState('');
  const [rosterTab, setRosterTab] = useState<RosterTab>('pending');
  const [rosterQ, setRosterQ] = useState('');
  const [shareSearch, setShareSearch] = useState('');
  /** Main content tabs — avoids infinite scroll of every section */
  type MainTab = 'ringkasan' | 'checklist' | 'bagikan' | 'detail';
  const [mainTab, setMainTab] = useState<MainTab>('ringkasan');
  /** Mobile: keep secondary filters collapsed so sticky bar stays short */
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRosterLoading(true);
    setRosterError('');
    void fetchPublicTenantRoster().then((list) => {
      if (cancelled) return;
      setRoster(list);
      setRosterLoading(false);
      if (list.length === 0) {
        setRosterError('Roster tenant kosong atau gagal dimuat. Coba refresh sebentar lagi.');
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

  /** Events that can host public survey form (ongoing + past), with names. */
  const shareableEvents = useMemo(() => {
    const list = events
      .filter((e) => e.status === 'past' || e.status === 'ongoing')
      .slice()
      .sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || ''));

    // Fallback: event_id from surveys not yet in events prop (e.g. partial load)
    const known = new Set(list.map((e) => e.id));
    for (const s of surveys) {
      if (known.has(s.event_id)) continue;
      const found = events.find((e) => e.id === s.event_id);
      if (found) {
        list.push(found);
        known.add(found.id);
        continue;
      }
      // Minimal stub so share row still shows when only survey data loaded
      list.push({
        id: s.event_id,
        acara: `Event ${s.event_id.slice(0, 8)}…`,
        status: 'past',
        dateStr: '',
        tanggal: '',
        day: '',
        jam: '',
        lokasi: '',
        eo: '',
        pic: '',
        phone: '',
        keterangan: '',
        month: '',
        category: '',
        categories: [],
        priority: 'medium',
        eventModel: '',
        eventNominal: '',
        eventModelNotes: '',
        rowIndex: 0,
      } as EventItem);
      known.add(s.event_id);
    }
    return list;
  }, [events, surveys]);

  const responseCountByEvent = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of surveys) {
      if (s.status !== 'submitted' && s.status !== 'reviewed') continue;
      m.set(s.event_id, (m.get(s.event_id) || 0) + 1);
    }
    return m;
  }, [surveys]);

  const eventOptions = useMemo((): EventFilterOption[] => {
    // Prefer shareable list so filter shows event names even before responses exist
    const byId = new Map(shareableEvents.map((e) => [e.id, e]));
    for (const s of surveys) {
      if (!byId.has(s.event_id)) {
        const found = events.find((e) => e.id === s.event_id);
        if (found) byId.set(found.id, found);
      }
    }
    return [...byId.values()]
      .map((e) => ({
        id: e.id,
        label: e.acara,
        status: e.status,
        dateStr: e.dateStr || '',
      }))
      // Newest first (dateStr desc); ongoing before past on same day
      .sort((a, b) => {
        const d = (b.dateStr || '').localeCompare(a.dateStr || '');
        if (d !== 0) return d;
        if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
        if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
        return a.label.localeCompare(b.label, 'id');
      });
  }, [shareableEvents, surveys, events]);

  const selectedEvent = useMemo(() => {
    if (filter.eventId === 'all') return null;
    return (
      events.find((e) => e.id === filter.eventId) ||
      shareableEvents.find((e) => e.id === filter.eventId) ||
      null
    );
  }, [events, shareableEvents, filter.eventId]);

  const shareList = useMemo(() => {
    const q = shareSearch.trim().toLowerCase();
    const list =
      filter.eventId !== 'all' && selectedEvent
        ? [selectedEvent]
        : shareableEvents;
    if (!q) return list;
    return list.filter((e) => e.acara.toLowerCase().includes(q));
  }, [filter.eventId, selectedEvent, shareableEvents, shareSearch]);

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
      : selectedEvent?.acara || eventMap.get(filter.eventId) || filter.eventId;

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
        label: filter.status === 'submitted' ? 'Telah dikirim' : 'Telah ditinjau',
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
        <p className="text-xs text-slate-500">Memuat data survey…</p>
      </div>
    );
  }

  const filterDirty = isFilterActive(filter);

  const mainTabs: Array<{ id: MainTab; label: string; shortLabel: string; count?: number }> = [
    { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkas', count: agg.total },
    { id: 'checklist', label: 'Checklist tenant', shortLabel: 'Checklist', count: checklistStats.pending },
    { id: 'bagikan', label: 'Bagikan form survey', shortLabel: 'Bagikan', count: shareableEvents.length },
    { id: 'detail', label: 'Detail', shortLabel: 'Detail', count: agg.rows.length },
  ];

  const advancedFilterCount =
    (filter.dateFrom ? 1 : 0) +
    (filter.dateTo ? 1 : 0) +
    (filter.zona !== 'all' ? 1 : 0) +
    (filter.kategori !== 'all' ? 1 : 0) +
    (filter.status !== 'all' ? 1 : 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Report header — compact */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Hasil Evaluasi Tenant
          </h1>
          {selectedEvent ? (
            <p className="mt-1">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-primary-50 px-2.5 py-0.5 text-xs font-semibold text-brand-primary-800 dark:bg-brand-primary-950/50 dark:text-brand-primary-200">
                <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{selectedEvent.acara}</span>
              </span>
            </p>
          ) : null}
        </div>
        {canExport && (
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting || agg.total === 0}
            className="ui-btn-primary ui-focus-ring inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
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

      <ResultsReadingGuide />

      {/* Filter toolbar — overflow-visible so event dropdown is not clipped */}
      <section
        className="ui-dashboard-surface sticky top-[3.25rem] z-30 overflow-visible shadow-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--brand-card-light)_92%,transparent)] supports-[backdrop-filter]:backdrop-blur-md dark:supports-[backdrop-filter]:bg-slate-900/90"
        aria-labelledby="filter-heading"
      >
        <div className="ui-dashboard-muted flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.04] px-3 py-2 dark:border-slate-700 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
            <Filter className="h-3.5 w-3.5 shrink-0 text-brand-primary-500" aria-hidden />
            <h2 id="filter-heading" className="text-[11px] font-bold uppercase tracking-wide">
              Filter
            </h2>
            <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {agg.total}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {filterDirty && (
              <button
                type="button"
                onClick={resetFilter}
                className="ui-focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-primary-700 transition hover:bg-brand-primary-50 dark:text-brand-primary-300 dark:hover:bg-brand-primary-950/40"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="ui-focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:hidden"
              aria-expanded={filtersOpen}
            >
              Lanjutan
              {advancedFilterCount > 0 && (
                <span className="rounded-full bg-brand-primary-100 px-1.5 text-[10px] tabular-nums text-brand-primary-700 dark:bg-brand-primary-900/50 dark:text-brand-primary-300">
                  {advancedFilterCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition ${filtersOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          </div>
        </div>

        <div className="space-y-2.5 p-3 sm:p-4">
          {/* Event always visible — primary control */}
          <div className="min-w-0">
            <span className="mb-1 block text-[11px] font-medium ui-text-muted">
              Event
            </span>
            <EventFilterSearch
              value={filter.eventId}
              options={eventOptions}
              onChange={(id) => setField('eventId', id)}
            />
          </div>

          {/* Secondary filters: collapsed on mobile by default */}
          <div
            className={`grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${
              filtersOpen ? 'grid' : 'hidden sm:grid'
            }`}
          >
            <label className="block min-w-0">
              <span className="mb-1 block text-[11px] font-medium ui-text-muted">
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
              <span className="mb-1 block text-[11px] font-medium ui-text-muted">
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
              <span className="mb-1 block text-[11px] font-medium ui-text-muted">
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
              <span className="mb-1 block text-[11px] font-medium ui-text-muted">
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
            <label className="block min-w-0 sm:col-span-2 xl:col-span-1">
              <span className="mb-1 block text-[11px] font-medium ui-text-muted">
                Status
              </span>
              <select
                value={filter.status}
                onChange={(e) => setField('status', e.target.value as ResultsFilter['status'])}
                className={FIELD}
              >
                <option value="all">Semua (telah dikirim)</option>
                <option value="submitted">Telah dikirim</option>
                <option value="reviewed">Telah ditinjau</option>
              </select>
            </label>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-black/[0.04] px-3 py-2 dark:border-slate-700 sm:px-4 sm:py-2.5">
            <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Aktif
            </span>
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => clearChip(c.key)}
                className="ui-focus-ring inline-flex max-w-[min(100%,14rem)] items-center gap-1 rounded-full bg-brand-primary-50 px-2 py-0.5 text-[11px] font-medium text-brand-primary-800 ring-1 ring-inset ring-brand-primary-200 transition hover:bg-brand-primary-100 dark:bg-brand-primary-950/40 dark:text-brand-primary-200 dark:ring-brand-primary-800 dark:hover:bg-brand-primary-900/40"
                title="Hapus filter ini"
              >
                <span className="truncate">{c.label}</span>
                <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* KPI strip — always 2×2 on phone */}
      <section aria-label="Ringkasan angka" className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
        <KpiCard
          label="Total Submisi"
          value={agg.total}
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          helper="Formulir yang telah dikirim"
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
              ? `${checklistStats.pending} belum mengisi`
              : 'Jumlah gerai yang menjawab'
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
          helper="Menyatakan pengunjung meningkat"
        />
        <KpiCard
          label="Sales Positif"
          value={agg.total > 0 ? `${agg.salesPosPct}%` : '—'}
          icon={<DollarSign className="h-4 w-4" aria-hidden />}
          tone={pctTone(agg.salesPosPct)}
          helper="Omzet meningkat minimal 10%"
        />
      </section>

      {/* Main tabs — short labels on phone */}
      <div
        role="tablist"
        aria-label="Bagian konten"
        className="grid grid-cols-4 gap-1 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/60"
      >
        {mainTabs.map((t) => {
          const active = mainTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMainTab(t.id)}
              className={`ui-focus-ring flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-center transition sm:flex-row sm:gap-1.5 sm:px-2 sm:text-sm ${
                active
                  ? 'bg-white text-brand-primary-800 shadow-sm dark:bg-slate-900 dark:text-brand-primary-200'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-200'
              }`}
            >
              <span className="max-w-full truncate text-[11px] font-semibold leading-tight sm:text-xs">
                <span className="sm:hidden">{t.shortLabel}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </span>
              {typeof t.count === 'number' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none ${
                    active
                      ? 'bg-brand-primary-50 text-brand-primary-700 dark:bg-brand-primary-950/50 dark:text-brand-primary-300'
: 'bg-slate-200/80 ui-text-muted dark:bg-slate-700 '
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: Bagikan */}
      {mainTab === 'bagikan' && (
      <section
        aria-labelledby="share-heading"
        className="ui-dashboard-surface overflow-hidden"
      >
        <div className="ui-dashboard-muted flex flex-col gap-3 border-b border-black/[0.04] px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/50 dark:text-brand-primary-400">
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div>
              <h2
                id="share-heading"
                className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200"
              >
                Bagikan form survey
              </h2>
              <p className="text-[11px] ui-text-muted">
                {selectedEvent
                  ? `Tautan dan kode QR formulir: ${selectedEvent.acara}`
                  : 'Salin tautan atau tampilkan QR, lalu kirim kepada tenant yang belum mengisi'}
              </p>
            </div>
          </div>
          {filter.eventId === 'all' && (
            <div className="relative min-w-[160px] sm:max-w-[220px] sm:flex-1">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                type="search"
                value={shareSearch}
                onChange={(e) => setShareSearch(e.target.value)}
                placeholder="Cari nama event…"
                className="ui-focus-ring w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                aria-label="Cari event untuk dibagikan"
              />
            </div>
          )}
        </div>

        {shareList.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs ui-text-muted">
            Tidak ada event ongoing/past untuk dibagikan
            {shareSearch ? ' / cocok pencarian' : ''}.
          </p>
        ) : (
          <div
            className={
              filter.eventId === 'all'
                ? 'max-h-[min(36rem,70vh)] overflow-y-auto overscroll-contain'
                : undefined
            }
          >
            {shareList.map((ev) => (
              <EventShareRow
                key={ev.id}
                event={ev}
                responseCount={responseCountByEvent.get(ev.id) || 0}
                defaultOpen={filter.eventId === ev.id || shareList.length === 1}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {/* Tab: Checklist */}
      {mainTab === 'checklist' && (
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
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Checklist tenant
              </h2>
              <p className="text-[11px] ui-text-muted">
                {filter.eventId === 'all'
                  ? 'Daftar tenant yang telah atau belum mengisi. Pilih satu event pada filter agar angkanya lebih akurat.'
                  : `Status pengisian untuk: ${eventLabel}`}
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
                  <span className={`ml-1 tabular-nums ${active ? 'text-white/80' : 'text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            <div className="relative min-w-[140px] flex-1 sm:max-w-[200px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden />
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
          <div className="flex items-center justify-center gap-2 py-10 text-sm ui-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-brand-primary-500" aria-hidden />
            Memuat daftar tenant…
          </div>
        ) : rosterError && roster.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs ui-text-muted">{rosterError}</p>
        ) : checklistView.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs ui-text-muted">
            Tidak ada tenant di tab ini{rosterQ ? ' / hasil pencarian' : ''}.
          </p>
        ) : (
          <ul className="max-h-[min(36rem,70dvh)] divide-y divide-slate-100 overflow-y-auto overscroll-contain dark:divide-slate-800">
            {checklistView.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-slate-50/80 dark:gap-3 dark:hover:bg-slate-800/40 sm:px-4"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    t.filled
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
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
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-800">
                    {(t.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t.name}
                  </p>
                  <p className="truncate text-[11px] ui-text-muted">
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
      )}

      {/* Tab: Ringkasan (charts) */}
      {mainTab === 'ringkasan' && (
        agg.total === 0 ? (
          <div className="ui-empty-panel px-6 py-14">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Inbox className="h-6 w-6 text-slate-500 dark:text-slate-300" aria-hidden />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Belum ada data sesuai filter
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs ui-text-muted">
              Tidak ada data yang sesuai filter. Longgarkan filter, buka Bagikan untuk mengirim
              formulir, atau Checklist untuk memeriksa partisipasi.
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
          <div className="space-y-4">
            <section aria-label="Distribusi" className="grid gap-3 lg:grid-cols-2">
              <DistBars
                title="Traffic"
                icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
                dist={agg.trafficDist}
                total={agg.total}
                colorMap={TRAFFIC_COLORS}
                hint="Hijau: pengunjung meningkat. Merah: menurun."
              />
              <DistBars
                title="Sales"
                icon={<DollarSign className="h-3.5 w-3.5" aria-hidden />}
                dist={agg.salesDist}
                total={agg.total}
                colorMap={SALES_COLORS}
                hint="Dihitung positif jika omzet meningkat minimal 10%"
              />
              <DistBars
                title="Kategori"
                icon={<Tag className="h-3.5 w-3.5" aria-hidden />}
                dist={agg.kategoriDist}
                total={agg.total}
                hint="Jenis gerai yang paling banyak mengisi"
              />
              <DistBars
                title="Zona"
                icon={<MapPin className="h-3.5 w-3.5" aria-hidden />}
                dist={agg.zonaDist}
                total={agg.total}
                hint="Lantai atau area lokasi gerai"
              />
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <div className="ui-dashboard-surface overflow-hidden">
                <div className="ui-dashboard-muted border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    Top Gerai
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Diurut berdasarkan frekuensi laporan kenaikan pengunjung atau omzet, bukan nilai omzet tertinggi
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
                        <p className="text-[11px] text-slate-500">{g.count} respons</p>
                      </div>
                        <div className="shrink-0 text-right text-[11px] ui-text-muted">
                        <p>
                          Traffic naik {g.trafficPos} · Omzet naik {g.salesPos}
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
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Jenis gerai yang paling sering melaporkan kenaikan omzet, beserta besarannya
                  </p>
                </div>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full min-w-[320px] text-left text-xs">
                    <thead className="sticky top-0 z-10">
<tr className="ui-dashboard-muted border-b border-black/[0.04] text-[10px] uppercase tracking-wide ui-text-muted dark:border-slate-700 ">
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
                          <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.sales}</td>
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

            <TenantSurveyTrendChart eventFilter={trendEventId} publicMode={publicMode} />
          </div>
        )
      )}

      {/* Tab: Detail (feedback + table) */}
      {mainTab === 'detail' && (
        <div className="space-y-4">
          <section className="ui-dashboard-surface overflow-hidden" aria-labelledby="feedback-heading">
            <div className="ui-dashboard-muted flex flex-col gap-2.5 border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/50 dark:text-brand-primary-400">
                  <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <h3
                    id="feedback-heading"
                    className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200"
                  >
                    Feedback Gerai
                    <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-500">
                      ({feedbackFiltered.length})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Komentar dari gerai. Perhatikan keluhan atau saran yang sering muncul.
                  </p>
                </div>
              </div>
              <div className="relative max-w-xs flex-1">
                <label htmlFor="feedback-search" className="sr-only">
                  Cari feedback atau gerai
                </label>
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
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
            <div className="max-h-[min(40rem,70dvh)] overflow-y-auto overscroll-contain p-2.5 sm:p-4">
              {feedbackFiltered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                  <MessageSquareText
                    className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600"
                    aria-hidden
                  />
                  <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-300">Tidak ada feedback teks</p>
                </div>
              ) : (
                <ul className="grid gap-2.5 sm:gap-3">
                  {feedbackFiltered.slice(0, 100).map((f) => (
                    <li
                      key={f.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-800/40 sm:px-3.5 sm:py-3"
                    >
                      <div className="mb-1.5 flex flex-col gap-0.5 text-[10px] text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5">
                        <span className="font-semibold text-brand-primary-700 dark:text-brand-primary-300">
                          {f.gerai}
                        </span>
                        <span className="hidden sm:inline" aria-hidden>
                          ·
                        </span>
                        <span className="truncate text-slate-500">
                          {eventMap.get(f.event_id) || f.event_id}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 sm:text-sm">
                        {f.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="ui-dashboard-surface overflow-hidden" aria-labelledby="detail-heading">
            <div className="ui-dashboard-muted border-b border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
              <h3
                id="detail-heading"
                className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200"
              >
                Detail Respons
                <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-500">
                  ({agg.rows.length})
                </span>
              </h3>
            </div>
            {/* Mobile cards + desktop table */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
              {agg.rows.slice(0, 100).map((s: TenantEventSurvey) => (
                <article key={s.id} className="space-y-1.5 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100 [overflow-wrap:anywhere]">
                      {s.nama_gerai || s.tenant_name || '—'}
                    </p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-[11px] ui-text-muted [overflow-wrap:anywhere]">
                    {eventMap.get(s.event_id) || s.event_id}
                  </p>
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <div>
                      <dt className="text-slate-500">Zona</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-300">{s.lokasi_zona || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Kategori</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-300 [overflow-wrap:anywhere]">
                        {s.kategori || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Traffic</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-300">{s.kenaikan_traffic || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Sales</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-300">{s.kenaikan_sales || '—'}</dd>
                    </div>
                  </dl>
                </article>
              ))}
              {agg.rows.length === 0 && (
                <p className="px-3 py-8 text-center text-xs ui-text-muted">Tidak ada respons</p>
              )}
            </div>
            <div className="hidden max-h-[28rem] overflow-auto sm:block">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="sticky top-0 z-10">
<tr className="ui-dashboard-muted border-b border-black/[0.04] text-[10px] uppercase tracking-wide ui-text-muted dark:border-slate-700 ">
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
                      <td className="max-w-[140px] truncate px-2 py-2 text-slate-600 dark:text-slate-300">
                        {eventMap.get(s.event_id) || s.event_id}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                        {s.lokasi_zona || '—'}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-slate-600 dark:text-slate-300">
                        {s.kategori || '—'}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                        {s.kenaikan_traffic || '—'}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
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
              <p className="border-t border-black/[0.04] px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700">
                Menampilkan 100 dari {agg.rows.length} baris
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
