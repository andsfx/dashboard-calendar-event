import { ReactNode } from 'react';
import { Headphones, Heart, Lightbulb, MapPin, Mic2, Users } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const FACILITIES: Array<{ icon: ReactNode; title: string; detail: string }> = [
  { icon: <Mic2 className="h-6 w-6" aria-hidden="true" />, title: 'Panggung & Backdrop', detail: 'Panggung siap pakai dengan backdrop yang bisa diganti materinya sesuai tema event kamu.' },
  { icon: <Headphones className="h-6 w-6" aria-hidden="true" />, title: 'Sound System 10K Watt', detail: 'Sound system profesional 10.000 watt lengkap dengan operator berpengalaman.' },
  { icon: <Lightbulb className="h-6 w-6" aria-hidden="true" />, title: 'Lighting System', detail: 'Lighting profesional yang bikin panggung kamu makin standout dan memorable.' },
  { icon: <Users className="h-6 w-6" aria-hidden="true" />, title: '50 Kursi Penonton', detail: '50 kursi penonton yang bisa di-arrange sesuai kebutuhan acara kamu.' },
  { icon: <MapPin className="h-6 w-6" aria-hidden="true" />, title: 'Area Lantai 3', detail: 'Lokasi strategis di lantai 3 Metropolitan Mall Bekasi, mudah diakses pengunjung.' },
  { icon: <Heart className="h-6 w-6" aria-hidden="true" />, title: 'Meja Juri', detail: 'Meja juri tersedia untuk kompetisi, audisi, atau ujian kenaikan kelas.' },
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

export function CommunityFacilities() {
  return (
    <RevealSection id="facilities" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {eyebrow('Fasilitas')}
            <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              Semua udah disiapin.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
            Kamu nggak perlu pusing soal venue dan peralatan. Fokus aja bikin acara yang memorable!
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FACILITIES.map(f => (
            <div
              key={f.title}
              className="rounded-[1.75rem] border bg-[#fcfaf6] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                {f.icon}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
