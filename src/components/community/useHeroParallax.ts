import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { isGsapMotionLoaded, loadGsapMotion } from '../../lib/gsapMotion';

/** Jarak pre-state `.community-hero-in`, sama dengan `motion.css`. */
const HERO_DISTANCE = 12;
const HERO_DURATION = 0.5;
const HERO_STAGGER = 0.06;
/** Batas tunggu chunk GSAP sebelum pre-state hero dilepas. */
const FALLBACK_DELAY = 2500;

/**
 * Gerak hero: entrance kolom teks + parallax scroll. Keduanya GSAP.
 *
 * Entrance dulu: kolom `[data-hero-copy]` dan seluruh `.community-hero-in` di
 * dalam hero (badge, h1, subteks, CTA, papan data) masuk dengan `opacity` + `y`
 * dan stagger kecil. CSS hanya memegang pre-state-nya, jadi tidak ada
 * `@keyframes` yang berjalan paralel.
 *
 * Lalu parallax: gambar bergeser pelan, kolom teks naik lebih cepat, keduanya
 * diikat ke scroll (scrub), bukan ke waktu. Timeline parallax dibuat **sebelum**
 * timeline entrance supaya nilai `y: 0` milik parallax (progress 0) ditulis
 * lebih dulu dan entrance yang terakhir menulis nilai awalnya.
 *
 * `okMotion` sengaja dipakai sebagai kondisi positif. `gsap.matchMedia()` hanya
 * menjalankan handler untuk kondisi yang cocok, dan `reduceMotion` di-return
 * lebih dulu sebagai jaring pengaman kalau kedua query sempat cocok.
 *
 * Keterbacaan: teks hero adalah konten pertama yang dibaca pengunjung, jadi
 * setiap jalur tanpa gerak melepas pre-state lewat `hero-static` (opacity 1,
 * transform none) — reduced motion langsung, chunk gagal saat rejection, chunk
 * menggantung setelah 2,5 detik. Tidak ada keadaan di mana hero bisa tertahan
 * tak terlihat.
 */
export function useHeroParallax(rootRef: RefObject<HTMLElement | null>): { isStatic: boolean } {
  /** Pre-state sudah dilepas: hero tampil apa adanya, tanpa entrance. */
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsStatic(true);
      return;
    }

    let cancelled = false;
    /** Diisi sinkron oleh jalur fail-open; dicek oleh `.then` yang datang terlambat. */
    let released = false;
    let media: { kill: () => void } | undefined;
    let entrance: { kill: () => void } | undefined;

    const release = () => {
      released = true;
      setIsStatic(true);
    };

    const timer = window.setTimeout(() => {
      if (cancelled || isGsapMotionLoaded()) return;
      release();
    }, FALLBACK_DELAY);

    void loadGsapMotion()
      .then(({ gsap, outExpo }) => {
        // Pre-state sudah dilepas (reduced motion / timeout): jangan animasikan
        // apa pun, karena tween akan menyembunyikan konten yang sudah terbaca.
        if (cancelled || released) return;
        window.clearTimeout(timer);

        const image = root.querySelector<HTMLElement>('[data-hero-media]');
        const copy = root.querySelector<HTMLElement>('[data-hero-copy]');
        const entranceNodes = Array.from(root.querySelectorAll<HTMLElement>('.community-hero-in'));
        // Tanpa keduanya tidak ada yang perlu digerakkan; konten sudah tampil
        // karena hanya simpul di dalam `entranceNodes` yang di-pre-hide CSS.
        if (!image && !copy && entranceNodes.length === 0) return;

        if (image || copy) {
          const mm = gsap.matchMedia();
          media = mm;
          mm.add(
            {
              reduceMotion: '(prefers-reduced-motion: reduce)',
              okMotion: '(prefers-reduced-motion: no-preference)',
            },
            (context) => {
              if (context.conditions?.reduceMotion) return;

              const timeline = gsap.timeline({
                scrollTrigger: {
                  trigger: root,
                  start: 'top top',
                  end: 'bottom top',
                  scrub: 0.5,
                },
              });

              if (image) {
                timeline.fromTo(image, { yPercent: -6 }, { yPercent: 6, ease: 'none' }, 0);
              }
              if (copy) {
                timeline.fromTo(copy, { y: 0 }, { y: -56, ease: 'none' }, 0);
              }
            },
          );
        }

        if (copy || entranceNodes.length > 0) {
          const timeline = gsap.timeline();
          if (copy) {
            timeline.fromTo(
              copy,
              { opacity: 0, y: HERO_DISTANCE },
              { opacity: 1, y: 0, duration: HERO_DURATION, ease: outExpo, immediateRender: true },
              0,
            );
          }
          if (entranceNodes.length > 0) {
            timeline.fromTo(
              entranceNodes,
              { opacity: 0, y: HERO_DISTANCE },
              {
                opacity: 1,
                y: 0,
                duration: HERO_DURATION,
                ease: outExpo,
                stagger: HERO_STAGGER,
                immediateRender: true,
              },
              0.04,
            );
          }
          entrance = timeline;
        }
      })
      .catch(() => {
        // Chunk gagal: hero tetap tampil statis, pre-state dilepas.
        if (cancelled) return;
        window.clearTimeout(timer);
        release();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      entrance?.kill();
      media?.kill();
    };
  }, [rootRef]);

  return { isStatic };
}
