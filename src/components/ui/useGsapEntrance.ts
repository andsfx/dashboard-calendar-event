import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { gsap as GsapValue } from 'gsap';
import { isGsapMotionLoaded, loadGsapMotion } from '../../lib/gsapMotion';

/** Batas tunggu chunk GSAP sebelum jalur fail-open dipakai. */
const FALLBACK_DELAY = 2500;

export interface GsapMotionContext {
  gsap: typeof GsapValue;
  /** Easing JS `metmal-out-expo`, sama dengan token CSS `--ease-out-expo`. */
  outExpo: (progress: number) => number;
}

export interface GsapEntranceOptions {
  /** Bangun tween/timeline; kembalikan objek ber-`kill` untuk dibersihkan saat unmount. */
  build: (motion: GsapMotionContext, target: HTMLElement) => { kill: () => void } | void;
  /** Kelas end-state yang dipasang saat reduced-motion / chunk gagal / menggantung. */
  staticClass: string;
  /** Nilai berubah → entrance diulang (dashboard: `pathname`, views: `viewMode`, nav: `open`). */
  refreshKey?: unknown;
}

/**
 * Entrance satu-shot milik GSAP untuk permukaan interface (bukan scroll-reveal).
 *
 * CSS hanya memegang pre-state (sembunyi) dan end-state (`staticClass`); tidak
 * ada `transition`/`@keyframes` yang berjalan paralel dengan tween ini. Pola
 * sama dengan `useHeroParallax`: reduced motion / chunk gagal / chunk menggantung
 * semua berakhir di end state lewat `staticClass`, dan tween yang datang terlambat
 * tidak pernah menyalakan ulang simpul yang sudah terbaca.
 *
 * Simpul boleh belum terpasang saat effect pertama jalan — `DashboardShell`
 * baru merender `<main>` setelah `/auth/me` selesai. Hook menunggu `ref` terisi
 * (maksimal `FALLBACK_DELAY`) sebelum memutuskan; sebelumnya ia menyerah diam-diam
 * sehingga pre-state CSS `opacity: 0` tertinggal permanen dan halaman tampak
 * kosong (2026-11-11, `/tenant-survey-results`).
 */
export function useGsapEntrance(
  ref: RefObject<HTMLElement | null>,
  options: GsapEntranceOptions,
): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { staticClass, build } = optionsRef.current;

    let cancelled = false;
    /** Diisi sinkron oleh jalur fail-open; dicek oleh `.then` yang datang terlambat. */
    let released = false;
    let animation: { kill: () => void } | undefined;
    let fallbackTimer = 0;

    const release = (target: HTMLElement) => {
      released = true;
      target.classList.add(staticClass);
    };

    const run = (target: HTMLElement) => {
      // Reduced motion: end-state straight, no tween.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target.classList.add(staticClass);
        return;
      }

      // Fail-open: chunk menggantung (bukan rejection) → lepas pre-state.
      fallbackTimer = window.setTimeout(() => {
        if (cancelled || isGsapMotionLoaded()) return;
        release(target);
      }, FALLBACK_DELAY);

      void loadGsapMotion()
        .then((motion) => {
          if (cancelled || released) return;
          window.clearTimeout(fallbackTimer);
          try {
            animation =
              build({ gsap: motion.gsap, outExpo: motion.outExpo }, target) ?? undefined;
          } catch {
            // Tween gagal dibuat (node terlepas saat chunk tiba): konten harus tetap terbaca.
            release(target);
          }
        })
        .catch(() => {
          if (cancelled) return;
          window.clearTimeout(fallbackTimer);
          release(target);
        });
    };

    const deadline = performance.now() + FALLBACK_DELAY;
    let raf = 0;
    const waitForTarget = () => {
      const target = ref.current;
      if (target) {
        run(target);
        return;
      }
      // Simpul tidak pernah muncul (mis. route berpindah sebelum siap): tidak ada
      // pre-state yang perlu dilepas, jadi berhenti tanpa memasang end-state.
      if (cancelled || performance.now() >= deadline) return;
      raf = window.requestAnimationFrame(waitForTarget);
    };
    waitForTarget();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(fallbackTimer);
      animation?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.refreshKey]);
}
