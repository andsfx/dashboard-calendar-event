import { memo } from 'react';
import { Clock, MapPin, Users, Zap, Sparkles, CalendarDays } from 'lucide-react';
import { EventItem, AnnualTheme } from '../types';
import { useEffect, useState } from 'react';
import { getTodayIsoLocal, parseIsoDateLocal, parseTimeRange } from '../utils/eventDateTime';

interface FeaturedEventCardProps {
  events: EventItem[];
  annualThemes: AnnualTheme[];
}

function getProgress(jam: string): number {
  const range = parseTimeRange(jam);
  if (!range) return 50;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = range.startHour * 60 + range.startMin;
  const endMinutes = range.endHour * 60 + range.endMin;
  const total = endMinutes - startMinutes;
  if (total <= 0) return 50;
  const elapsed = currentMinutes - startMinutes;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function getActiveThemes(themes: AnnualTheme[]): AnnualTheme[] {
  const todayStr = getTodayIsoLocal();
  return themes.filter(t => todayStr >= t.dateStart && todayStr <= t.dateEnd);
}

function getThemeProgress(theme: AnnualTheme): number {
  const now = new Date();
  const start = new Date(theme.dateStart + 'T00:00:00');
  const end = new Date(theme.dateEnd + 'T23:59:59');
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function formatDateShort(dateStr: string): string {
  const d = parseIsoDateLocal(dateStr);
  if (!d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const FeaturedEventCard = memo(function FeaturedEventCard({ events, annualThemes }: FeaturedEventCardProps) {
  const ongoingEvents = events.filter(e => e.status === 'ongoing');
  const activeThemes = getActiveThemes(annualThemes);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    function updateProgress() {
      const p: Record<string, number> = {};
      ongoingEvents.forEach(e => {
        p[e.id] = getProgress(e.jam);
      });
      setProgress(p);
    }
    updateProgress();
    const interval = setInterval(updateProgress, 60000);
    return () => clearInterval(interval);
  }, [events]);

  return (
    <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
      {/* Active Annual Themes */}
      {activeThemes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tema Tahunan Aktif
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeThemes.map(theme => {
              const prog = getThemeProgress(theme);
              return (
                <div
                  key={theme.id}
                  className="relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{ background: `linear-gradient(135deg, ${theme.color}, transparent)` }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: theme.color }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.color }}>
                        Musim Aktif
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">{theme.name}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{formatDateShort(theme.dateStart)} — {formatDateShort(theme.dateEnd)}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{Math.round(prog)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${prog}%`, backgroundColor: theme.color }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ongoing Events */}
      {ongoingEvents.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sedang Berlangsung</h3>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-sm">Tidak ada acara yang sedang berlangsung saat ini.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sedang Berlangsung ({ongoingEvents.length})
            </h3>
          </div>
          {ongoingEvents.map(event => (
            <div
              key={event.id}
              className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-2xl p-6 shadow-xl shadow-indigo-600/20 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-400/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold mb-2 backdrop-blur-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE NOW
                    </span>
                    <h4 className="text-xl font-bold mt-1">{event.acara}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div className="flex items-center gap-2 text-white/80">
                    <Clock className="w-4 h-4" />
                    <span>{event.jam}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <MapPin className="w-4 h-4" />
                    <span>{event.lokasi || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Users className="w-4 h-4" />
                    <span>{event.eo || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <CalendarDays className="w-4 h-4" />
                    <span>{event.day}, {event.tanggal}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-white/50 mb-1.5">
                    <span>Progress Acara</span>
                    <span>{Math.round(progress[event.id] || 0)}%</span>
                  </div>
                  <div className="h-2 bg-white/15 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-300 to-violet-300 rounded-full transition-all duration-1000"
                      style={{ width: `${progress[event.id] || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
});

export default FeaturedEventCard;
