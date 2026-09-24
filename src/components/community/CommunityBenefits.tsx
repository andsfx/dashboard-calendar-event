import { ReactNode } from 'react';
import { HandCoins, Megaphone, PackageCheck, Sprout } from 'lucide-react';
import { RevealSection } from './CommunityRevealPrimitives';
import { Link } from 'react-router-dom';

const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string }> = [
  {
    icon: <Megaphone className="h-6 w-6" aria-hidden="true" />,
    title: 'Promosi & Marketing',
    desc: 'Event kamu kami promosiin lewat media sosial, digital signage, dan kanal mall lainnya.',
  },
  {
    icon: <Sprout className="h-6 w-6" aria-hidden="true" />,
    title: 'Kembangkan Komunitas',
    desc: 'Eksposur ke ribuan pengunjung mall setiap hari. Kesempatan kolaborasi dengan komunitas lain yang udah bergabung.',
  },
  {
    icon: <PackageCheck className="h-6 w-6" aria-hidden="true" />,
    title: 'Venue & Peralatan Gratis',
    desc: 'Panggung, sound system, lighting, kursi penonton, semuanya gratis. Kamu tinggal fokus bikin acaranya.',
  },
];

/* M4 (skill 4.7, Section-Layout-Repetition Ban): this section used to be a
   "headline + card grid" — the same layout family as Facilities, Steps and
   Gallery. It is now the page's single "stacked full-width feature-rows"
   family: every item is a full-width row (icon tile left, copy right) stacked
   vertically, with no card surfaces and no grid. All copy, heading text/levels
   and the `/sponsor` CTA target are unchanged. */
export function CommunityBenefits() {
  return (
    <RevealSection id="benefits" intensity="strong" className="border-b border-black/5 bg-[var(--section-alt)] px-4 py-16 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              Bukan cuma dikasih tempat.
            </h2>
            <p className="mt-4 max-w-[65ch] text-base leading-7 ui-text-secondary">
              Kamu juga didukung buat berkembang. Dari sponsorship sampai promosi, semuanya buat memperbesar jangkauan.
            </p>
          </div>

          <div className="reveal-cluster flex flex-col gap-10 sm:gap-14">
            {/* CTA sponsorship — link ke halaman /sponsor */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)]">
                <HandCoins className="h-6 w-6 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold leading-tight text-slate-950 dark:text-white">Dukungan Sponsorship</h3>
                <p className="mt-2 max-w-[65ch] text-base leading-7 ui-text-secondary">Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu hubungkan dengan brand dan tenant yang relevan.</p>
                <Link
                  to="/sponsor"
                  className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-tosca-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                >
                  Lihat Peluang Sponsor
                </Link>
              </div>
            </div>

            {BENEFITS.map((b) => (
              <div key={b.title} className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] text-[var(--brand-tosca-dark)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)] dark:text-[var(--brand-tosca-soft)]">
                  {b.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{b.title}</h3>
                  <p className="mt-2 max-w-[65ch] text-base leading-7 ui-text-secondary">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
