import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, CalendarDays } from 'lucide-react';
import { AnnualTheme } from '../types';

interface Props {
  themes: AnnualTheme[];
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function formatDate(str: string) {
  const [, m, d] = str.split('-');
  return `${d} ${MONTH_ABBR[parseInt(m) - 1]}`;
}

function calcProgress(start: string, end: string, today: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const t = new Date(today).getTime();
  if (t <= s) return 0;
  if (t >= e) return 100;
  return Math.round(((t - s) / (e - s)) * 100);
}

export function QuarterTimeline({ themes }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedThemeId, setSelectedThemeId] = useState('');

  const activeTheme = useMemo(
    () => themes.find(t => today >= t.dateStart && today <= t.dateEnd) ?? themes[0],
    [themes, today]
  );

  useEffect(() => {
    if (activeTheme) {
      setSelectedThemeId(activeTheme.id);
    }
  }, [activeTheme]);

  const selectedTheme = themes.find(t => t.id === selectedThemeId) ?? activeTheme;
  const themeYear = themes[0]?.dateStart?.slice(0, 4) ?? new Date().getFullYear().toString();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white"><CalendarDays className="h-4 w-4 text-violet-500" />Tema Tahunan {themeYear}</p>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {themes.filter(t => today >= t.dateStart && today <= t.dateEnd).length > 0
            ? '● Tema aktif'
            : 'Tidak ada tema aktif'}
        </span>
      </div>

      <div className="sm:hidden">
        {selectedTheme && (
          <>
            <div className="relative">
              <select
                value={selectedTheme.id}
                onChange={e => setSelectedThemeId(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
              >
                {themes.map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div
              className="mt-3 rounded-xl p-4"
              style={{
                backgroundColor: `${selectedTheme.color}18`,
                borderLeft: `3px solid ${selectedTheme.color}`,
                ...(today >= selectedTheme.dateStart && today <= selectedTheme.dateEnd
                  ? { boxShadow: `0 0 0 2px ${selectedTheme.color}33` }
                  : {}),
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedTheme.color }} />
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{selectedTheme.name}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {formatDate(selectedTheme.dateStart)} - {formatDate(selectedTheme.dateEnd)}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${calcProgress(selectedTheme.dateStart, selectedTheme.dateEnd, today)}%`,
                    backgroundColor: selectedTheme.color,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden flex-col gap-2.5 sm:flex sm:flex-row sm:gap-3">
        {themes.map(theme => {
          const isActive = today >= theme.dateStart && today <= theme.dateEnd;
          const isPast   = today > theme.dateEnd;
          const progress = calcProgress(theme.dateStart, theme.dateEnd, today);

          return (
            <div
              key={theme.id}
              className={`relative flex-1 rounded-xl p-4 transition-all duration-200 ${
                isActive
                  ? 'ring-2 shadow-sm'
                  : isPast
                  ? 'opacity-60'
                  : 'opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: `${theme.color}18`,
                borderLeft: `3px solid ${theme.color}`,
                ...(isActive ? { boxShadow: `0 0 0 2px ${theme.color}55` } : {}),
              }}
            >
              {/* Live pulse dot */}
              {isActive && (
                <div
                  className="absolute right-3 top-3 h-2 w-2 rounded-full live-dot"
                  style={{ backgroundColor: theme.color }}
                />
              )}

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: theme.color }} />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{theme.name}</p>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {formatDate(theme.dateStart)} – {formatDate(theme.dateEnd)}
              </p>

              {/* Progress bar */}
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, backgroundColor: theme.color }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                {isActive && (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: theme.color }}
                  >
                    ✦ Aktif
                  </span>
                )}
                {!isActive && !isPast && (
                  <span className="text-[10px] text-slate-400">Mendatang</span>
                )}
                {isPast && (
                  <span className="text-[10px] text-slate-400">Selesai</span>
                )}
                <span className="text-[10px] font-semibold" style={{ color: theme.color }}>
                  {progress}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
