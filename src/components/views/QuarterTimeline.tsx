import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { AnnualTheme } from '../../types';

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
    <div className="ui-dashboard-surface p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--wf-ink)]"><CalendarDays className="h-4 w-4 shrink-0 text-[var(--wf-accent)]" />Tema Tahunan {themeYear}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 self-start text-xs text-[var(--wf-ink-muted)] sm:self-auto">
            {themes.filter(t => today >= t.dateStart && today <= t.dateEnd).length > 0
              ? 'Tema aktif'
              : 'Tidak ada tema aktif'}
          </span>
          {isAdmin && onAddTheme && (
            <button onClick={onAddTheme} className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-rule)] px-2.5 py-1.5 text-xs font-medium text-[var(--wf-accent)] transition-colors hover:bg-[var(--wf-accent-soft)]">
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
                className="h-11 w-full appearance-none rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-4 pr-10 text-sm font-medium text-[var(--wf-ink)] outline-none transition-colors focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
              >
                {themes.map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" />
            </div>

            <div
              className="mt-3 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] p-4"
              style={{
                backgroundColor: `${selectedTheme.color}18`,
                ...(today >= selectedTheme.dateStart && today <= selectedTheme.dateEnd
                  ? { borderColor: 'var(--wf-live)', boxShadow: `0 0 0 2px ${selectedTheme.color}33` }
                  : {}),
              }}
            >
              <div className="flex min-w-0 items-start gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedTheme.color }} />
                <p className="min-w-0 line-clamp-2 text-sm font-bold leading-snug text-[var(--wf-ink)]">{selectedTheme.name}</p>
              </div>
              {isAdmin && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {onEditTheme && <button type="button" onClick={() => onEditTheme(selectedTheme)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-rule)] px-2.5 py-1.5 text-xs font-medium text-[var(--wf-ink)] transition-colors hover:bg-[var(--wf-board-2)]"><Pencil className="h-3.5 w-3.5" />Ubah</button>}
                  {onDeleteTheme && <button type="button" onClick={() => onDeleteTheme(selectedTheme)} className="inline-flex items-center gap-1 rounded-lg border border-red-600/20 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-600/10 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" />Hapus</button>}
                </div>
              )}
              <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
                {formatDate(selectedTheme.dateStart)} - {formatDate(selectedTheme.dateEnd)}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--wf-rule-strong)]">
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
              className={`relative min-w-0 rounded-[var(--wf-radius-board)] border p-4 transition-colors duration-200 ${
                isActive
                  ? 'border-[var(--wf-live)]'
                  : isPast
                  ? 'border-[var(--wf-rule)] opacity-60'
                  : 'border-[var(--wf-rule)] opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: `${theme.color}18`,
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
                  {onEditTheme && <button type="button" onClick={() => onEditTheme(theme)} className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] p-1 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)]"><Pencil className="h-3.5 w-3.5" /></button>}
                  {onDeleteTheme && <button type="button" onClick={() => onDeleteTheme(theme)} className="rounded-lg border border-red-600/20 bg-[var(--wf-board)] p-1 text-red-700 transition-colors hover:bg-red-600/10 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              )}

              <div className="flex min-w-0 items-start gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: theme.color }} />
                <p className="min-w-0 line-clamp-2 text-xs font-bold leading-snug text-[var(--wf-ink)]">{theme.name}</p>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--wf-ink-muted)]">
                {formatDate(theme.dateStart)} - {formatDate(theme.dateEnd)}
              </p>

              {/* Progress bar */}
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--wf-rule-strong)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, backgroundColor: theme.color }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isActive && (
                  <span className="wf-key wf-key--live wf-key--plain">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    Aktif
                  </span>
                )}
                {!isActive && !isPast && (
                  <span className="text-[10px] text-[var(--wf-ink-muted)]">Mendatang</span>
                )}
                {isPast && (
                  <span className="text-[10px] text-[var(--wf-ink-muted)]">Selesai</span>
                )}
                <span className="ml-auto text-[10px] font-semibold text-[var(--wf-ink-muted)]">
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
