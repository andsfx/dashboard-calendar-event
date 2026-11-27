import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, Inbox, X } from 'lucide-react';
import { EventArea, EventItem, HolidayItem } from '../../types';
import { 
  generateCalendarDays, 
  isMultiDayEvent,
  getMultiDayEventsForDate,
  getSingleDayEventsForDate,
  formatDateRange,
  getMultiDayJamDisplay,
  getEventDuration,
  getDateRange,
  isRecurringEvent
} from '../../utils/eventUtils';
import { StatusBadge } from '../ui/StatusBadge';
import { CategoryBadges } from '../ui/CategoryBadges';
import { ModalWrapper } from '../modals/ModalWrapper';
import { Button } from '../shadcn/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyMedia, EmptyDescription } from '../shadcn/empty';

const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const DAY_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
// Hanya dua status yang bisa tampil di sini: `/events` tidak pernah mengirim
// event `past` (lihat `liveEvents` di EventsLandingPage). Status tetap dipakai
// untuk peringkat sort, badge kartu, dan titik warna di grid; PENGELOMPOKAN
// panel bulan/hari memakai area venue via `areaId` (bukan status) supaya
// konsisten dengan pengelompokan venue di #featured.
function getStatusRank(status: string) {
  if (status === 'ongoing') return 0;
  if (status === 'upcoming') return 1;
  return 2;
}

/** Grup panel bulan/hari: satu grup per area (venue). Sumbu lokasi = `areaId`
 *  yang di-resolve lewat `areas` — kanonik dan sama dengan `venueSections` di
 *  halaman. String `ev.lokasi` mentah sengaja TIDAK dipakai: di data produksi
 *  ia terfragmentasi menjadi banyak ejaan satu venue yang sama (mis.
 *  "Panggung Funworld Lt. 3", "Panggung Lt. 3", "Lt. 3 Fun World"), sehingga
 *  grouping string akan memecah venue itu jadi beberapa header.
 *  Urutan grup = `sortOrder` area lalu nama; event tanpa area (atau area tidak
 *  dikenal) masuk "Area belum ditentukan" paling akhir. */
function groupByArea(
  events: EventItem[],
  areas: EventArea[],
): Array<{ key: string; name: string; events: EventItem[] }> {
  const areaById = new Map(areas.map(a => [a.id, a]));
  const byArea = new Map<string, EventItem[]>();
  const unmapped: EventItem[] = [];
  for (const ev of events) {
    const area = ev.areaId ? areaById.get(ev.areaId) : undefined;
    if (!area) { unmapped.push(ev); continue; }
    const bucket = byArea.get(area.id);
    if (bucket) bucket.push(ev);
    else byArea.set(area.id, [ev]);
  }
  const groups = [...areas]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'id'))
    .flatMap(area => {
      const evs = byArea.get(area.id);
      return evs && evs.length > 0 ? [{ key: area.id, name: area.name, events: evs }] : [];
    });
  if (unmapped.length > 0) groups.push({ key: '__unmapped', name: 'Area belum ditentukan', events: unmapped });
  return groups;
}

function getTimeSortValue(jam: string) {
  const match = jam?.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hour = match[1];
  const minute = match[2];
  if (!hour || !minute) return Number.MAX_SAFE_INTEGER;
  return parseInt(hour, 10) * 60 + parseInt(minute, 10);
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
  areas?: EventArea[];
  holidays: HolidayItem[];
  onDetail: (ev: EventItem) => void;
  /**
   * Komponen ini kini hanya untuk permukaan publik (`/events`). Versi dashboard
   * dipindah ke `dashboard/DashboardCalendarView` (lima tampilan), jadi cabang
   * skin dashboard-nya dihapus agar tidak ada dua kalender yang berbeda
   * diam-diam. Prop `variant` dipertahankan demi pemanggil lama.
   */
  variant?: 'public';
}

export function CalendarView({ events, areas = [], holidays, onDetail }: Props) {
 const surfaceClass = 'overflow-hidden rounded-[1.5rem] border bg-[var(--wf-board)] shadow-[var(--shadow-card-soft)] border-[var(--wf-rule)]';
 const headerClass = 'flex items-center justify-between border-b bg-[var(--wf-board)] px-5 py-4 border-[var(--wf-rule)]';
  const headerBtnClass = 'min-h-11 min-w-11 rounded-lg text-[var(--brand-tosca)] transition-colors hover:bg-[var(--wf-board-2)] dark:text-[var(--brand-tosca-soft)] ui-focus-ring';
  const headerTitleClass = 'font-mono text-lg font-bold uppercase tracking-[0.06em] text-[var(--wf-ink)]';
  const headerSubClass = 'font-mono text-xs uppercase tracking-[0.08em] text-[var(--wf-ink-muted)]';
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = generateCalendarDays(year, month);
  const holidaysByDate = holidays.reduce((acc, holiday) => {
    if (!acc[holiday.dateStr]) acc[holiday.dateStr] = [];
    const dateArray = acc[holiday.dateStr];
    if (dateArray) {
      dateArray.push(holiday);
    }
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
      const statusCompare = getStatusRank(a.status) - getStatusRank(b.status);
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
  const monthLocationGroups = groupByArea(monthEvents.filter(ev => !isMultiDayEvent(ev)), areas);
  // selectedDayEvents: gabungkan single-day events + multi-day events yang overlap
  const selectedDayEvents = selectedDate ? (() => {
    const singleDay = getSingleDayEventsForDate(events, selectedDate);
    const multiDay = getMultiDayEventsForDate(events, selectedDate);
    return [...singleDay, ...multiDay].sort((a, b) => {
      const statusCompare = getStatusRank(a.status) - getStatusRank(b.status);
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
  // Sumber urutan = `selectedDayEvents` yang sudah diurutkan status → jam → nama
  // (`getSingleDayEventsForDate` hanya memfilter). `groupByArea` mempertahankan
  // urutan masuk di dalam grup, jadi memakai daftar unsorted akan mengacak kartu
  // popup hari dibanding sebelum pengelompokan per area.
  const dayLocationGroups = groupByArea(selectedDayEvents.filter(ev => !isMultiDayEvent(ev)), areas);
  /* Judul grup disembunyikan HANYA bila satu-satunya grup adalah event tanpa
   * area: di kondisi itu judulnya cuma "Area belum ditentukan" untuk seluruh
   * panel (terjadi saat `areas` belum termuat atau data lama tanpa `area_id`).
   * Satu grup ber-area tetap diberi judul — nama venue + jumlah event adalah
   * informasi nyata, bukan pengulangan. */
  const showMonthGroupHeaders = !(monthLocationGroups.length === 1 && monthLocationGroups[0]?.key === '__unmapped');
  const showDayGroupHeaders = !(dayLocationGroups.length === 1 && dayLocationGroups[0]?.key === '__unmapped');

  return (
    <>
      {/* Dua kolom hanya berdampingan di `lg` (flex-row); di bawah itu kolom
          bertumpuk, jadi sticky dipasang `lg:` saja. Offset = header sticky
          `h-16` + border 1px + strip filter (`#filter`, terukur 74px di 1440)
          + jarak 8px → 4rem+1px+82px. Diukur lewat probe Playwright, bukan
          salinan `top-44` dari `redesign/code.html:454`. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Calendar grid */}
        <div className={`${surfaceClass} lg:sticky lg:top-[calc(4rem+1px+82px)] lg:w-96 lg:shrink-0`}>
        {/* Header */}
        <div className={headerClass}>
          <Button type="button" variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Bulan sebelumnya" className={headerBtnClass}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className={headerTitleClass}>{MONTH_ID[month]}</p>
            <p className={headerSubClass}>{year} · {monthEvents.length} acara</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={nextMonth} aria-label="Bulan berikutnya" className={headerBtnClass}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[var(--wf-rule)] ">
          {DAY_SHORT.map(d => (
            <div key={d} className="py-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--wf-ink-muted)]">{d}</div>
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
              <Button
                type="button"
                variant="ghost"
                key={d.dateStr}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDate(null);
                    return;
                  }
                  setSelectedDate(d.dateStr);
                }}
                aria-label={dayLabel}
                className={`relative flex! h-11 w-full! flex-col items-center justify-center rounded-lg border-0! p-0! font-mono text-[11px] font-medium tabular-nums transition-[background-color,color,box-shadow] active:translate-y-0! sm:rounded-xl sm:text-xs ${
                  isSelected
                    ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)] shadow-md hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]!'
                    : isToday
                    ? 'bg-[var(--wf-accent-soft)] font-bold! text-[var(--wf-accent)] ring-2 ring-[var(--wf-accent)] hover:bg-[var(--wf-accent-soft)]! hover:text-[var(--wf-accent)]!'
                    : 'text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink)]!'
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
                        : 'bg-[var(--wf-rule-strong)]';
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
                    {!hasOngoing && !hasUpcoming && <span className="h-1 w-1 rounded-full bg-[var(--wf-rule-strong)]" />}
                  </div>
                )}
              </Button>
            );
          })}
        </div>

        {/* Legend */}
<div className="flex flex-wrap items-center justify-center gap-3 border-t border-[var(--wf-rule)] px-3 py-3 text-[11px] text-[var(--wf-ink-muted)]  sm:text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Berlangsung</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Mendatang</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Libur nasional</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />Cuti bersama</span>
        </div>
        </div>

        {/* Monthly event panel */}
        <div className="flex-1">
        {monthEvents.length > 0 || monthHolidays.length > 0 ? (
          <div className={surfaceClass}>
            <div className="border-b border-black/[0.04] px-4 py-4 sm:px-5 border-[var(--wf-rule)]">
              <p className="font-semibold text-[var(--wf-ink)] ">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--wf-accent)]" /> Agenda {MONTH_ID[month]} {year}</span>
              </p>
              <p className="text-xs text-[var(--wf-ink-muted)] ">
                {monthEvents.length} acara dan {monthHolidays.length} hari libur di bulan ini
              </p>
            </div>
            <div className="space-y-6 p-4 sm:p-5">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--wf-ink)] ">Acara</h3>
                    <p className="text-xs text-[var(--wf-ink-muted)] ">
                      {monthEvents.length} acara di bulan ini
                      {monthEvents.length > 0 && (
                        <span>
                          {' '}({[
                            monthEvents.filter(e => e.status === 'ongoing').length > 0 && `${monthEvents.filter(e => e.status === 'ongoing').length} berlangsung`,
                            monthEvents.filter(e => e.status === 'upcoming').length > 0 && `${monthEvents.filter(e => e.status === 'upcoming').length} mendatang`,
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
                        <div className="mb-5 space-y-3 rounded-xl border border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] p-4  ">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[var(--wf-accent)]" />
                            <p className="text-xs font-semibold text-[var(--wf-accent)] ">
                            Rangkaian acara ({multiDayEvents.length})
                          </p>
                        </div>
                        <div className="space-y-3">
                          {multiDayEvents.map(ev => {
                              const duration = getEventDuration(ev.dateStr, ev.dateEnd);
                              return (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  key={ev.id}
                                  onClick={() => onDetail(ev)}
                                  className="flex! flex-col! items-stretch! justify-start! h-auto! w-full! gap-0! rounded-xl border border-[var(--wf-accent)]/40! bg-[var(--wf-board)] p-3! text-left! whitespace-normal! font-normal! shadow-[var(--shadow-card-soft)] transition-[background-color,box-shadow,transform]! hover:-translate-y-0.5 hover:bg-[var(--wf-accent-soft)]! hover:shadow-md active:translate-y-0!"
                                >
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-[var(--wf-accent)] ">
                                      {formatDateRange(ev.dateStr, ev.dateEnd)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--wf-accent)]  ">
                                        {duration} hari
                                      </span>
                                      <StatusBadge status={ev.status} size="sm" />
                                      {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)]  ">Reguler</span>}
                                    </div>
                                  </div>
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <CategoryBadges categories={ev.categories} maxVisible={2} />
                                  </div>
                                  <p className="font-semibold text-[var(--wf-ink)] ">{ev.acara}</p>
                                  <div className="mt-2 space-y-1 text-xs text-[var(--wf-ink-muted)]">
                                    {getMultiDayJamDisplay(ev) && (
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="size-3 shrink-0" />
                                        <span>{getMultiDayJamDisplay(ev)}</span>
                                      </div>
                                    )}
                                    {ev.lokasi && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="size-3 shrink-0" />
                                        <span className="line-clamp-2">{ev.lokasi}</span>
                                      </div>
                                    )}
                                    {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                                    {ev.keterangan && <p className="line-clamp-2 text-[var(--wf-ink-muted)] ">{ev.keterangan}</p>}
                                  </div>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Single-day events section: grup per area (venue). */}
                    {monthLocationGroups.map((group, groupIdx) => (
                      <div key={group.key} className={groupIdx > 0 ? 'mt-5 border-t border-[var(--wf-rule)] pt-5 ' : ''}>
                        {group.name && showMonthGroupHeaders && (
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[var(--wf-accent)]" aria-hidden="true" />
                            <h4 className="text-xs font-semibold text-[var(--wf-ink-muted)]">
                              {group.name} ({group.events.length})
                            </h4>
                          </div>
                        )}
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {group.events.map(ev => {
                              const isSelectedCard = selectedDate === ev.dateStr;
                              return (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  key={ev.id}
                                  onClick={() => onDetail(ev)}
                                  className={`flex! flex-col! items-stretch! justify-start! h-auto! w-full! gap-0! cursor-pointer rounded-2xl border p-4! text-left! whitespace-normal! font-normal! shadow-sm transition-[background-color,box-shadow,transform]! hover:-translate-y-0.5 hover:bg-[var(--wf-board-2)]! hover:shadow-md active:translate-y-0! ${
                                    isSelectedCard
                                      ? 'border-[var(--wf-accent)]/40! bg-[var(--wf-accent-soft)] ring-1 ring-[var(--wf-accent)]'
                                      : 'bg-[var(--wf-board)] border-[var(--wf-rule)]!'
                                  }`}
                                >
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className={`text-xs font-semibold ${isSelectedCard ? 'text-[var(--wf-accent)] ' : 'text-[var(--wf-ink-muted)]'}`}>
                                      {ev.day}, {ev.tanggal}
                                    </p>
                                    <StatusBadge status={ev.status} size="sm" />
                                    {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)]  ">Reguler</span>}
                                  </div>
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <CategoryBadges categories={ev.categories} maxVisible={2} />
                                  </div>
                                  <p className="font-semibold text-[var(--wf-ink)] ">{ev.acara}</p>
                                  <div className="mt-3 space-y-1.5 text-xs text-[var(--wf-ink-muted)]">
                                    {ev.jam && (
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="size-3 shrink-0" />
                                        <span>{ev.jam}</span>
                                      </div>
                                    )}
                                    {ev.lokasi && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="size-3 shrink-0" />
                                        <span className="line-clamp-2">{ev.lokasi}</span>
                                      </div>
                                    )}
                                    {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                                    {ev.keterangan && <p className="line-clamp-2 text-[var(--wf-ink-muted)] ">{ev.keterangan}</p>}
                                  </div>
                                </Button>
                              );
                            })}
                          </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ui-empty-panel px-4 py-6 text-sm text-[var(--wf-ink-muted)]">
                    <Empty className="border-0 bg-transparent p-0">
                      <EmptyHeader>
                        <EmptyTitle className="text-sm text-[var(--wf-ink-muted)]">Tidak ada acara di bulan ini.</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  </div>
                )}
              </section>

              <section className="space-y-3 border-t border-[var(--wf-rule)] pt-5 ">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--wf-ink)] ">Hari libur</h3>
                    <p className="text-xs text-[var(--wf-ink-muted)] ">{monthHolidays.length} hari libur di bulan ini</p>
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
                              ? 'border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] ring-1 ring-[var(--wf-accent)]   '
 : ' bg-[var(--wf-board)] border-[var(--wf-rule)]'
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-xs font-semibold ${isSelectedCard ? 'text-[var(--wf-accent)] ' : 'text-[var(--wf-ink-muted)]'}`}>
                              {holiday.day}, {holiday.tanggal}
                            </p>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass}`}>
                              {holiday.type === 'libur_nasional' ? 'Libur nasional' : 'Cuti bersama'}
                            </span>
                          </div>
                          <p className="font-semibold text-[var(--wf-ink)] ">{holiday.name}</p>
                          {holiday.description && (
                            <p className="mt-3 line-clamp-3 text-xs text-[var(--wf-ink-muted)]">{holiday.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ui-empty-panel px-4 py-6 text-sm text-[var(--wf-ink-muted)]">
                    <Empty className="border-0 bg-transparent p-0">
                      <EmptyHeader>
                        <EmptyTitle className="text-sm text-[var(--wf-ink-muted)]">Tidak ada hari libur di bulan ini.</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="ui-empty-panel flex h-full min-h-[260px] flex-col items-center justify-center px-4 text-[var(--wf-ink-muted)]  sm:min-h-[300px]">
            <Empty className="border-0 bg-transparent p-0">
              <EmptyMedia className="mb-3">
                <CalendarDays className="h-10 w-10 opacity-50" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada agenda atau hari libur di {MONTH_ID[month]} {year}</EmptyTitle>
                <EmptyDescription className="mt-1 text-xs text-[var(--wf-ink-muted)]">Coba pindah bulan untuk melihat informasi lainnya.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}

        {/* Monthly summary */}
        {monthEvents.length > 0 && (
          <div className={`${surfaceClass} mt-4 p-4`}>
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--wf-ink-muted)]">
              Ringkasan {MONTH_ID[month]} {year}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {([
                { key: 'ongoing', label: 'Berlangsung', color: 'text-emerald-600 dark:text-emerald-400' },
                { key: 'upcoming', label: 'Mendatang', color: 'text-amber-600 dark:text-amber-400' },
              ] as const).map(({ key, label, color }) => {
                const count = monthEvents.filter(e => e.status === key).length;
                return (
                  <div key={key} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{count}</p>
                    <p className="text-xs text-[var(--wf-ink-muted)]">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>

      <ModalWrapper isOpen={isDayPopupOpen} onClose={() => setSelectedDate(null)} maxWidth="max-w-2xl" ariaLabelledBy="calendar-day-title">
 <div className="max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--wf-board)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--wf-rule)] px-4 py-4 sm:px-6 ">
            <div>
              <p id="calendar-day-title" className="font-bold text-[var(--wf-ink)] ">Agenda {selectedDayTitle}</p>
              <p className="text-xs text-[var(--wf-ink-muted)] ">{selectedDayEvents.length} acara pada tanggal ini</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setSelectedDate(null)} className="min-h-11 min-w-11 rounded-xl p-2 text-[var(--wf-ink-muted)]  transition-colors hover:bg-[var(--wf-board-2)] sm:min-h-0 sm:min-w-0 " aria-label="Tutup">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

            <div className="space-y-5 px-4 py-5 sm:px-6">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--wf-ink)] ">Acara</h3>
                <p className="text-xs text-[var(--wf-ink-muted)] ">{selectedDayEvents.length} acara pada tanggal ini</p>
              </div>

              {selectedDayEvents.length > 0 ? (
                <div className="space-y-0">
                  {/* Multi-day events in day popup */}
                  {(() => {
                    const multiDayEvents = selectedDayEvents.filter(e => isMultiDayEvent(e));
                    if (multiDayEvents.length === 0) return null;
                    
                    return (
                      <div className="mb-4 space-y-3 rounded-xl border border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] p-3  ">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[var(--wf-accent)]" />
                          <p className="text-xs font-semibold text-[var(--wf-accent)] ">
                            Rangkaian acara ({multiDayEvents.length})
                          </p>
                        </div>
                        <div className="space-y-2">
                          {multiDayEvents.map(ev => {
                            const duration = getEventDuration(ev.dateStr, ev.dateEnd);
                            return (
                              <Button
                                type="button"
                                variant="ghost"
                                key={`day-popup-multiday-${ev.id}`}
                                onClick={() => {
                                  setSelectedDate(null);
                                  onDetail(ev);
                                }}
                                className="flex! flex-col! items-stretch! justify-start! h-auto! w-full! gap-0! rounded-lg border border-[var(--wf-accent)]/40! bg-[var(--wf-board)] p-3! text-left! whitespace-normal! font-normal! shadow-[var(--shadow-card-soft)] transition-[background-color,box-shadow,transform]! hover:-translate-y-0.5 hover:bg-[var(--wf-accent-soft)]! hover:shadow-md active:translate-y-0!"
                              >
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-[var(--wf-accent)] ">
                                    {formatDateRange(ev.dateStr, ev.dateEnd)}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--wf-accent)]  ">
                                      {duration} hari
                                    </span>
                                    <StatusBadge status={ev.status} size="sm" />
                                    {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)]  ">Reguler</span>}
                                  </div>
                                </div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <CategoryBadges categories={ev.categories} maxVisible={2} />
                                </div>
                                <p className="font-semibold text-[var(--wf-ink)] ">{ev.acara}</p>
                                <div className="mt-2 space-y-1 text-xs text-[var(--wf-ink-muted)]">
                                  {getMultiDayJamDisplay(ev) && (
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="size-3 shrink-0" />
                                      <span>{getMultiDayJamDisplay(ev)}</span>
                                    </div>
                                  )}
                                  {ev.lokasi && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="size-3 shrink-0" />
                                      <span className="line-clamp-2">{ev.lokasi}</span>
                                    </div>
                                  )}
                                  {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {dayLocationGroups.map((group, groupIdx) => (
                    <div key={group.key} className={groupIdx > 0 ? 'mt-4 border-t border-[var(--wf-rule)] pt-4 ' : ''}>
                      {group.name && showDayGroupHeaders && (
                        <div className="mb-3 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[var(--wf-accent)]" aria-hidden="true" />
                          <h4 className="text-xs font-semibold text-[var(--wf-ink-muted)]">
                            {group.name} ({group.events.length})
                          </h4>
                        </div>
                      )}
                        <div className="space-y-3">
                          {group.events.map(ev => (
                            <Button
                              type="button"
                              variant="ghost"
                              key={`day-popup-${ev.id}`}
                              onClick={() => {
                                setSelectedDate(null);
                                onDetail(ev);
                              }}
                              className="flex! flex-col! items-stretch! justify-start! h-auto! w-full! gap-0! rounded-2xl border bg-[var(--wf-board)] p-4! text-left! whitespace-normal! font-normal! shadow-[var(--shadow-card-soft)] transition-[background-color,box-shadow,transform]! hover:-translate-y-0.5 hover:bg-[var(--wf-board-2)]! hover:shadow-md active:translate-y-0! border-[var(--wf-rule)]!"
                            >
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-[var(--wf-ink-muted)]">{ev.day}, {ev.tanggal}</p>
                                <StatusBadge status={ev.status} size="sm" />
                                {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)]  ">Reguler</span>}
                              </div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <CategoryBadges categories={ev.categories} maxVisible={2} />
                              </div>
                              <p className="font-semibold text-[var(--wf-ink)] ">{ev.acara}</p>
                              <div className="mt-3 space-y-1.5 text-xs text-[var(--wf-ink-muted)]">
                                {ev.jam && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="size-3 shrink-0" />
                                    <span>{ev.jam}</span>
                                  </div>
                                )}
                                {ev.lokasi && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="size-3 shrink-0" />
                                    <span className="line-clamp-2">{ev.lokasi}</span>
                                  </div>
                                )}
                                {ev.eo && <p>Penyelenggara: {ev.eo}</p>}
                              </div>
                            </Button>
                          ))}
                        </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ui-empty-panel px-4 py-6 text-sm text-[var(--wf-ink-muted)]">
                  <Empty className="border-0 bg-transparent p-0">
                    <EmptyHeader>
                      <EmptyTitle className="text-sm text-[var(--wf-ink-muted)]">Tidak ada acara pada tanggal ini.</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </div>
              )}
            </section>

            <section className="space-y-3 border-t border-[var(--wf-rule)] pt-5 ">
              <div>
                <h3 className="text-sm font-bold text-[var(--wf-ink)] ">Hari libur</h3>
                <p className="text-xs text-[var(--wf-ink-muted)] ">{selectedDayHolidays.length} hari libur pada tanggal ini</p>
              </div>

              {selectedDayHolidays.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayHolidays.map(holiday => {
                    const badgeClass = holiday.type === 'libur_nasional'
                      ? 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/50'
                      : 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800/50';

                    return (
 <div key={`day-popup-holiday-${holiday.id}`} className="rounded-2xl border bg-[var(--wf-board)] p-4 text-left shadow-[var(--shadow-card-soft)] border-[var(--wf-rule)]">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[var(--wf-ink-muted)]">{holiday.day}, {holiday.tanggal}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass}`}>
                            {holiday.type === 'libur_nasional' ? 'Libur nasional' : 'Cuti bersama'}
                          </span>
                        </div>
                        <p className="font-semibold text-[var(--wf-ink)] ">{holiday.name}</p>
                        {holiday.description && <p className="mt-3 text-xs text-[var(--wf-ink-muted)]">{holiday.description}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ui-empty-panel px-4 py-6 text-sm text-[var(--wf-ink-muted)]">
                  <Empty className="border-0 bg-transparent p-0">
                    <EmptyHeader>
                      <EmptyTitle className="text-sm text-[var(--wf-ink-muted)]">Tidak ada hari libur pada tanggal ini.</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </div>
              )}
            </section>
          </div>
        </div>
      </ModalWrapper>
    </>
  );
}
