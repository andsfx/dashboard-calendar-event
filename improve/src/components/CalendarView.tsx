import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { EventItem } from '../types';
import { generateCalendarDays, groupByDate } from '../utils/eventUtils';
import { StatusBadge } from './StatusBadge';
import { CategoryBadge } from './CategoryBadge';

const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

interface Props {
  events: EventItem[];
  onDetail: (ev: EventItem) => void;
}

export function CalendarView({ events, onDetail }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = generateCalendarDays(year, month);
  const byDate = groupByDate(events);
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

  const selectedEvents = selectedDate ? (byDate[selectedDate] ?? []) : [];

  // Count events in current month
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEvents = events.filter(e => e.dateStr.startsWith(monthStr));

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
        <div className="grid grid-cols-7 p-2 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const dayEvents = byDate[d.dateStr] ?? [];
            const hasEvents = dayEvents.length > 0;
            const isToday = d.dateStr === todayStr;
            const isSelected = d.dateStr === selectedDate;
            const hasOngoing = dayEvents.some(e => e.status === 'ongoing');
            const hasUpcoming = dayEvents.some(e => e.status === 'upcoming');

            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(isSelected ? null : d.dateStr)}
                className={`relative flex h-10 w-full flex-col items-center justify-center rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-md'
                    : isToday
                    ? 'bg-violet-100 text-violet-700 font-bold ring-2 ring-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-700'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
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
        <div className="flex items-center justify-center gap-4 border-t border-slate-100 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Berlangsung</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Mendatang</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Selesai</span>
        </div>
      </div>

      {/* Event detail panel */}
      <div className="flex-1">
        {selectedDate ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-white">
                📅 {selectedDate}
              </p>
              <p className="text-xs text-slate-400">
                {selectedEvents.length === 0 ? 'Tidak ada acara' : `${selectedEvents.length} acara terjadwal`}
              </p>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="mb-2 text-4xl">📭</div>
                <p className="text-sm">Tidak ada acara di tanggal ini</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {selectedEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="cursor-pointer px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    onClick={() => onDetail(ev)}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={ev.status} size="sm" />
                      <CategoryBadge category={ev.category} />
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-white">{ev.acara}</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {ev.jam && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> {ev.jam}
                        </div>
                      )}
                      {ev.lokasi && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" /> {ev.lokasi}
                        </div>
                      )}
                      {ev.eo && <p>📋 {ev.eo}</p>}
                      {ev.keterangan && <p className="line-clamp-2 text-slate-400">{ev.keterangan}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
            <div className="mb-3 text-5xl">📆</div>
            <p className="text-sm font-medium">Pilih tanggal</p>
            <p className="mt-1 text-xs">Klik tanggal di kalender untuk melihat acara</p>
          </div>
        )}

        {/* Monthly summary */}
        {monthEvents.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ringkasan {MONTH_ID[month]} {year}
            </p>
            <div className="grid grid-cols-3 gap-3">
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
