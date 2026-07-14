import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import {
  ClipboardCheck, Clock, CheckCircle, Eye, Edit, Send,
  AlertCircle, Star, Store, MapPin, Tag, TrendingUp, DollarSign,
  User, Phone, Search, ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react';
import type { TenantEventSurvey, EventItem, TenantSurveyStatus } from '../../types';
import { isV3Survey } from '../../utils/surveyUtils';

interface TenantSurveyListProps {
  surveys: TenantEventSurvey[];
  events: Array<Pick<EventItem, 'id' | 'acara' | 'dateStr' | 'status'>>;
  isLoading: boolean;
  error: string | null;
  onNewSurvey: (eventId: string) => void;
  onEditDraft: (survey: TenantEventSurvey) => void;
  onSubmitDraft: (id: string) => Promise<void>;
  onViewDetail: (survey: TenantEventSurvey) => void;
  onRefresh: () => void;
}

const PAGE_SIZE = 12;

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  submitted: {
    label: 'Terkirim',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  reviewed: {
    label: 'Direview',
    icon: Eye,
    color: 'bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300',
    dot: 'bg-brand-primary-500',
  },
} as const;

const STATUS_TABS: Array<{ key: TenantSurveyStatus | 'all'; label: string; dot?: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'draft', label: 'Draft', dot: 'bg-amber-500' },
  { key: 'submitted', label: 'Terkirim', dot: 'bg-emerald-500' },
  { key: 'reviewed', label: 'Direview', dot: 'bg-brand-primary-500' },
];

function ratingColor(n: number | null | undefined): string {
  if (n == null) return 'text-slate-400';
  if (n >= 4) return 'text-emerald-500';
  if (n >= 3) return 'text-yellow-500';
  return 'text-red-500';
}

function StatusBadge({ status }: { status: TenantSurveyStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function tenantLabel(survey: TenantEventSurvey): string {
  if (isV3Survey(survey)) return survey.nama_gerai || survey.tenant_name || '—';
  return survey.tenant_name || survey.tenant_organization || '—';
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TenantSurveyList({
  surveys,
  events,
  isLoading,
  error,
  onNewSurvey,
  onEditDraft,
  onSubmitDraft,
  onViewDetail,
  onRefresh,
}: TenantSurveyListProps) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [eventQuery, setEventQuery] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantSurveyStatus | 'all'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [kategoriFilter, setKategoriFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const counts = useMemo(() => {
    let draft = 0;
    let submitted = 0;
    let reviewed = 0;
    const gerai = new Set<string>();
    for (const s of surveys) {
      if (s.status === 'draft') draft += 1;
      else if (s.status === 'submitted') submitted += 1;
      else if (s.status === 'reviewed') reviewed += 1;
      const label = tenantLabel(s);
      if (label && label !== '—') gerai.add(label.toLowerCase());
    }
    return { total: surveys.length, draft, submitted, reviewed, gerai: gerai.size };
  }, [surveys]);

  const eventsInData = useMemo(() => {
    const ids = new Set(surveys.map((s) => s.event_id));
    return events.filter((e) => ids.has(e.id));
  }, [surveys, events]);

  const kategoriInData = useMemo(() => {
    const set = new Set<string>();
    for (const s of surveys) {
      if (s.kategori) set.add(s.kategori);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [surveys]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = surveys;

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (eventFilter !== 'all') {
      result = result.filter((s) => s.event_id === eventFilter);
    }
    if (kategoriFilter !== 'all') {
      result = result.filter((s) => s.kategori === kategoriFilter);
    }
    if (q) {
      result = result.filter((s) => {
        const ev = eventMap.get(s.event_id);
        const hay = [
          tenantLabel(s),
          s.tenant_organization,
          s.pic_name,
          s.pic_phone,
          s.kategori,
          s.lokasi_zona,
          s.kenaikan_traffic,
          s.kenaikan_sales,
          ev?.acara,
          ev?.dateStr,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return [...result].sort((a, b) => {
      const ta = new Date(a.submitted_at || a.updated_at || a.created_at).getTime();
      const tb = new Date(b.submitted_at || b.updated_at || b.created_at).getTime();
      return tb - ta;
    });
  }, [surveys, statusFilter, eventFilter, kategoriFilter, search, eventMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, eventFilter, kategoriFilter]);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    eventFilter !== 'all' ||
    kategoriFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setEventFilter('all');
    setKategoriFilter('all');
  }, []);

  const handleSubmitDraft = useCallback(
    async (id: string) => {
      setSubmittingId(id);
      setDraftError(null);
      try {
        await onSubmitDraft(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal mengirim draft';
        setDraftError(msg);
      } finally {
        setSubmittingId(null);
      }
    },
    [onSubmitDraft],
  );

  // Admin draft picker: events that still have no admin-owned survey row.
  // Public v3 responses share event_id; still allow picker if only public rows exist.
  const availableEvents = useMemo(() => {
    return events
      .filter((ev) => {
        const forEvent = surveys.filter((s) => s.event_id === ev.id);
        if (forEvent.length === 0) return true;
        // Hide only when a non-public (admin/v2) survey already exists for event
        return forEvent.every((s) => isV3Survey(s));
      })
      .filter((ev) => {
        const q = eventQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          (ev.acara || '').toLowerCase().includes(q) ||
          (ev.dateStr || '').toLowerCase().includes(q)
        );
      });
  }, [events, surveys, eventQuery]);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="h-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{error}</p>
            <button type="button" onClick={onRefresh} className="mt-1 cursor-pointer underline hover:no-underline">
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total" value={counts.total} icon={<ClipboardCheck className="h-4 w-4" />} />
        <KpiCard label="Draft" value={counts.draft} icon={<Clock className="h-4 w-4" />} accent="amber" />
        <KpiCard label="Terkirim" value={counts.submitted} icon={<CheckCircle className="h-4 w-4" />} accent="emerald" />
        <KpiCard label="Gerai unik" value={counts.gerai} icon={<Store className="h-4 w-4" />} accent="brand" />
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari gerai, event, PIC, kategori…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEventPicker(!showEventPicker)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-500 sm:w-auto"
            >
              <ClipboardCheck className="h-4 w-4" />
              Buat Self-Assessment
            </button>

            {showEventPicker && (
              <div className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:w-80">
                <input
                  type="search"
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                  placeholder="Cari event…"
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-primary-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                />
                {availableEvents.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {eventQuery.trim()
                      ? `Tidak ada event cocok "${eventQuery}"`
                      : 'Tidak ada event tersedia untuk draft admin'}
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {availableEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          onNewSurvey(ev.id);
                          setShowEventPicker(false);
                          setEventQuery('');
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <span className="flex-1 truncate text-slate-800 dark:text-slate-200">{ev.acara}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {ev.status === 'past' ? 'past' : ev.status === 'ongoing' ? 'live' : ev.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === 'all'
                ? counts.total
                : tab.key === 'draft'
                  ? counts.draft
                  : tab.key === 'submitted'
                    ? counts.submitted
                    : counts.reviewed;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                aria-pressed={statusFilter === tab.key}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === tab.key
                    ? 'bg-brand-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {tab.dot && (
                  <span
                    className={`h-2 w-2 rounded-full ${statusFilter === tab.key ? 'bg-white/80' : tab.dot}`}
                  />
                )}
                {tab.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    statusFilter === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Semua event</option>
            {eventsInData.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.acara}
              </option>
            ))}
          </select>

          {kategoriInData.length > 0 && (
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="all">Semua kategori</option>
              {kategoriInData.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3 w-3" />
              Reset filter
            </button>
          )}

          <span className="ml-auto text-[11px] tabular-nums text-slate-400">
            {filtered.length} dari {counts.total} response
          </span>
        </div>
      </div>

      {draftError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {draftError}
        </div>
      )}

      {/* Empty */}
      {surveys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Belum ada self-assessment
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Aktifkan form public per event, atau buat draft admin di atas
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
          <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Tidak ada hasil filter
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 cursor-pointer text-xs font-semibold text-brand-primary-600 underline hover:no-underline dark:text-brand-primary-400"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {pageItems.map((survey) => {
              const ev = eventMap.get(survey.event_id);
              const v3 = isV3Survey(survey);
              return (
                <div
                  key={survey.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                        {tenantLabel(survey)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {ev?.acara || survey.event_id}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={survey.status} />
                      {v3 && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          Publik
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {v3 ? (
                      <>
                        {survey.kategori && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {survey.kategori}
                          </span>
                        )}
                        {survey.kenaikan_traffic && (
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {survey.kenaikan_traffic}
                          </span>
                        )}
                        {survey.kenaikan_sales && (
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {survey.kenaikan_sales}
                          </span>
                        )}
                      </>
                    ) : (
                      survey.overall_rating != null && (
                        <span className={`inline-flex items-center gap-1 font-semibold ${ratingColor(survey.overall_rating)}`}>
                          <Star className="h-3 w-3 fill-current" />
                          {survey.overall_rating}/5
                        </span>
                      )
                    )}
                    <span>{formatShortDate(survey.submitted_at || survey.created_at)}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionBtn onClick={() => onViewDetail(survey)} icon={Eye} label="Detail" />
                    {survey.status === 'draft' && (
                      <>
                        <ActionBtn onClick={() => onEditDraft(survey)} icon={Edit} label="Edit" />
                        <ActionBtn
                          onClick={() => handleSubmitDraft(survey.id)}
                          icon={Send}
                          label={submittingId === survey.id ? '…' : 'Kirim'}
                          primary
                          disabled={submittingId === survey.id}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    <th className="px-4 py-3">Gerai / Tenant</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Impact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {pageItems.map((survey) => {
                    const ev = eventMap.get(survey.event_id);
                    const v3 = isV3Survey(survey);
                    return (
                      <tr
                        key={survey.id}
                        className="group cursor-pointer transition hover:bg-brand-primary-50/40 dark:hover:bg-brand-primary-950/20"
                        onClick={() => onViewDetail(survey)}
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                              {tenantLabel(survey)}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {v3 ? (
                                <>
                                  {survey.lokasi_zona && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {survey.lokasi_zona}
                                    </span>
                                  )}
                                  {survey.kategori && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <Tag className="h-3 w-3" />
                                      {survey.kategori}
                                    </span>
                                  )}
                                  {survey.pic_name && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <User className="h-3 w-3" />
                                      {survey.pic_name}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {survey.tenant_organization && (
                                    <span>{survey.tenant_organization}</span>
                                  )}
                                  {survey.pic_phone && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <Phone className="h-3 w-3" />
                                      {survey.pic_phone}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-[14rem] truncate text-slate-700 dark:text-slate-300">
                            {ev?.acara || survey.event_id}
                          </p>
                          <p className="text-[11px] text-slate-400">{ev?.dateStr || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          {v3 ? (
                            <div className="space-y-0.5 text-[11px]">
                              <p className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <TrendingUp className="h-3 w-3 text-slate-400" />
                                {survey.kenaikan_traffic || '—'}
                              </p>
                              <p className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <DollarSign className="h-3 w-3 text-slate-400" />
                                {survey.kenaikan_sales || '—'}
                              </p>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${ratingColor(survey.overall_rating)}`}>
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {survey.overall_rating != null ? `${survey.overall_rating}/5` : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge status={survey.status} />
                            {v3 && (
                              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                Publik
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {formatShortDate(survey.submitted_at || survey.created_at)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <ActionBtn onClick={() => onViewDetail(survey)} icon={Eye} label="Detail" compact />
                            {survey.status === 'draft' && (
                              <>
                                <ActionBtn onClick={() => onEditDraft(survey)} icon={Edit} label="Edit" compact />
                                <ActionBtn
                                  onClick={() => handleSubmitDraft(survey.id)}
                                  icon={Send}
                                  label={submittingId === survey.id ? '…' : 'Kirim'}
                                  primary
                                  compact
                                  disabled={submittingId === survey.id}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Halaman {safePage} / {totalPages}
                  <span className="ml-1 text-slate-400">
                    · {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari{' '}
                    {filtered.length}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Sebelum
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Berikut
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between md:hidden">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Sebelum
              </button>
              <span className="text-xs tabular-nums text-slate-500">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
              >
                Berikut
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent = 'slate',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: 'slate' | 'amber' | 'emerald' | 'brand';
}) {
  const iconColor = {
    slate: 'text-brand-primary-500 dark:text-brand-primary-400',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    brand: 'text-brand-primary-500 dark:text-brand-primary-400',
  }[accent];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800">
      <div className={`flex items-center gap-2 ${iconColor}`}>
        {icon}
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  primary = false,
  compact = false,
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-lg bg-brand-primary-600 font-semibold text-white transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
      >
        <Icon className="h-3 w-3" />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
