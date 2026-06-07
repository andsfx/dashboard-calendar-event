import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Clock, MapPin } from 'lucide-react';
import { EventItem, HolidayItem } from '../types';
import { CalendarView } from './CalendarView';
import { RevealSection, eyebrow } from './PublicShared';

const BRAND = {
  accent: '#7c6cf2',
  accentWarm: '#f2743e',
};

const AGENDA_INITIAL_LIMIT = 6;

interface PublicEventGridProps {
  events: EventItem[];
  ongoingEvents: EventItem[];
  upcomingEvents: EventItem[];
  isLoading: boolean;
  holidays: HolidayItem[];
  onDetail: (event: EventItem) => void;
}

export function PublicEventGrid({ events, ongoingEvents, upcomingEvents, isLoading, holidays, onDetail }: PublicEventGridProps) {
  const allAgenda = useMemo(
    () => [...ongoingEvents, ...upcomingEvents]
      .filter((item, index, array) => array.findIndex(other => other.id === item.id) === index),
    [ongoingEvents, upcomingEvents]
  );
  const [showAllAgenda, setShowAllAgenda] = useState(false);
  const visibleAgenda = showAllAgenda ? allAgenda : allAgenda.slice(0, AGENDA_INITIAL_LIMIT);

  return (
    <><RevealSection id="featured" intensity="strong" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                {eyebrow('Agenda Mendatang')}
                <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Semua acara yang akan datang.</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400">
                Daftar lengkap acara yang sedang berlangsung dan akan segera dimulai di area Metropolitan Mall Bekasi.
                {allAgenda.length > 0 && <span className="ml-1 font-medium text-violet-500 dark:text-violet-400">{allAgenda.length} acara tersedia</span>}
              </p>
            </div>

            {allAgenda.length > 0 ? (
              <>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleAgenda.map(ev => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onDetail(ev)}
                      className="group rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)] dark:bg-slate-800 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        {ev.status === 'ongoing' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                            Segera hadir
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{ev.month}</span>
                      </div>
                        <p className="mt-3 text-xl font-semibold leading-tight text-slate-900 line-clamp-2 group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-200">{ev.acara}</p>
                      <div className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{ev.tanggal}{ev.jam ? ` | ${ev.jam}` : ''}</span>
                        </div>
                        {ev.lokasi && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-1">{ev.lokasi}</span>
                          </div>
                        )}
                      </div>
                      {ev.keterangan && (
                        <p className="mt-3 line-clamp-2 border-t border-slate-200/50 pt-3 text-sm leading-6 text-slate-400 dark:border-slate-700 dark:text-slate-500">{ev.keterangan}</p>
                      )}
                      {ev.categories && ev.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {ev.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="rounded-full border border-slate-200/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400">{cat}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {allAgenda.length > AGENDA_INITIAL_LIMIT && (
                  <div className="mt-8 text-center">
                    {showAllAgenda ? (
                      <button
                        type="button"
                        onClick={() => setShowAllAgenda(false)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Tampilkan lebih sedikit
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAllAgenda(true)}
                        className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}
                      >
                        Lihat semua {allAgenda.length} acara
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-10 rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.05)] dark:bg-slate-800 dark:border-slate-700">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-4 text-xl font-semibold text-slate-700 dark:text-white">Belum ada agenda mendatang</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Jadwal acara berikutnya akan segera diumumkan. Pantau kalender publik untuk update terbaru.</p>
                <a href="#calendar" className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}>
                  Lihat Kalender
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </RevealSection>

        <RevealSection id="calendar" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="reveal-cluster mx-auto max-w-7xl space-y-10">
            <div className="rounded-[2.25rem] border border-slate-200/50 bg-[#fcfaf6] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:bg-slate-800 dark:border-slate-700">
              {isLoading ? <div className="h-[32rem] animate-pulse rounded-[1.8rem] bg-slate-200/70 dark:bg-slate-800/70" /> : <CalendarView events={events} holidays={holidays} onDetail={onDetail} />}
            </div>
            <div className="max-w-3xl">
              {eyebrow('Kalender')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Pilih tanggal, lalu temukan acara.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-400">Kalender ini merangkum jadwal panggung, bazaar, program keluarga, dan agenda musiman agar rencana kunjungan lebih mudah disusun dari satu tampilan.</p>
            </div>
          </div>
        </RevealSection></>
  );
}
