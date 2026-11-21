import { RevealSection } from './CommunityRevealPrimitives';

const STEPS: Array<{ num: string; title: string; desc: string }> = [
  { num: '01', title: 'Daftar dan kirim', desc: 'Pilih tipe organisasi, isi formulir pendaftaran, dan tulis rencana acara kamu.' },
  { num: '02', title: 'Review tim mall', desc: 'Tim kami meninjau pengajuan dalam 5 hari kerja. PIC dihubungi untuk diskusi jadwal.' },
  { num: '03', title: 'Konfirmasi dan persiapan', desc: 'Setelah jadwal disetujui, kami siapkan venue dan peralatan sesuai kesepakatan.' },
  { num: '04', title: 'Hari H', desc: 'Acara dimulai. Kamu fokus menjalankan kegiatan, tim kami mendukung kebutuhan teknis.' },
];

export function CommunitySteps() {
  return (
    <RevealSection id="how" className="scroll-mt-28 border-b border-[var(--wf-rule)] bg-[var(--section-alt)] px-4 py-16  sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-bold leading-tight text-[var(--wf-ink)] sm:text-5xl">
            Cukup 4 langkah untuk mendaftar.
          </h2>
        </div>

        <ol className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.num} data-reveal-item className="ui-campaign-card relative p-6">
              <span className="ui-campaign-icon-gradient inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold tabular-nums">
                {s.num}
              </span>
              <h3 className="mt-4 text-lg font-bold text-[var(--wf-ink)]">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--wf-ink-muted)]">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </RevealSection>
  );
}
