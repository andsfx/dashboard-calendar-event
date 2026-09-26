import { useEffect, useRef, useState } from 'react';

/**
 * Reveal saat section masuk viewport. ScrollTrigger (chunk GSAP yang sama
 * dengan entrance hero) menggerakkan `.reveal-stage > *`; class
 * `reveal-visible` tetap dipasang supaya fallback CSS di motion.css dan
 * pemilih tes tidak berubah. `once` — tidak diulang saat scroll balik.
 */
export function useScrollReveal() {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = ref.current;
    if (!target) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    let cancelled = false;
    let kill: (() => void) | undefined;

    // Import dinamis: GSAP + ScrollTrigger hanya boleh ikut chunk halaman yang
    // memakai reveal, bukan bundle boot. Lihat manualChunks di vite.config.ts.
    void import('gsap')
      .then(async ({ default: gsap }) => {
        if (cancelled) return;
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        const items = target.querySelectorAll<HTMLElement>('.reveal-stage > *');
        const tweened = items.length > 0 ? items : [target];
        gsap.set(tweened, { animation: 'none', transition: 'none' });

        const tween = gsap.fromTo(
          tweened,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: 'power3.out',
            stagger: 0.06,
            overwrite: 'auto',
            immediateRender: false,
            scrollTrigger: {
              trigger: target,
              start: 'top 84%',
              once: true,
              onEnter: () => setIsVisible(true),
            },
          },
        );
        kill = () => tween.kill();
      })
      .catch(() => {
        if (!cancelled) setIsVisible(true);
      });

    return () => {
      cancelled = true;
      kill?.();
    };
  }, []);

  return { ref, isVisible };
}
