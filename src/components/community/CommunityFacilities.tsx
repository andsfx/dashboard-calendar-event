import { Fragment, ReactNode } from 'react';
import { Armchair, Gavel, Lightbulb, MapPin, Mic2, Speaker } from 'lucide-react';
import { RevealSection, CommunityEyebrow } from './CommunityRevealPrimitives';

const FACILITIES: Array<{ icon: ReactNode; title: string; detail: string }> = [
  { icon: <Mic2 className="h-5 w-5" aria-hidden="true" />, title: 'Panggung & Backdrop', detail: 'Panggung siap pakai dengan backdrop yang bisa diganti materinya sesuai tema event kamu.' },
  { icon: <Speaker className="h-5 w-5" aria-hidden="true" />, title: 'Sound System 10K Watt', detail: 'Sound system profesional 10.000 watt lengkap dengan operator berpengalaman.' },
  { icon: <Lightbulb className="h-5 w-5" aria-hidden="true" />, title: 'Lighting System', detail: 'Lighting profesional yang bikin panggung kamu makin berkesan.' },
  { icon: <Armchair className="h-5 w-5" aria-hidden="true" />, title: '50 Kursi Penonton', detail: '50 kursi penonton yang bisa ditata ulang sesuai kebutuhan acara kamu.' },
  { icon: <MapPin className="h-5 w-5" aria-hidden="true" />, title: 'Area Lantai 3', detail: 'Lokasi strategis di lantai 3 Metropolitan Mall Bekasi, mudah diakses pengunjung.' },
  { icon: <Gavel className="h-5 w-5" aria-hidden="true" />, title: 'Meja Juri', detail: 'Meja juri tersedia untuk kompetisi, audisi, atau ujian kenaikan kelas.' },
];

/* M4 (skill 4.7, Section-Layout-Repetition Ban): this section used to be a
   "headline + card grid" — the same layout family as Benefits, Steps and
   Gallery. It is now the page's single "two-column definition grid" family:
   each facility is one row of [title column | detail column] (icon + heading
   on the left, the detail on the right), so the label/value pairing is
   structural rather than card-shaped. No card surfaces, no borders under rows
   (9.F); it collapses to a single column below `sm`. Strings, heading
   text/level and the section anchor are unchanged. */
export function CommunityFacilities() {
  return (
    <RevealSection id="facilities" intensity="strong" className="border-t border-black/5 px-4 py-16 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5">
          <div className="max-w-2xl">
            <CommunityEyebrow>Fasilitas</CommunityEyebrow>
            <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              Semua udah disiapin.
            </h2>
            <p className="mt-4 max-w-[65ch] text-base leading-7 ui-text-secondary">
              Dari panggung sampai meja juri, semua fasilitas siap pakai tanpa biaya sewa.
            </p>
          </div>
          <p className="max-w-[65ch] text-sm leading-7 ui-text-secondary">
            Kamu nggak perlu pusing soal venue dan peralatan. Fokus aja bikin acara yang berkesan!
          </p>
        </div>

        <div className="mt-10 grid gap-x-10 gap-y-8 sm:mt-14 sm:grid-cols-[minmax(0,15rem)_1fr] lg:mt-16">
          {FACILITIES.map((f) => (
            <Fragment key={f.title}>
              <h3 className="flex items-start gap-3 text-lg font-bold text-slate-900 dark:text-white">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] text-[var(--brand-tosca-dark)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)] dark:text-[var(--brand-tosca-soft)]">
                  {f.icon}
                </span>
                <span className="mt-1.5">{f.title}</span>
              </h3>
              <p className="max-w-[65ch] text-sm leading-6 ui-text-muted sm:mt-2.5">{f.detail}</p>
            </Fragment>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
