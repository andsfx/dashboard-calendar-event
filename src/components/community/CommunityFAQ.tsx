import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const FAQS: Array<[string, string]> = [
  ['Beneran gratis? Nggak ada biaya tersembunyi?', 'Beneran 100% gratis! Panggung, sound system, lighting, kursi — semua disediakan tanpa biaya. Yang perlu kamu siapin cuma konsep acara dan semangat komunitas kamu.'],
  ['Komunitas apa aja yang bisa daftar?', 'Semua jenis komunitas welcome! Musik, dance, seni, gaming, olahraga, pendidikan, dan lainnya. Selama punya konsep acara yang jelas dan positif, kita open.'],
  ['Berapa lama proses review-nya?', 'Biasanya 3-5 hari kerja setelah form diterima. Tim kami akan hubungi PIC untuk diskusi lebih lanjut soal jadwal dan kebutuhan.'],
  ['Bisa request tanggal tertentu?', 'Bisa! Tulis preferensi tanggal di form. Tim kami akan cek ketersediaan dan konfirmasi secepatnya.'],
  ['Apakah bisa kolaborasi dengan komunitas lain?', 'Absolutely! Justru itu salah satu value yang kami tawarkan. Kami bisa bantu connect kamu dengan komunitas lain yang udah bergabung.'],
  ['Apa syarat untuk mendaftar?', 'Kirimkan company profile atau portofolio komunitas beserta proposal event ke email kami. Nggak perlu ribet — yang penting jelas konsep dan tujuannya.'],
];

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

function RevealSection({
  children,
  className = '',
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref as never}
      className={`reveal-on-scroll ${isVisible ? 'reveal-visible' : ''} ${className}`}
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

export function CommunityFAQ() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <RevealSection id="faq" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          {eyebrow('FAQ')}
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Pertanyaan yang sering muncul.
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map(([question, answer], index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={question}
                className="overflow-hidden rounded-[1.8rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
              >
                <button
                  type="button"
                  id={`community-faq-trigger-${index}`}
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6 ${focusRing}`}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `community-faq-${index}` : undefined}
                >
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">{question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 transition text-violet-500 dark:text-violet-400 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div id={`community-faq-${index}`} role="region" aria-labelledby={`community-faq-trigger-${index}`} className="border-t border-slate-200/50 px-5 py-5 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:text-slate-400 sm:px-6">
                    {answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
