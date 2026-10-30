import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number from 0 to `target` over ~900ms with an ease-out curve.
 * Renders the target value on initial mount and re-animates on reveal.
 * Respects prefers-reduced-motion and environments without requestAnimationFrame.
 *
 * Animasi hanya sekali per mount. Setelah itu nilai mengikuti `target` apa
 * adanya: polling statistik tiap 30s tidak boleh memutar ulang hitungan dari 0.
 */
export function useCountUp(target: number, start: boolean) {
  const [value, setValue] = useState(target);
  const reduceMotion = useRef(false);
  const hasRAF = useRef(typeof requestAnimationFrame !== 'undefined');
  const animated = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    // Belum di-reveal: tampilkan angka terbaru, karena data bisa tiba setelah mount.
    if (!start) {
      setValue(target);
      return;
    }
    if (animated.current || reduceMotion.current || !hasRAF.current) {
      animated.current = true;
      setValue(target);
      return;
    }
    animated.current = true;

    const duration = 900;
    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target]);

  return value;
}
