import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../shadcn/button';
import { RevealSection } from './CommunityRevealPrimitives';
import { isGsapMotionLoaded, loadGsapMotion } from '../../lib/gsapMotion';

const FAQS: Array<[string, string]> = [
  ['Benar gratis? Ada biaya tersembunyi?', 'Venue, sound system, lighting, dan kursi disediakan tanpa biaya sewa. Syaratnya lolos review tim, konsep cocok, dan Jadwal Event tersedia.'],
  ['Siapa saja yang bisa mendaftar?', 'Komunitas, sekolah, kampus, perusahaan, EO, NGO, dan instansi bisa mendaftar. Konsep acara wajib jelas dan sesuai ketentuan Metropolitan Mall Bekasi.'],
  ['Berapa lama proses review?', 'Tim kami meninjau pengajuan dan menghubungi PIC dalam 5 hari kerja.'],
  ['Bisa pilih tanggal tertentu?', 'Bisa. Tulis preferensi tanggal di formulir. Tim kami mengecek ketersediaan Jadwal Event dan memberi kabar dalam 5 hari kerja.'],
  ['Apakah bisa berkolaborasi dengan penyelenggara lain?', 'Bisa. Kami membantu menghubungkan kamu dengan komunitas atau penyelenggara lain yang sudah bergabung.'],
  ['Apa syarat untuk mendaftar?', 'Siapkan konsep serta tujuan acara yang jelas. Kamu bisa melampirkan profil organisasi atau Proposal Event di formulir (opsional).'],
];

const focusRing = 'ui-focus-ring';

/** Durasi buka/tutup akordeon (GSAP; CSS `.faq-panel` hanya pre-state + end-state). */
const FAQ_DURATION_MS = 300;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function FaqItem({
  question,
  answer,
  index,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const prevOpen = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Mount pertama: keadaan terbuka awal tidak dianimasikan (end state CSS langsung).
    if (prevOpen.current === null) {
      prevOpen.current = isOpen;
      return;
    }
    if (prevOpen.current === isOpen) return;
    prevOpen.current = isOpen;

    // Reduced motion / chunk belum termuat: class `.faq-panel-open` sudah memberi
    // end state; tanpa tween.
    if (prefersReducedMotion() || !isGsapMotionLoaded()) return;

    let cancelled = false;
    let tween: { kill: () => void } | undefined;

    void loadGsapMotion()
      .then(({ gsap, outExpo }) => {
        if (cancelled || !panel.isConnected) return;
        const content = panel.firstElementChild as HTMLElement | null;
        if (!content) return;

        // Guard tinggi nol (jsdom / konten belum ter-layout): tanpa nilai ukur,
        // tween height akan macet di 0 dan panel tertahan tertutup. Lewati tween
        // dan serahkan end state ke class `.faq-panel-open`/tertutup.
        if (content.scrollHeight === 0) return;

        if (isOpen) {
          const openHeight = content.scrollHeight;
          panel.style.visibility = 'visible';
          tween = gsap.fromTo(
            panel,
            { height: 0, opacity: 0 },
            {
              height: openHeight,
              opacity: 1,
              duration: FAQ_DURATION_MS / 1000,
              ease: outExpo,
              immediateRender: true,
              onComplete: () => {
                panel.style.height = 'auto';
              },
            },
          );
        } else {
          // Panel sudah dibalik ke `height:0` oleh class tertutup; ukur isi
          // (scrollHeight) sebagai titik awal, bukan offsetHeight panel.
          const closedHeight = content.scrollHeight;
          tween = gsap.fromTo(
            panel,
            { height: closedHeight, opacity: 1 },
            {
              height: 0,
              opacity: 0,
              duration: FAQ_DURATION_MS / 1000,
              ease: outExpo,
              immediateRender: true,
              onComplete: () => {
                panel.style.visibility = 'hidden';
              },
            },
          );
        }
      })
      .catch(() => {
        // Chunk gagal: class end-state CSS tetap berlaku.
      });

    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [isOpen]);

  return (
    <div className="ui-campaign-card overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        id={`community-faq-trigger-${index}`}
        onClick={onToggle}
        className={`flex h-auto w-full items-center justify-between gap-4 whitespace-normal rounded-none border-0 px-5 py-5 text-left font-normal hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent active:translate-y-0 sm:px-6 ${focusRing} focus-visible:ring-0`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? `community-faq-${index}` : undefined}
      >
        <span className="text-lg font-semibold text-[var(--wf-ink)]">{question}</span>
        <ChevronDown
          className={`h-5 w-5 size-5 shrink-0 text-[var(--brand-tosca)] transition motion-reduce:transition-none dark:text-[var(--brand-tosca-soft)] ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </Button>
      <div
        id={`community-faq-${index}`}
        ref={panelRef}
        role="region"
        aria-labelledby={`community-faq-trigger-${index}`}
        className={`faq-panel ${isOpen ? 'faq-panel-open' : ''}`}
      >
        <div className="border-t border-[var(--wf-rule)] px-5 py-5 text-sm leading-7 text-[var(--wf-ink-muted)] sm:px-6">
          {answer}
        </div>
      </div>
    </div>
  );
}

export function CommunityFAQ() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <RevealSection id="faq" className="scroll-mt-28 border-t border-[var(--wf-rule)] px-4 py-16  sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <h2 className="text-balance text-4xl font-bold leading-tight text-[var(--wf-ink)] sm:text-5xl">
            Masih ragu? Ini jawabannya.
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map(([question, answer], index) => {
            const isOpen = openFaq === index;
            return (
              <FaqItem
                key={question}
                question={question}
                answer={answer}
                index={index}
                isOpen={isOpen}
                onToggle={() => setOpenFaq(isOpen ? -1 : index)}
              />
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
