import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, Inbox, X } from 'lucide-react';
import { EventItem, HolidayItem } from '../types';
import { 
  generateCalendarDays, 
  groupByDate,
  isMultiDayEvent,
  getMultiDayEventsForDate,
  getSingleDayEventsForDate,
  formatDateRange,
  getMultiDayJamDisplay,
  getEventDuration,
  getDateRange
} from '../utils/eventUtils';
import { StatusBadge } from './StatusBadge';
import { CategoryBadges } from './CategoryBadges';
import { ModalWrapper } from './ModalWrapper';

const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const DAY_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const STATUS_ORDER: Record<string, number> = { ongoing: 0, upcoming: 1, past: 2 };
const STATUS_GROUPS = [
  { key: 'ongoing' as const, label: 'Sedang Berlangsung', dot: 'bg-emerald-500' },
  { key: 'upcoming' as const, label: 'Akan Datang', dot: 'bg-amber-400' },
  { key: 'past' as const, label: 'Sudah Selesai', dot: 'bg-slate-400' },
];

function getTimeSortValue(jam: string) {
  const match = jam?.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

// Helper untuk mendapatkan multi-day events yang ditampilkan di hari tertentu
function getMultiDayBarsForDay(events: EventItem[], dateStr: string) {
  const multiDayEvents = getMultiDayEventsForDate(events, dateStr);
  return multiDayEvents.map(event => {
    const range = getDateRange(event.dateStr, event.dateEnd);
    const isFirst = range[0] === dateStr;
    const isLast = range[range.length - 1] === dateStr;
    const position = range.indexOf(dateStr);
    return { event, isFirst, isLast, position, totalDays: range.length };
  });
}

interface Props {
  events: EventItem[];
  holidays: HolidayItem[];
  onDetail: (ev: EventItem) => void;
}

export function CalendarView({ events, holidays, onDetail }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = generateCalendarDays(year, month);
  const byDate = groupByDate(events);
  const holidaysByDate = holidays.reduce((acc, holiday) => {
    if (!acc[holiday.dateStr]) acc[holiday.dateStr] = [];
    acc[holiday.dateStr].push(holiday);
    return acc;
  }, {} as Record<string, HolidayItem[]>);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Count events in current month (termasuk multi-day yang overlap ke bulan ini)
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
  
  const monthEvents = events
    .filter(e => {
      if (isMultiDayEvent(e)) {
        // Multi-day: tampilkan jika range overlap dengan bulan ini
        const evStart = e.dateStr;
        const evEnd = e.dateEnd!;
        return evStart <= monthEnd && evEnd >= monthStart;
      }
      // Single-day: tampilkan jika dateStr di bulan ini
      return e.dateStr.startsWith(monthStr);
    })
    .sort((a, b) => {
      const statusCompare = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      if (statusCompare !== 0) return statusCompare;
      const dateCompare = a.dateStr.localeCompare(b.dateStr);
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = getTimeSortValue(a.jam) - getTimeSortValue(b.jam);
      if (timeCompare !== 0) return timeCompare;
      return a.acara.localeCompare(b.acara);
    });
  const monthHolidays = holidays
    .filter(h => h.dateStr.startsWith(monthStr))
    .sort((a, b) => {
      const dateCompare = a.dateStr.localeCompare(b.dateStr);
      if (dateCompare !== 0) return dateCompare;
      if (a.type !== b.type) return a.type === 'libur_nasional' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  // selectedDayEvents: gabungkan single-day events + multi-day events yang overlap
  const selectedDayEvents = selectedDate ? (() => {
    const singleDay = getSingleDayEventsForDate(events, selectedDate);
    const multiDay = getMultiDayEventsForDate(events, selectedDate);
    return [...singleDay, ...multiDay].sort((a, b) => {
      const statusCompare = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      if (statusCompare !== 0) return statusCompare;
      const timeCompare = getTimeSortValue(a.jam) - getTimeSortValue(b.jam);
      if (timeCompare !== 0) return timeCompare;
      return a.acara.localeCompare(b.acara);
    });
  })() : [];
  const selectedDayHolidays = selectedDate ? (holidaysByDate[selectedDate] ?? []).slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === 'libur_nasional' ? -1 : 1;
    return a.name.localeCompare(b.name);
  }) : [];
  const selectedDayTitle = selectedDate ? (() => {
    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
    if (Number.isNaN(date.getTime())) return selectedDate;
    return `${DAY_FULL[date.getDay()]}, ${Number(dayStr)} ${MONTH_ID[Number(monthStr) - 1]} ${yearStr}`;
  })() : '';
  const isDayPopupOpen = !!selectedDate && (selectedDayEvents.length > 0 || selectedDayHolidays.length > 0);
  const selectedDayMultiDayEvents = selectedDate ? getMultiDayEventsForDate(events, selectedDate) : [];
  const selectedDaySingleEvents = selectedDate ? getSingleDayEventsForDate(events, selectedDate) : [];

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Calendar grid */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:w-96 lg:shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4">
          <button onClick={prevMonth} aria-label="Bulan sebelumnya" className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{MONTH_ID[month]}</p>
            <p className="text-xs text-white/70">{year} | {monthEvents.length} acara</p>
          </div>
          <button onClick={nextMonth} aria-label="Bulan berikutnya" className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
          {DAY_SHORT.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1 p-1.5 sm:p-2">
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const dayHolidays = holidaysByDate[d.dateStr] ?? [];
            const multiDayBars = getMultiDayBarsForDay(events, d.dateStr);
            const singleDayEvents = getSingleDayEventsForDate(events, d.dateStr);
            const hasEvents = singleDayEvents.length > 0 || multiDayBars.length > 0;
            const hasHolidays = dayHolidays.length > 0;
            const isToday = d.dateStr === todayStr;
            const isSelected = d.dateStr === selectedDate;
            const hasOngoing = singleDayEvents.some(e => e.status === 'ongoing');
            const hasUpcoming = singleDayEvents.some(e => e.status === 'upcoming');
            const hasNationalHoliday = dayHolidays.some(h => h.type === 'libur_nasional');
            const hasCollectiveLeave = dayHolidays.some(h => h.type === 'cuti_bersama');

            const totalDayEvents = singleDayEvents.length + multiDayBars.length;
            const dayLabel = `${d.day} ${MONTH_ID[month]} ${year}${totalDayEvents > 0 ? `, ${totalDayEvents} acara` : ''}${dayHolidays.length > 0 ? `, ${dayHolidays.length} hari libur` : ''}`;

            return (
              <button
                key={d.dateStr}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDate(null);
                    return;
                  }
                  setSelectedDate(d.dateStr);
                }}
                aria-label={dayLabel}
                className={`relative flex h-9 w-full flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-all sm:h-10 sm:rounded-xl sm:text-xs ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-md'
                    : isToday
                    ? 'bg-violet-100 text-violet-700 font-bold ring-2 ring-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-700'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {hasHolidays && (
                  <div className="absolute right-1 top-1 flex gap-0.5">
                    {hasNationalHoliday && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                    {hasCollectiveLeave && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                  </div>
                )}
                {d.day}
                {multiDayBars.length > 0 && (
                  <div className="absolute bottom-0.5 left-0.5 right-0.5 flex flex-col gap-0.5">
                    {multiDayBars.map((bar, idx) => {
                      const bgColor = bar.event.status === 'ongoing' 
                        ? 'bg-emerald-400' 
                        : bar.event.status === 'upcoming' 
                        ? 'bg-amber-400' 
                        : 'bg-slate-400';
                      return (
                        <div
                          key={`${bar.event.id}-${idx}`}
                          className={`h-0.5 rounded-full ${bgColor} ${
                            bar.isFirst ? 'rounded-l-full' : ''
                          } ${bar.isLast ? 'rounded-r-full' : ''}`}
                        />
                      );
                    })}
                  </div>
                )}
                {hasEvents && multiDayBars.length === 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {hasOngoing && <span className="h-1 w-1 rounded-full bg-emerald-400" />}
                    {hasUpcoming && <span className="h-1 w-1 rounded-full bg-amber-400" />}
                    {!hasOngoing && !hasUpcoming && <span className="h-1 w-1 rounded-full bg-slate-400" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 px-3 py-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Berlangsung</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Mendatang</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Selesai</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Libur Nasional</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />Cuti Bersama</span>
        </div>
        </div>

        {/* Monthly event panel */}
        <div className="flex-1">
        {monthEvents.length > 0 || monthHolidays.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-white">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-violet-500" /> Agenda {MONTH_ID[month]} {year}</span>
              </p>
              <p className="text-xs text-slate-400">
                {monthEvents.length} acara dan {monthHolidays.length} hari libur di bulan ini
              </p>
            </div>
            <div className="space-y-6 p-4 sm:p-5">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Event</h3>
                    <p className="text-xs text-slate-400">
                      {monthEvents.length} event di bulan ini
                      {monthEvents.length > 0 && (
                        <span>
                          {' '}({[
                            monthEvents.filter(e => e.status === 'ongoing').length > 0 && `${monthEvents.filter(e => e.status === 'ongoing').length} berlangsung`,
                            monthEvents.filter(e => e.status === 'upcoming').length > 0 && `${monthEvents.filter(e => e.status === 'upcoming').length} mendatang`,
                            monthEvents.filter(e => e.status === 'past').length > 0 && `${monthEvents.filter(e => e.status === 'past').length} selesai`,
                          ].filter(Boolean).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {monthEvents.length > 0 ? (
                  <div className="space-y-0">
                    {/* Multi-day events section */}
                    {(() => {
                      const multiDayEvents = monthEvents.filter(e => isMultiDayEvent(e));
                      if (multiDayEvents.length === 0) return null;
                      
                      return (
                        <div className="mb-5 space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-800/50 dark:bg-violet-900/10">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-violet-500" />
                            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                              Multi-hari ({multiDayEvents.length})
                            </p>
                          </div>
                          <div className="space-y-3">
                            {multiDayEvents.map(ev => {
                              const duration = getEventDuration(ev.dateStr, ev.dateEnd);
                              return (
                                <button
                                  key={ev.id}
                                  onClick={() => onDetail(ev)}
                                  className="w-full rounded-xl border border-violet-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50/50 hover:shadow-md dark:border-violet-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/30"
                                >
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                                      {formatDateRange(ev.dateStr, ev.dateEnd)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                        {duration} hari
                                      </span>
                                      <StatusBadge status={ev.status} size="sm" />
                                    </div>
                                  </div>
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <CategoryBadges categories={ev.categories} maxVisible={2} />
                                  </div>
                                  <p className="font-semibold text-slate-800 dark:text-white">{ev.acara}</p>
                                  <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    {getMultiDayJamDisplay(ev) && (
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3 shrink-0" />
                                        <span>{getMultiDayJamDisplay(ev)}</span>
                                      </div>
                                    )}
                                    {ev.lokasi && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="line-clamp-2">{ev.lokasi}</span>
                                      </div>
                                    )}
                                    {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                                    {ev.keterangan && <p className="line-clamp-2 text-slate-400">{ev.keterangan}</p>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Single-day events section */}
                    {STATUS_GROUPS.map((group, groupIdx) => {
                      const groupEvents = monthEvents.filter(ev => ev.status === group.key && !isMultiDayEvent(ev));
                      if (groupEvents.length === 0) return null;
                      return (
                        <div key={group.key} className={groupIdx > 0 && monthEvents.some(ev => ev.status !== group.key && (STATUS_ORDER[ev.status] ?? 3) < (STATUS_ORDER[group.key] ?? 3)) ? 'mt-5 border-t border-slate-100 pt-5 dark:border-slate-700' : ''}>
                          <div className="mb-3 flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${group.dot}`} />
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {group.label} ({groupEvents.length})
                            </p>
                          </div>
                          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${group.key === 'past' ? 'opacity-60' : ''}`}>
                            {groupEvents.map(ev => {
                              const isSelectedCard = selectedDate === ev.dateStr;
                              return (
                                <button
                                  key={ev.id}
                                  onClick={() => onDetail(ev)}
                                  className={`cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:hover:bg-slate-700/30 ${
                                    isSelectedCard
                                      ? 'border-violet-200 bg-violet-50/40 ring-1 ring-violet-200 dark:border-violet-800/50 dark:bg-violet-900/10 dark:ring-violet-800/40'
                                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
                                  }`}
                                >
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className={`text-xs font-semibold ${isSelectedCard ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                      {ev.day}, {ev.tanggal}
                                    </p>
                                    <StatusBadge status={ev.status} size="sm" />
                                  </div>
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <CategoryBadges categories={ev.categories} maxVisible={2} />
                                  </div>
                                  <p className="font-semibold text-slate-800 dark:text-white">{ev.acara}</p>
                                  <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    {ev.jam && (
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3 shrink-0" />
                                        <span>{ev.jam}</span>
                                      </div>
                                    )}
                                    {ev.lokasi && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="line-clamp-2">{ev.lokasi}</span>
                                      </div>
                                    )}
                                    {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                                    {ev.keterangan && <p className="line-clamp-2 text-slate-400">{ev.keterangan}</p>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/40">
                    Tidak ada event di bulan ini.
                  </div>
                )}
              </section>

              <section className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Hari Libur</h3>
                    <p className="text-xs text-slate-400">{monthHolidays.length} hari libur di bulan ini</p>
                  </div>
                </div>

                {monthHolidays.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {monthHolidays.map(holiday => {
                      const isSelectedCard = selectedDate === holiday.dateStr;
                      const badgeClass = holiday.type === 'libur_nasional'
                        ? 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/50'
                        : 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800/50';

                      return (
                        <div
                          key={`holiday-${holiday.id}`}
                          className={`rounded-2xl border p-4 text-left shadow-sm ${
                            isSelectedCard
                              ? 'border-violet-200 bg-violet-50/40 ring-1 ring-violet-200 dark:border-violet-800/50 dark:bg-violet-900/10 dark:ring-violet-800/40'
                              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-xs font-semibold ${isSelectedCard ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'}`}>
                              {holiday.day}, {holiday.tanggal}
                            </p>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass}`}>
                              {holiday.type === 'libur_nasional' ? 'Libur Nasional' : 'Cuti Bersama'}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-white">{holiday.name}</p>
                          {holiday.description && (
                            <p className="mt-3 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{holiday.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/40">
                    Tidak ada hari libur di bulan ini.
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 sm:min-h-[300px]">
            <CalendarDays className="mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm font-medium">Belum ada agenda atau hari libur di {MONTH_ID[month]} {year}</p>
            <p className="mt-1 text-xs">Coba pindah bulan untuk melihat informasi lainnya</p>
          </div>
        )}

        {/* Monthly summary */}
        {monthEvents.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ringkasan {MONTH_ID[month]} {year}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(['ongoing', 'upcoming', 'past'] as const).map(s => {
                const count = monthEvents.filter(e => e.status === s).length;
                const label = s === 'ongoing' ? 'Berlangsung' : s === 'upcoming' ? 'Mendatang' : 'Selesai';
                const color = s === 'ongoing' ? 'text-emerald-600 dark:text-emerald-400' : s === 'upcoming' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400';
                return (
                  <div key={s} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{count}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>

      <ModalWrapper isOpen={isDayPopupOpen} onClose={() => setSelectedDate(null)} maxWidth="max-w-2xl">
        <div className="max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
            <div>
              <p className="font-bold text-slate-800 dark:text-white">Agenda Tanggal</p>
              <p className="text-xs text-slate-400">{selectedDayTitle}</p>
            </div>
            <button onClick={() => setSelectedDate(null)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-6">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Event</h3>
                <p className="text-xs text-slate-400">{selectedDayEvents.length} event pada tanggal ini</p>
              </div>

              {selectedDayEvents.length > 0 ? (
                <div className="space-y-0">
                  {/* Multi-day events in day popup */}
                  {(() => {
                    const multiDayEvents = selectedDayEvents.filter(e => isMultiDayEvent(e));
                    if (multiDayEvents.length === 0) return null;
                    
                    return (
                      <div className="mb-4 space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-800/50 dark:bg-violet-900/10">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-violet-500" />
                          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                            Multi-hari ({multiDayEvents.length})
                          </p>
                        </div>
                        <div className="space-y-2">
                          {multiDayEvents.map(ev => {
                            const duration = getEventDuration(ev.dateStr, ev.dateEnd);
                            return (
                              <button
                                key={`day-popup-multiday-${ev.id}`}
                                onClick={() => {
                                  setSelectedDate(null);
                                  onDetail(ev);
                                }}
                                className="w-full rounded-lg border border-violet-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50/50 hover:shadow-md dark:border-violet-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/30"
                              >
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                                    {formatDateRange(ev.dateStr, ev.dateEnd)}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                      {duration} hari
                                    </span>
                                    <StatusBadge status={ev.status} size="sm" />
                                  </div>
                                </div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <CategoryBadges categories={ev.categories} maxVisible={2} />
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-white">{ev.acara}</p>
                                <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  {getMultiDayJamDisplay(ev) && (
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3 w-3 shrink-0" />
                                      <span>{getMultiDayJamDisplay(ev)}</span>
                                    </div>
                                  )}
                                  {ev.lokasi && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span className="line-clamp-2">{ev.lokasi}</span>
                                    </div>
                                  )}
                                  {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Single-day events in day popup */}
                  {STATUS_GROUPS.map((group, groupIdx) => {
                    const groupEvents = selectedDayEvents.filter(ev => ev.status === group.key && !isMultiDayEvent(ev));
                    if (groupEvents.length === 0) return null;
                    return (
                      <div key={group.key} className={groupIdx > 0 && selectedDayEvents.some(ev => ev.status !== group.key && (STATUS_ORDER[ev.status] ?? 3) < (STATUS_ORDER[group.key] ?? 3)) ? 'mt-4 border-t border-slate-100 pt-4 dark:border-slate-700' : ''}>
                        <div className="mb-3 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${group.dot}`} />
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {group.label} ({groupEvents.length})
                          </p>
                        </div>
                        <div className={`space-y-3 ${group.key === 'past' ? 'opacity-60' : ''}`}>
                          {groupEvents.map(ev => (
                            <button
                              key={`day-popup-${ev.id}`}
                              onClick={() => {
                                setSelectedDate(null);
                                onDetail(ev);
                              }}
                              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/30"
                            >
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ev.day}, {ev.tanggal}</p>
                                <StatusBadge status={ev.status} size="sm" />
                              </div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <CategoryBadges categories={ev.categories} maxVisible={2} />
                              </div>
                              <p className="font-semibold text-slate-800 dark:text-white">{ev.acara}</p>
                              <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                {ev.jam && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span>{ev.jam}</span>
                                  </div>
                                )}
                                {ev.lokasi && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="line-clamp-2">{ev.lokasi}</span>
                                  </div>
                                )}
                                {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/40">
                  Tidak ada event pada tanggal ini.
                </div>
              )}
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Hari Libur</h3>
                <p className="text-xs text-slate-400">{selectedDayHolidays.length} hari libur pada tanggal ini</p>
              </div>

              {selectedDayHolidays.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayHolidays.map(holiday => {
                    const badgeClass = holiday.type === 'libur_nasional'
                      ? 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/50'
                      : 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800/50';

                    return (
                      <div key={`day-popup-holiday-${holiday.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{holiday.day}, {holiday.tanggal}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass}`}>
                            {holiday.type === 'libur_nasional' ? 'Libur Nasional' : 'Cuti Bersama'}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-white">{holiday.name}</p>
                        {holiday.description && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{holiday.description}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/40">
                  Tidak ada hari libur pada tanggal ini.
                </div>
              )}
            </section>
          </div>
        </div>
      </ModalWrapper>
    </>
  );
}
