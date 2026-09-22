import { ArrowRight, CalendarDays, CheckCircle2, Music, Users } from 'lucide-react';
import heroFallbackImage from '../../assets/landing/hero-fallback.webp';
import heroFallbackImageSm from '../../assets/landing/hero-fallback-800.webp';
import { imgUrl } from '../../utils/imageOptim';
import { formatDateRange } from '../../utils/eventUtils';
import type { EventItem } from '../../types';
import { formatCount } from './countFormat';
import { COMMUNITY_STAT_LABELS } from './communityStats';

/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V3
 * redesign: solid brand CTA, honest badge, LCP static hero — no invented metrics
 * v2: hero jadi dua kolom sejajar (narasi | papan data realtime) — tidak lagi
 *     menumpuk ke bawah, dan tidak ada lagi ruang kosong di sisi kanan.
 */

const focusRing = 'ui-focus-ring';

/**
 * Facts that used to sit INSIDE the hero as a 3-item trust strip. Section 4.7
 * bans a feature-bullet / trust micro-strip inside the hero, so (M1) they render
 * as their own band directly below it — content and icons preserved.
 */
const HIGHLIGHTS: Array<{ icon: typeof CheckCircle2; label: string; emerald?: boolean }> = [
  { icon: CheckCircle2, label: '100% Gratis', emerald: true },
  { icon: Music, label: 'Sound 10K Watt' },
  { icon: Users, label: 'Terbuka untuk Semua' },
];

interface CommunityHeroProps {
  heroImageUrl?: string;
  stats?: { completed?: number };
  /** Event publik — dipakai untuk papan data realtime di kolom kanan. */
  events?: EventItem[];
  isLoading?: boolean;
}

export function CommunityHero({ heroImageUrl, stats, events = [], isLoading = false }: CommunityHeroProps) {
  const completed = stats?.completed ?? 0;
  const loading = isLoading || stats === undefined;
  // M7 (skill 4.8): the `hero_image` site setting defaults to ''
  // (useSiteSettingsHandlers.ts:44), which left the hero as text + gradient only.
  // Fall back to a bundled landing photograph so the existing image layer always
  // fills. A configured URL still wins.
  const resolvedHeroImage = heroImageUrl || heroFallbackImage;
  // imgUrl() only rewrites R2 URLs (isR2Url matches VITE_R2_PUBLIC_URL); for the
  // bundled fallback it returns the path unchanged, so wsrv.nl resize params never
  // apply and a 3-entry srcSet would collapse to one file. The fallback therefore
  // ships its own pre-built WebP variants (ffmpeg/libwebp: 800w + 1600w) instead of
  // being run through the CDN helper.
  const heroImgProps = heroImageUrl
    ? {
        src: imgUrl(heroImageUrl, { w: 1280, q: 78 }),
        srcSet: `
        ${imgUrl(heroImageUrl, { w: 768, q: 74 })} 768w,
        ${imgUrl(heroImageUrl, { w: 1280, q: 78 })} 1280w,
        ${imgUrl(heroImageUrl, { w: 1920, q: 80 })} 1920w
      `,
        sizes: '100vw',
      }
    : {
        src: heroFallbackImage,
        srcSet: `${heroFallbackImageSm} 800w, ${heroFallbackImage} 1600w`,
        sizes: '100vw',
      };

  // ─── Papan data realtime (kolom kanan) ──────────────────────────────
  // Ongoing selalu punya tanggal <= hari ini, jadi urut naik = ongoing dulu,
  // baru upcoming terdekat. Tidak perlu peringkat status terpisah.
  const liveEvents = events
    .filter(e => e.status === 'ongoing' || e.status === 'upcoming')
    .slice()
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .slice(0, 3);
  // Metrik di sini sengaja realtime/operasional saja; angka seumur hidup
  // (terlaksana, penyelenggara, total) tetap milik CommunitySocialProof di
  // bawah hero supaya tidak ada dua angka kembar di satu layar.
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const metrics: Array<{ label: string; value: number }> = [
    { label: 'Sedang berlangsung', value: events.filter(e => e.status === 'ongoing').length },
    { label: 'Akan datang', value: events.filter(e => e.status === 'upcoming').length },
    { label: 'Event bulan ini', value: events.filter(e => e.dateStr.startsWith(monthPrefix)).length },
  ];

  return (
    <>
      <section
        id="hero"
        className="relative isolate flex min-h-[100svh] items-center overflow-hidden"
      >
        {/* Layer 1: gradient bg */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-hero-tosca" />

        {/* Layer 2: grain texture */}
        <div aria-hidden="true" className="site-grain absolute inset-0 z-0" />

        {/* Layer 3: hero image (configured URL wins; bundled fallback otherwise) */}
        {resolvedHeroImage && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
            <img
              {...heroImgProps}
              alt="Suasana event komunitas di Metropolitan Mall Bekasi"
              className="h-full w-full object-cover brightness-[0.35]"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        )}

        {/* Layer 4: radial mask depth overlay */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] bg-gradient-hero-mask" />

        {/* Dua kolom sejajar: narasi (tengah) | papan data realtime.
            Padding atas/bawah dirapatkan di lebar kecil: konten hero yang
            melewati ~87% tinggi kotak akan turun ke pita transisi gradient,
            dan gate a11y mengukur fraksi itu secara langsung. */}
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-start gap-8 px-4 pt-20 pb-16 sm:px-6 sm:pt-24 sm:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div className="mx-auto max-w-2xl text-center lg:mx-0">
            <div className="community-hero-in inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-5 py-2.5 text-[12px] font-bold tracking-wider text-white/85" aria-live="polite" aria-busy={loading}>
              {loading ? (
                <span className="inline-block h-4 w-32 animate-pulse rounded-full bg-white/25 motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                `${formatCount(completed)}+ ${COMMUNITY_STAT_LABELS.completed}`
              )}
            </div>

            {/* M10: skala desktop diturunkan ke 60px (dulu lg:text-[5rem] = 80px).
                Catatan: klaim lama "2 baris di 1280px" tidak lagi berlaku sejak
                hero jadi dua kolom — kolom narasi menyempit, jadi headline
                terbaca 3 baris di 1440px (terukur 60px/63px lh, lebar 617px).
                Jangan naikkan lagi ke 80px: gate `hero copy stays above the 87%
                line` mengukur tinggi konten hero, dan headline 4 baris akan
                mendorongnya ke pita transisi gradient. */}
            <h1 className="community-hero-in community-hero-in-d1 mt-6 text-[2.5rem] font-extrabold leading-[1.05] text-white sm:text-6xl">
              Panggung <strong className="text-brand-primary-300">Gratis</strong> untuk Komunitas Bekasi
            </h1>

            {/* M2: three subtext paragraphs (30 words / 5 lines) collapsed to one (12 words). */}
            <p className="community-hero-in community-hero-in-d2 mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
              Venue, sound system, dan lighting sudah lengkap. Kamu tinggal bawa konsep acaranya.
            </p>

            <div className="community-hero-in community-hero-in-d3 mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
              <a
                href="/daftar"
                className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[var(--brand-tosca-dark)] active:scale-[0.98] motion-reduce:active:scale-100 ${focusRing}`}
              >
                Daftar Event
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </a>
              <a
                href="#upcoming-events"
                className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/15 ${focusRing}`}
              >
                Cek Event
              </a>
            </div>
          </div>

          {/* Papan data realtime — mengisi ruang kanan hero, bukan tumpukan bawah */}
          <aside
            aria-label="Data komunitas terkini"
            className="community-hero-in community-hero-in-d2 w-full rounded-[var(--radius-campaign-card)] border border-white/15 bg-white/10 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                Jadwal terdekat
              </p>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" aria-hidden="true" />
                Live
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3" aria-busy={loading}>
              {metrics.map(metric => (
                <div key={metric.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3">
                  {loading ? (
                    <span className="block h-7 w-12 animate-pulse rounded-md bg-white/25 motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <p className="font-display text-2xl font-extrabold leading-none tabular-nums text-white">
                      {metric.value > 0 ? formatCount(metric.value) : '—'}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] font-semibold leading-tight text-white/70">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Daftar event hanya di `lg:` — di bawah itu panel berada di kolom
                yang sama dengan narasi, sehingga menambah tinggi konten hero.
                Hero memakai `min-h-[100svh]`; begitu konten melewati tinggi
                viewport, hero ikut memanjang dan teks turun ke pita terang
                gradient (gate `hero copy stays above the 87% line` mengukur
                ini). Di mobile metrik realtime tetap tampil, dan daftar
                agenda lengkap ada di section tepat di bawah hero. */}
            <div className="mt-5 hidden border-t border-white/15 pt-4 lg:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                Sedang & akan berlangsung
              </p>
              {loading ? (
                <ul className="mt-3 space-y-2.5">
                  {[0, 1].map(i => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-white/20 motion-reduce:animate-none" aria-hidden="true" />
                      <span className="h-4 w-full animate-pulse rounded-md bg-white/20 motion-reduce:animate-none" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              ) : liveEvents.length > 0 ? (
                <ul className="mt-3 space-y-2.5">
                  {liveEvents.map(event => (
                    <li key={event.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/12 text-white/85">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{event.acara}</p>
                        <p className="mt-0.5 truncate text-xs text-white/70">
                          {formatDateRange(event.dateStr, event.dateEnd)}
                          {event.pic ? ` · ${event.pic}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-white/70">
                  Belum ada agenda terjadwal — ajukan eventmu dan jadi yang pertama.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* M1: the former in-hero trust strip. Hero stack is now badge + h1 + 1
          subtext + 2 CTAs; these three facts (and their icons) live on in this
          band directly below the hero instead of being deleted. */}
      <section
        aria-label="Keunggulan program komunitas"
        className="border-b border-black/5 bg-[var(--brand-card)] px-4 py-6 dark:border-slate-800 dark:bg-slate-900 sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 text-sm font-medium text-slate-700 dark:text-slate-300">
          {HIGHLIGHTS.map(({ icon: Icon, label, emerald }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span
                className={
                  emerald
                    ? 'flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] text-[var(--brand-tosca-dark)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)] dark:text-[var(--brand-tosca-soft)]'
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
