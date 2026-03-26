import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { EventItem } from '../types';

interface CalendarViewProps {
  events: EventItem[];
  isAdmin: boolean;
  onEventClick: (event: EventItem) => void;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad(n: number) { return n < 10 ? '0' + n : '' + n; }

export default function CalendarView({ events, isAdmin, onEventClick }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  // Group events by date
  const eventsByDate: Record<string, EventItem[]> = {};
  events.forEach(e => {
    if (!eventsByDate[e.dateStr]) eventsByDate[e.dateStr] = [];
    eventsByDate[e.dateStr].push(e);
  });

  const days: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      dateStr: `${currentYear}-${pad(currentMonth + 1)}-${pad(d)}`,
    });
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold">
            {BULAN[currentMonth]} {currentYear}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {HARI_PENDEK.map(h => (
            <div key={h} className="text-center py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              {h}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="aspect-square border-b border-r border-slate-100 dark:border-slate-800" />;

            const hasEvents = eventsByDate[d.dateStr]?.length > 0;
            const isToday = d.dateStr === todayStr;
            const isSelected = d.dateStr === selectedDate;
            const dayEvents = eventsByDate[d.dateStr] || [];
            const hasOngoing = dayEvents.some(e => e.status === 'ongoing');

            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(isSelected ? null : d.dateStr)}
                className={`aspect-square border-b border-r border-slate-100 dark:border-slate-800 p-1 sm:p-2 flex flex-col items-center justify-start gap-0.5 transition-all relative group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 ${
                  isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500 ring-inset' : ''
                }`}
              >
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                  isToday
                    ? 'bg-indigo-500 text-white font-bold'
                    : isSelected
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {d.day}
                </span>
                {hasEvents && (
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          ev.status === 'ongoing'
                            ? 'bg-emerald-500 animate-pulse'
                            : ev.status === 'upcoming'
                            ? 'bg-blue-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-slate-400">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
                {hasOngoing && (
                  <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse-glow" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date events */}
        {selectedDate && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 animate-slide-in">
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
              {selectedEvents.length > 0
                ? `${selectedEvents.length} acara pada ${selectedDate}`
                : `Tidak ada acara pada ${selectedDate}`
              }
            </h4>
            <div className="space-y-2">
              {selectedEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => { if (isAdmin) onEventClick(event); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${isAdmin ? 'hover:shadow-md cursor-pointer' : 'cursor-default'} ${
                    event.status === 'ongoing'
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                      : event.status === 'upcoming'
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 dark:text-white">{event.acara}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      event.status === 'ongoing' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      event.status === 'upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {event.status === 'ongoing' ? 'Live' : event.status === 'upcoming' ? 'Mendatang' : 'Selesai'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.jam || '-'}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.lokasi || '-'}</span>
                  </div>
                  {isAdmin && (
                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1.5 font-medium">Klik untuk edit</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
