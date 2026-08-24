import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number from 0 to `target` over ~900ms with an ease-out curve.
 * Renders the target value on initial mount and re-animates on reveal.
 * Respects prefers-reduced-motion and environments without requestAnimationFrame.
 */
export function useCountUp(target: number, start: boolean) {
  const [value, setValue] = useState(target);
  const reduceMotion = useRef(false);
  const hasRAF = useRef(typeof requestAnimationFrame !== 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (!start) return;
    if (reduceMotion.current || !hasRAF.current) {
      setValue(target);
      return;
    }

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