import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, Inbox } from 'lucide-react';
import { EventItem, HolidayItem } from '../types';
import { generateCalendarDays, groupByDate } from '../utils/eventUtils';
import { StatusBadge } from './StatusBadge';
import { CategoryBadge } from './CategoryBadge';

const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function getTimeSortValue(jam: string) {
  const match = jam?.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
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

  // Count events in current month
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEvents = events
    .filter(e => e.dateStr.startsWith(monthStr))
    .sort((a, b) => {
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

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:w-96 lg:shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4">
          <button onClick={prevMonth} className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{MONTH_ID[month]}</p>
            <p className="text-xs text-white/70">{year} · {monthEvents.length} acara</p>
          </div>
          <button onClick={nextMonth} className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white">
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
            const dayEvents = byDate[d.dateStr] ?? [];
            const dayHolidays = holidaysByDate[d.dateStr] ?? [];
            const hasEvents = dayEvents.length > 0;
            const hasHolidays = dayHolidays.length > 0;
            const isToday = d.dateStr === todayStr;
            const isSelected = d.dateStr === selectedDate;
            const hasOngoing = dayEvents.some(e => e.status === 'ongoing');
            const hasUpcoming = dayEvents.some(e => e.status === 'upcoming');
            const hasNationalHoliday = dayHolidays.some(h => h.type === 'libur_nasional');
            const hasCollectiveLeave = dayHolidays.some(h => h.type === 'cuti_bersama');

            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(isSelected ? null : d.dateStr)}
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
                {hasEvents && (
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
                    <p className="text-xs text-slate-400">{monthEvents.length} event di bulan ini</p>
                  </div>
                </div>

                {monthEvents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {monthEvents.map(ev => {
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
                            <CategoryBadge category={ev.category} />
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
                            {ev.eo && <p>EO: {ev.eo}</p>}
                            {ev.keterangan && <p className="line-clamp-2 text-slate-400">{ev.keterangan}</p>}
                          </div>
                        </button>
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
  );
}
