import { ArrowRight, CheckCircle2, ChevronDown, Music, Sparkles, Users } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { ReactNode } from 'react';
import { imgUrl } from '../../utils/imageOptim';

const BRAND = {
  accent: '#7c6cf2',
  accentSoft: '#9185f7',
  accentWarm: '#f2743e',
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

function RevealSection({
  children,
  className = '',
  as = 'section',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal();
  const Tag = as;

  return (
    <Tag
      ref={ref as never}
      className={`reveal-on-scroll ${isVisible ? 'reveal-visible' : ''} ${className}`}
      {...rest}
    >
      <div className="reveal-stage">{children}</div>
    </Tag>
  );
}

interface CommunityHeroProps {
  heroImageUrl?: string;
}

export function CommunityHero({ heroImageUrl }: CommunityHeroProps) {
  return (
    <section
      id="hero"
      className="relative min-h-screen lg:max-h-[1000px] overflow-hidden"
    >
      {/* Background: foto + gradient overlay */}
      {heroImageUrl ? (
        <>
          <div className="absolute inset-0">
            <img src={imgUrl(heroImageUrl, { w: 1920, q: 80 })} alt="" className="h-full w-full object-cover" fetchPriority="high" />
          </div>
          {/* Gradient overlay di atas foto (60-70% opacity) */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(26,5,51,0.75) 0%, rgba(15,23,42,0.65) 40%, rgba(30,27,75,0.70) 70%, rgba(49,46,129,0.60) 100%)' }}
          />
        </>
      ) : (
        <>
          {/* Base gradient */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0f172a 40%, #1e1b4b 70%, #312e81 100%)' }}
          />
          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
          {/* Mesh gradient overlay */}
          <div
            className="absolute inset-0 opacity-40 dark:opacity-30"
            style={{
              background: `
                radial-gradient(circle at 20% 30%, rgba(251, 146, 60, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(236, 72, 153, 0.10) 0%, transparent 50%),
                radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.13) 0%, transparent 50%)
              `,
            }}
          />
        </>
      )}

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-orange-500/25 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/25 blur-[80px]" />
        <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-pink-500/25 blur-[90px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <RevealSection as="div" className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Metmal Community Space
          </div>

          <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-[5rem]">
            Calling All{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-violet-400 bg-clip-text text-transparent">
              Community
            </span>
            !
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
            Lagi cari tempat buat event atau kumpul komunitas? Di Metropolitan Mall Bekasi <strong className="text-white">GRATIS</strong>!
            Venue, sound system, lighting semua udah disiapin. Terbuka untuk komunitas, sekolah, perusahaan, dan organisasi lainnya.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#register"
              className={`group inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-xl ${focusRing}`}
              style={{ 
                background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)`,
                boxShadow: '0 20px 40px -12px rgba(242, 116, 62, 0.5)'
              }}
            >
              Daftar Sekarang
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#benefits"
              className={`inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-xl transition hover:border-white/40 hover:bg-white/20 ${focusRing}`}
            >
              Lihat Benefits
            </a>
          </div>

          {/* Quick stats */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/75">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              </span>
              <span>100% Gratis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
                <Music className="h-4 w-4 text-violet-400" aria-hidden="true" />
              </span>
              <span>Sound 10K Watt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                <Users className="h-4 w-4 text-amber-400" aria-hidden="true" />
              </span>
              <span>Open for All</span>
            </div>
          </div>
        </RevealSection>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse" aria-hidden="true">
        <ChevronDown className="h-6 w-6 text-white/50" />
      </div>
    </section>
  );
}
