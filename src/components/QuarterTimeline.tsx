import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { AnnualTheme } from '../types';

interface Props {
  themes: AnnualTheme[];
  isAdmin?: boolean;
  onAddTheme?: () => void;
  onEditTheme?: (theme: AnnualTheme) => void;
  onDeleteTheme?: (theme: AnnualTheme) => void;
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function formatDate(str: string) {
  const [, m, d] = str.split('-');
  const monthIndex = parseInt(m ?? '1') - 1;
  const monthName = MONTH_ABBR[monthIndex];
  return `${d ?? ''} ${monthName ?? ''}`;
}

function calcProgress(start: string, end: string, today: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const t = new Date(today).getTime();
  if (t <= s) return 0;
  if (t >= e) return 100;
  return Math.round(((t - s) / (e - s)) * 100);
}

export function QuarterTimeline({ themes, isAdmin = false, onAddTheme, onEditTheme, onDeleteTheme }: Props) {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const [selectedThemeId, setSelectedThemeId] = useState('');

  const activeTheme = useMemo(
    () => {
      const found = themes.find(t => today >= t.dateStart && today <= t.dateEnd);
      return found ?? themes[0];
    },
    [themes, today]
  );

  useEffect(() => {
    if (activeTheme) {
      setSelectedThemeId(activeTheme.id);
    }
  }, [activeTheme]);

  const selectedTheme = themes.find(t => t.id === selectedThemeId) ?? activeTheme;
  const firstTheme = themes[0];
  const themeYear = firstTheme?.dateStart?.slice(0, 4) ?? new Date().getFullYear().toString();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700 dark:text-white"><CalendarDays className="h-4 w-4 shrink-0 text-violet-500" />Tema Tahunan {themeYear}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 self-start text-xs text-slate-400 dark:text-slate-500 sm:self-auto">
            {themes.filter(t => today >= t.dateStart && today <= t.dateEnd).length > 0
              ? 'Tema aktif'
              : 'Tidak ada tema aktif'}
          </span>
          {isAdmin && onAddTheme && (
            <button onClick={onAddTheme} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-medium text-violet-600 transition hover:bg-violet-50 dark:border-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-900/20">
              <Plus className="h-3.5 w-3.5" />Tambah Tema
            </button>
          )}
        </div>
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
              <div className="flex min-w-0 items-start gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedTheme.color }} />
                <p className="min-w-0 line-clamp-2 text-sm font-bold leading-snug text-slate-800 dark:text-slate-100">{selectedTheme.name}</p>
              </div>
              {isAdmin && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {onEditTheme && <button type="button" onClick={() => onEditTheme(selectedTheme)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/30"><Pencil className="h-3.5 w-3.5" />Edit</button>}
                  {onDeleteTheme && <button type="button" onClick={() => onDeleteTheme(selectedTheme)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-900/20"><Trash2 className="h-3.5 w-3.5" />Hapus</button>}
                </div>
              )}
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

      <div className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {themes.map(theme => {
          const isActive = today >= theme.dateStart && today <= theme.dateEnd;
          const isPast   = today > theme.dateEnd;
          const progress = calcProgress(theme.dateStart, theme.dateEnd, today);

          return (
            <div
              key={theme.id}
              className={`relative min-w-0 rounded-xl p-4 transition-all duration-200 ${
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
              {isAdmin && (
                <div className="absolute right-3 top-3 flex gap-1">
                  {onEditTheme && <button type="button" onClick={() => onEditTheme(theme)} className="rounded-lg border border-slate-200 bg-white/90 p-1 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"><Pencil className="h-3.5 w-3.5" /></button>}
                  {onDeleteTheme && <button type="button" onClick={() => onDeleteTheme(theme)} className="rounded-lg border border-rose-200 bg-white/90 p-1 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-800/80 dark:text-rose-300 dark:hover:bg-rose-900/20"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              )}

              <div className="flex min-w-0 items-start gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: theme.color }} />
                <p className="min-w-0 line-clamp-2 text-xs font-bold leading-snug text-slate-800 dark:text-slate-100">{theme.name}</p>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {formatDate(theme.dateStart)} - {formatDate(theme.dateEnd)}
              </p>

              {/* Progress bar */}
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, backgroundColor: theme.color }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isActive && (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: theme.color }}
                  >
                    Aktif
                  </span>
                )}
                {!isActive && !isPast && (
                  <span className="text-[10px] text-slate-400">Mendatang</span>
                )}
                {isPast && (
                  <span className="text-[10px] text-slate-400">Selesai</span>
                )}
                <span className="ml-auto text-[10px] font-semibold" style={{ color: theme.color }}>
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
