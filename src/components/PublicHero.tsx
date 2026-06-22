import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Clock, MapPin, Send, Timer, Zap } from 'lucide-react';
import heroImage from '../assets/landing/event-hero.jpg';
import { AnnualTheme, EventItem } from '../types';
import { parseDateStrLocal } from '../utils/eventUtils';
import { RevealSection } from './PublicShared';

const BRAND = {
  accent: 'var(--color-brand-primary)',
  accentWarm: 'var(--color-brand-secondary)',
};

interface PublicHeroProps {
  ongoingEvents: EventItem[];
  upcomingEvents: EventItem[];
  themes: AnnualTheme[];
  isDark: boolean;
  onDetail: (event: EventItem) => void;
}

function HeroCountdown({ dateStr }: { dateStr: string }) {
  const [diff, setDiff] = useState('');

  useEffect(() => {
    const calc = () => {
      const d = parseDateStrLocal(dateStr);
      const target = d ? d.getTime() : 0;
      const now = Date.now();
      const ms = target - now;
      if (ms <= 0) { setDiff('Hari ini'); return; }
      const days = Math.floor(ms / 86400000);
      const hrs = Math.floor((ms % 86400000) / 3600000);
      if (days > 0) setDiff(`${days}h ${hrs}j lagi`);
      else {
        const mins = Math.floor((ms % 3600000) / 60000);
        setDiff(`${hrs}j ${mins}m lagi`);
      }
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [dateStr]);

  if (!diff) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 backdrop-blur-sm">
      <Timer className="h-3 w-3" /> {diff}
    </span>
  );
}

function HeroEventCard({ event, onClick }: { event: EventItem; onClick: (ev: EventItem) => void }) {
  const isLive = event.status === 'ongoing';
  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className="group flex w-full items-start gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.07] p-4 text-left backdrop-blur-md transition hover:bg-white/[0.13] hover:border-white/[0.2]"
    >
      <div className="shrink-0 pt-0.5">
        {isLive ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-emerald-300" />
          </span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <CalendarDays className="h-4 w-4 text-white/70" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          {event.status === 'upcoming' && event.dateStr && <HeroCountdown dateStr={event.dateStr} />}
        </div>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug text-white line-clamp-1 group-hover:text-white/95">{event.acara}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/80">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {event.tanggal}{event.jam ? ` | ${event.jam}` : ''}
          </span>
          {event.lokasi && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{event.lokasi}</span>
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/30 transition group-hover:text-white/60 group-hover:translate-x-0.5" />
    </button>
  );
}


export function PublicHero({ ongoingEvents, upcomingEvents, themes, isDark, onDetail }: PublicHeroProps) {
  void themes;
  void isDark;
  const heroEvents = useMemo(
    () => [...ongoingEvents, ...upcomingEvents]
      .filter((item, index, array) => array.findIndex(other => other.id === item.id) === index)
      .slice(0, 3),
    [ongoingEvents, upcomingEvents]
  );

  return (
<section
          id="hero"
          className="relative min-h-screen overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.68) 0%, rgba(15,23,42,0.48) 30%, rgba(15,23,42,0.22) 60%, rgba(15,23,42,0.32) 100%), linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.18) 20%, rgba(15,23,42,0.22) 56%, rgba(15,23,42,0.42) 100%), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(242,116,62,0.06),transparent_28%),radial-gradient(circle_at_top_right,rgba(124,108,242,0.04),transparent_24%)]" />
          <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-slate-950/34 via-slate-950/10 to-transparent md:w-[40%]" />
          <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-22">
            {/* Left: Headline + CTA */}
            <RevealSection as="div" className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/14 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/76">
                <CalendarDays className="h-3.5 w-3.5 text-orange-300" />
                Agenda Publik
              </div>
              <h1 className="mt-4 max-w-[8.5ch] text-[1.82rem] font-semibold leading-[0.95] text-white sm:max-w-[8ch] sm:text-6xl lg:text-[4.05rem]">
                Kalender acara publik Metropolitan Mall Bekasi.
              </h1>
              <p className="mt-3 max-w-[18rem] text-[14px] leading-6 text-white/76 sm:max-w-[30rem] sm:text-lg sm:leading-7">
                Lihat acara yang sedang berlangsung, agenda akhir pekan, dan pengajuan aktivasi dari satu halaman.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row">
                <a href="#calendar" className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}>
                  Lihat Kalender Event
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#submit" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-6 py-3 text-sm font-semibold text-white">
                  Ajukan Aktivasi
                  <Send className="h-4 w-4" />
                </a>
              </div>
            </RevealSection>

            {/* Right: Upcoming Event Cards */}
            <RevealSection as="div" className="flex flex-col gap-3 lg:self-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75">
                {heroEvents.length > 0 ? `${heroEvents.length} acara terdekat` : 'Agenda terdekat'}
              </p>
              {heroEvents.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {heroEvents.map(ev => (
                    <HeroEventCard key={ev.id} event={ev} onClick={onDetail} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.12] bg-white/[0.07] p-5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                      <CalendarDays className="h-4 w-4 text-white/50" />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Segera hadir</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold leading-snug text-white/85">Jadwal acara berikutnya segera diumumkan.</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">Pantau kalender publik untuk update terbaru mengenai program dan aktivasi di area mall.</p>
                </div>
              )}
            </RevealSection>
          </div>
        </section>
  );
}
