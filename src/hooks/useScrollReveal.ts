import { useEffect, useRef, useState } from 'react';
import { createIntersectionObserver } from '../utils/intersectionObserver';

export function useScrollReveal() {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const target = ref.current;
    if (!target) return;

    const observer = createIntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer?.unobserve(entry.target);
          }
        });
      },
      {
        // threshold 0 fires on any intersection. A higher threshold (e.g. 0.24)
        // can never be met when the target is taller than ~4x the viewport —
        // which happens on mobile stacked layouts (e.g. the community events
        // section), leaving the section stuck at opacity 0.
        threshold: 0,
        rootMargin: '0px 0px -16% 0px',
      }
    );

    // No IntersectionObserver (very old browsers): never leave content hidden.
    if (!observer) {
      setIsVisible(true);
      return;
    }

    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
