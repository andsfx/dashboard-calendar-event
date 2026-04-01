import { useState } from 'react';
import { BarChart3, Inbox } from 'lucide-react';
import { EventItem } from '../types';
import { CATEGORY_COLORS } from '../utils/eventUtils';

interface Props {
  events: EventItem[];
}

export function CategoryChart({ events }: Props) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const counts: Record<string, number> = {};
  events.forEach(event => {
    const categories = event.categories.length > 0 ? event.categories : [event.category];
    categories.forEach(category => {
      counts[category] = (counts[category] ?? 0) + 1;
    });
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || 1;
  const max = sorted[0]?.[1] ?? 1;

  // Donut segments
  const donutData = sorted.slice(0, 6);
  let cumPercent = 0;
  const segments = donutData.map(([cat, count]) => {
    const pct = (count / total) * 100;
    const seg = { cat, count, pct, offset: cumPercent };
    cumPercent += pct;
    return seg;
  });

  const r = 38;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700 dark:text-white"><BarChart3 className="h-4 w-4 shrink-0 text-violet-500" /><span className="truncate">Distribusi Kategori</span></p>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          {sorted.length} kategori
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <Inbox className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-xs">Belum ada data</p>
        </div>
      ) : (
        <>
          {/* SVG Donut chart */}
          <div className="mb-5 flex items-center justify-center">
            <svg width="96" height="96" viewBox="0 0 100 100" className="overflow-visible sm:h-[110px] sm:w-[110px]">
              {/* Background circle */}
              <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="14"
                className="text-slate-100 dark:text-slate-700" />

              {segments.map((seg, i) => {
                const color = CATEGORY_COLORS[seg.cat] ?? '#6366f1';
                const dashArray = (seg.pct / 100) * circumference;
                const dashOffset = circumference - (seg.offset / 100) * circumference;
                const isHovered = hoveredCat === seg.cat;
                return (
                  <circle
                    key={i}
                    cx="50" cy="50" r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHovered ? 17 : 14}
                    strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-width 0.2s ease, stroke-dasharray 0.5s ease' }}
                    transform="rotate(-90 50 50)"
                    onMouseEnter={() => setHoveredCat(seg.cat)}
                    onMouseLeave={() => setHoveredCat(null)}
                    className="cursor-pointer"
                  />
                );
              })}

              {/* Center label */}
              <text x="50" y="46" textAnchor="middle" fontSize="13" fontWeight="bold"
                className="fill-slate-800 dark:fill-white select-none"
                style={{ fill: 'currentColor' }}>
                {hoveredCat
                  ? counts[hoveredCat] ?? 0
                  : total}
              </text>
              <text x="50" y="58" textAnchor="middle" fontSize="7"
                style={{ fill: '#94a3b8' }}
                className="select-none">
                {hoveredCat ? hoveredCat.slice(0, 8) : 'total'}
              </text>
            </svg>
          </div>

          {/* Bar chart list */}
          <div className="space-y-2.5">
            {sorted.map(([cat, count]) => {
              const color = CATEGORY_COLORS[cat] ?? '#6366f1';
              const pct = Math.round((count / max) * 100);
              const isHov = hoveredCat === cat;
              return (
                <div
                  key={cat}
                  onMouseEnter={() => setHoveredCat(cat)}
                  onMouseLeave={() => setHoveredCat(null)}
                  className={`cursor-default rounded-lg px-1 py-0.5 transition-colors ${isHov ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full transition-transform duration-150"
                        style={{ backgroundColor: color, transform: isHov ? 'scale(1.4)' : 'scale(1)' }}
                      />
                      <span className={`truncate font-medium ${isHov ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                        {cat}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-slate-400">{Math.round((count / total) * 100)}%</span>
                      <span className="w-4 text-right font-bold text-slate-800 dark:text-white">{count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        opacity: isHov ? 1 : 0.75,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
