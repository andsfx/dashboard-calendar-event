import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, X } from 'lucide-react';
import type { EventItem, EventStatus, HolidayItem } from '../../types';
import {
  getDateRange,
  getEventDuration,
  getMultiDayJamDisplay,
  isMultiDayEvent,
  MONTH_NAMES,
  parseDateStrLocal,
  STATUS_ORDER,
} from '../../utils/eventUtils';
import { StatusBadge } from '../ui/StatusBadge';
import { CategoryBadges } from '../ui/CategoryBadges';

/** Lima tampilan, senada dengan kalender internal tim (Bulan/Minggu/Hari/Agenda/Linimasa). */
type CalendarMode = 'month' | 'week' | 'day' | 'agenda' | 'timeline';

const VIEW_TABS: Array<{ key: CalendarMode; label: string }> = [
  { key: 'month', label: 'Bulan' },
  { key: 'week', label: 'Minggu' },
  { key: 'day', label: 'Hari' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'timeline', label: 'Linimasa' },
];

/** Senin sebagai awal minggu (konvensi kalender Indonesia). */
const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const AGENDA_DAYS = 60;
const DAY_HOURS = Array.from({ length: 15 }, (_, index) => index + 8);

const STATUS_CHIP: Record<EventStatus, string> = {
  ongoing: 'border-[var(--wf-live)]/40 bg-[var(--wf-live)]/10 text-[var(--wf-ink)]',
  upcoming: 'border-[var(--wf-action)]/40 bg-[var(--wf-action)]/10 text-[var(--wf-ink)]',
  past: 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]',
  draft: 'border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] text-[var(--wf-ink)]',
};

const STATUS_DOT: Record<EventStatus, string> = {
  ongoing: 'bg-[var(--wf-live)]',
  upcoming: 'bg-[var(--wf-action)]',
  past: 'bg-[var(--wf-ink-muted)]',
  draft: 'bg-[var(--wf-accent)]',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "YYYY-MM-DD" dari komponen lokal (bukan UTC, agar tidak bergeser sehari). */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfWeek(reference: Date): Date {
  const day = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const offset = (day.getDay() + 6) % 7; // Senin = 0
  day.setDate(day.getDate() - offset);
  return day;
}

/** 42 sel (6 baris) supaya grid bulan selalu penuh dan kolom hari konsisten. */
function buildMonthGrid(reference: Date): Date[] {
  const firstOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatLongDate(dateKey: string): string {
  const date = parseDateStrLocal(dateKey);
  if (!date) return dateKey;
  return `${WEEKDAY_LABELS[(date.getDay() + 6) % 7]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortDate(dateKey: string): string {
  const date = parseDateStrLocal(dateKey);
  if (!date) return dateKey;
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** Jam mulai sebagai angka (untuk band jam di tampilan Hari); null bila tak terbaca. */
function startHour(jam: string): number | null {
  const match = jam?.match(/(\d{1,2})[:.](\d{2})/);
  if (!match || !match[1]) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? hour : null;
}

function sortEvents(events: EventItem[]): EventItem[] {
  return [...events].sort((a, b) => {
    const byStatus = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    const byDate = a.dateStr.localeCompare(b.dateStr);
    if (byDate !== 0) return byDate;
    return a.acara.localeCompare(b.acara);
  });
}

interface Props {
  events: EventItem[];
  holidays: HolidayItem[];
  onDetail: (event: EventItem) => void;
}

/**
 * Kalender jadwal versi dashboard: lima tampilan (Bulan, Minggu, Hari, Agenda,
 * Linimasa) dengan navigasi periode dan satu panel hari yang bisa dibuka dari
 * grid. Semua warna memakai token papan (`--wf-*`) supaya tetap satu sistem
 * dengan modul admin lain; status memakai bentuk + warna yang sama dengan
 * StatusBadge (bukan palet baru).
 */
export function DashboardCalendarView({ events, holidays, onDetail }: Props) {
  const today = new Date();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [reference, setReference] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayKey = toDateKey(today);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayItem[]>();
    for (const holiday of holidays) {
      const bucket = map.get(holiday.dateStr);
      if (bucket) bucket.push(holiday);
      else map.set(holiday.dateStr, [holiday]);
    }
    return map;
  }, [holidays]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of events) {
      for (const dateKey of getDateRange(event.dateStr, event.dateEnd)) {
        const bucket = map.get(dateKey);
        if (bucket) bucket.push(event);
        else map.set(dateKey, [event]);
      }
    }
    return map;
  }, [events]);

  const range = useMemo(() => {
    if (mode === 'week') {
      const from = startOfWeek(reference);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      return { from, to };
    }
    if (mode === 'day') {
      const from = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
      return { from, to: new Date(from) };
    }
    if (mode === 'agenda' || mode === 'timeline') {
      const from = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
      const to = new Date(from);
      to.setDate(from.getDate() + AGENDA_DAYS - 1);
      return { from, to };
    }
    return {
      from: new Date(reference.getFullYear(), reference.getMonth(), 1),
      to: new Date(reference.getFullYear(), reference.getMonth() + 1, 0),
    };
  }, [mode, reference]);

  const fromKey = toDateKey(range.from);
  const toKey = toDateKey(range.to);

  /** Hari yang punya minimal satu event atau libur dalam rentang aktif. */
  const periodDays = useMemo(() => {
    const days: Array<{ key: string; events: EventItem[]; holidays: HolidayItem[] }> = [];
    const cursor = new Date(range.from);
    while (toDateKey(cursor) <= toKey) {
      const key = toDateKey(cursor);
      const dayEvents = sortEvents(eventsByDay.get(key) ?? []);
      const dayHolidays = holidaysByDate.get(key) ?? [];
      if (dayEvents.length > 0 || dayHolidays.length > 0) days.push({ key, events: dayEvents, holidays: dayHolidays });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [range, toKey, eventsByDay, holidaysByDate]);

  const periodEventCount = useMemo(
    () => periodDays.reduce((total, day) => total + day.events.length, 0),
    [periodDays],
  );

  function shift(direction: number) {
    setSelectedDate(null);
    setReference(current => {
      if (mode === 'week') {
        const next = new Date(current);
        next.setDate(current.getDate() + direction * 7);
        return next;
      }
      if (mode === 'day') {
        const next = new Date(current);
        next.setDate(current.getDate() + direction);
        return next;
      }
      if (mode === 'agenda' || mode === 'timeline') {
        const next = new Date(current);
        next.setDate(current.getDate() + direction * AGENDA_DAYS);
        return next;
      }
      return new Date(current.getFullYear(), current.getMonth() + direction, 1);
    });
  }

  const monthLabel = `${MONTH_NAMES[reference.getMonth()]} ${reference.getFullYear()}`;
  const dayLabel = formatLongDate(fromKey);
  const periodLabel = mode === 'day'
    ? dayLabel
    : mode === 'month'
      ? monthLabel
      : `${formatShortDate(fromKey)} – ${formatShortDate(toKey)}`;

  const selectedDayEvents = selectedDate ? sortEvents(eventsByDay.get(selectedDate) ?? []) : [];
  const selectedDayHolidays = selectedDate ? holidaysByDate.get(selectedDate) ?? [] : [];

  function renderChip(event: EventItem) {
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => onDetail(event)}
        title={`${event.acara} (${event.jam || 'jam belum ditentukan'})`}
        className={`flex w-full items-center gap-1.5 truncate rounded-[var(--wf-radius-control)] border px-2 py-1 text-left text-xs font-medium transition hover:brightness-[0.97] ui-focus-ring ${STATUS_CHIP[event.status]}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[event.status]}`} aria-hidden="true" />
        <span className="truncate">{event.acara}</span>
      </button>
    );
  }

  function renderEventRow(event: EventItem) {
    return (
      <li
        key={event.id}
        className="flex flex-wrap items-center gap-2 rounded-[var(--wf-radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2"
      >
        <span className="wf-code w-28 shrink-0 text-xs font-semibold text-[var(--wf-ink-muted)]">
          {event.jam || '—'}
        </span>
        <button
          type="button"
          onClick={() => onDetail(event)}
          className="min-w-0 flex-1 text-left ui-focus-ring rounded-sm"
        >
          <span className="block truncate font-medium text-[var(--wf-ink)]">{event.acara}</span>
          <span className="block truncate text-xs text-[var(--wf-ink-muted)]">
            {event.lokasi || 'Lokasi belum ditentukan'}
            {event.eo ? ` · ${event.eo}` : ''}
          </span>
        </button>
        <StatusBadge status={event.status} size="sm" />
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: pilih tampilan + navigasi periode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Pilih tampilan kalender"
          className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-1"
        >
          {VIEW_TABS.map(tab => {
            const active = mode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { setMode(tab.key); setSelectedDate(null); }}
                className={`ui-focus-ring inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                    : 'text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--wf-ink)]">
            <CalendarDays className="h-4 w-4 text-[var(--wf-accent)]" aria-hidden="true" />
            {periodLabel}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Periode sebelumnya"
              className="ui-focus-ring rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] p-1.5 text-[var(--wf-ink-muted)] transition-colors hover:text-[var(--wf-ink)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setReference(new Date()); setSelectedDate(null); }}
              className="ui-focus-ring rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-ink)] transition-colors hover:border-[var(--wf-rule-strong)]"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Periode berikutnya"
              className="ui-focus-ring rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] p-1.5 text-[var(--wf-ink-muted)] transition-colors hover:text-[var(--wf-ink)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--wf-ink-muted)]">
        {periodEventCount} event pada periode ini · {periodDays.length} hari terisi
      </p>

      {/* ── Bulan ─────────────────────────────────────────────── */}
      {mode === 'month' && (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 gap-1 border-b border-[var(--wf-rule)] pb-2">
              {WEEKDAY_LABELS.map(label => (
                <p key={label} className="text-center text-xs font-semibold uppercase text-[var(--wf-ink-muted)]">
                  {label}
                </p>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {buildMonthGrid(reference).map(day => {
                const dayKey = toDateKey(day);
                const isOtherMonth = day.getMonth() !== reference.getMonth();
                const isToday = dayKey === todayKey;
                const dayEvents = sortEvents(eventsByDay.get(dayKey) ?? []);
                const dayHolidays = holidaysByDate.get(dayKey) ?? [];
                return (
                  <div
                    key={dayKey}
                    className={`min-h-24 rounded-[var(--wf-radius-control)] border p-1.5 ${
                      isOtherMonth
                        ? 'border-transparent bg-[var(--wf-board-2)]/50'
                        : 'border-[var(--wf-rule)] bg-[var(--wf-board)]'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex gap-0.5">
                        {dayHolidays.some(h => h.type === 'libur_nasional') && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                        )}
                        {dayHolidays.some(h => h.type === 'cuti_bersama') && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--wf-accent)]" aria-hidden="true" />
                        )}
                      </span>
                      <span
                        className={`text-right text-xs font-semibold ${
                          isToday
                            ? 'text-[var(--wf-accent)]'
                            : isOtherMonth
                              ? 'text-[var(--wf-ink-muted)]/60'
                              : 'text-[var(--wf-ink)]'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(renderChip)}
                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(dayKey)}
                          className="ui-focus-ring px-1 text-[11px] text-[var(--wf-ink-muted)] hover:text-[var(--wf-accent)]"
                        >
                          +{dayEvents.length - 3} event lain
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Minggu ────────────────────────────────────────────── */}
      {mode === 'week' && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {Array.from({ length: 7 }, (_, index) => {
            const day = new Date(range.from);
            day.setDate(range.from.getDate() + index);
            const dayKey = toDateKey(day);
            const dayEvents = sortEvents(eventsByDay.get(dayKey) ?? []);
            const isToday = dayKey === todayKey;
            return (
              <div
                key={dayKey}
                className={`min-h-32 rounded-[var(--wf-radius-board)] border p-2 ${
                  isToday ? 'border-[var(--wf-accent)] bg-[var(--wf-accent-soft)]' : 'border-[var(--wf-rule)] bg-[var(--wf-board)]'
                }`}
              >
                <p className="text-xs font-semibold uppercase text-[var(--wf-ink-muted)]">{WEEKDAY_LABELS[index]}</p>
                <p className="text-sm font-semibold text-[var(--wf-ink)]">{day.getDate()}</p>
                <div className="mt-2 space-y-1">
                  {dayEvents.length === 0 ? (
                    <p className="text-[11px] text-[var(--wf-ink-muted)]">Tidak ada event</p>
                  ) : (
                    dayEvents.map(renderChip)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Hari ──────────────────────────────────────────────── */}
      {mode === 'day' && (
        <div className="space-y-2">
          {(() => {
            const dayEvents = sortEvents(eventsByDay.get(fromKey) ?? []);
            if (dayEvents.length === 0) {
              return (
                <div className="ui-empty-panel px-4 py-10 text-center text-sm text-[var(--wf-ink-muted)]">
                  Tidak ada event pada hari ini.
                </div>
              );
            }
            const untimed = dayEvents.filter(event => startHour(event.jam) === null);
            return (
              <>
                {untimed.length > 0 && (
                  <div className="flex gap-3 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2">
                    <p className="w-14 shrink-0 text-xs font-semibold text-[var(--wf-ink-muted)]">Tanpa jam</p>
                    <div className="min-w-0 flex-1 space-y-1">{untimed.map(renderChip)}</div>
                  </div>
                )}
                {DAY_HOURS.map(hour => {
                  const hourEvents = dayEvents.filter(event => startHour(event.jam) === hour);
                  if (hourEvents.length === 0) return null;
                  return (
                    <div
                      key={hour}
                      className="flex gap-3 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2"
                    >
                      <p className="wf-code w-14 shrink-0 text-xs font-semibold text-[var(--wf-ink-muted)]">
                        {pad(hour)}.00
                      </p>
                      <div className="min-w-0 flex-1 space-y-1">{hourEvents.map(renderChip)}</div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Linimasa ──────────────────────────────────────────── */}
      {mode === 'timeline' && (
        <div className="space-y-0">
          {periodDays.length === 0 ? (
            <div className="ui-empty-panel px-4 py-10 text-center text-sm text-[var(--wf-ink-muted)]">
              Tidak ada event pada rentang ini.
            </div>
          ) : (
            periodDays.map(day => (
              <section
                key={day.key}
                className="relative ml-2 border-l-2 border-[var(--wf-accent)]/30 pb-6 pl-4"
              >
                <span className="absolute -left-1.5 top-1 h-2.5 w-2.5 rounded-full bg-[var(--wf-accent)]" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[var(--wf-ink)]">{formatShortDate(day.key)}</h3>
                <ul className="mt-2 space-y-2">{day.events.map(renderEventRow)}</ul>
              </section>
            ))
          )}
        </div>
      )}

      {/* ── Agenda ────────────────────────────────────────────── */}
      {mode === 'agenda' && (
        <div className="space-y-4">
          {periodDays.length === 0 ? (
            <div className="ui-empty-panel px-4 py-10 text-center text-sm text-[var(--wf-ink-muted)]">
              Tidak ada event pada rentang agenda ini.
            </div>
          ) : (
            periodDays.map(day => (
              <section key={day.key}>
                <h3 className="text-sm font-semibold text-[var(--wf-ink)]">{formatLongDate(day.key)}</h3>
                <ul className="mt-2 divide-y divide-[var(--wf-rule)] rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)]">
                  {day.events.map(event => (
                    <li key={event.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => onDetail(event)}
                        className="min-w-0 flex-1 text-left ui-focus-ring rounded-sm"
                      >
                        <span className="block truncate font-medium text-[var(--wf-ink)]">{event.acara}</span>
                        <span className="block truncate text-xs text-[var(--wf-ink-muted)]">
                          {event.lokasi || 'Lokasi belum ditentukan'}
                          {event.eo ? ` · ${event.eo}` : ''} ·{' '}
                          {isMultiDayEvent(event)
                            ? `${getEventDuration(event.dateStr, event.dateEnd)} hari`
                            : event.jam || 'jam belum ditentukan'}
                        </span>
                      </button>
                      <StatusBadge status={event.status} size="sm" />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {/* Panel hari — dibuka dari grid bulan atau klik "+N event lain" */}
      {selectedDate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-calendar-day-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] sm:rounded-[var(--wf-radius-board)]"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--wf-rule)] px-4 py-4 sm:px-6">
              <div>
                <p id="dashboard-calendar-day-title" className="font-bold text-[var(--wf-ink)]">
                  {formatLongDate(selectedDate)}
                </p>
                <p className="text-xs text-[var(--wf-ink-muted)]">
                  {selectedDayEvents.length} event
                  {selectedDayHolidays.length > 0 ? ` · ${selectedDayHolidays.length} hari libur` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                aria-label="Tutup"
                className="ui-focus-ring rounded-lg p-2 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-5 sm:px-6">
              {selectedDayEvents.length === 0 ? (
                <div className="ui-empty-panel px-4 py-6 text-center text-sm text-[var(--wf-ink-muted)]">
                  Tidak ada event pada tanggal ini.
                </div>
              ) : (
                <ul className="space-y-3">
                  {selectedDayEvents.map(event => (
                    <li
                      key={event.id}
                      className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[var(--wf-ink-muted)]">
                          {isMultiDayEvent(event)
                            ? `${formatShortDate(event.dateStr)} – ${formatShortDate(event.dateEnd ?? event.dateStr)}`
                            : event.jam || 'jam belum ditentukan'}
                        </p>
                        <StatusBadge status={event.status} size="sm" />
                      </div>
                      {event.categories.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <CategoryBadges categories={event.categories} maxVisible={2} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setSelectedDate(null); onDetail(event); }}
                        className="w-full text-left ui-focus-ring rounded-sm"
                      >
                        <span className="block font-semibold text-[var(--wf-ink)]">{event.acara}</span>
                      </button>
                      <div className="mt-2 space-y-1 text-xs text-[var(--wf-ink-muted)]">
                        {isMultiDayEvent(event) && getMultiDayJamDisplay(event) && (
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {getMultiDayJamDisplay(event)}
                          </p>
                        )}
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {event.lokasi || 'Lokasi belum ditentukan'}
                        </p>
                        {event.eo && <p>Penyelenggara: {event.eo}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {selectedDayHolidays.length > 0 && (
                <section className="space-y-2 border-t border-[var(--wf-rule)] pt-4">
                  <h3 className="text-sm font-semibold text-[var(--wf-ink)]">Hari Libur</h3>
                  {selectedDayHolidays.map(holiday => (
                    <div
                      key={holiday.id}
                      className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] px-4 py-3"
                    >
                      <p className="font-medium text-[var(--wf-ink)]">{holiday.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
                        {holiday.type === 'libur_nasional' ? 'Libur Nasional' : 'Cuti Bersama'}
                        {holiday.description ? ` · ${holiday.description}` : ''}
                      </p>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
