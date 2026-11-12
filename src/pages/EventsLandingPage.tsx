/* Hallmark · genre: community-campaign · macrostructure: Split Studio
 * design-system: DESIGN.md · designed-as-app
 * pre-emit critique: P4 H4 E4 S4 R4 V4
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock,
  Clock3,
  Download,
  MapPin,
  Radio,
  RefreshCw,
  Repeat,
  Search,
  Timer,
  X,
  Zap,
} from 'lucide-react';
import { countdownLabel, eventOverlapsWindow, getTodayIsoLocal, getTomorrowIsoLocal, getWeekendWindow, relativeDayLabel } from '../utils/eventDateTime';
import { CATEGORY_COLORS, collapseRecurringSeries, isRecurringEvent, recurringScheduleLabel } from '../utils/eventUtils';
import { resolveEventPoster } from '../utils/eventPoster';
import { EventPosterBanner } from '../components/events/EventPosterBanner';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { resolveAreaDisplay } from '../utils/areaGrouping';
import { usePageMeta } from '../utils/pageMeta';
import { EventItem, HolidayItem, PhotoAlbum, EventArea, AnnualTheme } from '../types';
import { renderEventsSchedulePdfResult } from '../utils/eventsSchedulePdf';
import { formatIsoId } from '../utils/exportDateRange';
import type { SchedulePdfSection } from '../components/pdf/buildSchedulePdf';
import type { ExportScopePicker as ExportScopePickerComponent } from '../components/pdf/ExportScopePicker';
// Modal ekspor + pemilih cakupannya memakai ModalWrapper → md-dialog (Material
// Web + Lit). Dimuat malas supaya MD3 tidak ikut initial load halaman PUBLIK ini.
// `lazy()` menghapus tipe generik komponennya, jadi tipenya dipulihkan lewat
// cast agar pemanggil tetap mendapat inferensi `T` penuh.
const PdfExportOptionsModal = lazy(() =>
  import('../components/pdf/PdfExportOptionsModal').then(m => ({ default: m.PdfExportOptionsModal })),
);
const ExportScopePicker = lazy(() =>
  import('../components/pdf/ExportScopePicker').then(m => ({ default: m.ExportScopePicker })),
) as unknown as typeof ExportScopePickerComponent;
import { useExportScope } from '../components/pdf/useExportScope';
import { SCHEDULE_SECTION_OPTIONS } from '../components/pdf/pdfSectionOptions';
import { CategoryBadges } from '../components/ui/CategoryBadges';
import { CalendarView } from '../components/views/CalendarView';
import { CommunityEyebrow, RevealSection } from '../components/community/CommunityRevealPrimitives';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';

/** Anchor milik halaman ini; label dan tujuan tidak ditulis ulang di header. */
const EVENTS_SECTION_LINKS = [
  { label: 'Sorotan', href: '#featured' },
  { label: 'Kalender', href: '#calendar' },
] as const;

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
  events: EventItem[];
  holidays: HolidayItem[];
  albums?: PhotoAlbum[];
  areas?: EventArea[];
  /** Tema tahunan untuk preset "Tema" di ekspor PDF. */
  themes?: AnnualTheme[];
  isLoading?: boolean;
  /** Pesan galat fetch jadwal; bila terisi, halaman merender status error + aksi coba lagi. */
  error?: string | null;
  /** Dipanggil tombol "Coba lagi" pada status error (di-wire ke refreshEvents). */
  onRetry?: () => void;
  onDetail: (ev: EventItem) => void;
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Jam mulai event ("10:00 - 21:00" / "13.00 WIB") → "10:00"; null bila tak terbaca. */
function parseStartTime(jam: string | undefined): string | null {
  const match = /(\d{1,2})[.:](\d{2})/.exec(jam ?? '');
  if (!match) return null;
  const [, h, m] = match;
  return `${String(Number(h)).padStart(2, '0')}:${m}`;
}

function getCountdown(targetDate: string, now: number, jam?: string) {
  // Target memakai jam mulai event bila terbaca; hitung mundur bersel "Detik"
  // akan salah bila patokannya tengah malam.
  const start = parseStartTime(jam) ?? '00:00';
  const target = new Date(`${targetDate}T${start}:00`).getTime();
  const diff = Math.max(0, target - now);
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  return {
    days: Math.floor(diff / dayMs),
    hours: Math.floor((diff % dayMs) / hourMs),
    minutes: Math.floor((diff % hourMs) / minuteMs),
    seconds: Math.floor((diff % minuteMs) / 1000),
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

/**
 * Dark-mode counterpart of `darkenChipText`. The darkened tone fixes LIGHT mode
 * because the tint sits over a light card — but on the dark theme that same
 * darkened tone is the failing color (measured: tosca 1.73:1, amber 2.76–2.92:1
 * on their own dark tints). Mirror the `CountdownCell` precedent: keep the hue,
 * flip the lightness.
 *
 * Returned as a custom property rather than a class because the light value is
 * an inline `style`, which outranks utility classes; the `.dark [data-chip-tone]`
 * rule in `utilities.css` performs the override. Light mode is untouched.
 */
function lightenChipText(hex: string): string {
  const TOSCA = '#00918e';
  const map: Record<string, string> = {
    [TOSCA]: 'var(--brand-tosca-soft)',
    '#e24378': 'var(--brand-secondary-300)',
    '#f59e0b': '#fcd34d',
  };
  const key = hex.toLowerCase();
  if (map[key]) return map[key];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lift = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.55));
  return `#${[r, g, b].map(v => lift(v).toString(16).padStart(2, '0')).join('')}`;
}

function CountdownCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--brand-tosca)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand-tosca)_9%,white)] px-3 py-2.5 text-center dark:border-[color-mix(in_srgb,var(--brand-tosca)_40%,black)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_18%,black)]">
      <p className="font-display text-xl font-bold tabular-nums text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)] sm:text-2xl">
        {String(value).padStart(2, '0')}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--wf-ink-muted)]">
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
    // Sel "Detik" butuh detak per detik; interval 60 s membuat angka detik
    // melompat 60 seperti jam rusak.
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, []);

  const cat = (event.categories?.length ? event.categories[0] : event.category) || 'Umum';
  const catColor = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Umum ?? '#00918e';
  const countdown = getCountdown(event.dateStr, now, event.jam);
  const isLive = event.status === 'ongoing';
  const isRecurring = isRecurringEvent(event);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-campaign-card)] border border-[var(--border-subtle)] bg-[var(--wf-board)] shadow-[var(--shadow-card-soft)]">
      {promoImageUrl && (
        <div className="relative">
          <EventPosterBanner
            src={promoImageUrl}
            alt={event.acara}
            eager
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
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]"
            data-chip-tone=""
            style={
              {
                /* chip text sits on a ~7% tint of catColor over white; the bright 500 tone
                   fails AA there (tosca 3.54:1, amber 2.03:1), so always use the darkened tone.
                   darkenChipText(): tosca 8.01:1, amber 4.75:1 on the same tint.
                   On the dark theme that same darkened tone fails (tosca 1.73:1), so
                   `--chip-tone-dark` carries the lifted tone; `utilities.css` swaps it in
                   because this inline color outranks any `dark:` utility class. */
                color: darkenChipText(catColor),
                '--chip-tone-dark': lightenChipText(catColor),
                borderColor: `${catColor}40`,
                backgroundColor: `${catColor}12`,
              } as React.CSSProperties
            }
          >
            {isLive && (
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 motion-reduce:hidden"
                  style={{ backgroundColor: catColor }}
                  aria-hidden="true"
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catColor }} />
              </span>
            )}
            {isLive ? 'Berlangsung' : 'Mendatang'}
          </span>
          <CategoryBadges categories={event.categories} maxVisible={2} />
        </div>

        <h2 className="font-display mt-4 text-2xl font-bold leading-[1.15] tracking-tight text-[var(--wf-ink)] sm:text-3xl">
          {event.acara}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-[var(--wf-ink-muted)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)]/80 px-3.5 py-2">
            {isRecurring ? (
              <Repeat className="h-4 w-4 shrink-0" style={{ color: catColor }} aria-hidden="true" />
            ) : (
              <CalendarDays className="h-4 w-4 shrink-0" style={{ color: catColor }} aria-hidden="true" />
            )}
            {isRecurring ? recurringScheduleLabel(event) : event.tanggal}
          </span>
          {event.jam && (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)]/80 px-3.5 py-2">
              <Clock className="h-4 w-4 shrink-0" style={{ color: catColor }} aria-hidden="true" />
              {event.jam}
            </span>
          )}
          {event.lokasi && (
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)]/80 px-3.5 py-2">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: catColor }} aria-hidden="true" />
              <span className="line-clamp-1">{event.lokasi}</span>
            </span>
          )}
        </div>

        {event.keterangan && (
          <p className="mt-4 line-clamp-2 text-sm leading-7 text-[var(--wf-ink-muted)] sm:text-base sm:leading-8">
            {event.keterangan}
          </p>
        )}
      </div>

      <div className="border-t border-black/5 bg-[var(--wf-board)] p-6 sm:p-8">
        {/* Status dan tombol sengaja ditumpuk, bukan sebaris: keduanya
            `inline-flex` dan tanpa pembungkus mereka mengalir satu baris
            dengan jarak 0px — teks "Sedang berlangsung" menempel persis di
            tepi tombol (terukur gap 0px di 768–1440px). `items-start` menjaga
            tombol tetap selebar kontennya, tidak melar penuh. */}
        <div className="flex flex-col items-start gap-4">
          {!isLive && !isRecurring && (
            <>
              <p
                className="text-xs font-bold tracking-wide"
                data-chip-tone=""
                style={
                  {
                    color: darkenChipText(catColor),
                    '--chip-tone-dark': lightenChipText(catColor),
                  } as React.CSSProperties
                }
              >
                Hitung mundur acara
              </p>
              <div className="grid w-full max-w-sm grid-cols-4 gap-2">
                <CountdownCell label="Hari" value={countdown.days} />
                <CountdownCell label="Jam" value={countdown.hours} />
                <CountdownCell label="Menit" value={countdown.minutes} />
                <CountdownCell label="Detik" value={countdown.seconds} />
              </div>
            </>
          )}
          {isLive && (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--wf-ink)]">
              <Zap className="h-4 w-4 animate-pulse motion-reduce:animate-none text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Sedang berlangsung
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDetail(event)}
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-page)]! ui-focus-ring h-auto border-0 rounded-full! font-bold! active:translate-y-0! hover:text-[var(--wf-accent-ink)]!"
          >
            Lihat detail event
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function EventRailCard({
  event,
  areas,
  albums,
  onDetail,
}: {
  event: EventItem;
  areas: EventArea[];
  albums: PhotoAlbum[];
  onDetail: (ev: EventItem) => void;
}) {
  const cat = (event.categories?.length ? event.categories[0] : event.category) || 'Umum';
  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Umum ?? '#00918e';
  const isLive = event.status === 'ongoing';
  const isRecurring = isRecurringEvent(event);
  const relLabel = !isRecurring && event.status === 'upcoming' ? relativeDayLabel(event.dateStr) : null;
  const cdLabel = !isRecurring && event.status === 'upcoming' && !relLabel ? countdownLabel(event.dateStr, event.jam) : null;
  const posterUrl = resolveEventPoster(event, albums);

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onDetail(event)}
      data-reveal-item
      className="group flex min-w-0 flex-col items-start overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--wf-board)] text-left shadow-[var(--shadow-card-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-raised)] ui-focus-ring motion-reduce:hover:translate-y-0 flex! h-auto gap-0! p-0! whitespace-normal! rounded-[var(--radius-card-lg)]! border-[var(--border-subtle)]! hover:bg-[var(--wf-board)]! active:translate-y-0!  "
    >
      {posterUrl && <EventPosterBanner src={posterUrl} alt={event.acara} />}
      <div className="flex w-full min-w-0 flex-col items-start gap-4 p-5">
      <div className="flex w-full items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
          data-chip-tone=""
          style={
            {
              color: darkenChipText(color),
              '--chip-tone-dark': lightenChipText(color),
              backgroundColor: `${color}15`,
            } as React.CSSProperties
          }
        >
          {isLive ? (
            <>
              <Radio className="size-3 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              Berlangsung
            </>
          ) : isRecurring ? (
            <>
              <Repeat className="size-3" aria-hidden="true" />
              {recurringScheduleLabel(event)}
            </>
          ) : (
            <>
              <Clock3 className="size-3" aria-hidden="true" />
              {relLabel ?? event.tanggal}
              {relLabel && event.tanggal && <span className="sr-only">{event.tanggal}</span>}
            </>
          )}
        </span>
        {cdLabel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Timer className="size-3" aria-hidden="true" />
            {cdLabel}
          </span>
        )}
        <ArrowRight
          className="size-4 shrink-0 text-[var(--wf-rule-strong)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--wf-ink-muted)] motion-reduce:transform-none"
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-lg font-bold leading-tight text-[var(--wf-ink)]">
          {event.acara}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[var(--wf-ink-muted)]">
          {isLive && event.tanggal && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3" aria-hidden="true" />
              {event.tanggal}
            </span>
          )}
          {event.jam && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3" aria-hidden="true" />
              {event.jam}
            </span>
          )}
          {event.lokasi && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{resolveAreaDisplay(event.areaId, event.lokasi, areas)}</span>
            </span>
          )}
        </div>
      </div>
      </div>
    </Button>
  );
}

function EventsErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-semibold text-[var(--wf-ink-muted)]">Gagal memuat jadwal</p>
      <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--wf-ink-muted)]">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="ghost"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-page)]! ui-focus-ring h-auto border-0 rounded-full! font-bold! active:translate-y-0! hover:text-[var(--wf-accent-ink)]!"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function EventsLandingPage({
  isDark,
  onToggleDark,
  events,
  holidays,
  albums = [],
  areas = [],
  themes = [],
  isLoading = false,
  error = null,
  onRetry,
  onDetail,
}: Props) {
  usePageMeta({
    title: 'Jadwal event - Metropolitan Mall Bekasi',
    description: 'Jadwal event yang sedang berlangsung dan akan datang di Metropolitan Mall Bekasi.',
  });
  // Rangkaian reguler dirangkum jadi satu entri per seri: kartu jadwal publik
  // tidak membanjir dengan satu kartu per kemunculan. Kalender bulanan tetap
  // memakai daftar yang belum dirangkum (`events`, atau `filteredEvents` saat
  // filter aktif) supaya tiap tanggal kemunculan tetap tampil.
  const displayEvents = useMemo(() => collapseRecurringSeries(events), [events]);
  const ongoing = useMemo(
    () => sortHighlightCandidates(displayEvents.filter(e => e.status === 'ongoing')),
    [displayEvents],
  );
  const upcoming = useMemo(
    () =>
      displayEvents
        .filter(e => e.status === 'upcoming')
        .sort((a, b) => {
          const byPriority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
          if (byPriority !== 0) return byPriority;
          return a.dateStr.localeCompare(b.dateStr);
        }),
    [displayEvents],
  );

  const highlight = useMemo(() => {
    // Hero diutamakan punya poster supaya banner tidak kosong: cari kandidat
    // ber-poster di seluruh kandidat (ongoing lebih dulu, lalu upcoming) —
    // kalau tidak ada satu pun, jatuh ke urutan prioritas/tanggal biasa.
    const withPoster = [...ongoing, ...upcoming].find(e => resolveEventPoster(e, albums));
    return withPoster ?? ongoing[0] ?? upcoming[0] ?? null;
  }, [ongoing, upcoming, albums]);
  const highlightPromoUrl = useMemo(
    () => resolveEventPoster(highlight, albums),
    [highlight, albums],
  );

  const railRest = useMemo(() => {
    return [...ongoing, ...upcoming].filter(e => e.id !== highlight?.id);
  }, [ongoing, upcoming, highlight]);
  const railEvents = railRest.slice(0, 6);
  const railOverflow = Math.max(0, railRest.length - 6);


  const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);

  // ─── Filter URL (?waktu= & ?kategori=) — deep-linkable, riset Skedda/Eventbrite pattern ───
  const [searchParams, setSearchParams] = useSearchParams();
  const waktu = searchParams.get('waktu'); // 'hari-ini' | 'besok' | 'akhir-pekan' | null
  const kategori = searchParams.get('kategori'); // label kategori | null

  // ─── Pencarian (?q=) — ketikan lokal, URL diperbarui setelah 300 ms ───
  // Input dikendalikan state lokal supaya tiap huruf tidak menulis riwayat;
  // URL tetap menjadi sumber kebenaran filter (deep-link, tombol kembali).
  const qParam = searchParams.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(qParam);
  /** Nilai q yang terakhir kita tulis sendiri: hidrasi dari URL tidak boleh
   *  menimpa ketikan yang lebih baru saat URL menyusul. */
  const lastPushedQ = useRef(qParam);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) for (const c of ev.categories || []) set.add(c);
    return [...set].sort((a, b) => a.localeCompare(b, 'id')).slice(0, 10);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const todayIso = getTodayIsoLocal();
    const weekend = getWeekendWindow();
    const win = waktu === 'hari-ini'
      ? { start: todayIso, end: todayIso }
      : waktu === 'besok'
        ? { start: getTomorrowIsoLocal(), end: getTomorrowIsoLocal() }
        : waktu === 'akhir-pekan' ? weekend : null;
    const needle = qParam.trim().toLowerCase();
    return events.filter(ev => {
      if (win && !eventOverlapsWindow(ev.dateStr, ev.dateEnd, win.start, win.end)) return false;
      if (kategori && !(ev.categories || []).includes(kategori)) return false;
      if (needle) {
        // Substring tanpa beda huruf besar/kecil atas nama, lokasi, keterangan.
        const haystack = [ev.acara, ev.lokasi, ev.keterangan];
        if (!haystack.some(field => (field || '').toLowerCase().includes(needle))) return false;
      }
      return true;
    }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [events, waktu, kategori, qParam]);
  // Filter menjaga semantik tanggal (seri reguler cocok bila salah satu
  // kemunculannya masuk window), lalu dirangkum untuk tampilan.
  const displayFilteredEvents = useMemo(
    () => collapseRecurringSeries(filteredEvents),
    [filteredEvents],
  );

  /**
   * Venue untuk bagian Sorotan: area utama = area (urut `sortOrder`) pertama
   * yang punya event, sisanya masuk "Lokasi Lainnya di Metmal" bersama event
   * tanpa area. `displayFilteredEvents` sudah dirangkum per seri, jadi satu
   * rangkaian tidak pernah muncul dua kali walau anggotanya beda area.
   */
  const venueSections = useMemo(() => {
    const areaById = new Map(areas.map(a => [a.id, a]));
    const byArea = new Map<string, EventItem[]>();
    const unmapped: EventItem[] = [];
    for (const ev of displayFilteredEvents) {
      const area = ev.areaId ? areaById.get(ev.areaId) : undefined;
      if (!area) {
        unmapped.push(ev);
        continue;
      }
      const bucket = byArea.get(area.id);
      if (bucket) bucket.push(ev);
      else byArea.set(area.id, [ev]);
    }
    const ordered = [...areas]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'id'))
      .flatMap(area => {
        const events = byArea.get(area.id);
        return events && events.length > 0 ? [{ area, events }] : [];
      });
    const primary = ordered[0] ?? null;
    const otherAreas = ordered.slice(1).map(group => group.area);
    const others = [...ordered.slice(1).flatMap(group => group.events), ...unmapped];
    return { primary, otherAreas, others };
  }, [displayFilteredEvents, areas]);

  const { primary: primaryVenue, others, otherAreas: otherVenueAreas } = venueSections;
  // Subjudul "Lokasi Lainnya": maksimal tiga nama lokasi, sisanya diringkas.
  const shownVenueNames = otherVenueAreas.slice(0, 3).map(area => area.name);
  const hiddenVenueCount = otherVenueAreas.length - shownVenueNames.length;
  const otherVenueSummary = shownVenueNames.length > 0
    ? `${shownVenueNames.join(', ')}${hiddenVenueCount > 0 ? ` +${hiddenVenueCount} lainnya` : ''}`
    : 'lokasi lain';

  const isFilterActive = Boolean(waktu || kategori || qParam.trim());

  // Cakupan ekspor: periode (hari/minggu/bulan/tahun/tema/kustom) lalu pilih
  // per event.
  //
  // Dua hal yang sengaja dibuat sama dengan tampilan halaman:
  //  1. Filter halaman (`?waktu=` / `?kategori=`) ikut menyaring ekspor, jadi
  //     angka di dialog cocok dengan "N acara ditemukan" di badan halaman.
  //     Dashboard sudah berperilaku begitu (mengekspor `visibleEvents`).
  //     `allItems` dikirim hanya saat filter halaman benar-benar aktif: itulah
  //     satu-satunya keadaan ketika "melepas filter" punya arti. Tanpa filter,
  //     daftar tersaring sama dengan daftar penuh, jadi sakelarnya hanya akan
  //     jadi kontrol tanpa efek. Tanpa itu pula, memfilter halaman "Hari ini"
  //     membuat rekap satu tema penuh mustahil karena keduanya bertumpuk
  //     sebagai irisan.
  //  2. Event tidak punya kolom tema di database, jadi preset Tema memakai
  //     rentang tanggal tema — cara yang sama dipakai `/gallery` untuk
  //     memasangkan album ke tema.
  const exportScope = useExportScope<EventItem>({
    items: filteredEvents,
    allItems: isFilterActive ? events : undefined,
    getId: (event) => event.id,
    getRange: (event) => ({ start: event.dateStr, end: event.dateEnd }),
    themes,
  });

  const handleDownloadSchedulePdf = async (sections: string[]) => {
    if (exportScope.selected.length === 0) return;
    return renderEventsSchedulePdfResult(exportScope.selected, { sections: sections as SchedulePdfSection[] });
  };

  const setParam = (key: 'waktu' | 'kategori' | 'q', value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const resetFilter = () => setSearchParams(new URLSearchParams(), { replace: true });

  // Hidrasi dari URL untuk `?q=`: hanya bila nilainya datang dari luar
  // (deep-link, "Reset filter", tombol kembali), bukan gema tulisan kita.
  useEffect(() => {
    if (qParam === lastPushedQ.current) return;
    lastPushedQ.current = qParam;
    setSearchInput(qParam);
  }, [qParam]);

  // Ketikan → URL setelah 300 ms; `replace` supaya riwayat tidak berisi satu
  // entri per huruf. String kosong menghapus parameter.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = searchInput.trim();
      if (nextQ === qParam) return;
      lastPushedQ.current = nextQ;
      setParam('q', nextQ || null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, qParam]);

  const clearSearch = () => {
    setSearchInput('');
    lastPushedQ.current = '';
    setParam('q', null);
  };

  return (
    <div className="events-landing min-h-screen overflow-x-clip bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#calendar"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke kalender
      </a>

      <PublicSiteHeader
        isDark={isDark}
        onToggleDark={onToggleDark}
        sectionLinks={EVENTS_SECTION_LINKS}
      />

      <main id="konten-utama" tabIndex={-1} className="events-page outline-none">
        {/* Split Studio hero */}
        <RevealSection
          className="border-b border-black/5 "
          refreshKey={isLoading ? 'loading' : highlight?.id ?? 'empty'}
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-10 lg:py-24">
            <div className="flex min-w-0 flex-col justify-center">
              <CommunityEyebrow>Metropolitan Mall Bekasi</CommunityEyebrow>
              <h1 className="font-display mt-3 max-w-xl text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-[var(--wf-ink)]">
                Jadwal event
              </h1>
              <p className="mt-4 max-w-md text-base leading-8 text-[var(--wf-ink-muted)]">
                Jadwal event yang sedang berlangsung dan akan datang di Metropolitan Mall Bekasi.
              </p>

              {!isLoading && !error && (
                <dl className="mt-8 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--wf-board)] px-2.5 py-3 sm:px-3  ">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--wf-ink-muted)]">Total event</dt>
                    <dd className="font-display mt-1 text-xl font-bold tabular-nums text-[var(--wf-ink)] sm:text-2xl">{displayEvents.length}</dd>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-3 sm:px-3 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Berlangsung</dt>
                    <dd className="font-display mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300 sm:text-2xl">{ongoing.length}</dd>
                  </div>
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-2.5 py-3 sm:px-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
                      <span className="sm:hidden">Mendatang</span>
                      <span className="hidden sm:inline">Mendatang</span>
                    </dt>
                    <dd className="font-display mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300 sm:text-2xl">{upcoming.length}</dd>
                  </div>
                </dl>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#calendar"
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-[13px] font-semibold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)] hover:text-[var(--wf-ink)] ui-focus-ring"
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Kalender lengkap
                </a>
                <Link
                  to="/daftar"
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[var(--wf-board)] px-5 py-2.5 text-[13px] font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)] ui-focus-ring"
                >
                  Daftar ikut acara
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsExportOptionsOpen(true)}
                  disabled={isLoading || events.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10! bg-[var(--wf-board)] px-5 py-2.5 text-[13px] md:text-[13px] font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)]! disabled:cursor-not-allowed disabled:opacity-50 ui-focus-ring h-auto rounded-full! leading-normal active:translate-y-0! disabled:pointer-events-auto! hover:text-[var(--wf-ink-muted)]!"
                  aria-label="Unduh jadwal event sebagai PDF"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Unduh brosur PDF
                </Button>
              </div>

              {/* Mobile in-page anchors */}
              <nav className="mt-6 flex flex-wrap gap-2 md:hidden" aria-label="Navigasi section">
                <a
                  href="#featured"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-[var(--wf-board)] px-3.5 py-1.5 text-xs font-semibold text-[var(--wf-ink-muted)] ui-focus-ring"
                >
                  Sorotan
                </a>
                <a
                  href="#calendar"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-[var(--wf-board)] px-3.5 py-1.5 text-xs font-semibold text-[var(--wf-ink-muted)] ui-focus-ring"
                >
                  Kalender
                </a>
                <Link
                  to="/daftar"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-[var(--wf-board)] px-3.5 py-1.5 text-xs font-semibold text-[var(--wf-ink-muted)] ui-focus-ring"
                >
                  Daftar event
                </Link>
                <Link
                  to="/ajukan-event"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-[var(--wf-board)] px-3.5 py-1.5 text-xs font-semibold text-[var(--wf-ink-muted)] ui-focus-ring"
                >
                  Ajukan event
                </Link>
                <Link
                  to="/sponsor"
                  className="inline-flex min-h-11 items-center rounded-full border border-black/8 bg-[var(--wf-board)] px-3.5 py-1.5 text-xs font-semibold text-[var(--wf-ink-muted)] ui-focus-ring"
                >
                  Sponsor
                </Link>
              </nav>
            </div>

            <div className="min-w-0">
              {isLoading ? (
                <div className="h-full min-h-[22rem] animate-pulse rounded-[var(--radius-campaign-card)] border border-[var(--wf-rule)] bg-[var(--wf-rule)]" />
              ) : error ? (
                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-[var(--radius-campaign-card)] border border-red-200 bg-[var(--wf-board)]/70 px-6 py-12 text-center  ">
                  <EventsErrorState message={error} onRetry={onRetry} />
                </div>
              ) : highlight ? (
                <HighlightEventCard
                  event={highlight}
                  promoImageUrl={highlightPromoUrl}
                  onDetail={onDetail}
                />
              ) : (
                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-[var(--radius-campaign-card)] border border-dashed border-[var(--wf-rule-strong)] bg-[var(--wf-board)]/70 px-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)]">
                    <CalendarDays className="h-7 w-7 text-[var(--brand-tosca)]" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-[var(--wf-ink-muted)]">Belum ada event</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--wf-ink-muted)]">
                    Jadwal akan muncul di sini setelah event dipublikasikan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </RevealSection>

        {/* Filter URL-shareable — preset waktu + kategori (riset Skedda "today/this weekend") */}
        <section id="filter" aria-label="Filter jadwal event" className="sticky top-[calc(4rem+1px)] z-30 border-y border-black/5 bg-[var(--wf-page)]/95 px-4 py-2 backdrop-blur-sm sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-1.5 sm:gap-3">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              {/* Baris tunggal: tab tidak membungkus (4 tab butuh ~361px di 390px),
                  jadi strip tetap pendek dan anchor `scroll-margin-top` 13rem sah. */}
              <div className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto" role="group" aria-label="Filter waktu">
                {([['', 'Semua'], ['hari-ini', 'Hari ini'], ['besok', 'Besok'], ['akhir-pekan', 'Akhir pekan ini']] as const).map(([value, label]) => (
                  <Button
                    key={value || 'semua'}
                    type="button"
                    variant="ghost"
                    onClick={() => setParam('waktu', value || null)}
                    aria-pressed={(waktu || '') === value}
                    className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ui-focus-ring h-auto rounded-full! font-bold! active:translate-y-0! sm:py-1.5 ${
                      (waktu || '') === value
                        ? 'border-0 bg-[var(--wf-accent)] text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]!'
                        : 'border border-black/10! bg-[var(--wf-board)] text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink-muted)]!'
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* Kolom cari: menyaring nama, lokasi, dan keterangan acara lewat `?q=`. */}
              <div className="relative w-full sm:w-72">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Cari event"
                  placeholder="Cari nama lomba, workshop, kajian..."
                  className="ui-focus-ring h-10! w-full! rounded-lg border border-[var(--wf-rule)]! bg-[var(--wf-board)]! pl-9! pr-8! text-sm! text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] focus-visible:border-[var(--wf-accent)]! dark:bg-[var(--wf-board)]!"
                />
                {searchInput && (
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={clearSearch}
                      aria-label="Hapus pencarian"
                      className="rounded-full! text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink)]!"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {categoryOptions.length > 0 && (
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto" role="group" aria-label="Filter kategori">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setParam('kategori', null)}
                  aria-pressed={!kategori}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] md:text-[11px] font-semibold transition ui-focus-ring h-auto gap-0! rounded-full! leading-normal active:translate-y-0! ${
                    !kategori
                      ? 'border-0 bg-[var(--wf-accent)] text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]!'
                      : 'border border-black/10! bg-[var(--wf-board)] text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink-muted)]!'
                  }`}
                >
                  Semua kategori
                </Button>
                {categoryOptions.map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant="ghost"
                    onClick={() => setParam('kategori', kategori === cat ? null : cat)}
                    aria-pressed={kategori === cat}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] md:text-[11px] font-semibold transition ui-focus-ring h-auto gap-0! rounded-full! leading-normal active:translate-y-0! ${
                      kategori === cat
                        ? 'border-0 bg-[var(--wf-accent)] text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]!'
                        : 'border border-black/10! bg-[var(--wf-board)] text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink-muted)]!'
                    }`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Event rail */}
        <RevealSection id="featured" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32" refreshKey={`${events.length}:${filteredEvents.length}`}>
          <div className="mx-auto max-w-7xl">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-36 animate-pulse rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-rule)]" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[var(--radius-card-lg)] border border-red-200 bg-[var(--wf-board)]/60 px-6 py-10  ">
                <EventsErrorState message={error} onRetry={onRetry} />
              </div>
            ) : isFilterActive || primaryVenue ? (
              <>
                {/* Satu H2 menjaga kerangka dokumen; venue jadi H3 di bawahnya.
                    Filter aktif hanya mengganti judul dan aksi kanan — isinya
                    tetap pengelompokan venue yang sama, bukan grid datar kedua. */}
                <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-4xl lg:text-5xl">
                    {isFilterActive
                      ? `${displayFilteredEvents.length} acara ditemukan`
                      : 'Mendatang dan berlangsung'}
                  </h2>
                  {isFilterActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetFilter}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/10! bg-[var(--wf-board)] px-4 py-1.5 text-xs font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)]! ui-focus-ring h-auto rounded-full! active:translate-y-0! hover:text-[var(--wf-ink-muted)]!"
                    >
                      <X className="size-3.5" aria-hidden="true" /> Reset filter
                    </Button>
                  ) : (
                    <p className="text-sm text-[var(--wf-ink-muted)]">
                      {displayFilteredEvents.length} event
                    </p>
                  )}
                </div>

                {isFilterActive && displayFilteredEvents.length === 0 ? (
                  <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--wf-rule)] bg-[var(--wf-board)]/60 px-6 py-10 text-center">
                    <p className="text-sm font-medium text-[var(--wf-ink-muted)]">
                      {qParam.trim()
                        ? `Tidak ada acara yang cocok dengan pencarian "${qParam.trim()}".`
                        : 'Tidak ada acara yang cocok dengan filter ini.'}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetFilter}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-tosca-600)] hover:text-[var(--brand-tosca-dark)]! dark:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm! h-auto border-0 p-0! active:translate-y-0! hover:bg-transparent dark:hover:bg-transparent dark:hover:text-[var(--brand-tosca-soft)]!"
                    >
                      Tampilkan semua event
                    </Button>
                  </div>
                ) : (
                  <>
                    {primaryVenue && (
                      <div className="mb-12">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-2 size-3 shrink-0 rounded-full bg-[var(--wf-accent)]"
                              aria-hidden="true"
                            />
                            <div>
                              <h3 className="font-display text-2xl font-bold tracking-tight text-[var(--wf-ink)]">
                                {primaryVenue.area.name}
                              </h3>
                              <p className="mt-1 text-sm font-medium text-[var(--wf-ink-muted)]">
                                {primaryVenue.events.length} acara dijadwalkan
                                {primaryVenue.area.description ? ` · ${primaryVenue.area.description}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-[var(--wf-accent)] px-3 py-1 text-xs font-semibold text-[var(--wf-accent-ink)]">
                            Area Utama
                          </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {primaryVenue.events.map(ev => (
                            <EventRailCard key={ev.id} event={ev} areas={areas} albums={albums} onDetail={onDetail} />
                          ))}
                        </div>
                      </div>
                    )}

                    {others.length > 0 && (
                      <div>
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-2 size-3 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--wf-accent)_45%,transparent)]"
                              aria-hidden="true"
                            />
                            <div>
                              <h3 className="font-display text-xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-2xl">
                                Lokasi Lainnya di Metmal
                              </h3>
                              <p className="mt-1 text-sm font-medium text-[var(--wf-ink-muted)]">
                                {others.length} agenda di {otherVenueSummary}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {others.map(ev => (
                            <EventRailCard key={ev.id} event={ev} areas={areas} albums={albums} onDetail={onDetail} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : railEvents.length > 0 ? (
              <>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-4xl lg:text-5xl">
                      Mendatang dan berlangsung
                    </h2>
                  </div>
                  <p className="text-sm text-[var(--wf-ink-muted)]">
                    {railRest.length} event
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {railEvents.map(ev => (
                    <EventRailCard key={ev.id} event={ev} areas={areas} albums={albums} onDetail={onDetail} />
                  ))}
                </div>
                {railOverflow > 0 && (
                  <div className="mt-6 text-center">
                    <a
                      href="#calendar"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-tosca-600)] transition hover:text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm"
                    >
                      +{railOverflow} event lain di kalender
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </>
            ) : !highlight ? null : (
              <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--wf-rule)] bg-[var(--wf-board)]/60 px-6 py-10 text-center">
                <p className="text-sm font-medium text-[var(--wf-ink-muted)]">
                  Lihat kalender untuk jadwal lengkap.
                </p>
                <a
                  href="#calendar"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-tosca-600)] hover:text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)] ui-focus-ring rounded-sm"
                >
                  Lihat kalender <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </RevealSection>

        {/* Calendar */}
        <RevealSection id="calendar" tabIndex={-1} className="border-t border-black/5 bg-[var(--wf-board)]/50 px-4 py-16 outline-none   sm:px-6 sm:py-24 lg:py-32" refreshKey={events.length}>
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-4xl lg:text-5xl">
                Jadwal lengkap
              </h2>
              <p className="mt-3 text-base leading-8 text-[var(--wf-ink-muted)]">
                Tampilan bulanan. Klik event untuk melihat detail.
              </p>
            </div>

            {isLoading ? (
              <div className="h-[28rem] animate-pulse rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-rule)]" />
            ) : error ? (
              <div className="rounded-[var(--radius-card-lg)] border border-red-200 bg-[var(--wf-board)]/60 px-6 py-10  ">
                <EventsErrorState message={error} onRetry={onRetry} />
              </div>
            ) : (
              <CalendarView events={filteredEvents} holidays={holidays} onDetail={onDetail} variant="public" />
            )}
          </div>
        </RevealSection>

        {/* Pendaftaran organisasi — halaman khusus */}
        <RevealSection className="border-t border-black/5 py-14 sm:py-16 ">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-3xl">Mau mengadakan event di Metmal?</h2>
              <p className="mt-2 text-sm leading-7 ui-text-secondary">
                EO, sekolah, komunitas, kampus, perusahaan, hingga instansi. Daftarkan organisasimu dan tim Marcomm akan menghubungimu.
              </p>
            </div>
            <Link
              to="/daftar"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-7 py-3.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-page)] ui-focus-ring"
            >
              Daftar event
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </RevealSection>
      </main>

      <footer className="relative isolate overflow-hidden px-4 py-14 sm:px-6 sm:py-18">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-reasoning-tosca" />
        <div aria-hidden="true" className="site-grain absolute inset-0" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-white">Metropolitan Mall Bekasi</p>
            <p className="mt-0.5 text-xs text-white/70">Jadwal event</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/80">
            <Link to="/" className="transition hover:text-white ui-focus-ring rounded-sm">
              Komunitas
            </Link>
            <Link to="/gallery" className="transition hover:text-white ui-focus-ring rounded-sm">
              Galeri
            </Link>
            <Link to="/sponsor" className="transition hover:text-white ui-focus-ring rounded-sm">
              Sponsor
            </Link>
            <Link to="/docs" className="transition hover:text-white ui-focus-ring rounded-sm">
              Dokumentasi
            </Link>
            <a href="#calendar" className="transition hover:text-white ui-focus-ring rounded-sm">
              Kalender
            </a>
            <Link to="/ajukan-event" className="transition hover:text-white ui-focus-ring rounded-sm">
              Ajukan event
            </Link>
            <Link to="/daftar" className="transition hover:text-white ui-focus-ring rounded-sm">
              Daftar event
            </Link>
          </div>
        </div>
      </footer>

      {isExportOptionsOpen && (
        <Suspense fallback={null}>
          <PdfExportOptionsModal
            isOpen={isExportOptionsOpen}
            onClose={() => setIsExportOptionsOpen(false)}
            title="Unduh jadwal event"
            description={
              isFilterActive
                ? exportScope.ignorePageFilter
                  ? `${exportScope.selected.length} dari ${events.length} event akan disertakan. Filter halaman diabaikan, jadi seluruh acara ditawarkan.`
                  : `${exportScope.selected.length} dari ${filteredEvents.length} event akan disertakan. Filter halaman aktif, jadi hanya acara yang tampil di daftar.`
                : `${exportScope.selected.length} dari ${events.length} event akan disertakan. Atur periode dan event, lalu pilih bagian dokumen.`
            }
            sections={SCHEDULE_SECTION_OPTIONS}
            defaultSelected={['summary', 'table']}
            requiredSections={['table']}
            onGenerate={handleDownloadSchedulePdf}
            canGenerate={exportScope.selected.length > 0}
          >
            <ExportScopePicker
              scope={exportScope}
              getId={(event) => event.id}
              primary={(event) => event.acara || '(tanpa nama)'}
              secondary={(event) => [formatIsoId(event.dateStr), event.lokasi, event.eo].filter(Boolean).join(' · ')}
              itemNoun="event"
              searchPlaceholder="Cari acara, lokasi, penyelenggara…"
            />
          </PdfExportOptionsModal>
        </Suspense>
      )}
    </div>
  );
}
