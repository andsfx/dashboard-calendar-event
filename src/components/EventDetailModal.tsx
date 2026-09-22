import { lazy, Suspense } from 'react';
import { X, Edit2, Trash2, Zap, CalendarDays, Repeat, QrCode, ExternalLink, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { EventDetailContent } from './EventDetailContent';

const SurveyQRCode = lazy(() => import('./survey/SurveyQRCode'));
import { EventPhotoGallery } from './EventPhotoGallery';
import { CategoryBadges } from './CategoryBadges';
import { PriorityBadge } from './PriorityBadge';
import { CATEGORY_COLORS, isMultiDayEvent, getEventDuration, isRecurringEvent } from '../utils/eventUtils';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  event: EventItem | null;
  events?: EventItem[];
  onClose: () => void;
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
  onDeleteSeries?: (groupId: string) => void;
  isAdmin?: boolean;
}

export function EventDetailModal({ isOpen, event, events = [], onClose, onEdit, onDelete, onDeleteSeries, isAdmin = false }: Props) {
  if (!event) return null;

  const color = CATEGORY_COLORS[event.category] ?? 'var(--wf-accent)';
  const isOngoing = event.status === 'ongoing';
  const isMultiDay = isMultiDayEvent(event);
  const duration = isMultiDay ? getEventDuration(event.dateStr, event.dateEnd) : 1;
  const isRecurring = isRecurringEvent(event);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="event-detail-title">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--wf-board)]">
        {/* Color accent header */}
        <div
          className="relative px-4 pb-5 pt-6 sm:px-6"
          style={{ '--event-color': color } as React.CSSProperties}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}44)` }} />
          {/* Subtle bg tint — works in both light and dark */}
          <div className="absolute inset-0 rounded-t-2xl opacity-10 dark:opacity-5" style={{ background: color }} />
          <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `${color}44` }} />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex flex-wrap items-center gap-2 pr-8 sm:pr-10">
            <StatusBadge status={event.status} />
            <CategoryBadges categories={event.categories} />
            {!!isAdmin && <PriorityBadge priority={event.priority} />}
            {isOngoing && (
              <span aria-label="Event sedang berlangsung" className="flex items-center gap-1 rounded-full bg-[var(--wf-live)]/10 px-2.5 py-1 text-xs font-bold text-[var(--wf-live)]">
                <Zap className="h-3 w-3" aria-hidden="true" /> LIVE
              </span>
            )}
            {isMultiDay && (
              <span aria-label={`Rangkaian acara ${duration} hari`} className="flex items-center gap-1 rounded-full bg-[var(--wf-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--wf-accent)]">
                <CalendarDays className="h-3 w-3" aria-hidden="true" /> Rangkaian acara · {duration} hari
              </span>
            )}
            {isRecurring && (
              <span aria-label="Event reguler berulang" className="flex items-center gap-1 rounded-full bg-[var(--wf-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--wf-accent)]">
                <Repeat className="h-3 w-3" aria-hidden="true" /> Event reguler
              </span>
            )}
          </div>

          <h2 id="event-detail-title" className="pr-8 text-lg font-bold leading-snug text-[var(--wf-ink)] sm:pr-10 sm:text-xl">
            {event.acara}
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-3 px-4 py-5 sm:px-6">
          <EventDetailContent event={event} isAdmin={isAdmin} allEvents={events} />
        </div>

        {/* Photo Gallery — always show, upload only for ongoing/past admin */}
        <div className="border-t border-[var(--wf-rule)] px-4 pt-4 sm:px-6">
          <EventPhotoGallery
            eventId={event.id}
            eventName={event.acara}
            canUpload={!!isAdmin && (event.status === 'ongoing' || event.status === 'past')}
          />
        </div>

        {/* Survey section — for past events (both admin & public) */}
        {event.status === 'past' && (
          <div className="border-t border-[var(--wf-rule)] px-4 pt-4 sm:px-6">
            {/* Public: CTA banner */}
            {!isAdmin && (
              <a
                href={`/survey/${event.id}`}
                className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-3 transition-colors hover:bg-[var(--wf-board-2)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wf-accent-soft)]">
                  <ClipboardCheckIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--wf-accent)]">Isi Survey Kepuasan</p>
                  <p className="text-[11px] text-[var(--wf-accent)]">Bantu kami meningkatkan kualitas layanan</p>
                </div>
                <span className="shrink-0 rounded-lg bg-[var(--wf-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-accent-ink)]">
                  Isi Survey
                </span>
              </a>
            )}
            {/* QR Code (both admin & public) */}
            <details className="group">
<summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--wf-ink-muted)] hover:text-[var(--wf-accent)]">
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Code Survey</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] group-open:hidden">Tampilkan</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] hidden group-open:inline">Sembunyikan</span>
              </summary>
              <div className="mt-3">
                <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" /></div>}>
                  <SurveyQRCode eventId={event.id} eventName={event.acara} />
                </Suspense>
              </div>
            </details>
            {/* QR Code Tenant Self-Assessment */}
            <details className="group">
<summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--wf-ink-muted)] hover:text-[var(--wf-accent)]">
                <ClipboardCheckIcon />
                <span>QR Code Self-Assessment Tenant</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] group-open:hidden">Tampilkan</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] hidden group-open:inline">Sembunyikan</span>
              </summary>
              <div className="mt-3">
                <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" /></div>}>
                  <SurveyQRCode
                    eventId={event.id}
                    eventName={event.acara}
                    basePath="/tenant-survey"
                    label="Self-Assessment Tenant"
                    showTypeTabs={false}
                  />
                </Suspense>
              </div>
            </details>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-[var(--wf-rule)] px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--wf-rule)] py-2.5 text-sm font-medium text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] active:scale-95"
          >
            Tutup
          </button>
          {!isAdmin && (
            <Link
              to={`/events/${event.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] py-2.5 text-sm font-semibold text-[var(--wf-accent)] transition-colors hover:bg-[var(--wf-board-2)] active:scale-95"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Buka halaman event
            </Link>
          )}
          {onEdit && (
            <button
              onClick={() => { onClose(); onEdit(event); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] py-2.5 text-sm font-semibold text-[var(--wf-accent)] transition-colors hover:bg-[var(--wf-board-2)] active:scale-95"
            >
              <Edit2 className="h-3.5 w-3.5" /> Ubah
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onClose(); onDelete(event); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-600/10 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-600/20 active:scale-95 dark:border-red-900/50 dark:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          )}
          {isRecurring && onDeleteSeries && event.recurrenceGroupId && (
            <button
              onClick={() => { onClose(); onDeleteSeries(event.recurrenceGroupId!); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-600/20 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-600/30 active:scale-95 dark:border-red-900/50 dark:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus seluruh rangkaian
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}

/** ClipboardCheck icon (lucide, lazy-adjacent, keeps imports tidy) */
function ClipboardCheckIcon() {
  return (
    <ClipboardCheck className="h-4 w-4 text-[var(--wf-accent)]" aria-hidden="true" />
  );
}
