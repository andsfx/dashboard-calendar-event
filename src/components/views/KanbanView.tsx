import { Clock, MapPin, Edit2, Trash2, ExternalLink, FileText, Radio, Clock3, CheckCircle2, PenSquare, Inbox } from 'lucide-react';
import { EventItem, EventStatus } from '../../types';
import { CategoryBadges } from '../ui/CategoryBadges';
import { PriorityBadge } from '../ui/PriorityBadge';
import { CATEGORY_COLORS, isRecurringEvent } from '../../utils/eventUtils';

const COLUMNS: Array<{
  status: EventStatus;
  label: string;
  icon: React.ReactNode;
  cardBorder: string;
  emptyMsg: string;
}> = [
  {
    status: 'ongoing',
    label: 'Berlangsung',
    icon: <Radio className="h-4 w-4" />,
    cardBorder: 'hover:border-[var(--wf-live)]/50',
    emptyMsg: 'Tidak ada acara yang sedang berlangsung',
  },
  {
    status: 'upcoming',
    label: 'Mendatang',
    icon: <Clock3 className="h-4 w-4" />,
    cardBorder: 'hover:border-[var(--wf-action)]/50',
    emptyMsg: 'Tidak ada acara mendatang',
  },
  {
    status: 'past',
    label: 'Selesai',
    icon: <CheckCircle2 className="h-4 w-4" />,
    cardBorder: 'hover:border-[var(--wf-rule-strong)]',
    emptyMsg: 'Belum ada acara yang selesai',
  },
];

/** Optional internal column — Event status draft (legacy), not Draft antrian */
const INTERNAL_DRAFT_COLUMN = {
  status: 'draft' as EventStatus,
  label: 'Internal',
  icon: <PenSquare className="h-4 w-4" />,
  cardBorder: 'hover:border-[var(--wf-accent)]/50',
  emptyMsg: 'Tidak ada event internal draft',
};


interface Props {
  events: EventItem[];
  isAdmin: boolean;
  /** Show legacy Event status=draft column (admin/superadmin only). */
  showInternalDraftColumn?: boolean;
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
  onDetail: (ev: EventItem) => void;
}

function EventCard({
  ev, isAdmin, onEdit, onDelete, onDetail, cardBorder,
}: {
  ev: EventItem; isAdmin: boolean;
  onEdit?: (e: EventItem) => void;
  onDelete?: (e: EventItem) => void;
  onDetail: (e: EventItem) => void;
  cardBorder: string;
}) {
  const color = CATEGORY_COLORS[ev.category] ?? '#00918e';

  return (
    <div
            className={`group relative cursor-pointer overflow-hidden rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] transition-all duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-offset-[var(--wf-board)] ${ev.status === 'past' ? 'opacity-80' : ''} ${cardBorder}`}
      onClick={() => onDetail(ev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetail(ev); } }}
      aria-label={`${ev.acara} - ${ev.tanggal}`}
    >
      {/* Color top bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />

      <div className="p-4">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-[var(--wf-ink)] line-clamp-2 flex-1">{ev.acara}</p>
          {/* Action buttons */}
          <div
            className="flex shrink-0 gap-0.5 opacity-100 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100 focus-within:opacity-100"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onDetail(ev)}
              title="Lihat detail"
              aria-label="Lihat detail"
              className="rounded-lg min-h-[36px] min-w-[36px] p-1.5 text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] focus-visible:outline-none"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
            {(onEdit || onDelete) && (
              <>
                {onEdit && (
                <button
                  onClick={() => onEdit(ev)}
                  title="Ubah"
                  aria-label="Ubah acara"
                  className="rounded-lg min-h-[36px] min-w-[36px] p-1.5 text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-accent-soft)] hover:text-[var(--wf-accent)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] focus-visible:outline-none"
                >
                  <Edit2 className="h-3 w-3" aria-hidden="true" />
                </button>
                )}
                {onDelete && (
                <button
                  onClick={() => onDelete(ev)}
                  title="Hapus"
                  aria-label="Hapus acara"
                  className="rounded-lg min-h-[36px] min-w-[36px] p-1.5 text-[var(--wf-ink-muted)] transition hover:bg-red-600/10 hover:text-red-700 dark:hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-[var(--wf-ink-muted)]">
          <p className="font-medium text-[var(--wf-ink)]">{ev.tanggal}</p>
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
          <p className="mt-2 line-clamp-2 text-xs text-[var(--wf-ink-muted)] leading-relaxed">{ev.keterangan}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--wf-rule)] pt-2.5">
          <CategoryBadges categories={ev.categories} maxVisible={2} />
          <PriorityBadge priority={ev.priority} />
          {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-ink-muted)]">Reguler</span>}
        </div>
      </div>
    </div>
  );
}

export function KanbanView({ events, isAdmin, showInternalDraftColumn = false, onEdit, onDelete, onDetail }: Props) {
  // Operational columns only; optional Internal if flag + any legacy draft Event rows
  const hasInternalDraft = showInternalDraftColumn && events.some(e => e.status === 'draft');
  const visibleColumns = hasInternalDraft ? [...COLUMNS, INTERNAL_DRAFT_COLUMN] : COLUMNS;

  if (events.length === 0) {
    return (
      <div 
        className="ui-empty-panel flex flex-col items-center justify-center py-20 text-[var(--wf-ink-muted)]"
        aria-live="polite"
        role="status"
      >
        <FileText className="mb-3 h-10 w-10 opacity-60" aria-hidden="true" />
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
          <div key={col.status} className="flex min-w-[280px] flex-col gap-3 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] lg:min-w-0">
            {/* Column header */}
            <div className="flex items-center gap-2.5 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] px-4 py-2.5">
              <span className="text-sm text-[var(--wf-ink)]">{col.icon}</span>
              <span className="text-sm font-bold text-[var(--wf-ink)]">{col.label}</span>
              <span className="ml-auto rounded-full bg-[var(--wf-board-2)] px-2 py-0.5 text-xs font-bold text-[var(--wf-ink-muted)]">
                {colEvents.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {colEvents.length === 0 ? (
                <div 
                  className="ui-empty-panel flex flex-col items-center justify-center rounded-[var(--wf-radius-board)] py-8 text-[var(--wf-ink-muted)]"
                  aria-live="polite"
                  role="status"
                >
                  <Inbox className="mb-1.5 h-6 w-6 opacity-40" aria-hidden="true" />
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
