import { useLayoutEffect, type RefObject } from 'react';

/**
 * Entrance berurutan untuk hero komunitas (rute `/`, CommunityLandingPage).
 * GSAP dimuat lewat dynamic import supaya tidak masuk bundle boot. Keyframe
 * `.community-hero-in` di motion.css tetap jadi fallback kalau chunk gagal dimuat.
 */
export function useCommunityHeroMotion(rootRef: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = [...root.querySelectorAll<HTMLElement>('.community-hero-in')];
    if (targets.length === 0) return;

    const reduceNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceNow) {
      for (const el of targets) {
        el.style.animation = 'none';
        el.style.opacity = '0';
      }
    }

    let cancelled = false;
    let revert: (() => void) | undefined;

    const revealFallback = () => {
      for (const el of targets) {
        el.style.animation = '';
        el.style.opacity = '';
      }
    };
    void import('gsap')
      .then(({ default: gsap }) => {
        if (cancelled) return;
        const mm = gsap.matchMedia();
        mm.add(
          {
            reduceMotion: '(prefers-reduced-motion: reduce)',
            okMotion: '(prefers-reduced-motion: no-preference)',
          },
          (context) => {
            const reduce = Boolean(context.conditions?.reduceMotion);
            gsap.set(targets, { animation: 'none' });
            gsap.fromTo(
              targets,
              { autoAlpha: 0, y: reduce ? 0 : 16 },
              {
                autoAlpha: 1,
                y: 0,
                duration: reduce ? 0 : 0.6,
                ease: 'power3.out',
                stagger: reduce ? 0 : 0.08,
                clearProps: 'opacity,visibility,transform',
              },
            );
          },
        );
        revert = () => mm.revert();
      })
      .catch(revealFallback);

    return () => {
      cancelled = true;
      if (revert) revert();
      else revealFallback();
    };
  }, [rootRef]);
}
