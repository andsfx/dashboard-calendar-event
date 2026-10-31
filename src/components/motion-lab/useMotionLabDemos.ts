import { useEffect, type RefObject } from 'react';

type LabRefs = {
  parallaxRef: RefObject<HTMLElement | null>;
  staggerRef: RefObject<HTMLElement | null>;
  railRef: RefObject<HTMLElement | null>;
};

/**
 * Tiga demo gerak GSAP untuk `/motion-lab`.
 *
 * Plugin dimuat lewat dynamic import dengan alasan yang sama seperti
 * `useScrollReveal`: chunk GSAP tidak boleh masuk bundle boot, dan halaman ini
 * satu-satunya pemakai `CustomEase`.
 *
 * `gsap.matchMedia` memegang dua kondisi sekaligus (`prefers-reduced-motion` dan
 * breakpoint desktop). Saat kondisinya berubah, matchMedia me-revert semua tween
 * dan pin hasil run sebelumnya, jadi tidak ada animasi yang menumpuk saat
 * viewport di-resize.
 */
export function useMotionLabDemos({ parallaxRef, staggerRef, railRef }: LabRefs) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let labMedia: { kill: () => void } | undefined;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { CustomEase }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/CustomEase'),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger, CustomEase);
      // Kurva JS disamakan dengan token CSS `--ease-out-expo`
      // (cubic-bezier(0.22, 1, 0.36, 1)) supaya gerak script dan transisi CSS
      // memakai bahasa yang sama.
      const outExpo = CustomEase.create('metmal-out-expo', '0.22,1,0.36,1');

      const mm = gsap.matchMedia();
      labMedia = mm;
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          isDesktop: '(min-width: 1024px)',
          // Wajib ada penutup: matchMedia hanya menjalankan handler bila minimal
          // satu kondisi cocok (gsap-core `active && func(...)`). Tanpa isMobile,
          // ponsel dan tablet tidak pernah menginisialisasi demo A dan B.
          isMobile: '(max-width: 1023.98px)',
        },
        (context) => {
          const conditions = context.conditions ?? {};
          if (conditions.reduceMotion) return;

          // ── A. Parallax ───────────────────────────────────────────────
          // Media dan kolom teks bergerak berlawanan arah saat section
          // melewati viewport. Tujuan: memberi kedalaman pada hero, bukan
          // dekorasi yang berjalan sendiri.
          const parallax = parallaxRef.current;
          if (parallax) {
            const media = parallax.querySelector<HTMLElement>('[data-parallax-media]');
            const copy = parallax.querySelector<HTMLElement>('[data-parallax-copy]');
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: parallax,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.6,
              },
            });
            if (media) timeline.fromTo(media, { yPercent: -8 }, { yPercent: 8, ease: 'none' }, 0);
            if (copy) timeline.fromTo(copy, { y: 56 }, { y: -56, ease: 'none' }, 0);
          }

          // ── B. Stagger per blok ──────────────────────────────────────
          // Tujuan: kartu masuk berurutan supaya mata mengikuti urutan baca,
          // bukan satu blok besar yang muncul sekaligus.
          const stagger = staggerRef.current;
          if (stagger) {
            const items = gsap.utils
              .toArray<HTMLElement>(stagger.querySelectorAll('[data-stagger-item]'))
              .filter((item) => item.dataset.revealed !== 'true');

            gsap.set(items, { autoAlpha: 0, y: 28 });
            ScrollTrigger.batch(items, {
              start: 'top 85%',
              once: true,
              onEnter: (batch) => {
                for (const item of batch) {
                  if (item instanceof HTMLElement) item.dataset.revealed = 'true';
                }
                gsap.to(batch, {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.6,
                  ease: outExpo,
                  stagger: 0.08,
                  overwrite: 'auto',
                });
              },
            });
          }

          // ── C. Rail pinned ───────────────────────────────────────────
          // Hanya desktop: di ponsel rail tetap scroll horizontal biasa, jadi
          // tidak ada animasi kontinu besar di layar kecil (DESIGN.md §Motion).
          const rail = railRef.current;
          if (rail && conditions.isDesktop) {
            const track = rail.querySelector<HTMLElement>('[data-rail-track]');
            if (track) {
              // scrollWidth sudah termasuk padding track, jadi jarak tempuh
              // adalah overflow sesungguhnya. clientWidth dipakai, bukan
              // innerWidth, supaya scrollbar tidak ikut dihitung.
              const distance = () =>
                Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
              gsap.to(track, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                  trigger: rail,
                  start: 'top top',
                  end: () => `+=${distance()}`,
                  pin: true,
                  scrub: 1,
                  anticipatePin: 1,
                  invalidateOnRefresh: true,
                },
              });
            }
          }
        },
      );

    })().catch(() => {
      // Chunk GSAP gagal dimuat: ketiga demo tetap terbaca sebagai konten statis.
    });

    return () => {
      cancelled = true;
      labMedia?.kill();
    };
  }, [parallaxRef, staggerRef, railRef]);
}
