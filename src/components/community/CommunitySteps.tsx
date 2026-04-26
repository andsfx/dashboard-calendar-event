import { ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const STEPS: Array<{ num: string; title: string; desc: string }> = [
  { num: '01', title: 'Daftar & Submit', desc: 'Isi form pendaftaran komunitas. Ceritain siapa kamu dan apa yang mau kamu lakuin.' },
  { num: '02', title: 'Review Tim Mall', desc: 'Tim kami review proposal kamu dan diskusi soal jadwal, kebutuhan, dan konsep acara.' },
  { num: '03', title: 'Konfirmasi & Prep', desc: 'Setelah deal, kita siapin venue dan semua tools yang kamu butuhkan.' },
  { num: '04', title: 'Event Day!', desc: 'Hari H tiba! Kamu fokus bikin acara seru, sisanya biar tim mall yang handle.' },
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

export function CommunitySteps() {
  return (
    <RevealSection id="how" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          {eyebrow('Cara Daftar')}
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Gampang banget, cuma 4 langkah.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.num} className="relative">
              {i < STEPS.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-violet-400/40 to-transparent dark:from-violet-500/30 lg:block" />
              )}
              <div className="relative rounded-[2rem] border border-slate-200/50 bg-[#fcfaf6] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-violet-500 text-lg font-extrabold text-white">
                  {s.num}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
