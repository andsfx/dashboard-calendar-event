import { useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Star, ThumbsUp,
  Building2, Store, Tag, DollarSign,
} from 'lucide-react';
import type { TenantSurveyAnalytics, TenantEventSurvey } from '../../types';
import { isV3Survey } from '../../utils/surveyUtils';
import { SURVEY_OPTIONS } from '../../constants/survey-options';
import TenantSurveyTrendChart from './TenantSurveyTrendChart';

interface TenantSurveyAnalyticsProps {
  analytics: TenantSurveyAnalytics[];
  surveys: TenantEventSurvey[];
  isLoading: boolean;
  eventFilter?: string | null;
}

function ratingColor(n: number | null | undefined): string {
  if (n == null) return 'text-slate-400 dark:text-slate-500';
  if (n >= 4) return 'text-emerald-500';
  if (n >= 3) return 'text-yellow-500';
  return 'text-red-500';
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
  color = 'text-slate-800 dark:text-slate-200',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="ui-dashboard-surface p-4">
      <div className="flex items-center gap-2 text-brand-primary-500 dark:text-brand-primary-400">
        {icon}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ─── Empty / Loading states ───────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
      <BarChart3 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        Belum ada data analytics
      </p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Analytics akan muncul setelah tenant mengirimkan self-assessment
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <BarChart3 className="h-4 w-4 animate-pulse" />
        Memuat analytics...
      </div>
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
    const salesPos =
      (salesDist['> 50%'] || 0) +
      (salesDist['30% - 50%'] || 0) +
      (salesDist['10% - 30%'] || 0);

    return {
      v3Surveys,
      trafficDist,
      salesDist,
      kategoriDist,
      total,
      uniqueGerai,
      trafficPosPct: total > 0 ? Math.round((trafficPos / total) * 100) : 0,
      salesPosPct: total > 0 ? Math.round((salesPos / total) * 100) : 0,
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

    const avgRepeat = Math.round(
      rated.reduce((sum, a) => sum + (a.avg_overall_rating || 0), 0) / rated.length * 20,
    );

    return {
      totalSurveys,
      totalTenants,
      avgOverall: weightedAvgs.avg_overall_rating,
      avgRepeat,
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
  if (!hasV3 && !hasV2) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* ── V3: Publik Categorical Analytics ──────────────────────── */}
      {hasV3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-brand-primary-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
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
              label="Gerai Unik"
              value={v3Data.uniqueGerai}
              icon={<Store className="h-4 w-4" />}
            />
            <StatCard
              label="Traffic Positif"
              value={v3Data.total > 0 ? `${v3Data.trafficPosPct}%` : '-'}
              icon={<TrendingUp className="h-4 w-4" />}
              color={
                v3Data.trafficPosPct >= 60
                  ? 'text-emerald-500'
                  : v3Data.trafficPosPct >= 30
                    ? 'text-yellow-500'
                    : 'text-red-500'
              }
            />
            <StatCard
              label="Sales Positif"
              value={v3Data.total > 0 ? `${v3Data.salesPosPct}%` : '-'}
              icon={<DollarSign className="h-4 w-4" />}
              color={
                v3Data.salesPosPct >= 60
                  ? 'text-emerald-500'
                  : v3Data.salesPosPct >= 30
                    ? 'text-yellow-500'
                    : 'text-red-500'
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
        <hr className="border-slate-200 dark:border-slate-700" />
      )}

      {/* ── V2: Tenant Rating Analytics ──────────────────────────── */}
      {hasV2 && aggregate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-brand-primary-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Self-Assessment Tenant (v2)
            </h3>
          </div>

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <StatCard
              label="Bersedia Repeat"
              value={aggregate.avgRepeat != null ? `${aggregate.avgRepeat}%` : '-'}
              icon={<ThumbsUp className="h-4 w-4" />}
              color={
                aggregate.avgRepeat != null
                  ? aggregate.avgRepeat >= 70
                    ? 'text-emerald-500'
                    : 'text-yellow-500'
                  : 'text-slate-400'
              }
            />
          </div>

          {/* Category averages */}
          <div className="ui-dashboard-surface p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
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
                    className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span className="text-brand-primary-500 dark:text-brand-primary-400">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
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
              <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Tenant Terbaik
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {topPerformers.map((a, i) => (
                  <div
                    key={a.tenant_user_id || `v3-${i}`}
                    className="flex items-center gap-3 p-4"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary-100 text-xs font-bold text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {a.tenant_organization || 'Tenant'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {a.submitted_surveys} survey terkirim
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${ratingColor(a.avg_overall_rating)}`}>
                        {a.avg_overall_rating?.toFixed(1)}
                      </p>
                      {a.avg_overall_rating != null && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
  const defaultColors = ['bg-brand-primary-500', 'bg-brand-primary-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

  if (entries.length === 0) return null;

  return (
    <div className="ui-dashboard-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-brand-primary-500 dark:text-brand-primary-400">{icon}</span>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h4>
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
                <span className="truncate text-[10px] text-slate-600 dark:text-slate-400">
                  {label}
                </span>
                <span className="ml-2 shrink-0 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {count}{' '}
                  <span className="font-normal text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
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