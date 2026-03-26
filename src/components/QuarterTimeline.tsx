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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700 dark:text-white">🗓 Tema Tahunan 2025</p>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {themes.filter(t => today >= t.dateStart && today <= t.dateEnd).length > 0
            ? '● Tema aktif'
            : 'Tidak ada tema aktif'}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
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
