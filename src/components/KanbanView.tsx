import { Clock, MapPin, Edit2, Trash2, ExternalLink, FileText, Radio, Clock3, CheckCircle2, PenSquare, Inbox } from 'lucide-react';
import { EventItem, EventStatus } from '../types';
import { CategoryBadges } from './CategoryBadges';
import { PriorityBadge } from './PriorityBadge';
import { CATEGORY_COLORS, isRecurringEvent } from '../utils/eventUtils';

const COLUMNS: Array<{
  status: EventStatus;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  cardBorder: string;
  emptyMsg: string;
}> = [
  {
    status: 'draft',
    label: 'Draft',
    icon: <PenSquare className="h-4 w-4" />,
    gradient: 'from-purple-500 to-violet-500',
    cardBorder: 'border-purple-100 dark:border-purple-800/40 hover:border-purple-300 dark:hover:border-purple-600/60',
    emptyMsg: 'Tidak ada event draft',
  },
  {
    status: 'ongoing',
    label: 'Berlangsung',
    icon: <Radio className="h-4 w-4" />,
    gradient: 'from-emerald-500 to-teal-500',
    cardBorder: 'border-emerald-100 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-600/60',
    emptyMsg: 'Tidak ada acara yang sedang berlangsung',
  },
  {
    status: 'upcoming',
    label: 'Mendatang',
    icon: <Clock3 className="h-4 w-4" />,
    gradient: 'from-amber-500 to-orange-500',
    cardBorder: 'border-amber-100 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-600/60',
    emptyMsg: 'Tidak ada acara mendatang',
  },
  {
    status: 'past',
    label: 'Selesai',
    icon: <CheckCircle2 className="h-4 w-4" />,
    gradient: 'from-slate-400 to-slate-500',
    cardBorder: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500',
    emptyMsg: 'Belum ada acara yang selesai',
  },
];


interface Props {
  events: EventItem[];
  isAdmin: boolean;
  onEdit: (ev: EventItem) => void;
  onDelete: (ev: EventItem) => void;
  onDetail: (ev: EventItem) => void;
}

function EventCard({
  ev, isAdmin, onEdit, onDelete, onDetail, cardBorder,
}: {
  ev: EventItem; isAdmin: boolean;
  onEdit: (e: EventItem) => void;
  onDelete: (e: EventItem) => void;
  onDetail: (e: EventItem) => void;
  cardBorder: string;
}) {
  const color = CATEGORY_COLORS[ev.category] ?? '#6366f1';

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900 ${ev.status === 'past' ? 'opacity-65' : ''} ${cardBorder}`}
      onClick={() => onDetail(ev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetail(ev); } }}
      aria-label={`${ev.acara} — ${ev.tanggal}`}
    >
      {/* Color top bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />

      <div className="p-4">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-white line-clamp-2 flex-1">{ev.acara}</p>
          {/* Action buttons */}
          <div
            className="flex shrink-0 gap-0.5 opacity-100 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onDetail(ev)}
              title="Lihat detail"
              aria-label="Lihat detail"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(ev)}
                  title="Edit"
                  aria-label="Edit acara"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                >
                  <Edit2 className="h-3 w-3" aria-hidden="true" />
                </button>
                <button
                  onClick={() => onDelete(ev)}
                  title="Hapus"
                  aria-label="Hapus acara"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-200">{ev.tanggal}</p>
          {ev.jam && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{ev.jam}</span>
            </div>
          )}
          {ev.lokasi && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{ev.lokasi}</span>
            </div>
          )}
        </div>

        {ev.keterangan && (
          <p className="mt-2 line-clamp-2 text-xs text-slate-400 leading-relaxed">{ev.keterangan}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-700">
          <CategoryBadges categories={ev.categories} maxVisible={2} />
          <PriorityBadge priority={ev.priority} />
          {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">Reguler</span>}
        </div>
      </div>
    </div>
  );
}

export function KanbanView({ events, isAdmin, onEdit, onDelete, onDetail }: Props) {
  const visibleColumns = isAdmin ? COLUMNS : COLUMNS.filter(col => col.status !== 'draft');

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50">
        <FileText className="mb-3 h-10 w-10 opacity-60" />
        <p className="text-sm font-medium">Tidak ada acara ditemukan</p>
        <p className="mt-1 text-xs">Coba ubah filter atau kata kunci pencarian</p>
      </div>
    );
  }

  return (
    <div className={`flex gap-4 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0 ${visibleColumns.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
      {visibleColumns.map(col => {
        const colEvents = events.filter(e => e.status === col.status);
        return (
          <div key={col.status} className="flex min-w-[280px] flex-col gap-3 lg:min-w-0">
            {/* Column header */}
            <div className={`flex items-center gap-2.5 rounded-xl bg-gradient-to-r px-4 py-2.5 text-white ${col.gradient}`}>
              <span className="text-sm">{col.icon}</span>
              <span className="text-sm font-bold">{col.label}</span>
              <span className="ml-auto rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                {colEvents.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {colEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  <Inbox className="mb-1.5 h-6 w-6 opacity-40" />
                  <p className="text-center text-xs px-3 leading-relaxed">{col.emptyMsg}</p>
                </div>
              ) : (
                colEvents.map(ev => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    isAdmin={isAdmin}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDetail={onDetail}
                    cardBorder={col.cardBorder}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
