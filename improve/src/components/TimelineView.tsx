import { Clock, MapPin, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { EventItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { CategoryBadge } from './CategoryBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  events: EventItem[];
  isAdmin: boolean;
  onEdit: (ev: EventItem) => void;
  onDelete: (ev: EventItem) => void;
  onDetail: (ev: EventItem) => void;
}

// Group events by month label
function groupByMonth(events: EventItem[]): Array<{ month: string; events: EventItem[] }> {
  const map = new Map<string, EventItem[]>();
  for (const ev of events) {
    const key = `${ev.month} ${ev.dateStr.split('-')[0]}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries()).map(([month, evs]) => ({ month, events: evs }));
}

const DOT_COLOR: Record<string, string> = {
  ongoing:  'bg-emerald-500 ring-emerald-200 dark:ring-emerald-800',
  upcoming: 'bg-amber-500 ring-amber-200 dark:ring-amber-800',
  past:     'bg-slate-400 ring-slate-200 dark:ring-slate-700',
};

const CARD_ACCENT: Record<string, string> = {
  ongoing:  'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10',
  upcoming: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
  past:     'border-l-slate-400 bg-slate-50/50 dark:bg-slate-800/20',
};

export function TimelineView({ events, isAdmin, onEdit, onDelete, onDetail }: Props) {
  const grouped = groupByMonth(events);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-3 text-5xl">📅</div>
        <p className="text-sm font-medium">Tidak ada acara ditemukan</p>
        <p className="mt-1 text-xs">Coba ubah filter atau kata kunci pencarian</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(({ month, events: monthEvs }) => (
        <div key={month}>
          {/* Month header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 items-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4">
              <span className="text-xs font-bold text-white">{month}</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
            <span className="text-xs text-slate-400">{monthEvs.length} acara</span>
          </div>

          {/* Events for this month */}
          <div className="relative ml-4 border-l-2 border-slate-200 pl-6 space-y-4 dark:border-slate-700">
            {monthEvs.map((ev, idx) => (
              <div key={ev.id} className="relative">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[30px] top-4 h-4 w-4 rounded-full ring-4 ${DOT_COLOR[ev.status]} ${ev.status === 'ongoing' ? 'animate-pulse' : ''}`}
                />

                {/* Card */}
                <div
                  className={`group cursor-pointer rounded-xl border border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-slate-800 ${CARD_ACCENT[ev.status]} ${ev.status === 'past' ? 'opacity-70' : ''}`}
                  onClick={() => onDetail(ev)}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: date + name */}
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={ev.status} size="sm" />
                        <CategoryBadge category={ev.category} />
                        <PriorityBadge priority={ev.priority} />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-white">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{ev.keterangan}</p>
                      )}
                    </div>

                    {/* Right: meta + actions */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{ev.day}, {ev.tanggal}</p>
                        {ev.jam && (
                          <p className="mt-0.5 flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" /> {ev.jam}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onDetail(ev)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onEdit(ev)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(ev)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: location & EO */}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                    {ev.lokasi && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {ev.lokasi}
                      </span>
                    )}
                    {ev.eo && <span>📋 {ev.eo}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
