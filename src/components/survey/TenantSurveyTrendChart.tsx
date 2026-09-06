import { useMemo } from 'react';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { useTenantSurveyMonthlyTrend } from '../../hooks/useTenantSurveys';

function TrendBar({
  label,
  total,
  v2,
  v3,
  maxTotal,
}: {
  label: string;
  total: number;
  v2: number;
  v3: number;
  maxTotal: number;
}) {
  const barH = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const v2H = total > 0 ? (v2 / total) * barH : 0;
  const v3H = total > 0 ? (v3 / total) * barH : 0;
  const shortLabel = label.replace(/^\d{4}-(\d{2})$/, (_, m) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[parseInt(m, 10) - 1] || m;
  });

  return (
    <div className="flex flex-col items-center gap-1" title={`${label}: ${total} submissions`}>
      <div className="flex items-end" style={{ height: '140px' }}>
        <div
          className="flex w-8 flex-col-reverse overflow-hidden rounded-t-md transition-all duration-500"
          style={{ height: `${barH}%`, minHeight: v2H + v3H > 0 ? '4px' : '0' }}
        >
          {v3 > 0 && (
            <div
              className="w-full bg-brand-primary-400 transition-all duration-500"
              style={{ height: `${v3H > 0 ? (v3H / (v2H + v3H)) * 100 : 0}%`, minHeight: v3H > 0 ? '2px' : '0' }}
            />
          )}
          {v2 > 0 && (
            <div
              className="w-full bg-blue-400 transition-all duration-500"
              style={{ height: `${v2H > 0 ? (v2H / (v2H + v3H)) * 100 : 100}%`, minHeight: v2H > 0 ? '2px' : '0' }}
            />
          )}
        </div>
      </div>
      <span className="text-[10px] ui-text-muted">{shortLabel}</span>
      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{total}</span>
    </div>
  );
}

export default function TenantSurveyTrendChart({
  eventFilter,
  publicMode = false,
}: {
  eventFilter?: string | null;
  publicMode?: boolean;
}) {
  const { trend, isLoading, error } = useTenantSurveyMonthlyTrend(eventFilter, { publicMode });

  const stats = useMemo(() => {
    if (trend.length < 2) return null;

    const latest = trend[0]!;
    const previous = trend[1]!;

    const latestTrafficPos = latest.total_submissions > 0
      ? Math.round(((latest.traffic_signifikan + latest.traffic_sedikit_naik) / latest.total_submissions) * 100)
      : 0;
    const prevTrafficPos = previous.total_submissions > 0
      ? Math.round(((previous.traffic_signifikan + previous.traffic_sedikit_naik) / previous.total_submissions) * 100)
      : 0;

    const latestSalesPos = latest.total_submissions > 0
      ? Math.round(((latest.sales_lt_10 + latest.sales_10_30 + latest.sales_30_50 + latest.sales_gt_50) / latest.total_submissions) * 100)
      : 0;
    const prevSalesPos = previous.total_submissions > 0
      ? Math.round(((previous.sales_lt_10 + previous.sales_10_30 + previous.sales_30_50 + previous.sales_gt_50) / previous.total_submissions) * 100)
      : 0;

    return {
      latestTrafficPos,
      prevTrafficPos,
      latestSalesPos,
      prevSalesPos,
      trafficChange: latestTrafficPos - prevTrafficPos,
      salesChange: latestSalesPos - prevSalesPos,
      latestSubmissions: latest.total_submissions,
      prevSubmissions: previous.total_submissions,
      submissionsChange: latest.total_submissions - previous.total_submissions,
    };
  }, [trend]);

  const maxTotal = useMemo(() => {
    return Math.max(...trend.map(t => t.total_submissions), 1);
  }, [trend]);

  if (isLoading) {
    return (
      <div className="ui-dashboard-surface p-4">
        <div className="flex items-center gap-2 text-sm ui-text-muted">
          <BarChart3 className="h-4 w-4 animate-pulse" />
          Memuat tren...
        </div>
      </div>
    );
  }

  if (error || trend.length === 0) return null;

  return (
    <div className="ui-dashboard-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-primary-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Tren Bulanan
          </h3>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-[10px] ui-text-muted">
            {stats.submissionsChange !== 0 && (
              <span>
                Submisi: {stats.submissionsChange > 0 ? '+' : ''}{stats.submissionsChange}
                <span className="text-slate-500"> vs bulan lalu</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stat highlights */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <TrendStat
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Submisi Bulan Ini"
            value={stats.latestSubmissions}
            change={stats.submissionsChange}
            changeLabel="dari bulan lalu"
          />
          <TrendStat
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Traffic Positif"
            value={`${stats.latestTrafficPos}%`}
            change={stats.trafficChange}
            changeLabel="pp dari bulan lalu"
          />
          <TrendStat
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label="Sales Positif"
            value={`${stats.latestSalesPos}%`}
            change={stats.salesChange}
            changeLabel="pp dari bulan lalu"
          />
        </div>
      )}

      {/* Bar chart — last 12 months */}
      <div className="flex items-end justify-between gap-0.5 overflow-x-auto pb-1">
        {trend.map(t => (
          <TrendBar
            key={t.period}
            label={t.period}
            total={t.total_submissions}
            v2={t.v2_count}
            v3={t.v3_count}
            maxTotal={maxTotal}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" />
          v2 (Rating)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-primary-400" />
          v3 (Publik)
        </span>
      </div>
    </div>
  );
}

function TrendStat({
  icon,
  label,
  value,
  change,
  changeLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-brand-primary-500 dark:text-brand-primary-400">
        {icon}
        <span className="text-[10px] ui-text-muted">{label}</span>
      </div>
      <p className="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-200">{value}</p>
      {change !== 0 && (
        <p className={`text-[10px] ${change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {change > 0 ? '+' : ''}{change} {changeLabel}
        </p>
      )}
      {change === 0 && (
        <p className="text-[10px] text-slate-500">Sama {changeLabel}</p>
      )}
    </div>
  );
}
