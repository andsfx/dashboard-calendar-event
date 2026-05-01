import { useMemo, useState } from 'react';
import {
  TrendingUp, PieChart, MapPin, Calendar, DollarSign,
  Clock, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import type { EventItem } from '../../types';
import { CATEGORY_COLORS } from '../../utils/eventUtils';

interface AnalyticsDashboardProps {
  events: EventItem[];
}

export function AnalyticsDashboard({ events }: AnalyticsDashboardProps) {
  const [compareYear, setCompareYear] = useState<number | null>(null);

  const analytics = useMemo(() => computeAnalytics(events), [events]);
  const years = useMemo(() => {
    const set = new Set(events.map(e => new Date(e.dateStr).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [events]);

  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;
  const currentYearEvents = events.filter(e => new Date(e.dateStr).getFullYear() === currentYear);
  const prevYearEvents = events.filter(e => new Date(e.dateStr).getFullYear() === prevYear);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Analytics Lanjutan</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Insight mendalam tentang event & venue</p>
      </div>

      {/* 1. Tren Event per Bulan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tren Event per Bulan</h3>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />{currentYear}</span>
            {prevYearEvents.length > 0 && (
              <span className="flex items-center gap-1 ml-2"><span className="h-2 w-2 rounded-full bg-slate-300" />{prevYear}</span>
            )}
          </div>
        </div>
        <MonthlyTrendChart currentYear={analytics.monthlyTrend} prevYear={analytics.monthlyTrendPrev} />
      </div>

      {/* 2. Perbandingan Periode YoY */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CompareCard
          label="Total Event"
          current={currentYearEvents.length}
          previous={prevYearEvents.length}
        />
        <CompareCard
          label="Event/Bulan"
          current={+(currentYearEvents.length / Math.max(new Date().getMonth() + 1, 1)).toFixed(1)}
          previous={+(prevYearEvents.length / 12).toFixed(1)}
        />
        <CompareCard
          label="Kategori Aktif"
          current={new Set(currentYearEvents.flatMap(e => e.categories.length > 0 ? e.categories : [e.category])).size}
          previous={new Set(prevYearEvents.flatMap(e => e.categories.length > 0 ? e.categories : [e.category])).size}
        />
        <CompareCard
          label="Lokasi Dipakai"
          current={new Set(currentYearEvents.map(e => e.lokasi).filter(Boolean)).size}
          previous={new Set(prevYearEvents.map(e => e.lokasi).filter(Boolean)).size}
        />
      </div>

      {/* 3. Kategori Terpopuler (donut) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kategori Terpopuler</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {analytics.topCategories.slice(0, 6).map(({ name, count, pct }) => (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-[11px] text-slate-600 dark:text-slate-400">{name}</span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[name] || '#6366f1' }}
                />
              </div>
              <p className="text-[10px] text-slate-400">{pct.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Revenue/Model Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Model Event Breakdown</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {analytics.modelBreakdown.map(({ model, count, pct, color }) => (
            <div key={model} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
              <div className={`mb-1 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${color}`}>
                {model}
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{count}</p>
              <p className="text-[10px] text-slate-400">{pct.toFixed(0)}% dari total</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Heatmap Lokasi & Waktu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Top Lokasi</h3>
        </div>
        <div className="space-y-2">
          {analytics.topLocations.slice(0, 8).map(({ name, count, pct }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-28 truncate text-[11px] text-slate-600 dark:text-slate-400">{name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-red-400 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-[11px] font-semibold text-slate-700 dark:text-slate-300">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Occupancy / Jam Populer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Distribusi Waktu Event</h3>
        </div>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
          {analytics.hourDistribution.map(({ hour, count, intensity }) => (
            <div
              key={hour}
              className="flex flex-col items-center rounded-lg p-1.5"
              style={{ backgroundColor: `rgba(99, 102, 241, ${intensity * 0.3})` }}
            >
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{hour}:00</span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-white">{count}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          Jam tersibuk: <span className="font-semibold">{analytics.peakHour}:00</span> ({analytics.peakHourCount} event)
        </p>
      </div>
    </div>
  );
}


/* ─── Monthly Trend Chart (CSS bars) ──────────────────────────── */

function MonthlyTrendChart({ currentYear, prevYear }: { currentYear: number[]; prevYear: number[] }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const max = Math.max(...currentYear, ...prevYear, 1);

  return (
    <div className="flex items-end gap-1 sm:gap-2" style={{ height: '120px' }}>
      {months.map((m, i) => {
        const cur = currentYear[i] ?? 0;
        const prev = prevYear[i] ?? 0;
        return (
          <div key={m} className="flex flex-1 flex-col items-center gap-0.5">
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: '100px' }}>
              {prev > 0 && (
                <div
                  className="w-2 rounded-t bg-slate-200 transition-all duration-700 dark:bg-slate-600"
                  style={{ height: `${(prev / max) * 100}%` }}
                  title={`${prev} event`}
                />
              )}
              <div
                className="w-2 rounded-t bg-violet-500 transition-all duration-700 sm:w-3"
                style={{ height: `${(cur / max) * 100}%`, minHeight: cur > 0 ? '4px' : '0' }}
                title={`${cur} event`}
              />
            </div>
            <span className="text-[9px] text-slate-400">{m}</span>
          </div>
        );
      })}
    </div>
  );
}


/* ─── Compare Card ─────────────────────────────────────────────── */

function CompareCard({ label, current, previous }: { label: string; current: number; previous: number }) {
  const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{current}</p>
      {previous > 0 && (
        <div className={`flex items-center gap-0.5 text-[10px] font-medium ${isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-slate-400'}`}>
          {isUp ? <ArrowUpRight className="h-3 w-3" /> : isDown ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {Math.abs(diff).toFixed(0)}% vs tahun lalu
        </div>
      )}
    </div>
  );
}


/* ─── Analytics computation ────────────────────────────────────── */

function computeAnalytics(events: EventItem[]) {
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  // Monthly trend
  const monthlyTrend = Array(12).fill(0);
  const monthlyTrendPrev = Array(12).fill(0);
  events.forEach(e => {
    const d = new Date(e.dateStr);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (y === currentYear) monthlyTrend[m]++;
    else if (y === prevYear) monthlyTrendPrev[m]++;
  });

  // Top categories
  const catCounts: Record<string, number> = {};
  events.forEach(e => {
    const cats = e.categories.length > 0 ? e.categories : [e.category];
    cats.forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; });
  });
  const totalCats = Object.values(catCounts).reduce((s, v) => s + v, 0) || 1;
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: (count / totalCats) * 100 }));

  // Model breakdown
  const modelCounts = { free: 0, bayar: 0, support: 0, other: 0 };
  events.forEach(e => {
    const m = e.eventModel || '';
    if (m === 'free') modelCounts.free++;
    else if (m === 'bayar') modelCounts.bayar++;
    else if (m === 'support') modelCounts.support++;
    else modelCounts.other++;
  });
  const totalModels = events.length || 1;
  const modelBreakdown = [
    { model: 'Free', count: modelCounts.free, pct: (modelCounts.free / totalModels) * 100, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { model: 'Bayar', count: modelCounts.bayar, pct: (modelCounts.bayar / totalModels) * 100, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    { model: 'Support', count: modelCounts.support, pct: (modelCounts.support / totalModels) * 100, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    { model: 'Lainnya', count: modelCounts.other, pct: (modelCounts.other / totalModels) * 100, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  ];

  // Top locations
  const locCounts: Record<string, number> = {};
  events.forEach(e => {
    const loc = (e.lokasi || '').trim();
    if (loc) locCounts[loc] = (locCounts[loc] ?? 0) + 1;
  });
  const maxLoc = Math.max(...Object.values(locCounts), 1);
  const topLocations = Object.entries(locCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: (count / maxLoc) * 100 }));

  // Hour distribution
  const hourCounts: Record<number, number> = {};
  events.forEach(e => {
    const jam = e.jam || '';
    const match = jam.match(/^(\d{1,2})/);
    if (match && match[1]) {
      const h = parseInt(match[1], 10);
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    }
  });
  const maxHour = Math.max(...Object.values(hourCounts), 1);
  const hourDistribution = [];
  for (let h = 8; h <= 21; h++) {
    const count = hourCounts[h] || 0;
    hourDistribution.push({ hour: h, count, intensity: count / maxHour });
  }
  const peakEntry = hourDistribution.length > 0
    ? hourDistribution.reduce((a, b) => a.count > b.count ? a : b)
    : { hour: 10, count: 0, intensity: 0 };

  return {
    monthlyTrend,
    monthlyTrendPrev,
    topCategories,
    modelBreakdown,
    topLocations,
    hourDistribution,
    peakHour: peakEntry?.hour || 10,
    peakHourCount: peakEntry?.count || 0,
  };
}
