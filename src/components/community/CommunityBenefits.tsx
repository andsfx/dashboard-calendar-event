import { ReactNode } from 'react';
import { Megaphone, Rocket, Trophy, Zap } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string; color: string }> = [
  {
    icon: <Trophy className="h-7 w-7" aria-hidden="true" />,
    title: 'Sponsorship Opportunities',
    desc: 'Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu connect dengan brand dan tenant yang relevan.',
    color: '#f59e0b',
  },
  {
    icon: <Megaphone className="h-7 w-7" aria-hidden="true" />,
    title: 'Marketing Support',
    desc: 'Tim marketing kami bantu promosiin event kamu lewat social media, digital signage, dan channel mall lainnya.',
    color: '#ec4899',
  },
  {
    icon: <Rocket className="h-7 w-7" aria-hidden="true" />,
    title: 'Grow Your Community',
    desc: 'Eksposur ke ribuan pengunjung mall setiap hari. Kesempatan kolaborasi dengan komunitas lain yang udah bergabung.',
    color: '#8b5cf6',
  },
  {
    icon: <Zap className="h-7 w-7" aria-hidden="true" />,
    title: 'Free Venue & Event Tools',
    desc: 'Panggung, sound system, lighting, kursi penonton — semua GRATIS. Kamu tinggal fokus bikin acara yang seru.',
    color: '#10b981',
  },
];

function RevealSection({
  children,
  className = '',
  intensity = 'default',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  intensity?: 'default' | 'strong';
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref as never}
      className={`reveal-on-scroll ${intensity === 'strong' ? 'reveal-strong' : ''} ${isVisible ? 'reveal-visible' : ''} ${className}`}
      {...rest}
    >
      <div className="reveal-stage">{children}</div>
    </section>
  );
}

function eyebrow(label: string) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-500">
      {label}
    </p>
  );
}

export function CommunityBenefits() {
  return (
    <RevealSection id="benefits" intensity="strong" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          {eyebrow('Kenapa Gabung')}
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Bukan cuma dikasih space.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
            Kamu juga dipush buat berkembang. Dari sponsorship sampai marketing support — semua buat komunitas kamu makin besar.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
              style={{ '--accent-color': b.color } as React.CSSProperties}
            >
              {/* Accent bar */}
              <div
                className="absolute left-0 right-0 top-0 h-1 transition-all duration-300 group-hover:h-2"
                style={{ background: b.color }}
              />

              {/* Icon with colored background */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${b.color}15`, color: b.color }}
              >
                {b.icon}
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{b.desc}</p>

              {/* Decorative gradient blob */}
              <div
                className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-20"
                style={{ background: b.color }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
