import { ReactNode } from 'react';
import { Headphones, Heart, Lightbulb, MapPin, Mic2, Users } from 'lucide-react';
import { RevealSection } from './CommunityRevealPrimitives';

const FACILITIES: Array<{ icon: ReactNode; title: string; detail: string }> = [
  { icon: <Mic2 className="h-6 w-6" aria-hidden="true" />, title: 'Panggung & Backdrop', detail: 'Panggung siap pakai dengan backdrop yang bisa diganti materinya sesuai tema event kamu.' },
  { icon: <Headphones className="h-6 w-6" aria-hidden="true" />, title: 'Sound System 10K Watt', detail: 'Sound system profesional 10.000 watt lengkap dengan operator berpengalaman.' },
  { icon: <Lightbulb className="h-6 w-6" aria-hidden="true" />, title: 'Lighting System', detail: 'Lighting profesional yang bikin panggung kamu makin standout dan memorable.' },
  { icon: <Users className="h-6 w-6" aria-hidden="true" />, title: '50 Kursi Penonton', detail: '50 kursi penonton yang bisa di-arrange sesuai kebutuhan acara kamu.' },
  { icon: <MapPin className="h-6 w-6" aria-hidden="true" />, title: 'Area Lantai 3', detail: 'Lokasi strategis di lantai 3 Metropolitan Mall Bekasi, mudah diakses pengunjung.' },
  { icon: <Heart className="h-6 w-6" aria-hidden="true" />, title: 'Meja Juri', detail: 'Meja juri tersedia untuk kompetisi, audisi, atau ujian kenaikan kelas.' },
];

export function CommunityFacilities() {
  return (
    <RevealSection id="facilities" intensity="strong" className="border-y border-black/5 bg-neutral-50 px-4 py-16 dark:bg-slate-900 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              Semua udah disiapin.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 ui-text-secondary">
            Kamu nggak perlu pusing soal venue dan peralatan. Fokus aja bikin acara yang memorable!
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {FACILITIES.map(f => (
            <div
              key={f.title}
              className="ui-campaign-card p-5 transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] text-[var(--brand-tosca)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)] dark:text-[var(--brand-tosca-soft)]">
                {f.icon}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 ui-text-muted">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
