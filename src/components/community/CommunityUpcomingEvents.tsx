import React, { useState, useEffect, CSSProperties } from 'react';
import { Clock, MapPin, CalendarDays, ArrowRight, Radio } from 'lucide-react';
import { EventItem, PhotoAlbum } from '../../types';
import { CATEGORY_COLORS } from '../../utils/eventUtils';
import { RevealSection } from './CommunityRevealPrimitives';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

function EmptyEvents() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 py-16 text-center dark:border-slate-700 dark:bg-slate-800/30">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
        <CalendarDays className="h-8 w-8 text-violet-400 dark:text-violet-500" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-200">Belum ada event mendatang</p>
      <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">Event baru akan segera hadir. Pantau terus halaman ini atau hubungi kami untuk info terkini.</p>
      <a
        href="#contact"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
      >
        Hubungi Kami <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function GridCardsView({ events, onDetail }: { events: EventItem[]; onDetail: (ev: EventItem) => void }) {
  const sorted = [...events].sort((a, b) => {
    if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
    if (a.status !== 'ongoing' && b.status === 'ongoing') return 1;
    return a.dateStr.localeCompare(b.dateStr);
  }).slice(0, 6);

  if (sorted.length === 0) return <EmptyEvents />;

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map(ev => {
        const color = CATEGORY_COLORS[ev.category] ?? '#6366f1';
        const isOngoing = ev.status === 'ongoing';
        return (
          <button
            key={ev.id}
            type="button"
            onClick={() => onDetail(ev)}
            aria-label={`${ev.acara} — ${ev.tanggal}`}
            className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl text-left shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 ${focusRing}`}
          >
            {/* Gradient top section — fixed min-height for consistency */}
            <div
              className="relative flex min-h-[120px] flex-1 flex-col justify-between px-5 pb-5 pt-5"
              style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}
            >
              {/* Status badge */}
              <div>
                {isOngoing ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <Radio className="h-3 w-3" aria-hidden="true" /> BERLANGSUNG
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" /> {ev.tanggal}
                  </span>
                )}
              </div>
              <p className="mt-3 text-base font-bold leading-snug text-white line-clamp-2 drop-shadow-sm">{ev.acara}</p>
            </div>
            {/* Bottom section */}
            <div className="border border-t-0 border-slate-200/50 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800 rounded-b-2xl">
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                {ev.jam && <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" aria-hidden="true" /><span>{ev.jam}</span></div>}
                {ev.lokasi && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="line-clamp-1">{ev.lokasi}</span></div>}
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-700 transition-colors group-hover:text-violet-600 dark:text-slate-300 dark:group-hover:text-violet-400">
                Lihat Detail <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function EventShowcase({ events, onDetail, onViewAll }: { events: EventItem[]; onDetail: (ev: EventItem) => void; onViewAll: () => void }) {
  return (
    <>
      <GridCardsView events={events} onDetail={onDetail} />

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onViewAll}
          className={`inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
        >
          <CalendarDays className="h-4 w-4" />
          Lihat Semua Event
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function getCountdown(targetDate: string, now: number) {
  const target = new Date(`${targetDate}T00:00:00`).getTime();
  const diff = Math.max(0, target - now);
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  return {
    days: Math.floor(diff / dayMs),
    hours: Math.floor((diff % dayMs) / hourMs),
    minutes: Math.floor((diff % hourMs) / minuteMs),
  };
}

function CountdownPill({ label, value, color }: { label: string; value: number; color?: string }) {
  const pillStyle: CSSProperties = color
    ? { borderColor: `${color}40`, backgroundColor: `${color}12`, color }
    : {};
  return (
    <div
      className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-center text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
      style={pillStyle}
    >
      <p className="text-2xl font-bold sm:text-3xl">{String(value).padStart(2, '0')}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em]">{label}</p>
    </div>
  );
}

interface Props {
  events: EventItem[];
  albums: PhotoAlbum[];
  onDetail?: (ev: EventItem) => void;
}

export function CommunityUpcomingEvents({ events, albums, onDetail }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (events.length === 0) return null;

  const [mainEvent, ...otherEvents] = events;
  if (!mainEvent) return null;

  // Derive category color from mainEvent
  const mainCat = (mainEvent.categories?.length ? mainEvent.categories[0] : mainEvent.category) || 'Umum';
  const catColor = CATEGORY_COLORS[mainCat] ?? CATEGORY_COLORS.Umum;

  const countdown = getCountdown(mainEvent.dateStr, now);
  const mainAlbum = albums.find(album => album.eventId === mainEvent.id);
  const promoImageUrl = mainEvent.posterUrl || mainAlbum?.coverPhotoUrl || '';
  const promoImageCaption = mainEvent.posterUrl
    ? 'Poster/flyer dari detail event.'
    : mainAlbum?.coverPhotoUrl
      ? 'Materi promosi dari album gallery event.'
      : 'Belum ada poster/flyer untuk event ini.';

  return (
    <RevealSection id="upcoming-events" intensity="strong" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          {/* ── Main event card ── */}
          <div className="rounded-[2rem] border border-black/[0.06] bg-[#faf6ef] shadow-[0_12px_32px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800 lg:flex lg:flex-col lg:justify-between">
            <div className="p-6 sm:p-10 lg:p-12">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: catColor, borderColor: `${catColor}40`, backgroundColor: `${catColor}10` }}>
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: catColor }}></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catColor }}></span>
                </span>
                Event Berikutnya
              </span>
              <h3 className="mt-6 text-3xl font-bold leading-[1.15] tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                {mainEvent.acara}
              </h3>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 dark:border-slate-600 dark:bg-slate-700/50">
                  <CalendarDays className="h-4 w-4" style={{ color: catColor }} /> {mainEvent.tanggal}
                </span>
                {mainEvent.jam && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 dark:border-slate-600 dark:bg-slate-700/50">
                    <Clock className="h-4 w-4" style={{ color: catColor }} /> {mainEvent.jam}
                  </span>
                )}
                {mainEvent.lokasi && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 dark:border-slate-600 dark:bg-slate-700/50">
                    <MapPin className="h-4 w-4" style={{ color: catColor }} /> {mainEvent.lokasi}
                  </span>
                )}
              </div>
              {mainEvent.keterangan && (
                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 line-clamp-3">
                  {mainEvent.keterangan}
                </p>
              )}
            </div>

            <div className="border-t border-black/5 bg-white/50 p-6 sm:p-10 dark:border-slate-700 dark:bg-slate-800/50 lg:rounded-b-[2rem]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: catColor }}>Countdown menuju event</p>
              <div className="grid max-w-md grid-cols-3 gap-3">
                <CountdownPill label="Hari" value={countdown.days} color={catColor} />
                <CountdownPill label="Jam" value={countdown.hours} color={catColor} />
                <CountdownPill label="Menit" value={countdown.minutes} color={catColor} />
              </div>
              <button
                type="button"
                onClick={() => onDetail?.(mainEvent)}
                className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                style={{ background: `linear-gradient(90deg, ${catColor} 0%, ${catColor}dd 100%)` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `linear-gradient(90deg, ${catColor}ee 0%, ${catColor}cc 100%)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `linear-gradient(90deg, ${catColor} 0%, ${catColor}dd 100%)`; }}
              >
                Lihat Detail Event <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right: promo poster — visible all sizes */}
          <div className="flex items-end justify-center mt-4 lg:mt-0 lg:justify-end">
            <div className="w-full max-w-[280px] overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-slate-100 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800 rotate-2 transition-transform hover:rotate-0">
              {promoImageUrl ? (
                <img
                  src={promoImageUrl}
                  alt={`Promo ${mainEvent.acara}`}
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-[3/4] w-full flex-col items-center justify-center p-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-700">
                    <CalendarDays className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{promoImageCaption}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Other upcoming events ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {otherEvents.map(ev => {
            const evCat = (ev.categories?.length ? ev.categories[0] : ev.category) || 'Umum';
            const color = CATEGORY_COLORS[evCat] ?? CATEGORY_COLORS.Umum;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onDetail?.(ev)}
                className="group flex flex-col items-start gap-4 rounded-3xl border border-black/[0.06] bg-white p-5 text-left shadow-[0_4px_12px_rgba(15,23,42,0.02)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color, backgroundColor: `${color}15` }}>
                    <CalendarDays className="h-3 w-3" />
                    {ev.tanggal}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                </div>
                <div>
                  <h4 className="text-lg font-bold leading-tight text-slate-900 dark:text-white line-clamp-2">
                    {ev.acara}
                  </h4>
                  {(ev.jam || ev.lokasi) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {ev.jam && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {ev.jam}</span>}
                      {ev.lokasi && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> <span className="line-clamp-1">{ev.lokasi}</span></span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Cari sponsor card */}
          {events.length < 4 && (
            <div className="flex flex-col justify-between rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${catColor}18` }}>
                <CalendarDays className="h-8 w-8" style={{ color: catColor }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: catColor }}>Sponsor & Support</p>
                <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">Cari Sponsor atau Dukungan</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Hubungi tim kami untuk peluang sponsorship dan kolaborasi event.</p>
              </div>
              <a
                href={`https://wa.me/6281318534823?text=${encodeURIComponent(`Halo, saya tertarik untuk menjadi sponsor atau mendukung event "${mainEvent.acara}". Mohon informasi lebih lanjut.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition"
                style={{ background: `linear-gradient(90deg, ${catColor} 0%, ${catColor}dd 100%)` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `linear-gradient(90deg, ${catColor}ee 0%, ${catColor}cc 100%)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `linear-gradient(90deg, ${catColor} 0%, ${catColor}dd 100%)`; }}
              >
                Hubungi Kami <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </RevealSection>
  );
}
