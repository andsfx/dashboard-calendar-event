/* Hallmark · genre: community-campaign · macrostructure: Split Studio
 * design-system: DESIGN.md · designed-as-app
 * pre-emit critique: P4 H4 E4 S4 R4 V4
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Clock3,
  Download,
  Loader2,
  MapPin,
  Moon,
  Radio,
  SunMedium,
  Zap,
} from 'lucide-react';
import { EventItem, HolidayItem, PhotoAlbum } from '../types';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { CATEGORY_COLORS } from '../utils/eventUtils';
import { thumbUrl } from '../utils/imageOptim';
import { downloadEventsSchedulePdf } from '../utils/eventsSchedulePdf';
import { CategoryBadges } from './CategoryBadges';
import { CalendarView } from './CalendarView';
import { CommunityEyebrow } from './community/CommunityRevealPrimitives';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
  events: EventItem[];
  holidays: HolidayItem[];
  albums?: PhotoAlbum[];
  isLoading?: boolean;
  onDetail: (ev: EventItem) => void;
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

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

function sortHighlightCandidates(list: EventItem[]) {
  return [...list].sort((a, b) => {
    const byPriority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (byPriority !== 0) return byPriority;
    return a.dateStr.localeCompare(b.dateStr);
  });
}

/**
 * Chip text on a `12`-alpha color wash (e.g. amber #f59e0b at 7% over white)
 * fails AA at small sizes (~2:1 for amber-500). Darkening 500→700 tone passes.
 * Map: tosca→dark, pink→700; unknown catColor gets `00` darkened ~45%.
 */
function darkenChipText(hex: string): string {
  const TOSCA = '#00918e';
  const map: Record<string, string> = {
    [TOSCA]: 'var(--brand-tosca-dark)',
    '#e24378': '#a82150',
    '#f59e0b': '#b45309',
  };
  const key = hex.toLowerCase();
  if (map[key]) return map[key];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dark = (v: number) => Math.max(0, Math.round(v * 0.55));
  return `#${[r, g, b].map(v => dark(v).toString(16).padStart(2, '0')).join('')}`;
}

function CountdownCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--brand-tosca)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand-tosca)_9%,white)] px-3 py-2.5 text-center dark:border-[color-mix(in_srgb,var(--brand-tosca)_40%,black)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_18%,black)]">
      <p className="font-display text-xl font-bold tabular-nums text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)] sm:text-2xl">
        {String(value).padStart(2, '0')}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ui-text-muted">
        {label}
      </p>
    </div>
  );
}

function HighlightEventCard({
  event,
  promoImageUrl,
  onDetail,
}: {
  event: EventItem;
  promoImageUrl: string;
  onDetail: (ev: EventItem) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const cat = (event.categories?.length ? event.categories[0] : event.category) || 'Umum';
  const catColor = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Umum ?? '#00918e';
  const countdown = getCountdown(event.dateStr, now);
  const isLive = event.status === 'ongoing';

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--brand-card)] shadow-[var(--shadow-card-soft)] dark:border-slate-700 dark:bg-slate-900">
      {promoImageUrl && (
        <div
          data-promo-banner
          className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 sm:aspect-[5/3]"
        >
          <img
            src={thumbUrl(promoImageUrl)}
            alt={event.acara}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={(e) => {
              const wrap = e.currentTarget.closest('[data-promo-banner]');
              if (wrap instanceof HTMLElement) wrap.hidden = true;
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent"
            aria-hidden="true"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{
              /* amber-500 10px on 7% wash = 2.0:1 fail; 700 passes AA (4.68:1 on wash) */
              color: isLive ? catColor : darkenChipText(catColor),
              borderColor: `${catColor}40`,
              backgroundColor: `${catColor}12`,
            }}
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              {isLive && (
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 motion-reduce:hidden"
                  style={{ backgroundColor: catColor }}
                  aria-hidden="true"
                />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catColor }} />
            </span>
            {isLive ? 'Live Now' : 'Coming Soon'}
          </span>
          <CategoryBadges categories={event.categories} maxVisible={2} />
        </div>

        <h2 className="font-display mt-4 text-2xl font-bold leading-[1.15] tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          {event.acara}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-2 dark:border-slate-600 dark:bg-slate-800/70">
            <CalendarDays className="h-4 w-4 shrink-0" style={{ color: catColor }} aria-hidden="true" />
            {event.tanggal}
          </span>
          {event.jam && (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-2 dark:border-slate-600 dark:bg-slate-800/70">
              <Clock className="h-4 w-4 shrink-0" style={{ color: catColor }} aria-hidden="true" />
              {event.jam}
            </span>
          )}
          {event.lokasi && (
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-2 dark:border-slate-600 dark:bg-slate-800/70">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: catColor }} aria-hidden="true" />
              <span className="line-clamp-1">{event.lokasi}</span>
            </span>
          )}
        </div>

        {event.keterangan && (
          <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-8">
            {event.keterangan}
          </p>
        )}
      </div>

      <div className="border-t border-black/5 bg-[var(--brand-card-light)] p-6 sm:p-8 dark:border-slate-700 dark:bg-slate-800/60">
        {!isLive && (
          <>
            <p className="mb-3 text-xs font-bold tracking-wide" style={{ color: darkenChipText(catColor) }}>
              Countdown
            </p>
            <div className="mb-5 grid max-w-sm grid-cols-3 gap-2.5">
              <CountdownCell label="Hari" value={countdown.days} />
              <CountdownCell label="Jam" value={countdown.hours} />
              <CountdownCell label="Menit" value={countdown.minutes} />
            </div>
          </>
        )}
        {isLive && (
          <p className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <Zap className="h-4 w-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            Sedang berlangsung
          </p>
        )}
        <button
          type="button"
          onClick={() => onDetail(event)}
          className="group inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"
        >
          Detail Event
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function EventRailCard({
  event,
  onDetail,
}: {
  event: EventItem;
  onDetail: (ev: EventItem) => void;
}) {
  const cat = (event.categories?.length ? event.categories[0] : event.category) || 'Umum';
  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Umum ?? '#00918e';
  const isLive = event.status === 'ongoing';

  return (
    <button
      type="button"
      onClick={() => onDetail(event)}
      className="group flex min-w-0 flex-col items-start gap-4 rounded-[1.5rem] border border-[var(--border-subtle)] bg-white p-5 text-left shadow-[0_4px_12px_rgba(15,23,42,0.02)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-soft)] ui-focus-ring motion-reduce:hover:translate-y-0 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ color, backgroundColor: `${color}15` }}
        >
          {isLive ? (
            <>
              <Radio className="h-3 w-3 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              Live
            </>
          ) : (
            <>
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {event.tanggal}
            </>
          )}
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-600 motion-reduce:transform-none dark:text-slate-600 dark:group-hover:text-slate-300"
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-lg font-bold leading-tight text-slate-900 dark:text-white">
          {event.acara}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium ui-text-muted">
          {isLive && event.tanggal && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {event.tanggal}
            </span>
          )}
          {event.jam && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {event.jam}
            </span>
          )}
          {event.lokasi && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{event.lokasi}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function EventsLandingPage({
  isDark,
  onToggleDark,
  events,
  holidays,
  albums = [],
  isLoading = false,
  onDetail,
}: Props) {
  const ongoing = useMemo(
    () => sortHighlightCandidates(events.filter(e => e.status === 'ongoing')),
    [events],
  );
  const upcoming = useMemo(
    () =>
      events
        .filter(e => e.status === 'upcoming')
        .sort((a, b) => {
          const byPriority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
          if (byPriority !== 0) return byPriority;
          return a.dateStr.localeCompare(b.dateStr);
        }),
    [events],
  );

  const highlight = ongoing[0] ?? upcoming[0] ?? null;
  const highlightPromoUrl = useMemo(() => {
    if (!highlight) return '';
    if (highlight.posterUrl) return highlight.posterUrl;
    const album = albums.find(a => a.eventId === highlight.id);
    return album?.coverPhotoUrl || '';
  }, [highlight, albums]);

  const railRest = useMemo(() => {
    return [...ongoing, ...upcoming].filter(e => e.id !== highlight?.id);
  }, [ongoing, upcoming, highlight]);
  const railEvents = railRest.slice(0, 6);
  const railOverflow = Math.max(0, railRest.length - 6);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadSchedulePdf = async () => {
    if (isExportingPdf || events.length === 0) return;
    setIsExportingPdf(true);
    try {
      await downloadEventsSchedulePdf(events);
    } catch (err) {
      console.error('Schedule PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="events-landing min-h-screen overflow-x-clip bg-[var(--color-neutral-page)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <a
        href="#calendar"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke kalender
      </a>

      <header className="sticky top-0 z-50 border-b border-black/6 bg-[var(--color-neutral-page)]/96 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/96">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-lg outline-none ui-focus-ring"
            aria-label="Kembali ke Community"
          >
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-auto w-[88px] sm:w-[124px]" />
          </Link>

          <nav className="hidden items-center gap-6 text-[13px] font-medium text-slate-600 dark:text-slate-300 md:flex" aria-label="Navigasi jadwal">
            <a href="#featured" className="transition hover:text-[var(--brand-tosca)] dark:hover:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm">
              Highlights
            </a>
            <a href="#calendar" className="transition hover:text-[var(--brand-tosca)] dark:hover:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm">
              Calendar
            </a>
            <Link to="/daftar" className="transition hover:text-[var(--brand-tosca)] dark:hover:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm">
              Daftar
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 ui-focus-ring"
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ui-focus-ring"
            >
              Community
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Split Studio hero */}
        <section className="border-b border-black/5 dark:border-slate-800">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-10 lg:py-24">
            <div className="flex min-w-0 flex-col justify-center">
              <CommunityEyebrow>Metropolitan Mall Bekasi</CommunityEyebrow>
              <h1 className="font-display mt-3 max-w-xl text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-slate-950 dark:text-white">
                Event Schedule
              </h1>
              <p className="mt-4 max-w-md text-base leading-8 text-slate-600 dark:text-slate-400">
                Jadwal event yang sedang berlangsung dan akan datang di Metropolitan Mall Bekasi.
              </p>

              {!isLoading && (
                <dl className="mt-8 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-white px-2.5 py-3 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] ui-text-muted">Total</dt>
                    <dd className="font-display mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white sm:text-2xl">{events.length}</dd>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-3 sm:px-3 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Live</dt>
                    <dd className="font-display mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300 sm:text-2xl">{ongoing.length}</dd>
                  </div>
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-2.5 py-3 sm:px-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
                      <span className="sm:hidden">Soon</span>
                      <span className="hidden sm:inline">Coming Soon</span>
                    </dt>
                    <dd className="font-display mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300 sm:text-2xl">{upcoming.length}</dd>
                  </div>
                </dl>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#featured"
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca)] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"
                >
                  Highlights
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                </a>
                <Link
                  to="/daftar"
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ui-focus-ring"
                >
                  Daftar Event
                </Link>
                <button
                  type="button"
                  onClick={handleDownloadSchedulePdf}
                  disabled={isExportingPdf || isLoading || events.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ui-focus-ring"
                  aria-label="Unduh jadwal event sebagai PDF"
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isExportingPdf ? 'Menyiapkan PDF…' : 'Unduh PDF'}
                </button>
              </div>

              {/* Mobile in-page anchors */}
              <nav className="mt-6 flex flex-wrap gap-2 md:hidden" aria-label="Navigasi section">
                <a
                  href="#featured"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ui-focus-ring"
                >
                  Highlights
                </a>
                <a
                  href="#calendar"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ui-focus-ring"
                >
                  Calendar
                </a>
                <Link
                  to="/daftar"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ui-focus-ring"
                >
                  Daftar
                </Link>
              </nav>
            </div>

            <div className="min-w-0">
              {isLoading ? (
                <div className="h-full min-h-[22rem] animate-pulse rounded-[2rem] border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
              ) : highlight ? (
                <HighlightEventCard
                  event={highlight}
                  promoImageUrl={highlightPromoUrl}
                  onDetail={onDetail}
                />
              ) : (
                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)]">
                    <CalendarDays className="h-7 w-7 text-[var(--brand-tosca)]" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-200">Belum ada event</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 ui-text-muted">
                    Jadwal akan muncul di sini setelah event dipublikasikan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Event rail */}
        <section id="featured" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-36 animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
                ))}
              </div>
            ) : railEvents.length > 0 ? (
              <>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <CommunityEyebrow>More Events</CommunityEyebrow>
                    <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                      Upcoming & Live
                    </h2>
                  </div>
                  <p className="text-sm ui-text-muted">
                    {railRest.length} event
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {railEvents.map(ev => (
                    <EventRailCard key={ev.id} event={ev} onDetail={onDetail} />
                  ))}
                </div>
                {railOverflow > 0 && (
                  <div className="mt-6 text-center">
                    <a
                      href="#calendar"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-tosca)] transition hover:text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm"
                    >
                      +{railOverflow} event lain di calendar
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </>
            ) : !highlight ? null : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Lihat calendar untuk jadwal lengkap.
                </p>
                <a
                  href="#calendar"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-tosca)] hover:text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm"
                >
                  View Calendar <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Calendar */}
        <section id="calendar" className="scroll-mt-28 border-t border-black/5 bg-white/50 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/30 sm:px-6 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="max-w-2xl">
              <CommunityEyebrow>Calendar</CommunityEyebrow>
              <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                Full Schedule
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-400">
                Tampilan bulanan. Klik event untuk melihat detail.
              </p>
            </div>

            {isLoading ? (
              <div className="h-[28rem] animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
            ) : (
              <CalendarView events={events} holidays={holidays} onDetail={onDetail} variant="public" />
            )}
          </div>
        </section>

        {/* Pendaftaran organisasi — halaman khusus */}
        <section className="border-t border-black/5 py-14 sm:py-16 dark:border-slate-800">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]">Pendaftaran Organisasi</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">Mau mengadakan event di Metmal?</h2>
              <p className="mt-2 text-sm leading-7 ui-text-secondary">
                EO, sekolah, komunitas, kampus, perusahaan, hingga instansi — daftarkan organisasimu dan tim Marcomm akan menghubungimu.
              </p>
            </div>
            <Link
              to="/daftar"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"
            >
              Isi Form Pendaftaran
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative isolate overflow-hidden px-4 py-14 sm:px-6 sm:py-18">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-reasoning-tosca" />
        <div aria-hidden="true" className="site-grain absolute inset-0" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-white">Metropolitan Mall Bekasi</p>
            <p className="mt-0.5 text-xs text-white/50">Event Schedule</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/60">
            <Link to="/" className="transition hover:text-white ui-focus-ring rounded-sm">
              Community
            </Link>
            <Link to="/gallery" className="transition hover:text-white ui-focus-ring rounded-sm">
              Gallery
            </Link>
            <a href="#calendar" className="transition hover:text-white ui-focus-ring rounded-sm">
              Calendar
            </a>
            <Link to="/daftar" className="transition hover:text-white ui-focus-ring rounded-sm">
              Daftar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
