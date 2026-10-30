import { useEffect, useRef, useState } from 'react';

/**
 * Reveal saat section masuk viewport.
 *
 * Satu sistem gerak: motion.css memegang jarak, durasi, dan easing (lewat token
 * `--ease-out-expo`), class `reveal-visible` yang memicunya. ScrollTrigger hanya
 * mendeteksi bahwa section sudah masuk viewport, bukan menggerakkan apa pun,
 * supaya tidak ada dua animasi yang menumpuk pada simpul yang sama.
 *
 * `once`: tidak diulang saat scroll balik. `refreshKey`: pemanggil yang
 * kontennya datang belakangan (skeleton diganti data) mengirim nilai yang
 * berubah saat data tiba; posisi trigger dihitung ulang saat itu juga, karena
 * refresh bawaan GSAP hanya jalan pada load, resize, dan visibilitychange.
 */
export function useScrollReveal(refreshKey?: unknown) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const lastRefreshKey = useRef(refreshKey);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = ref.current;
    if (!target) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    let cancelled = false;
    let kill: (() => void) | undefined;

    // Import dinamis: ScrollTrigger hanya ikut chunk halaman yang memakai
    // reveal, bukan bundle boot. Statis tidak bisa dipakai di sini tanpa ikut
    // menarik plugin ke entry. Lihat manualChunks di vite.config.ts.
    void import('gsap')
      .then(async ({ default: gsap }) => {
        if (cancelled) return;
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        const trigger = ScrollTrigger.create({
          trigger: target,
          start: 'top 84%',
          once: true,
          onEnter: () => setIsVisible(true),
        });
        kill = () => trigger.kill();
      })
      .catch(() => {
        // Chunk gagal dimuat: tampilkan seksi tanpa menunggu trigger.
        if (!cancelled) setIsVisible(true);
      });

    return () => {
      cancelled = true;
      kill?.();
    };
  }, []);

  // Refresh posisi trigger setelah tinggi section berubah (skeleton ke data).
  // Gagal memuat ScrollTrigger di sini tidak fatal: trigger yang sudah ada
  // tetap bekerja dengan posisi lama.
  useEffect(() => {
    if (refreshKey === lastRefreshKey.current) return;
    lastRefreshKey.current = refreshKey;
    let cancelled = false;
    // Import dinamis dengan alasan yang sama: chunk GSAP tidak boleh masuk boot.
    void import('gsap/ScrollTrigger')
      .then(({ ScrollTrigger }) => {
        if (!cancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { ref, isVisible };
}
