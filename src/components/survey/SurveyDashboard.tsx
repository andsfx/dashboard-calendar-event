import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { downloadBlob } from '../../lib/download';
import {
  ClipboardCheck, Download, Star, Users, Building2,
  TrendingUp, Loader2, RefreshCw, Link2, Check,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight,
  MessageSquare, Calendar, AlertCircle, Search, ExternalLink,
} from 'lucide-react';
import { apiGet, apiPost } from '../../lib/rest';
import type { SurveyStatus } from '../../utils/api/surveysApi';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { NativeSelect } from '../shadcn/native-select';

// Base REST untuk download blob CSV (fetch native — apiGet meng-unwrap JSON).
const API_V1 = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '') + '/api/v1';

interface SurveyStats {
  total_responses: number;
  organizer_responses: number;
  public_responses: number;
  unique_events: number;
  mall_avg: {
    cleanliness: number;
    staff_service: number;
    coordination: number;
    security: number;
    overall: number;
  } | null;
  eo_avg: {
    event_quality: number;
    organization: number;
    committee_service: number;
    promotion_accuracy: number;
    recommendation: number;
    overall: number;
  } | null;
  nps_score: number | null;
  recent: Array<{
    id: string;
    event_id: string;
    survey_type: string;
    mall_cleanliness: number;
    mall_staff_service: number;
    mall_coordination: number;
    mall_security: number;
    eo_event_quality: number | null;
    eo_organization: number | null;
    eo_committee_service: number | null;
    eo_promotion_accuracy: number | null;
    eo_recommendation: number | null;
    respondent_name: string;
    respondent_email: string;
    mall_comment: string;
    eo_comment: string;
    general_comment: string;
    created_at: string;
  }>;
}

interface SurveyDashboardProps {
  events: Array<{ id: string; acara: string; status: string }>;
  /** Akun demo: hanya melihat. Toggle aktif/nonaktif survey disembunyikan. */
  readOnly?: boolean;
  /** Boleh unduh CSV (`/survey/export`): staff + viewer + eo_tenant. Demo tidak. */
  canExport?: boolean;
}

export function SurveyDashboard({ events, readOnly = false, canExport = false }: SurveyDashboardProps) {
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState<string | null>(null);
  const configLoadingRef = useRef<string | null>(null);
  const [activeConfigs, setActiveConfigs] = useState<Record<string, SurveyStatus>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  /** Error aksi (export/copy/toggle) — tidak menggantikan seluruh halaman. */
  const [actionError, setActionError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // GET /api/v1/survey/stats → data: { total_responses, mall_avg, eo_avg, ... }
      const data = await apiGet<SurveyStats>('/survey/stats');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ─── Hidrasi status discoverability per event (GET /survey/config) ──
  // `has_config=false` berarti event belum pernah diatur admin → CTA tetap
  // tampil seperti perilaku lama. Kegagalan fetch tidak menulis status palsu:
  // baris dibiarkan undefined supaya tetap dianggap "tampil".
  useEffect(() => {
    const surveyableIds = events
      .filter(e => e.status === 'past' || e.status === 'ongoing')
      .map(e => e.id);
    if (surveyableIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        surveyableIds.map(async (id) => {
          try {
            // Authenticated endpoint (tanpa rate-limit publik): dashboard bisa
            // punya ratusan event, jadi jangan memakai /survey/status yang
            // dibatasi 120 req/menit.
            const cfg = await apiGet<{ is_active?: boolean; has_config?: boolean }>(
              `/survey/config?event_id=${encodeURIComponent(id)}`,
            );
            return [id, {
              is_active: cfg?.is_active === true,
              // Rollout server lama belum mengirim has_config → pertahankan
              // perilaku lama (anggap sudah diatur) agar event nonaktif tidak
              // tiba-tiba tampil lagi.
              has_config: typeof cfg?.has_config === 'boolean' ? cfg.has_config : true,
            }] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setActiveConfigs(prev => {
        const next = { ...prev };
        for (const entry of entries) {
          if (!entry) continue;
          const [id, status] = entry;
          if (configLoadingRef.current === id) continue;
          next[id] = status;
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [events]);

  const handleExport = useCallback(async (eventId: string) => {
    setActionError('');
    try {
      // GET /api/v1/survey/export?event_id= — CSV blob (cookie auth).
      const res = await fetch(`${API_V1}/survey/export?event_id=${encodeURIComponent(eventId)}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setActionError('Gagal mengunduh CSV. Coba lagi, atau periksa koneksi internet.');
        return;
      }
      const blob = await res.blob();
      downloadBlob(blob, `survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      setActionError('Gagal mengunduh CSV. Coba lagi, atau periksa koneksi internet.');
    }
  }, []);

  const handleCopyLink = useCallback(async (eventId: string) => {
    const url = `${window.location.origin}/survey/${eventId}`;
    setActionError('');
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      setActionError('Gagal menyalin tautan. Salin manual dari address bar.');
    }
  }, []);

  const handleToggleConfig = useCallback(async (eventId: string, currentActive: boolean) => {
    setConfigLoading(eventId);
    configLoadingRef.current = eventId;
    setActionError('');
    try {
      // POST /api/v1/survey/config-set — upsert survey_config per event.
      const json = await apiPost<{ success: boolean; error?: string }>('/survey/config-set', {
        event_id: eventId,
        is_active: !currentActive,
      });
      if (json.success) {
        setActiveConfigs(prev => ({
          ...prev,
          [eventId]: { is_active: !currentActive, has_config: true },
        }));
      } else {
        setActionError(json.error || 'Gagal mengubah status survei.');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengubah status survei.');
    }
    finally { setConfigLoading(null); configLoadingRef.current = null; }
  }, []);

  // Filter recent by date range
  const filteredRecent = stats?.recent.filter(r => {
    if (!dateFrom && !dateTo) return true;
    const d = r.created_at.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  }) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--wf-accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="sr-only">Survei kepuasan</h2>
        <SurveyWorkflowBanner />
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-600/10 p-4 text-sm text-red-700 dark:border-red-800 dark:text-red-300"
        >
          <span className="min-w-0 flex-1">Ringkasan survei gagal dimuat: {error}</span>
          <Button variant="outline" onClick={fetchStats}>Coba lagi</Button>
        </div>
        <EventManagementSection
          events={events}
          copiedId={copiedId}
          onCopyLink={handleCopyLink}
          onExport={handleExport}
          onToggleConfig={handleToggleConfig}
          configLoading={configLoading}
          activeConfigs={activeConfigs}
          readOnly={readOnly}
          canExport={canExport}
        />
      </div>
    );
  }

  if (!stats || stats.total_responses === 0) {
    return (
      <div className="space-y-4">
        <h2 className="sr-only">Survei kepuasan</h2>
        <p className="text-sm text-[var(--wf-ink-muted)]">
          Status aktif menandai event yang formulir surveinya sedang dibuka untuk pengunjung.
        </p>
        <SurveyWorkflowBanner />
        {/* Aksi lebih dulu: admin bisa mengaktifkan/membagikan walau belum ada respons. */}
        <EventManagementSection
          events={events}
          copiedId={copiedId}
          onCopyLink={handleCopyLink}
          onExport={handleExport}
          onToggleConfig={handleToggleConfig}
          configLoading={configLoading}
          activeConfigs={activeConfigs}
          readOnly={readOnly}
          canExport={canExport}
        />
        {actionError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-600/10 p-3 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{actionError}</span>
            <Button variant="ghost" onClick={() => setActionError('')}>Tutup</Button>
          </div>
        )}
        <div className="ui-dashboard-surface p-6 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-[var(--wf-ink-muted)]" />
          <p className="mt-3 text-sm font-medium text-[var(--wf-ink-muted)]">
            Belum ada respons survei
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tanpa judul h2: nama halaman sudah dari DashboardHeader. Baris ini
          hanya menjelaskan arti status aktif + aksi muat ulang. */}
      <h2 className="sr-only">Survei kepuasan</h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--wf-ink-muted)]">
          Status aktif menandai event yang formulir surveinya sedang dibuka untuk pengunjung.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={fetchStats}
          title="Muat ulang statistik"
          aria-label="Muat ulang statistik"
          className="active:translate-y-0"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {actionError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-600/10 p-3 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <Button variant="ghost" onClick={() => setActionError('')}>Tutup</Button>
        </div>
      )}

      {/* Alur singkat — menjelaskan efek toggle dan urutan kerja */}
      <SurveyWorkflowBanner />

      {/* Event management — aksi utama, ditempatkan sebelum ringkasan */}
      <EventManagementSection
        events={events}
        copiedId={copiedId}
        onCopyLink={handleCopyLink}
        onExport={handleExport}
        onToggleConfig={handleToggleConfig}
        configLoading={configLoading}
        activeConfigs={activeConfigs}
        readOnly={readOnly}
        canExport={canExport}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatMini icon={<ClipboardCheck className="h-4 w-4" />} label="Total respons" value={stats.total_responses} color="primary" />
        <StatMini icon={<Building2 className="h-4 w-4" />} label="Penyelenggara" value={stats.organizer_responses} color="blue" />
        <StatMini icon={<Users className="h-4 w-4" />} label="Peserta" value={stats.public_responses} color="emerald" />
        <StatMini icon={<Star className="h-4 w-4" />} label="Event dinilai" value={stats.unique_events} color="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2 text-xs text-[var(--wf-ink-muted)]">
        <span>Butuh hasil evaluasi tenant per event?</span>
        <Link to="/tenant-survey-results" className="font-medium text-[var(--wf-action)] underline-offset-2 hover:underline">
          Buka halaman hasil evaluasi tenant
        </Link>
      </div>

      {/* Mall average ratings */}
      {stats.mall_avg && (
        <div className="ui-dashboard-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--wf-ink)]">
            Rata-rata Rating Pengelola Tempat
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <RatingBar label="Kebersihan" value={stats.mall_avg.cleanliness} />
            <RatingBar label="Pelayanan" value={stats.mall_avg.staff_service} />
            <RatingBar label="Koordinasi" value={stats.mall_avg.coordination} />
            <RatingBar label="Keamanan" value={stats.mall_avg.security} />
            <RatingBar label="Overall" value={stats.mall_avg.overall} highlight />
          </div>
        </div>
      )}

      {/* EO average ratings */}
      {stats.eo_avg && (
        <div className="ui-dashboard-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--wf-ink)]">
            Rata-rata Rating Penyelenggara Event
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <RatingBar label="Kualitas" value={stats.eo_avg.event_quality} />
            <RatingBar label="Organisasi" value={stats.eo_avg.organization} />
            <RatingBar label="Panitia" value={stats.eo_avg.committee_service} />
            <RatingBar label="Promosi" value={stats.eo_avg.promotion_accuracy} />
            <RatingBar label="Rekomendasi" value={stats.eo_avg.recommendation} />
            <RatingBar label="Overall" value={stats.eo_avg.overall} highlight />
          </div>
        </div>
      )}

      {/* NPS Score */}
      {stats.nps_score !== null && (
        <div className="ui-dashboard-surface p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className={`h-5 w-5 ${stats.nps_score >= 50 ? 'text-[var(--wf-live)]' : stats.nps_score >= 0 ? 'text-[var(--wf-action)]' : 'text-red-700 dark:text-red-300'}`} />
            <div>
              <p className="text-xs text-[var(--wf-ink-muted)]">Net Promoter Score (NPS)</p>
              <p className={`text-xl font-bold ${stats.nps_score >= 50 ? 'text-[var(--wf-live)]' : stats.nps_score >= 0 ? 'text-[var(--wf-action)]' : 'text-red-700 dark:text-red-300'}`}>
                {stats.nps_score > 0 ? '+' : ''}{stats.nps_score}
              </p>
            </div>
<span className="ml-auto rounded-full bg-[var(--wf-board-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--wf-ink-muted)] ">
              {stats.nps_score >= 50 ? 'Sangat Baik' : stats.nps_score >= 0 ? 'Baik' : 'Perlu Perbaikan'}
            </span>
          </div>
        </div>
      )}

      {/* Recent responses with date filter + expandable detail */}
      {stats.recent.length > 0 && (
        <div className="ui-dashboard-surface">
          <div className="flex flex-col gap-2 border-b border-[var(--wf-rule)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-[var(--wf-ink)]">Respons terbaru</h3>
            {/* Date filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[var(--wf-ink-muted)]" />
              {/* Input tanggal: shadcn Input; sufiks `!` menaklukkan default
                  primitif (w-full/h-8/px-2.5/border-input/bg-transparent/
                  md:text-sm) sementara border, bg, dan ukuran asli dipertahankan. */}
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Dari tanggal"
                className="h-auto w-auto! rounded-md border border-[var(--wf-rule)]! bg-[var(--wf-board)]! px-2! py-1 text-[11px]! text-[var(--wf-ink)] dark:bg-[var(--wf-board)]!"
                placeholder="Dari"
              />
              <span className="text-[10px] text-[var(--wf-ink-muted)]">-</span>
              {/* Input tanggal: shadcn Input; sufiks `!` menaklukkan default
                  primitif (w-full/h-8/px-2.5/border-input/bg-transparent/
                  md:text-sm) sementara border, bg, dan ukuran asli dipertahankan. */}
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Sampai tanggal"
                className="h-auto w-auto! rounded-md border border-[var(--wf-rule)]! bg-[var(--wf-board)]! px-2! py-1 text-[11px]! text-[var(--wf-ink)] dark:bg-[var(--wf-board)]!"
                placeholder="Sampai"
              />
              {(dateFrom || dateTo) && (
                <Button variant="ghost" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  Reset
                </Button>
              )}
            </div>
          </div>
          <div className="divide-y divide-[var(--wf-rule)]">
            {filteredRecent.length === 0 && (
              <p className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">Tidak ada respons dalam rentang tanggal ini</p>
            )}
            {filteredRecent.map((r) => {
              const mallAvg = ((r.mall_cleanliness + r.mall_staff_service + r.mall_coordination + r.mall_security) / 4);
              const eventName = events.find(e => e.id === r.event_id)?.acara || r.event_id;
              const isExpanded = expandedId === r.id;
              const hasComments = r.mall_comment || r.eo_comment || r.general_comment;
              return (
                <div key={r.id}>
                  {/* Baris disclosure penuh yang membungkus konten blok (skor +
                      nama event + meta + chevron): shadcn `Button` ghost dengan
                      chrome primitif dinetralkan (h-auto/border-0/rounded-none
                      + padding & gap asli) supaya tinggi baris tidak menyusut. */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="flex! h-auto! w-full! items-center justify-start! gap-3 whitespace-normal! rounded-none border-0! px-4! py-2.5! text-left! font-normal! transition-colors! hover:bg-[var(--wf-board-2)]! active:translate-y-0!"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--wf-accent-ink)] ${mallAvg >= 8 ? 'bg-[var(--wf-live)]' : mallAvg >= 5 ? 'bg-[var(--wf-action)]' : 'bg-red-600'}`}>
                      {mallAvg.toFixed(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--wf-ink)]">{eventName}</p>
                      <p className="text-[10px] text-[var(--wf-ink-muted)]">
                        {r.respondent_name || 'Anonim'} · {r.survey_type === 'organizer' ? 'Penyelenggara' : 'Peserta'} · {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {hasComments && <MessageSquare className="size-3 text-[var(--wf-ink-muted)]" />}
                      {isExpanded ? <ChevronUp className="size-3.5 text-[var(--wf-ink-muted)]" /> : <ChevronDown className="size-3.5 text-[var(--wf-ink-muted)]" />}
                    </div>
                  </Button>
                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="ui-dashboard-muted border-t border-[var(--wf-rule)] px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <MiniRating label="Kebersihan" value={r.mall_cleanliness} />
                        <MiniRating label="Pelayanan" value={r.mall_staff_service} />
                        <MiniRating label="Koordinasi" value={r.mall_coordination} />
                        <MiniRating label="Keamanan" value={r.mall_security} />
                      </div>
                      {r.survey_type === 'public' && r.eo_event_quality != null && (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <MiniRating label="Kualitas" value={r.eo_event_quality} />
                          <MiniRating label="Organisasi" value={r.eo_organization} />
                          <MiniRating label="Panitia" value={r.eo_committee_service} />
                          <MiniRating label="Promosi" value={r.eo_promotion_accuracy} />
                          <MiniRating label="NPS" value={r.eo_recommendation} />
                        </div>
                      )}
                      {/* Comments */}
                      {hasComments && (
                        <div className="mt-3 space-y-1.5">
                          {r.mall_comment && (
                            <p className="text-[11px] text-[var(--wf-ink)]">
                              <span className="font-semibold">Mall:</span> {r.mall_comment}
                            </p>
                          )}
                          {r.eo_comment && (
                            <p className="text-[11px] text-[var(--wf-ink)]">
                              <span className="font-semibold">EO:</span> {r.eo_comment}
                            </p>
                          )}
                          {r.general_comment && (
                            <p className="text-[11px] text-[var(--wf-ink)]">
                              <span className="font-semibold">Umum:</span> {r.general_comment}
                            </p>
                          )}
                        </div>
                      )}
                      {r.respondent_email && (
                        <p className="mt-2 text-[10px] text-[var(--wf-ink-muted)]">Email: {r.respondent_email}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event management dipindah ke atas ringkasan agar aksi utama terlihat dulu. */}
    </div>
  );
}


/* ─── Workflow Banner ──────────────────────────────────────────── */

function SurveyWorkflowBanner() {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2.5 text-xs text-[var(--wf-ink-muted)] sm:flex-row sm:items-center sm:gap-3">
      <span className="flex items-center gap-1.5"><span className="font-semibold text-[var(--wf-ink)]">1.</span> Aktifkan survei per event</span>
      <span className="hidden text-[var(--wf-rule)] sm:inline" aria-hidden="true">→</span>
      <span className="flex items-center gap-1.5"><span className="font-semibold text-[var(--wf-ink)]">2.</span> Bagikan tautan atau QR</span>
      <span className="hidden text-[var(--wf-rule)] sm:inline" aria-hidden="true">→</span>
      <span className="flex items-center gap-1.5"><span className="font-semibold text-[var(--wf-ink)]">3.</span> Pantau respons di ringkasan</span>
    </div>
  );
}

/* ─── Event Management Section ─────────────────────────────────── */

const EVENT_PAGE_SIZE = 8;

function EventManagementSection({ events, copiedId, onCopyLink, onExport, onToggleConfig, configLoading, activeConfigs, readOnly = false, canExport = false }: {
  events: Array<{ id: string; acara: string; status: string }>;
  copiedId: string;
  onCopyLink: (id: string) => void;
  onExport: (id: string) => void;
  onToggleConfig: (id: string, active: boolean) => void;
  readOnly?: boolean;
  canExport?: boolean;
  configLoading: string | null;
  activeConfigs: Record<string, SurveyStatus>;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  // past + ongoing, tanpa hard-limit (rules.md melarang cap 30 di dashboard kelola).
  const surveyableEvents = useMemo(
    () => events.filter(e => e.status === 'past' || e.status === 'ongoing'),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveyableEvents.filter((ev) => {
      if (q && !ev.acara.toLowerCase().includes(q)) return false;
      const status = activeConfigs[ev.id];
      const isActive = status ? (status.has_config ? status.is_active : true) : true;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
      return true;
    });
  }, [surveyableEvents, query, statusFilter, activeConfigs]);

  useEffect(() => { setPage(1); }, [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * EVENT_PAGE_SIZE;
  const pageItems = filteredEvents.slice(pageStart, pageStart + EVENT_PAGE_SIZE);

  if (surveyableEvents.length === 0) return null;

  return (
    <div className="ui-dashboard-surface">
      <div className="border-b border-[var(--wf-rule)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--wf-ink)]">Kelola survei per event</h3>
        <p className="text-[10px] text-[var(--wf-ink-muted)]">
          Aktifkan agar ajakan &quot;Isi survei kepuasan&quot; muncul di halaman event, lalu bagikan tautan atau QR.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[var(--wf-ink-muted)]" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama event…"
              aria-label="Cari event"
              className="w-full pl-9"
            />
          </div>
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            aria-label="Filter status survei"
            className="w-auto shrink-0"
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </NativeSelect>
        </div>
      </div>
      <div className="divide-y divide-[var(--wf-rule)]">
        {pageItems.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-[var(--wf-ink-muted)]">
            {query.trim() || statusFilter !== 'all'
              ? 'Tidak ada event yang cocok dengan pencarian atau filter.'
              : 'Belum ada event untuk dikelola.'}
          </p>
        ) : pageItems.map((ev) => {
          // Event tanpa baris config dianggap "belum diatur" → ajakan tampil
          // (perilaku lama). Sakelar baru mengubah status setelah admin
          // menyentuhnya.
          const config = activeConfigs[ev.id];
          const isActive = config ? (config.has_config ? config.is_active : true) : true;
          const isCopied = copiedId === ev.id;
          const isToggling = configLoading === ev.id;
          const statusLabel = !config || !config.has_config
            ? 'Belum diatur · ajakan tampil (default)'
            : config.is_active
              ? 'Aktif · ajakan tampil di halaman event'
              : 'Nonaktif · ajakan disembunyikan';
          const statusTone = config?.has_config && config.is_active
            ? 'text-[var(--wf-live)]'
            : 'text-[var(--wf-ink-muted)]';
          return (
            <div key={ev.id} className="flex items-center gap-2 px-4 py-2.5">
              {/* Event name + status discoverability */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-[var(--wf-ink)]">{ev.acara}</p>
                <p className={`text-[10px] ${statusTone}`}>
                  {statusLabel}
                </p>
              </div>

              {/* Toggle active */}
              {!readOnly && <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onToggleConfig(ev.id, isActive)}
                disabled={isToggling}
                aria-pressed={isActive}
                aria-label={`${isActive ? 'Sembunyikan' : 'Tampilkan'} ajakan survei ${ev.acara}`}
                title={isActive ? 'Ajakan tampil di halaman event - klik untuk menyembunyikan' : 'Ajakan disembunyikan - klik untuk menampilkan'}
                className="active:translate-y-0"
              >
                {isToggling ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : isActive ? (
                  <ToggleRight className="size-5" />
                ) : (
                  <ToggleLeft className="size-5" />
                )}
              </Button>}

              {/* Copy link */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => onCopyLink(ev.id)}
                title="Salin tautan survei"
                aria-label={`Salin tautan survei ${ev.acara}`}
              >
                {isCopied ? <Check className="size-3 text-[var(--wf-live)]" /> : <Link2 className="size-3" />}
                {isCopied ? 'Tersalin' : 'Tautan'}
              </Button>

              {/* Buka form di tab baru — jalur navigasi langsung ke halaman publik */}
              <Link
                to={`/survey/${ev.id}`}
                target="_blank"
                rel="noreferrer"
                title="Buka form survei"
                aria-label={`Buka form survei ${ev.acara}`}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]"
              >
                <ExternalLink className="size-3" />
                Buka
              </Link>

              {/* Export — backend menolak demo; tombol disembunyikan agar tak 403 */}
              {canExport && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onExport(ev.id)}
                  aria-label={`Unduh CSV survei ${ev.acara}`}
                >
                  <Download className="size-3" />
                  CSV
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {filteredEvents.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--wf-rule)] px-4 py-2">
          <p className="text-[10px] tabular-nums text-[var(--wf-ink-muted)]">
            {pageStart + 1}–{Math.min(pageStart + EVENT_PAGE_SIZE, filteredEvents.length)} dari {filteredEvents.length} event
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Halaman sebelumnya"
              className="active:translate-y-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-[10px] tabular-nums text-[var(--wf-ink-muted)]">
              Hal {safePage}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              aria-label="Halaman berikutnya"
              className="active:translate-y-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── Helpers ──────────────────────────────────────────────────── */

function StatMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]',
    blue: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]',
    emerald: 'bg-[var(--wf-live)]/10 text-[var(--wf-live)]',
    amber: 'bg-[var(--wf-action)]/10 text-[var(--wf-action)]',
  };
  return (
    <div className="ui-dashboard-surface p-3">
      <div className={`mb-2 inline-flex rounded-lg p-1.5 ${colors[color] || colors.primary}`}>{icon}</div>
      <p className="text-lg font-bold text-[var(--wf-ink)]">{value}</p>
      <p className="text-[10px] text-[var(--wf-ink-muted)]">{label}</p>
    </div>
  );
}

function RatingBar({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const pct = (value / 10) * 100;
  const color = value >= 8 ? 'bg-[var(--wf-live)]' : value >= 5 ? 'bg-[var(--wf-action)]' : 'bg-red-600';
  return (
    <div className={`space-y-1 ${highlight ? 'rounded-lg bg-[var(--wf-accent-soft)] p-2' : ''}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${highlight ? 'font-semibold text-[var(--wf-accent)]' : 'text-[var(--wf-ink-muted)]'}`}>{label}</span>
        <span className={`text-xs font-bold ${value >= 8 ? 'text-[var(--wf-live)]' : value >= 5 ? 'text-[var(--wf-action)]' : 'text-red-700 dark:text-red-300'}`}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--wf-board-2)]">
        <div className={`h-full rounded-full transition-[width] duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniRating({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center justify-between rounded-md bg-[var(--wf-board-2)] px-2 py-1">
      <span className="text-[10px] text-[var(--wf-ink-muted)]">{label}</span>
      <span className={`text-[11px] font-bold ${v >= 8 ? 'text-[var(--wf-live)]' : v >= 5 ? 'text-[var(--wf-action)]' : 'text-red-700 dark:text-red-300'}`}>{v || '-'}</span>
    </div>
  );
}


