import { useState } from 'react';
import { EventItem } from '../types';
import { CATEGORY_COLORS } from '../utils/eventUtils';

interface Props {
  events: EventItem[];
}

export function CategoryChart({ events }: Props) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const counts: Record<string, number> = {};
  events.forEach(e => { counts[e.category] = (counts[e.category] ?? 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = events.length || 1;

  const topCategories = sorted.slice(0, 5);
  const otherCount = sorted.slice(5).reduce((sum, [, c]) => sum + c, 0);

  const r = 36;
  const circumference = 2 * Math.PI * r;
  let cumPercent = 0;
  const segments = topCategories.map(([cat, count]) => {
    const pct = (count / total) * 100;
    const seg = { cat, count, pct, offset: cumPercent };
    cumPercent += pct;
    return seg;
  });

  if (otherCount > 0) {
    segments.push({ cat: 'Lainnya', count: otherCount, pct: (otherCount / total) * 100, offset: cumPercent });
  }

  const displayData = otherCount > 0 
    ? [...topCategories, ['Lainnya', otherCount] as [string, number]] 
    : sorted;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-700 dark:text-white">📊 Distribusi Kategori</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          {sorted.length}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <div className="mb-2 text-2xl opacity-50">📭</div>
          <p className="text-xs">Belum ada data</p>
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Donut Chart */}
          <div className="shrink-0">
            <svg width="90" height="90" viewBox="0 0 100 100" className="overflow-visible">
              <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="12"
                className="text-slate-100 dark:text-slate-700" />
              
              {segments.map((seg, i) => {
                const color = seg.cat === 'Lainnya' ? '#94a3b8' : (CATEGORY_COLORS[seg.cat] ?? '#6366f1');
                const dashArray = (seg.pct / 100) * circumference;
                const dashOffset = circumference - (seg.offset / 100) * circumference;
                const isHovered = hoveredCat === seg.cat;
                return (
                  <circle
                    key={i}
                    cx="50" cy="50" r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHovered ? 14 : 12}
                    strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-width 0.2s ease' }}
                    transform="rotate(-90 50 50)"
                    onMouseEnter={() => setHoveredCat(seg.cat)}
                    onMouseLeave={() => setHoveredCat(null)}
                    className="cursor-pointer"
                  />
                );
              })}

              <text x="50" y="48" textAnchor="middle" fontSize="14" fontWeight="bold"
                className="fill-slate-800 dark:fill-white">
                {hoveredCat ? counts[hoveredCat] ?? 0 : total}
              </text>
              <text x="50" y="60" textAnchor="middle" fontSize="6"
                className="fill-slate-400">
                {hoveredCat ? 'event' : 'total'}
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {displayData.slice(0, 6).map(([cat, count]) => {
              const color = cat === 'Lainnya' ? '#94a3b8' : (CATEGORY_COLORS[cat] ?? '#6366f1');
              const pct = Math.round((count / total) * 100);
              const isHov = hoveredCat === cat;
              return (
                <div
                  key={cat}
                  onMouseEnter={() => setHoveredCat(cat)}
                  onMouseLeave={() => setHoveredCat(null)}
                  className={`cursor-default rounded px-1.5 py-1 transition-colors ${isHov ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className={`truncate ${isHov ? 'text-slate-800 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                        {cat}
                      </span>
                    </div>
                    <span className="text-slate-400 font-medium">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}