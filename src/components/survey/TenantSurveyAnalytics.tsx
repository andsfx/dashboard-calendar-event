import { useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Star, ThumbsUp,
  Building2, ArrowUpRight, ArrowDownRight, Minus,
  Store, Tag, DollarSign, MapPin,
} from 'lucide-react';
import type { TenantSurveyAnalytics, TenantEventSurvey } from '../../types';

interface TenantSurveyAnalyticsProps {
  analytics: TenantSurveyAnalytics[];
  surveys: TenantEventSurvey[];
  isLoading: boolean;
}

function ratingColor(n: number | null | undefined): string {
  if (n == null) return 'text-slate-400 dark:text-slate-500';
  if (n >= 8) return 'text-emerald-500';
  if (n >= 5) return 'text-yellow-500';
  return 'text-red-500';
}

function isV3(survey: TenantEventSurvey): boolean {
  return !!(survey.nama_gerai && survey.venue_rating == null);
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 text-violet-500 dark:text-violet-400">
        {icon}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function TenantSurveyAnalyticsPanel({
  analytics,
  surveys,
  isLoading,
}: TenantSurveyAnalyticsProps) {
  // ─── Aggregate stats across all tenants ─────────────────────────
  const aggregate = useMemo(() => {
    if (analytics.length === 0) return null;

    const totalSurveys = analytics.reduce((sum, a) => sum + a.submitted_surveys, 0);
    const totalTenants = analytics.length;

    // Weighted averages (by survey count)
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
      for (const a of analytics) {
        const val = a[key] as number | null;
        if (val != null) {
          numSum += val * a.submitted_surveys;
          denSum += a.submitted_surveys;
        }
      }
      weightedAvgs[key] = denSum > 0 ? +(numSum / denSum).toFixed(2) : null;
    }

    // Average overall rating (no would_repeat_pct in new schema)
    const overallRated = analytics.filter(a => a.avg_overall_rating != null);
    const avgRepeat = overallRated.length > 0
      ? Math.round(overallRated.reduce((sum, a) => sum + (a.avg_overall_rating || 0), 0) / overallRated.length * 20)
      : null;

    return {
      totalSurveys,
      totalTenants,
      avgOverall: weightedAvgs.avg_overall_rating,
      avgRepeat,
      weightedAvgs,
    };
  }, [analytics]);

  // ─── Top/bottom performers ──────────────────────────────────────
  const topPerformers = useMemo(() => {
    return [...analytics]
      .filter(a => a.avg_overall_rating != null && a.submitted_surveys > 0)
      .sort((a, b) => (b.avg_overall_rating || 0) - (a.avg_overall_rating || 0))
      .slice(0, 5);
  }, [analytics]);

  // ─── V3 public survey distributions ────────────────────────────
  const v3Data = useMemo(() => {
    const v3Surveys = surveys.filter(isV3);
    const trafficLabels = ['Signifikan', 'Sedikit Naik', 'Tidak Ada', 'Menurun'];
    const salesLabels = ['Tidak ada kenaikan / Sama saja', '< 10%', '10% - 30%', '30% - 50%', '> 50%'];
    const kategoriLabels = ['Food & Beverage (F&B)', 'Fashion & Aksesoris', 'Lifestyle & Hobi', 'Hiburan / Mainan Anak', 'Servis / Jasa', 'Supermarket / Department Store'];

    return {
      v3Surveys,
      trafficDist: countDist(v3Surveys.map(s => s.kenaikan_traffic), trafficLabels),
      salesDist: countDist(v3Surveys.map(s => s.kenaikan_sales), salesLabels),
      kategoriDist: countDist(v3Surveys.map(s => s.kategori), kategoriLabels),
    };
  }, [surveys]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <BarChart3 className="h-4 w-4 animate-pulse" />
          Memuat analytics...
        </div>
      </div>
    );
  }

  if (!aggregate || analytics.length === 0) {
    if (v3Data.v3Surveys.length > 0) {
      // Show v3 analytics only
      return (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Submisi Publik"
              value={v3Data.v3Surveys.length}
              icon={<Store className="h-4 w-4" />}
            />
          </div>
          <V3DistributionSection
            trafficDist={v3Data.trafficDist}
            salesDist={v3Data.salesDist}
            kategoriDist={v3Data.kategoriDist}
            total={v3Data.v3Surveys.length}
          />
        </div>
      );
    }

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

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
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
          color={aggregate.avgRepeat != null ? (aggregate.avgRepeat >= 70 ? 'text-emerald-500' : 'text-yellow-500') : 'text-slate-400'}
        />
      </div>

      {/* Category averages */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
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
                <span className="text-violet-500 dark:text-violet-400">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
                  <p className={`text-sm font-bold ${ratingColor(val)}`}>{val?.toFixed(2) || '-'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top performers table */}
      {topPerformers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Tenant Terbaik
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {topPerformers.map((a, i) => (
              <div key={a.tenant_user_id} className="flex items-center gap-3 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
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

      {/* V3 Public survey analytics */}
      {v3Data.v3Surveys.length > 0 && (
        <V3DistributionSection
          trafficDist={v3Data.trafficDist}
          salesDist={v3Data.salesDist}
          kategoriDist={v3Data.kategoriDist}
          total={v3Data.v3Surveys.length}
        />
      )}
    </div>
  );
}

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
  const trafficColors: Record<string, string> = {
    'Signifikan': 'bg-emerald-500',
    'Sedikit Naik': 'bg-green-400',
    'Tidak Ada': 'bg-yellow-400',
    'Menurun': 'bg-red-500',
  };

  const salesColors: Record<string, string> = {
    '> 50%': 'bg-emerald-500',
    '30% - 50%': 'bg-green-400',
    '10% - 30%': 'bg-lime-400',
    '< 10%': 'bg-yellow-400',
    'Tidak ada kenaikan / Sama saja': 'bg-orange-400',
  };

  return (
    <div className="space-y-4">
      {/* V3 stat card */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Submisi Publik"
          value={total}
          icon={<Store className="h-4 w-4" />}
        />
        <StatCard
          label="Kategori Unik"
          value={Object.keys(kategoriDist).filter(k => (kategoriDist[k] ?? 0) > 0).length}
          icon={<Tag className="h-4 w-4" />}
        />
        <StatCard
          label="Traffic Positif"
          value={(() => {
            const pos = (trafficDist['Signifikan'] || 0) + (trafficDist['Sedikit Naik'] || 0);
            return total > 0 ? `${Math.round((pos / total) * 100)}%` : '-';
          })()}
          icon={<TrendingUp className="h-4 w-4" />}
          color={(() => {
            const pos = (trafficDist['Signifikan'] || 0) + (trafficDist['Sedikit Naik'] || 0);
            const pct = total > 0 ? (pos / total) * 100 : 0;
            return pct >= 60 ? 'text-emerald-500' : pct >= 30 ? 'text-yellow-500' : 'text-red-500';
          })()}
        />
      </div>

      {/* Distribution bars */}
      <div className="grid gap-4 sm:grid-cols-3">
        <DistCard
          title="Evaluasi Traffic"
          icon={<TrendingUp className="h-4 w-4" />}
          dist={trafficDist}
          colors={trafficColors}
          total={total}
        />
        <DistCard
          title="Evaluasi Sales"
          icon={<DollarSign className="h-4 w-4" />}
          dist={salesDist}
          colors={salesColors}
          total={total}
        />
        <DistCard
          title="Distribusi Kategori"
          icon={<Tag className="h-4 w-4" />}
          dist={kategoriDist}
          colors={{}}
          total={total}
        />
      </div>
    </div>
  );
}

function DistCard({
  title,
  icon,
  dist,
  colors,
  total,
}: {
  title: string;
  icon: React.ReactNode;
  dist: Record<string, number>;
  colors: Record<string, string>;
  total: number;
}) {
  const entries = Object.entries(dist).filter(([, count]) => count > 0);
  const maxCount = Math.max(...entries.map(([, c]) => c), 1);
  const defaultColors = ['bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-violet-500 dark:text-violet-400">{icon}</span>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h4>
      </div>
      <div className="space-y-2">
        {entries.map(([label, count], i) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barWidth = (count / maxCount) * 100;
          const barColor = colors[label] || defaultColors[i % defaultColors.length];
          return (
            <div key={label}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="truncate text-[10px] text-slate-600 dark:text-slate-400">{label}</span>
                <span className="ml-2 shrink-0 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {count} <span className="font-normal text-slate-400">({pct}%)</span>
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
