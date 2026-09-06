import { ReactNode } from 'react';
import { HandCoins, Megaphone, PackageCheck, Sprout } from 'lucide-react';
import { RevealSection } from './CommunityRevealPrimitives';
import { Link } from 'react-router-dom';

const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string; color: string }> = [
  {
    icon: <Megaphone className="h-6 w-6" aria-hidden="true" />,
    title: 'Promosi & Marketing',
    desc: 'Event kamu kami promosiin lewat media sosial, digital signage, dan kanal mall lainnya.',
    color: 'var(--brand-tosca)',
  },
  {
    icon: <Sprout className="h-6 w-6" aria-hidden="true" />,
    title: 'Kembangkan Komunitas',
    desc: 'Eksposur ke ribuan pengunjung mall setiap hari. Kesempatan kolaborasi dengan komunitas lain yang udah bergabung.',
    color: 'var(--brand-tosca)',
  },
  {
    icon: <PackageCheck className="h-6 w-6" aria-hidden="true" />,
    title: 'Venue & Peralatan Gratis',
    desc: 'Panggung, sound system, lighting, kursi penonton — semuanya gratis. Kamu tinggal fokus bikin acaranya.',
    color: 'var(--brand-tosca)',
  },
];

export function CommunityBenefits() {
  return (
    <RevealSection id="benefits" intensity="strong" className="border-b border-black/5 bg-[var(--section-alt)] px-4 py-16 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:items-end">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              Bukan cuma dikasih tempat.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 ui-text-secondary">
              Kamu juga didukung buat berkembang. Dari sponsorship sampai promosi, semuanya buat memperbesar jangkauan.
            </p>
          </div>

          <div className="reveal-cluster grid gap-5 sm:grid-cols-2">
            {/* CTA sponsorship — link ke halaman /sponsor */}
            <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--brand-tosca)_6%,white)] p-5 dark:border-slate-700 dark:bg-[color-mix(in_srgb,var(--brand-tosca)_12%,black)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)]">
                <HandCoins className="h-6 w-6 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]">Sponsor & Support</p>
                <h3 className="mt-1.5 text-lg font-bold leading-tight text-slate-950 dark:text-white">Dukungan Sponsorship</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu hubungkan dengan brand dan tenant yang relevan.</p>
              </div>
              <Link
                to="/sponsor"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                Lihat Peluang Sponsor
              </Link>
            </div>

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