import { Clock, MapPin, Edit2, Trash2, ExternalLink, CalendarDays, FileText } from 'lucide-react';
import { EventItem } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { CategoryBadges } from '../ui/CategoryBadges';
import { PriorityBadge } from '../ui/PriorityBadge';
import { formatDateRange, getMultiDayJamDisplay, isMultiDayEvent, isRecurringEvent } from '../../utils/eventUtils';

interface Props {
  events: EventItem[];
  isAdmin: boolean;
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
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
  draft:    'bg-[var(--wf-accent)] ring-[var(--wf-accent-soft)]',
  ongoing:  'bg-[var(--wf-live)] ring-[var(--wf-live)]/20',
  upcoming: 'bg-[var(--wf-action)] ring-[var(--wf-action)]/20',
  past:     'bg-[var(--wf-rule-strong)] ring-[var(--wf-rule)]',
};

const CARD_ACCENT: Record<string, string> = {
  draft:    'border-[var(--wf-rule)] bg-[var(--wf-accent-soft)]',
  ongoing:  'border-[var(--wf-rule)] bg-[var(--wf-live)]/10',
  upcoming: 'border-[var(--wf-rule)] bg-[var(--wf-action)]/10',
  past:     'border-[var(--wf-rule)] bg-[var(--wf-board-2)]',
};

export function TimelineView({ events, isAdmin, onEdit, onDelete, onDetail }: Props) {
  const grouped = groupByMonth(events);

  if (events.length === 0) {
    return (
      <div 
        className="ui-empty-panel flex flex-col items-center justify-center py-20 text-[var(--wf-ink-muted)]"
        aria-live="polite"
        role="status"
      >
        <CalendarDays className="mb-3 h-10 w-10 opacity-60" aria-hidden="true" />
        <p className="text-sm font-medium">Tidak ada acara ditemukan</p>
        <p className="mt-1 text-xs">Coba ubah filter atau kata kunci pencarian</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {grouped.map(({ month, events: monthEvs }) => (
        <div key={month}>
          {/* Month header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 items-center rounded-[var(--wf-radius-board)] bg-[var(--wf-accent)] px-4">
              <span className="text-xs font-bold text-[var(--wf-accent-ink)]">{month}</span>
            </div>
            <div className="h-px flex-1 bg-[var(--wf-rule)]" />
            <span className="text-xs text-[var(--wf-ink-muted)]">{monthEvs.length} acara</span>
          </div>

          {/* Events for this month */}
          <div className="relative ml-2 space-y-4 border-l-2 border-[var(--wf-rule)] pl-4 sm:ml-4 sm:pl-6">
            {monthEvs.map((ev, idx) => (
              <div key={ev.id} className="relative">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[18px] top-4 h-3.5 w-3.5 rounded-full ring-4 sm:-left-[30px] sm:h-4 sm:w-4 ${DOT_COLOR[ev.status] ?? DOT_COLOR['past']} ${ev.status === 'ongoing' ? 'animate-pulse' : ''}`}
                />

                {/* Card */}
                <div
                  className={`group cursor-pointer rounded-[var(--wf-radius-board)] border p-4 transition ui-focus-ring ${CARD_ACCENT[ev.status] ?? CARD_ACCENT['past']} ${ev.status === 'past' ? 'opacity-80' : ''}`}
                  onClick={() => onDetail(ev)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetail(ev); } }}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: date + name */}
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={ev.status} size="sm" />
                        {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-ink-muted)]">Reguler</span>}
                        <CategoryBadges categories={ev.categories} maxVisible={2} />
                        {isAdmin && <PriorityBadge priority={ev.priority} />}
                      </div>
                      <p className="font-bold text-[var(--wf-ink)]">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--wf-ink-muted)]">{ev.keterangan}</p>
                      )}
                    </div>

                    {/* Right: meta + actions */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="text-right text-xs text-[var(--wf-ink-muted)]">
                        <p className="font-semibold text-[var(--wf-ink)]">{isMultiDayEvent(ev) ? formatDateRange(ev.dateStr, ev.dateEnd) : `${ev.day}, ${ev.tanggal}`}</p>
                        {(isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : ev.jam) && (
                          <p className="mt-0.5 flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" /> {isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : ev.jam}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onDetail(ev)}
                          className="rounded-lg min-h-[36px] min-w-[36px] p-1.5 text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]"
                          aria-label="Lihat detail"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {(onEdit || onDelete) && (
                          <>
                            {onEdit && (
                            <button
                              onClick={() => onEdit(ev)}
                              className="rounded-lg min-h-[36px] min-w-[36px] p-1.5 text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-accent-soft)] hover:text-[var(--wf-accent)]"
                              aria-label='Ubah acara'
                            >
                              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            )}
                            {onDelete && (
                            <button
                              onClick={() => onDelete(ev)}
                              className="rounded-lg min-h-[36px] min-w-[36px] p-1.5 text-[var(--wf-ink-muted)] transition hover:bg-red-600/10 hover:text-red-700 dark:hover:text-red-300"
                              aria-label="Hapus acara"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: location & EO */}
<div className="mt-3 flex flex-wrap gap-3 border-t border-[var(--wf-rule)] pt-2 text-xs text-[var(--wf-ink-muted)] ">
                      {ev.lokasi && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {ev.lokasi}
                        </span>
                      )}
                      {ev.eo && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {ev.eo}</span>}
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
