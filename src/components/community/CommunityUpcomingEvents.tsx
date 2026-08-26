import React, { useState, useEffect, CSSProperties } from 'react';
import { Clock, MapPin, CalendarDays, ArrowRight, Handshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventItem, PhotoAlbum } from '../../types';
import { CATEGORY_COLORS } from '../../utils/eventUtils';
import { parseTimeRange } from '../../utils/eventDateTime';
import { RevealSection } from './CommunityRevealPrimitives';

function EmptyEvents() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 py-16 text-center dark:border-slate-700 dark:bg-slate-800/30">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_10%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_20%,black)]">
        <CalendarDays className="h-8 w-8 text-[var(--brand-tosca-soft)] dark:text-[var(--brand-tosca)]" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-200">Belum ada event mendatang</p>
      <p className="mt-2 max-w-xs text-sm text-slate-600 dark:text-slate-400">Event baru akan segera hadir. Pantau terus halaman ini atau hubungi kami untuk info terkini.</p>
      <a
        href="#contact"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-tosca-dark)]"
      >
        Hubungi Kami <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

/**
 * HI-6: target countdown = jam mulai event (bukan tengah malam).
 * `jam` format "10:00 - 12:00"; jika kosong, fallback ke tengah malam hari H.
 */
function getCountdownTarget(dateStr: string, jam?: string): number {
  const start = jam ? parseTimeRange(jam) : null;
  const base = new Date(`${dateStr}T00:00:00`).getTime();
  if (!start) return base;
  return base + start.startHour * 3_600_000 + start.startMin * 60_000;
}

function getCountdownFromDiff(diff: number) {
  const safeDiff = Math.max(0, diff);
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  return {
    days: Math.floor(safeDiff / dayMs),
    hours: Math.floor((safeDiff % dayMs) / hourMs),
    minutes: Math.floor((safeDiff % hourMs) / minuteMs),
  };
}

function CountdownPill({ label, value, color }: { label: string; value: number; color?: string }) {
  const pillStyle: CSSProperties = color
    ? { borderColor: `${color}40`, backgroundColor: `${color}12` }
    : {};
  return (
    <div
      className="rounded-2xl border border-[color-mix(in_srgb,var(--brand-tosca)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand-tosca)_10%,white)] px-4 py-3 text-center text-[var(--brand-tosca-dark)] dark:border-[color-mix(in_srgb,var(--brand-tosca)_40%,black)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_20%,black)] dark:text-[var(--brand-tosca-soft)]"
      style={pillStyle}
    >
      <p className="text-2xl font-bold tabular-nums sm:text-3xl">{String(value).padStart(2, '0')}</p>
      <p className="mt-1 text-[10px] font-medium tracking-wider">{label}</p>
    </div>
  );
}

interface Props {
  events: EventItem[];
  albums: PhotoAlbum[];
  onDetail?: (ev: EventItem) => void;
  isLoading?: boolean;
}

function UpcomingEventsSkeleton() {
  return (
    <RevealSection id="upcoming-events" className="border-t border-black/5 px-4 py-16 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
          Agenda event
        </h2>
        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-neutral-100 dark:border-slate-700 dark:bg-slate-800" aria-hidden="true">
          <div className="p-6 sm:p-10 lg:p-12">
            <span className="inline-block h-6 w-36 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
            <span className="mt-6 block h-10 w-3/4 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
            <span className="mt-4 block h-10 w-1/2 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
            <span className="mt-8 block h-4 w-full animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
            <span className="mt-3 block h-4 w-5/6 animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
          </div>
          <div className="border-t border-black/5 bg-white/50 p-6 sm:p-10 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="grid max-w-md grid-cols-3 gap-3">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

export function CommunityUpcomingEvents({ events, albums, onDetail, isLoading = false }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const mainEvent = events[0];
  if (isLoading) {
    return <UpcomingEventsSkeleton />;
  }
  if (!mainEvent) {
    return (
      <RevealSection id="upcoming-events" className="border-t border-black/5 px-4 py-16 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Agenda event
          </h2>
          <EmptyEvents />
        </div>
      </RevealSection>
    );
  }
  const otherEvents = events.slice(1);

  // Derive category color from mainEvent
  const mainCat = (mainEvent.categories?.length ? mainEvent.categories[0] : mainEvent.category) || 'Umum';
  const catColor = CATEGORY_COLORS[mainCat] ?? CATEGORY_COLORS.Umum;

  const countdownTarget = getCountdownTarget(mainEvent.dateStr, mainEvent.jam);
  const isMultiDay = !!mainEvent.dateEnd && mainEvent.dateEnd !== mainEvent.dateStr;
  const countdownDiff = countdownTarget - now;
  const showCountdown = countdownDiff > 0 && mainEvent.status !== 'ongoing';
  const showOngoing = !showCountdown && (!!mainEvent.jam || isMultiDay);
  const countdown = showCountdown ? getCountdownFromDiff(countdownDiff) : null;
  const mainAlbum = albums.find(album => album.eventId === mainEvent.id);
  const promoImageUrl = mainEvent.posterUrl || mainAlbum?.coverPhotoUrl || '';

  return (
    <RevealSection id="upcoming-events" intensity="strong" className="border-t border-black/5 px-4 py-16 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className={`grid gap-6 lg:items-stretch ${promoImageUrl ? 'lg:grid-cols-[1.15fr_0.85fr]' : 'lg:grid-cols-1'}`}>
          {/* ── Main event card ── */}
          <button
            type="button"
            onClick={() => onDetail?.(mainEvent)}
            className="group text-left rounded-[2rem] border border-[var(--border-subtle)] bg-neutral-100 shadow-[0_12px_32px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800 lg:flex lg:flex-col lg:justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            <div className="p-6 sm:p-10 lg:p-12">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200" style={{ borderColor: `${catColor}40`, backgroundColor: `${catColor}10` }}>
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:hidden" style={{ backgroundColor: catColor }}></span>
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
              {showCountdown && countdown ? (
                <>
                  <p className="mb-3 text-xs font-bold tracking-wide text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]">Countdown menuju event</p>
                  <div className="grid max-w-md grid-cols-3 gap-3">
                    <CountdownPill label="Hari" value={countdown.days} color={catColor} />
                    <CountdownPill label="Jam" value={countdown.hours} color={catColor} />
                    <CountdownPill label="Menit" value={countdown.minutes} color={catColor} />
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border px-5 py-4" style={{ borderColor: `${catColor}40`, backgroundColor: `${catColor}12` }}>
                  <p className="text-xl font-bold sm:text-2xl" style={{ color: catColor }}>
                    {showOngoing ? 'Sedang Berlangsung' : 'Hari Ini'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {showOngoing ? (mainEvent.jam || mainEvent.tanggal) : (mainEvent.jam || 'Sepanjang hari')}
                  </p>
                </div>
              )}
              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold text-white transition group-hover:bg-[var(--brand-tosca-dark)]">
                Lihat Detail Event <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </button>

          {/* Right: promo poster — hidden when no poster/flyer */}
          {promoImageUrl && (
            <div className="flex items-end justify-center mt-4 lg:mt-0 lg:justify-end">
              <div className="w-full max-w-[280px] overflow-hidden rounded-[1.5rem] border border-[var(--border-subtle)] bg-slate-100 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800">
                <img
                  src={promoImageUrl}
                  alt={`Promo ${mainEvent.acara}`}
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}
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
                className="group flex flex-col items-start gap-4 rounded-3xl border border-[var(--border-subtle)] bg-white p-5 text-left shadow-[0_4px_12px_rgba(15,23,42,0.02)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200" style={{ backgroundColor: `${color}15` }}>
                    <CalendarDays className="h-3 w-3" />
                    {ev.tanggal}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </div>
                <div>
                  <h4 className="text-lg font-bold leading-tight text-slate-900 dark:text-white line-clamp-2">
                    {ev.acara}
                  </h4>
                  {(ev.jam || ev.lokasi) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-600 dark:text-slate-400">
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
            <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--brand-tosca)_6%,white)] p-5 dark:border-slate-700 dark:bg-[color-mix(in_srgb,var(--brand-tosca)_12%,black)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)]">
                <Handshake className="h-6 w-6 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]">Sponsor & Support</p>
                <p className="mt-1.5 text-lg font-bold leading-tight text-slate-950 dark:text-white">Cari Sponsor atau Dukungan</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Hubungi tim kami untuk peluang sponsorship dan kolaborasi event.</p>
              </div>
              <a
                href={`https://wa.me/6281318534823?text=${encodeURIComponent(`Halo, saya tertarik untuk menjadi sponsor atau mendukung event "${mainEvent.acara}". Mohon informasi lebih lanjut.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                Hubungi Kami <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        {/* ── Link ke semua event ── */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/events"
            className={`inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950`}
          >
            Lihat Semua Event
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </RevealSection>
  );
}
