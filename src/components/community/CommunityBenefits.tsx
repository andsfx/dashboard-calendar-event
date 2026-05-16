import { ReactNode } from 'react';
import { Megaphone, Rocket, Trophy, Zap } from 'lucide-react';
import { CommunityEyebrow, RevealSection } from './CommunityRevealPrimitives';

const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string; color: string }> = [
  {
    icon: <Trophy className="h-7 w-7" aria-hidden="true" />,
    title: 'Dukungan Sponsorship',
    desc: 'Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu hubungkan dengan brand dan tenant yang relevan.',
    color: '#f59e0b',
  },
  {
    icon: <Megaphone className="h-7 w-7" aria-hidden="true" />,
    title: 'Promosi & Marketing',
    desc: 'Tim marketing kami bantu promosikan event kamu lewat media sosial, digital signage, dan kanal mall lainnya.',
    color: '#ec4899',
  },
  {
    icon: <Rocket className="h-7 w-7" aria-hidden="true" />,
    title: 'Kembangkan Komunitas',
    desc: 'Eksposur ke ribuan pengunjung mall setiap hari. Kesempatan kolaborasi dengan komunitas lain yang udah bergabung.',
    color: '#8b5cf6',
  },
  {
    icon: <Zap className="h-7 w-7" aria-hidden="true" />,
    title: 'Venue & Peralatan Gratis',
    desc: 'Panggung, sound system, lighting, kursi penonton — semua GRATIS. Kamu tinggal fokus bikin acara yang seru.',
    color: '#10b981',
  },
];

export function CommunityBenefits() {
  return (
    <RevealSection id="benefits" intensity="strong" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <CommunityEyebrow>Kenapa Gabung</CommunityEyebrow>
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Bukan cuma dikasih space.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 ui-text-secondary">
            Kamu juga didukung untuk berkembang. Dari sponsorship sampai promosi, semua untuk memperbesar jangkauan komunitas kamu.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="ui-campaign-card group relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none"
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
              <p className="mt-2 text-sm leading-6 ui-text-secondary">{b.desc}</p>

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
