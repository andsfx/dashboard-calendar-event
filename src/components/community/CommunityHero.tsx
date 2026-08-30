import { ArrowRight, CheckCircle2, Music, Users } from 'lucide-react';
import { imgUrl } from '../../utils/imageOptim';
import { formatCount } from './countFormat';

/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V3
 * redesign: solid brand CTA, honest badge, LCP static hero — no invented metrics
 */

const focusRing = 'ui-focus-ring';

interface CommunityHeroProps {
  heroImageUrl?: string;
  stats?: { completed?: number };
  isLoading?: boolean;
}

export function CommunityHero({ heroImageUrl, stats, isLoading = false }: CommunityHeroProps) {
  const completed = stats?.completed ?? 0;
  const loading = isLoading || stats === undefined;
  return (
    <section
      id="hero"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Layer 1: gradient bg */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-hero-tosca" />

      {/* Layer 2: grain texture */}
      <div aria-hidden="true" className="site-grain absolute inset-0 z-0" />

      {/* Layer 3: hero image (if available) */}
      {heroImageUrl && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
          <img
            src={imgUrl(heroImageUrl, { w: 1280, q: 78 })}
            srcSet={`
              ${imgUrl(heroImageUrl, { w: 768, q: 74 })} 768w,
              ${imgUrl(heroImageUrl, { w: 1280, q: 78 })} 1280w,
              ${imgUrl(heroImageUrl, { w: 1920, q: 80 })} 1920w
            `}
            sizes="100vw"
            alt="Suasana event komunitas di Metropolitan Mall Bekasi"
            className="h-full w-full object-cover brightness-[0.35]"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      )}

      {/* Layer 4: radial mask depth overlay */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] bg-gradient-hero-mask" />

      <div className="relative z-10 mx-auto flex min-h-[70dvh] max-w-7xl items-center px-4 pt-20 pb-32 sm:px-6">
        <div className="max-w-3xl w-full text-left">
          <div className="community-hero-in inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-5 py-2.5 text-[12px] font-bold tracking-wider text-white/85" aria-live="polite" aria-busy={loading}>
            {loading ? (
              <span className="inline-block h-4 w-32 animate-pulse rounded-full bg-white/25 motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              `${formatCount(completed)}+ Event Sudah Terlaksana`
            )}
          </div>

          <h1 className="community-hero-in community-hero-in-d1 mt-6 text-[2.5rem] font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-[5rem]">
            Panggung <strong className="text-brand-primary-300">Gratis</strong> untuk Komunitas Bekasi
          </h1>

          <div className="community-hero-in community-hero-in-d2">
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
              Cari venue untuk event komunitas? Metropolitan Mall Bekasi siapkan tempatnya <strong className="text-white">gratis</strong>.
            </p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Venue, sound system, dan lighting sudah lengkap. Kamu tinggal bawa konsep acaranya.
            </p>
            <p className="mt-4 max-w-md text-sm font-medium text-white/75">
              Slot tiap bulan terbatas. Amankan tanggal acaramu.
            </p>
          </div>

          <div className="community-hero-in community-hero-in-d3 mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-start">
            <a
              href="/daftar"
              className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[var(--brand-tosca-dark)] active:scale-[0.98] motion-reduce:active:scale-100 ${focusRing}`}
            >
              Daftar Sekarang
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
            </a>
            <a
              href="#register"
              className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/15 ${focusRing}`}
            >
              Isi Form di Halaman Ini
            </a>
          </div>

          <div className="community-hero-in community-hero-in-d4 mt-12 flex flex-wrap items-center gap-6 text-sm text-white/75">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              </span>
              <span>100% Gratis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Music className="h-4 w-4 text-white/90" aria-hidden="true" />
              </span>
              <span>Sound 10K Watt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Users className="h-4 w-4 text-white/90" aria-hidden="true" />
              </span>
              <span>Terbuka untuk Semua</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
