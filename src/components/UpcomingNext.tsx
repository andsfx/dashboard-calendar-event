import { CalendarDays, Clock, MapPin, Users, ArrowRight } from 'lucide-react';
import { EventItem } from '../types';
import { parseIsoDateLocal } from '../utils/eventDateTime';

interface UpcomingNextProps {
  events: EventItem[];
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDate = parseIsoDateLocal(dateStr);
  if (!eventDate) return 0;
  const diff = eventDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function UpcomingNext({ events }: UpcomingNextProps) {
  const upcoming = events
    .filter(e => e.status === 'upcoming')
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '280ms' }}>
      <div className="flex items-center gap-2 mb-4">
        <ArrowRight className="w-5 h-5 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Akan Datang
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {upcoming.map((event, index) => {
          const daysUntil = getDaysUntil(event.dateStr);
          return (
            <div
              key={event.id}
              className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
              style={{ animationDelay: `${300 + index * 80}ms` }}
            >
              {/* Days countdown */}
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-800">
                  <CalendarDays className="w-3 h-3" />
                  {daysUntil === 0 ? 'Hari Ini' : daysUntil === 1 ? 'Besok' : `${daysUntil} Hari Lagi`}
                </span>
              </div>

              {/* Event name */}
              <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-snug line-clamp-2 mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {event.acara}
              </h4>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                  <span>{event.day}, {event.tanggal}</span>
                </div>
                {event.jam && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span>{event.jam}</span>
                  </div>
                )}
                {event.lokasi && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                    <span className="truncate">{event.lokasi}</span>
                  </div>
                )}
                {event.eo && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{event.eo}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
