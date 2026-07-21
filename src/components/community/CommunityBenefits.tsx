import { ReactNode } from 'react';
import { Megaphone, Rocket, Trophy, Zap } from 'lucide-react';
import { RevealSection } from './CommunityRevealPrimitives';

const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string; color: string }> = [
  {
    icon: <Trophy className="h-6 w-6" aria-hidden="true" />,
    title: 'Dukungan Sponsorship',
    desc: 'Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu hubungkan dengan brand dan tenant yang relevan.',
    color: 'var(--brand-pink)',
  },
  {
    icon: <Megaphone className="h-6 w-6" aria-hidden="true" />,
    title: 'Promosi & Marketing',
    desc: 'Tim marketing kami bantu promosikan event kamu lewat media sosial, digital signage, dan kanal mall lainnya.',
    color: 'var(--brand-tosca)',
  },
  {
    icon: <Rocket className="h-6 w-6" aria-hidden="true" />,
    title: 'Kembangkan Komunitas',
    desc: 'Eksposur ke ribuan pengunjung mall setiap hari. Kesempatan kolaborasi dengan komunitas lain yang udah bergabung.',
    color: 'var(--brand-tosca-soft)',
  },
  {
    icon: <Zap className="h-6 w-6" aria-hidden="true" />,
    title: 'Venue & Peralatan Gratis',
    desc: 'Panggung, sound system, lighting, kursi penonton - semua GRATIS. Kamu tinggal fokus bikin acara yang seru.',
    color: 'var(--brand-tosca)',
  },
];

export function CommunityBenefits() {
  return (
    <RevealSection id="benefits" intensity="strong" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:items-end">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              Bukan cuma dikasih space.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 ui-text-secondary">
              Kamu juga didukung untuk berkembang. Dari sponsorship sampai promosi, semua untuk memperbesar jangkauan komunitas kamu.
            </p>
          </div>

          <div className="reveal-cluster grid gap-5 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="ui-campaign-card p-6">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${b.color} 14%, white)`, color: b.color }}
                >
                  {b.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{b.title}</h3>
                <p className="mt-2 text-sm leading-6 ui-text-secondary">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
