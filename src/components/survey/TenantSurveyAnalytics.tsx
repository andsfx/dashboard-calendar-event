import { useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Star, ThumbsUp,
  Building2, Store, Tag, DollarSign,
} from 'lucide-react';
import type { TenantSurveyAnalytics, TenantEventSurvey } from '../../types';
import { isV3Survey, salesPositivePct, trafficPositivePct } from '../../utils/surveyUtils';
import { SURVEY_OPTIONS } from '../../constants/survey-options';
import TenantSurveyTrendChart from './TenantSurveyTrendChart';

interface TenantSurveyAnalyticsProps {
  analytics: TenantSurveyAnalytics[];
  surveys: TenantEventSurvey[];
  isLoading: boolean;
  eventFilter?: string | null;
  /** Pesan kegagalan muat. Bila ada, tampilkan galat — bukan empty state. */
  error?: string | null;
  onRetry?: () => void;
}

function ratingColor(n: number | null | undefined): string {
  if (n == null) return 'text-[var(--wf-ink-muted)]';
  if (n >= 4) return 'text-[var(--wf-live)]';
  if (n >= 3) return 'text-[var(--wf-action)]';
  return 'text-red-700 dark:text-red-300';
}

function countDist(items: (string | null | undefined)[], labels: string[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const l of labels) dist[l] = 0;
  for (const item of items) {
    if (!item) continue;
    dist[item] = (dist[item] || 0) + 1;
  }
  return dist;
}

function StatCard({
  label,
  value,
  icon,
  color = 'text-[var(--wf-ink)]',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="ui-dashboard-surface p-4">
      <div className="flex items-center gap-2 text-[var(--wf-accent)]">
        {icon}
        <span className="text-xs font-medium text-[var(--wf-ink-muted)]">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ─── Empty / Loading states ───────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-[var(--wf-radius-board)] border border-dashed border-[var(--wf-rule)] p-8 text-center">
      <BarChart3 className="mx-auto h-10 w-10 text-[var(--wf-ink-muted)]" />
      <p className="mt-2 text-sm font-medium text-[var(--wf-ink-muted)]">
        Belum ada data analytics
      </p>
      <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
        Analytics akan muncul setelah tenant mengirimkan self-assessment
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-2 text-sm text-[var(--wf-ink-muted)]">
        <BarChart3 className="h-4 w-4 animate-pulse" />
        Memuat analytics…
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[var(--wf-radius-board)] border border-red-200 bg-red-600/10 p-6 text-center dark:border-red-800">
      <BarChart3 className="mx-auto h-8 w-8 text-red-700 dark:text-red-300" />
      <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">Gagal memuat analytics</p>
      <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function TenantSurveyAnalyticsPanel({
  analytics,
  surveys,
  isLoading,
  eventFilter,
  error,
  onRetry,
}: TenantSurveyAnalyticsProps) {

  // ─── V3 aggregate (from raw surveys — supports event filtering) ─
  const v3Data = useMemo(() => {
    const v3Surveys = surveys.filter(isV3Survey);
    const trafficLabels = [...SURVEY_OPTIONS.kenaikan_traffic];
    const salesLabels = [...SURVEY_OPTIONS.kenaikan_sales];
    const kategoriLabels = [...SURVEY_OPTIONS.kategori];

    const trafficDist = countDist(v3Surveys.map(s => s.kenaikan_traffic), trafficLabels);
    const salesDist = countDist(v3Surveys.map(s => s.kenaikan_sales), salesLabels);
    const kategoriDist = countDist(v3Surveys.map(s => s.kategori), kategoriLabels);

    const uniqueGerai = new Set(v3Surveys.map(s => s.nama_gerai).filter(Boolean)).size;

    const total = v3Surveys.length;
    const trafficPos = (trafficDist['Signifikan'] || 0) + (trafficDist['Sedikit Naik'] || 0);
    // Definisi "sales positif" dipusatkan di surveyUtils supaya panel ini dan
    // TrendChart tidak lagi menghasilkan dua angka berbeda untuk dataset sama.
    const salesPosPct = salesPositivePct(v3Surveys);
    const trafficPosPct = trafficPositivePct(v3Surveys);

    return {
      v3Surveys,
      trafficDist,
      salesDist,
      kategoriDist,
      total,
      uniqueGerai,
      trafficPosPct,
      salesPosPct,
    };
  }, [surveys]);

  // ─── V2 aggregate (from RPC analytics) ──────────────────────────
  const aggregate = useMemo(() => {
    const rated = analytics.filter(a => a.avg_overall_rating != null && a.submitted_surveys > 0);
    if (rated.length === 0) return null;

    const totalSurveys = rated.reduce((sum, a) => sum + a.submitted_surveys, 0);
    const totalTenants = rated.length;

    const fieldKeys = [
      'avg_overall_rating',
      'avg_venue_rating',
      'avg_management_rating',
      'avg_event_organization_rating',
      'avg_booth_facility_rating',
    ] as const;

    const weightedAvgs: Record<string, number | null> = {};
    for (const key of fieldKeys) {
      let numSum = 0;
      let denSum = 0;
      for (const a of rated) {
        const val = a[key] as number | null;
        if (val != null) {
          numSum += val * a.submitted_surveys;
          denSum += a.submitted_surveys;
        }
      }
      weightedAvgs[key] = denSum > 0 ? +(numSum / denSum).toFixed(2) : null;
    }

    return {
      totalSurveys,
      totalTenants,
      avgOverall: weightedAvgs.avg_overall_rating,
      weightedAvgs,
    };
  }, [analytics]);

  // ─── Top performers (v2 only) ───────────────────────────────────
  const topPerformers = useMemo(() => {
    return [...analytics]
      .filter(a => a.avg_overall_rating != null && a.submitted_surveys > 0)
      .sort((a, b) => (b.avg_overall_rating || 0) - (a.avg_overall_rating || 0))
      .slice(0, 5);
  }, [analytics]);

  // ─── Data type detection ────────────────────────────────────────
  const hasV3 = v3Data.total > 0;
  const hasV2 = aggregate != null;

  // ─── Render ─────────────────────────────────────────────────────
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!hasV3 && !hasV2) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* ── V3: Publik Categorical Analytics ──────────────────────── */}
      {hasV3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-[var(--wf-accent)]" />
            <h3 className="text-sm font-bold text-[var(--wf-ink)]">
              Feedback Publik (Self-Assessment v3)
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Submisi"
              value={v3Data.total}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <StatCard
              label="Tenant yang sudah isi"
              value={v3Data.uniqueGerai}
              icon={<Store className="h-4 w-4" />}
            />
            <StatCard
              label="Traffic Positif"
              value={v3Data.total > 0 ? `${v3Data.trafficPosPct}%` : '-'}
              icon={<TrendingUp className="h-4 w-4" />}
              color={
                v3Data.trafficPosPct >= 60
                  ? 'text-[var(--wf-live)]'
                  : v3Data.trafficPosPct >= 30
                    ? 'text-[var(--wf-action)]'
                    : 'text-red-700 dark:text-red-300'
              }
            />
            <StatCard
              label="Sales Positif"
              value={v3Data.total > 0 ? `${v3Data.salesPosPct}%` : '-'}
              icon={<DollarSign className="h-4 w-4" />}
              color={
                v3Data.salesPosPct >= 60
                  ? 'text-[var(--wf-live)]'
                  : v3Data.salesPosPct >= 30
                    ? 'text-[var(--wf-action)]'
                    : 'text-red-700 dark:text-red-300'
              }
            />
          </div>

          <V3DistributionSection
            trafficDist={v3Data.trafficDist}
            salesDist={v3Data.salesDist}
            kategoriDist={v3Data.kategoriDist}
            total={v3Data.total}
          />
        </div>
      )}

      {/* ── Separator when both sections shown ──────────────────── */}
      {hasV3 && hasV2 && (
        <hr className="border-[var(--wf-rule)]" />
      )}

      {/* ── V2: Tenant Rating Analytics ──────────────────────────── */}
      {hasV2 && aggregate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-[var(--wf-accent)]" />
            <h3 className="text-sm font-bold text-[var(--wf-ink)]">
              Self-Assessment Tenant (v2)
            </h3>
          </div>

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Self-Assessment"
              value={aggregate.totalSurveys}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <StatCard
              label="Tenant Aktif"
              value={aggregate.totalTenants}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Rating Rata-rata"
              value={aggregate.avgOverall?.toFixed(1) || '-'}
              icon={<Star className="h-4 w-4" />}
              color={ratingColor(aggregate.avgOverall)}
            />
          </div>

          {/* Category averages */}
          <div className="ui-dashboard-surface p-4">
            <h3 className="mb-3 text-sm font-bold text-[var(--wf-ink)]">
              Rata-rata per Kategori
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ['avg_venue_rating', 'Venue', <Building2 className="h-3.5 w-3.5" />],
                ['avg_management_rating', 'Manajemen', <Users className="h-3.5 w-3.5" />],
                ['avg_event_organization_rating', 'Organisasi Event', <Star className="h-3.5 w-3.5" />],
                ['avg_booth_facility_rating', 'Fasilitas Booth', <ThumbsUp className="h-3.5 w-3.5" />],
              ] as const).map(([key, label, icon]) => {
                const val = aggregate.weightedAvgs[key] as number | null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <span className="text-[var(--wf-accent)]">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11px] text-[var(--wf-ink-muted)]">{label}</p>
                      <p className={`text-sm font-bold ${ratingColor(val)}`}>{val?.toFixed(2) || '-'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top performers */}
          {topPerformers.length > 0 && (
            <div className="ui-dashboard-surface">
              <div className="border-b border-[var(--wf-rule)] p-4">
                <h3 className="text-sm font-bold text-[var(--wf-ink)]">
                  Tenant Terbaik
                </h3>
              </div>
              <div className="divide-y divide-[var(--wf-rule)]">
                {topPerformers.map((a, i) => (
                  <div
                    key={a.tenant_user_id || `v3-${i}`}
                    className="flex items-center gap-3 p-4"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--wf-accent-soft)] text-xs font-bold text-[var(--wf-accent)]">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                        {a.tenant_organization || 'Tenant'}
                      </p>
                      <p className="text-xs text-[var(--wf-ink-muted)]">
                        {a.submitted_surveys} survey terkirim
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${ratingColor(a.avg_overall_rating)}`}>
                        {a.avg_overall_rating?.toFixed(1)}
                      </p>
                      {a.avg_overall_rating != null && (
                        <p className="text-[11px] text-[var(--wf-ink-muted)]">
                          {a.avg_venue_rating != null ? `${a.avg_venue_rating}/5 venue` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Monthly Trend ──────────────────────────────────────── */}
      {(hasV3 || hasV2) && <TenantSurveyTrendChart eventFilter={eventFilter} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V3 Distribution Section (sub-component)
// ═══════════════════════════════════════════════════════════════════

function V3DistributionSection({
  trafficDist,
  salesDist,
  kategoriDist,
  total,
}: {
  trafficDist: Record<string, number>;
  salesDist: Record<string, number>;
  kategoriDist: Record<string, number>;
  total: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <DistCard
        title="Evaluasi Traffic"
        icon={<TrendingUp className="h-4 w-4" />}
        dist={trafficDist}
        colorMap={{
          'Signifikan': 'bg-emerald-500',
          'Sedikit Naik': 'bg-green-400',
          'Tidak Ada': 'bg-yellow-400',
          'Menurun': 'bg-red-500',
        }}
        total={total}
      />
      <DistCard
        title="Evaluasi Sales"
        icon={<DollarSign className="h-4 w-4" />}
        dist={salesDist}
        colorMap={{
          '> 50%': 'bg-emerald-500',
          '30% - 50%': 'bg-green-400',
          '10% - 30%': 'bg-lime-400',
          '< 10%': 'bg-yellow-400',
          'Tidak ada kenaikan / Sama saja': 'bg-orange-400',
        }}
        total={total}
      />
      <DistCard
        title="Distribusi Kategori"
        icon={<Tag className="h-4 w-4" />}
        dist={kategoriDist}
        total={total}
      />
    </div>
  );
}

function DistCard({
  title,
  icon,
  dist,
  colorMap,
  total,
}: {
  title: string;
  icon: React.ReactNode;
  dist: Record<string, number>;
  colorMap?: Record<string, string>;
  total: number;
}) {
  const entries = Object.entries(dist).filter(([, count]) => count > 0);
  const maxCount = Math.max(...entries.map(([, c]) => c), 1);
  const defaultColors = ['bg-[var(--wf-accent)]', 'bg-[var(--wf-accent)]', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

  if (entries.length === 0) return null;

  return (
    <div className="ui-dashboard-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[var(--wf-accent)]">{icon}</span>
        <h4 className="text-xs font-bold text-[var(--wf-ink)]">{title}</h4>
      </div>
      <div className="space-y-2">
        {entries.map(([label, count], i) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barWidth = (count / maxCount) * 100;
          const barColor =
            (colorMap ? colorMap[label] : undefined) ||
            defaultColors[i % defaultColors.length];
          return (
            <div key={label}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="truncate text-[10px] text-[var(--wf-ink-muted)]">
                  {label}
                </span>
                <span className="ml-2 shrink-0 text-[10px] font-bold text-[var(--wf-ink)]">
                  {count}{' '}
                  <span className="font-normal text-[var(--wf-ink-muted)]">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--wf-board-2)]">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}