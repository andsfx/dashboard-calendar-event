import { ReactNode } from 'react';
import { HandCoins, Megaphone, PackageCheck, Sprout } from 'lucide-react';
import { RevealSection } from './CommunityRevealPrimitives';
import { Link } from 'react-router-dom';

const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string }> = [
  {
    icon: <Megaphone className="h-6 w-6" aria-hidden="true" />,
    title: 'Dukungan promosi',
    desc: 'Acara kamu dipromosikan lewat media sosial, layar informasi, dan kanal resmi Metmal Bekasi.',
  },
  {
    icon: <Sprout className="h-6 w-6" aria-hidden="true" />,
    title: 'Jejaring antarpenyelenggara',
    desc: 'Jangkau pengunjung Metmal Bekasi dan buka peluang kolaborasi dengan penyelenggara lain.',
  },
  {
    icon: <PackageCheck className="h-6 w-6" aria-hidden="true" />,
    title: 'Venue dan peralatan tanpa biaya sewa',
    desc: 'Panggung, sound system, lighting, dan kursi tersedia tanpa biaya sewa sesuai review dan jadwal.',
  },
];

/* M4 (skill 4.7, Section-Layout-Repetition Ban): this section used to be a
   "headline + card grid" — the same layout family as Facilities, Steps and
   Gallery. It is now the page's single "stacked full-width feature-rows"
   family: every item is a full-width row (icon tile left, copy right) stacked
   vertically, with no card surfaces and no grid. String copy was later
   reworded by plain-language alignment (sentence case, "&" → "dan"); heading
   levels and the `/sponsor` CTA target are unchanged. */
export function CommunityBenefits() {
  return (
    <RevealSection id="benefits" className="scroll-mt-28 border-b border-[var(--wf-rule)] bg-[var(--section-alt)] px-4 py-16  sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-[var(--wf-ink)] sm:text-5xl">
              Dukungan promosi sampai Lead Sponsor.
            </h2>
            <p className="mt-4 max-w-[65ch] text-base leading-7 ui-text-secondary">
              Selain venue, acara kamu juga dibantu promosi agar jangkauannya makin luas.
            </p>
          </div>

          <div className="flex flex-col gap-10 sm:gap-14">
            {/* CTA sponsorship — link ke halaman /sponsor */}
            <div data-reveal-item className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)]">
                <HandCoins className="h-6 w-6 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold leading-tight text-[var(--wf-ink)]">Peluang Lead Sponsor</h3>
                <p className="mt-2 max-w-[65ch] text-base leading-7 ui-text-secondary">Kami bantu menghubungkan acara kamu dengan mitra dan tenant yang sesuai.</p>
                <Link
                  to="/sponsor"
                  className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] focus-visible:ring-offset-2"
                >
                  Lihat peluang Lead Sponsor
                </Link>
              </div>
            </div>

            {BENEFITS.map((b) => (
              <div key={b.title} data-reveal-item className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] text-[var(--brand-tosca-dark)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_22%,black)] dark:text-[var(--brand-tosca-soft)]">
                  {b.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-[var(--wf-ink)]">{b.title}</h3>
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
