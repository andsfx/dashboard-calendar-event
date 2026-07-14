import { RevealSection } from './CommunityRevealPrimitives';

const STEPS: Array<{ num: string; title: string; desc: string }> = [
  { num: '01', title: 'Daftar & Submit', desc: 'Pilih tipe organisasi, isi form pendaftaran, dan ceritain rencana event kamu.' },
  { num: '02', title: 'Review Tim Mall', desc: 'Tim kami review proposal kamu dan diskusi soal jadwal, kebutuhan, dan konsep acara.' },
  { num: '03', title: 'Konfirmasi & Prep', desc: 'Setelah deal, kita siapin venue dan semua tools yang kamu butuhkan.' },
  { num: '04', title: 'Event Day!', desc: 'Hari H tiba! Kamu fokus bikin acara seru, sisanya biar tim mall yang handle.' },
];

export function CommunitySteps() {
  return (
    <RevealSection id="how" intensity="strong" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Gampang banget, cuma 4 langkah.
          </h2>
        </div>

        <ol className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.num} className="ui-campaign-card relative p-6">
              <span className="ui-campaign-icon-gradient inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold tabular-nums">
                {s.num}
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </RevealSection>
  );
}
