import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CommunityEyebrow, RevealSection } from './CommunityRevealPrimitives';

const FAQS: Array<[string, string]> = [
  ['Benar gratis? Ada biaya tersembunyi?', 'Benar 100% gratis. Panggung, sound system, lighting, dan kursi disediakan tanpa biaya. Kamu cukup siapkan konsep acara dan kebutuhan komunitas.'],
  ['Komunitas apa saja yang bisa daftar?', 'Musik, dance, seni, gaming, olahraga, pendidikan, dan komunitas lain bisa mendaftar selama konsep acaranya jelas dan positif.'],
  ['Berapa lama proses review?', 'Biasanya 3-5 hari kerja setelah form diterima. Tim kami akan menghubungi PIC untuk diskusi jadwal dan kebutuhan.'],
  ['Bisa request tanggal tertentu?', 'Bisa. Tulis preferensi tanggal di form. Tim kami akan cek ketersediaan dan konfirmasi secepatnya.'],
  ['Apakah bisa kolaborasi dengan komunitas lain?', 'Bisa. Kami dapat membantu menghubungkan kamu dengan komunitas lain yang sudah bergabung.'],
  ['Apa syarat untuk mendaftar?', 'Kirimkan profil atau portofolio komunitas beserta proposal event. Yang penting, konsep dan tujuan acaranya jelas.'],
];

const focusRing = 'ui-focus-ring';

export function CommunityFAQ() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <RevealSection id="faq" className="border-y border-black/5 bg-[#f4efe8] px-4 py-16 dark:bg-slate-900 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <CommunityEyebrow>FAQ</CommunityEyebrow>
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
                className="ui-campaign-card overflow-hidden"
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
