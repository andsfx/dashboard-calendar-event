import type { ReactNode } from 'react';
import { Calendar, Clock, MapPin, Repeat, User, Tag, CalendarDays } from 'lucide-react';
import type { EventItem } from '../types';
import {
  CATEGORY_COLORS, isMultiDayEvent, formatDateRange, getMultiDayJamDisplay,
  getEventDuration, parseDateStrLocal, MONTH_NAMES, isRecurringEvent, getRecurringSeries,
} from '../utils/eventUtils';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--brand-card)] p-3.5 transition hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700/60">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">{value}</p>
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

interface EventDetailContentProps {
  event: EventItem;
  /** Admin mode: tampilkan PIC/phone/model kerja sama (internal). Public page WAJIB false. */
  isAdmin?: boolean;
  /** Opsional: render series info dari daftar event lengkap (recurring). */
  allEvents?: EventItem[];
}

/**
 * Shared event detail body — dipakai EventDetailModal (admin + public modal)
 * dan EventPublicDetailPage (permalink publik). Sumber tunggal konten;
 * badge/QR/actions tetap di pemanggil.
 */
export function EventDetailContent({ event, isAdmin = false, allEvents = [] }: EventDetailContentProps) {
  const isMultiDay = isMultiDayEvent(event);
  const isRecurring = isRecurringEvent(event);
  const seriesEvents = isRecurring && event.recurrenceGroupId ? getRecurringSeries(allEvents, event.recurrenceGroupId) : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <InfoRow
          icon={<Calendar className="h-4 w-4 text-brand-primary-500" />}
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
            icon={<Tag className="h-4 w-4 text-brand-primary-500" />}
            label="Keterangan Model Event"
            value={event.eventModelNotes}
          />
        )}
      </div>

      {event.keterangan && (
        <div className="rounded-xl border border-slate-100 bg-[var(--brand-card)] p-4 dark:border-slate-700 dark:bg-slate-700/40">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Tag className="h-3 w-3" /> Keterangan
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{event.keterangan}</p>
        </div>
      )}

      {/* Series info untuk recurring event */}
      {isRecurring && seriesEvents.length > 0 && (
        <div className="rounded-xl border border-brand-primary-100 bg-brand-primary-50/40 p-4 dark:border-brand-primary-900/30 dark:bg-brand-primary-900/10">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-primary-600 dark:text-brand-primary-400">
            <Repeat className="h-3 w-3" /> Series Reguler
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Bagian dari series reguler ({seriesEvents.length} event total)
          </p>
        </div>
      )}

      {/* Jadwal per Hari untuk rangkaian acara */}
      {isMultiDay && event.dayTimeSlots && event.dayTimeSlots.length > 0 && (
        <div className="rounded-xl border border-brand-primary-100 bg-brand-primary-50/40 p-4 dark:border-brand-primary-900/30 dark:bg-brand-primary-900/10">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-primary-600 dark:text-brand-primary-400">
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
  );
}

/** Warna aksen kategori untuk header halaman publik. */
export function getEventAccentColor(event: EventItem): string {
  return CATEGORY_COLORS[event.category] ?? '#00918e';
}

