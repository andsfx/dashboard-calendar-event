import { CalendarDays, ChevronRight } from 'lucide-react';
import { AnnualTheme } from '../../types';
import { getTodayIsoLocal, parseIsoDateLocal } from '../../utils/eventDateTime';

interface AnnualTimelineProps {
  themes: AnnualTheme[];
}

function formatDateShort(dateStr: string): string {
  const d = parseIsoDateLocal(dateStr);
  if (!d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getSeasonStatus(theme: AnnualTheme): 'active' | 'upcoming' | 'past' {
  const todayStr = getTodayIsoLocal();
  if (todayStr < theme.dateStart) return 'upcoming';
  if (todayStr > theme.dateEnd) return 'past';
  return 'active';
}

export default function AnnualTimeline({ themes }: AnnualTimelineProps) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-5 h-5 text-[var(--wf-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--wf-ink-muted)] uppercase tracking-wider">
          Tema Tahunan 2026
        </h3>
      </div>

      {/* Desktop horizontal timeline */}
      <div className="hidden lg:block bg-[var(--wf-board)] rounded-2xl border border-[var(--wf-rule)] p-6 shadow-sm">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--wf-rule)]" />

          <div className="grid grid-cols-8 gap-2 relative">
            {themes.map((theme, index) => {
              const status = getSeasonStatus(theme);
              return (
                <div key={theme.id} className="flex flex-col items-center text-center">
                  {/* Dot */}
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                    status === 'active'
                      ? 'border-[var(--wf-board)] shadow-lg scale-110'
                      : status === 'past'
                      ? 'border-[var(--wf-rule)] opacity-40'
                      : 'border-[var(--wf-rule)]'
                  }`} style={{
                    backgroundColor: status === 'past' ? '#94a3b8' : theme.color,
                  }}>
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                    {status === 'active' && (
                      <span className="absolute inset-0 w-10 h-10 rounded-full animate-ping opacity-20" style={{ backgroundColor: theme.color }} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-3 space-y-1">
                    <p className={`text-xs font-bold leading-tight ${
                      status === 'active'
                        ? 'text-[var(--wf-ink)]'
                        : status === 'past'
                        ? 'text-[var(--wf-ink-muted)]'
                        : 'text-[var(--wf-ink-muted)]'
                    }`}>
                      {theme.name}
                    </p>
                    <p className="text-[10px] text-[var(--wf-ink-muted)]">
                      {formatDateShort(theme.dateStart)}
                    </p>
                    <ChevronRight className="w-3 h-3 text-[var(--wf-ink-muted)] mx-auto rotate-90" />
                    <p className="text-[10px] text-[var(--wf-ink-muted)]">
                      {formatDateShort(theme.dateEnd)}
                    </p>
                    {status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.color }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        NOW
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile / Tablet - scrollable cards */}
      <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {themes.map((theme) => {
          const status = getSeasonStatus(theme);
          return (
            <div
              key={theme.id}
              className={`flex-shrink-0 w-48 snap-start rounded-xl p-4 transition-all bg-[var(--wf-board)] ${
                status === 'active'
                  ? 'border-2 shadow-lg'
                  : status === 'past'
                  ? 'border border-[var(--wf-rule)] opacity-40'
                  : 'border border-[var(--wf-rule)]'
              }`}
              style={{
                borderColor: status === 'active' ? theme.color : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }} />
                {status === 'active' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: theme.color }}>
                    NOW
                  </span>
                )}
              </div>
              <p className={`text-sm font-bold ${
                status === 'past' ? 'text-[var(--wf-ink-muted)]' : 'text-[var(--wf-ink)]'
              }`}>
                {theme.name}
              </p>
              <p className="text-xs text-[var(--wf-ink-muted)] mt-1">
                {formatDateShort(theme.dateStart)} — {formatDateShort(theme.dateEnd)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
