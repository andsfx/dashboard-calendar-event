import { lazy, Suspense } from 'react';
import { X, Clock, MapPin, Calendar, User, Edit2, Trash2, Zap, Tag, CalendarDays, Repeat, ClipboardCheck, QrCode } from 'lucide-react';
import { EventItem } from '../types';
import { StatusBadge } from './StatusBadge';

const SurveyQRCode = lazy(() => import('./survey/SurveyQRCode'));
import { CategoryBadges } from './CategoryBadges';
import { PriorityBadge } from './PriorityBadge';
import { CATEGORY_COLORS, isMultiDayEvent, formatDateRange, getMultiDayJamDisplay, getEventDuration, parseDateStrLocal, MONTH_NAMES, isRecurringEvent, getRecurringSeries } from '../utils/eventUtils';
import { ModalWrapper } from './ModalWrapper';

const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/40 transition hover:bg-slate-100 dark:hover:bg-slate-700/60">
      <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-white break-words">{value || '–'}</p>
      </div>
    </div>
  );
}

function getEventModelLabel(value: EventItem['eventModel']) {
  if (value === 'free') return 'Free';
  if (value === 'bayar') return 'Bayar';
  if (value === 'support') return 'Support';
  return '';
}

export function EventDetailModal({ isOpen, event, events = [], onClose, onEdit, onDelete, onDeleteSeries, isAdmin = false }: Props) {
  if (!event) return null;

  const color = CATEGORY_COLORS[event.category] ?? '#6366f1';
  const isOngoing = event.status === 'ongoing';
  const isMultiDay = isMultiDayEvent(event);
  const duration = isMultiDay ? getEventDuration(event.dateStr, event.dateEnd) : 1;
  const isRecurring = isRecurringEvent(event);
  const seriesEvents = isRecurring && event.recurrenceGroupId ? getRecurringSeries(events, event.recurrenceGroupId) : [];

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="event-detail-title">
      <div className="rounded-2xl bg-white shadow-2xl dark:bg-slate-800 overflow-hidden">
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
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-700"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex flex-wrap items-center gap-2 pr-8 sm:pr-10">
            <StatusBadge status={event.status} />
            <CategoryBadges categories={event.categories} />
            {isAdmin && <PriorityBadge priority={event.priority} />}
            {isOngoing && (
              <span aria-label="Event sedang berlangsung" className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Zap className="h-3 w-3" aria-hidden="true" /> LIVE
              </span>
            )}
            {isMultiDay && (
              <span aria-label={`Rangkaian acara ${duration} hari`} className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                <CalendarDays className="h-3 w-3" aria-hidden="true" /> Rangkaian acara · {duration} hari
              </span>
            )}
            {isRecurring && (
              <span aria-label="Event reguler berulang" className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                <Repeat className="h-3 w-3" aria-hidden="true" /> Event reguler
              </span>
            )}
          </div>

          <h2 id="event-detail-title" className="pr-8 text-lg font-bold leading-snug text-slate-900 dark:text-white sm:pr-10 sm:text-xl">
            {event.acara}
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-3 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <InfoRow
              icon={<Calendar className="h-4 w-4 text-violet-500" />}
              label="Tanggal"
              value={isMultiDay ? formatDateRange(event.dateStr, event.dateEnd) : `${event.day}, ${event.tanggal}`}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4 text-blue-500" />}
              label="Waktu"
              value={isMultiDay ? (getMultiDayJamDisplay(event) || '–') : (event.jam || '–')}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4 text-red-500" />}
              label="Lokasi"
              value={event.lokasi || '–'}
            />
            <InfoRow
              icon={<User className="h-4 w-4 text-amber-500" />}
              label="Event Organizer"
              value={event.eo || '–'}
            />
            {isAdmin && event.pic && (
              <InfoRow
                icon={<User className="h-4 w-4 text-cyan-500" />}
                label="Penanggung Jawab"
                value={event.pic}
              />
            )}
            {isAdmin && event.phone && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-teal-500" />}
                label="Nomor Handphone"
                value={event.phone}
              />
            )}
            {isAdmin && event.eventModel && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-emerald-500" />}
                label="Model Event"
                value={getEventModelLabel(event.eventModel)}
              />
            )}
            {isAdmin && event.eventNominal && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-blue-500" />}
                label="Nominal Event"
                value={event.eventNominal}
              />
            )}
            {isAdmin && event.eventModelNotes && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-violet-500" />}
                label="Keterangan Model Event"
                value={event.eventModelNotes}
              />
            )}
          </div>

          {event.keterangan && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/40">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <Tag className="h-3 w-3" /> Keterangan
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{event.keterangan}</p>
            </div>
          )}

          {/* Series info untuk recurring event */}
          {isRecurring && seriesEvents.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/30 dark:bg-indigo-900/10">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Repeat className="h-3 w-3" /> Series Reguler
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Bagian dari series reguler ({seriesEvents.length} event total)
              </p>
            </div>
          )}

          {/* Jadwal per Hari untuk rangkaian acara */}
          {isMultiDay && event.dayTimeSlots && event.dayTimeSlots.length > 0 && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 dark:border-violet-900/30 dark:bg-violet-900/10">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                <CalendarDays className="h-3 w-3" /> Jadwal per Hari
              </p>
              <div className="space-y-1.5">
                {event.dayTimeSlots.map((slot, idx) => {
                  const date = parseDateStrLocal(slot.date);
                  const dayName = date ? DAY_NAMES[date.getDay()] : '';
                  const dayNum = date ? date.getDate() : '';
                  const monthName = date ? MONTH_NAMES[date.getMonth()] : '';
                  return (
                    <div
                      key={slot.date}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-800/60"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        Hari {idx + 1}
                        <span className="ml-1.5 text-xs font-normal text-slate-400">
                          {dayName}, {dayNum} {monthName}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {slot.jam || '–'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Survey section — for past events (both admin & public) */}
        {event.status === 'past' && (
          <div className="border-t border-slate-100 px-4 pt-4 dark:border-slate-700 sm:px-6">
            {/* Public: CTA banner */}
            {!isAdmin && (
              <a
                href={`/survey/${event.id}`}
                className="mb-3 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:hover:bg-violet-900/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50">
                  <ClipboardCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Isi Survey Kepuasan</p>
                  <p className="text-[11px] text-violet-500 dark:text-violet-400">Bantu kami meningkatkan kualitas layanan</p>
                </div>
                <span className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Isi Survey
                </span>
              </a>
            )}
            {/* QR Code (both admin & public) */}
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400">
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Code Survey</span>
                <span className="ml-auto text-[10px] text-slate-400 group-open:hidden">Tampilkan</span>
                <span className="ml-auto text-[10px] text-slate-400 hidden group-open:inline">Sembunyikan</span>
              </summary>
              <div className="mt-3">
                <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" /></div>}>
                  <SurveyQRCode eventId={event.id} eventName={event.acara} />
                </Suspense>
              </div>
            </details>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:px-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tutup
          </button>
          {onEdit && (
            <button
              onClick={() => { onClose(); onEdit(event); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onClose(); onDelete(event); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:scale-95 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          )}
          {isRecurring && onDeleteSeries && event.recurrenceGroupId && (
            <button
              onClick={() => { onClose(); onDeleteSeries(event.recurrenceGroupId!); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-100 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-200 active:scale-95 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus seluruh rangkaian
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
