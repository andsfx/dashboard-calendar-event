import type { gsap as GsapValue } from 'gsap';
import type { ScrollTrigger as ScrollTriggerClass } from 'gsap/ScrollTrigger';

export interface GsapMotion {
  gsap: typeof GsapValue;
  /** Konstruktor, bukan instance: pemakai butuh `ScrollTrigger.create`/`refresh`. */
  ScrollTrigger: typeof ScrollTriggerClass;
  /** Easing JS dengan kurva yang sama seperti token CSS `--ease-out-expo`. */
  outExpo: (progress: number) => number;
}

let motionPromise: Promise<GsapMotion> | undefined;
let motionLoaded = false;
let refreshFrame = 0;

async function createMotion(): Promise<GsapMotion> {
  const [core, scrollTrigger, customEase] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('gsap/CustomEase'),
  ]);
  const gsap = core.default;
  gsap.registerPlugin(scrollTrigger.ScrollTrigger, customEase.CustomEase);
  motionLoaded = true;
  return {
    gsap,
    ScrollTrigger: scrollTrigger.ScrollTrigger,
    // cubic-bezier(0.22, 1, 0.36, 1) di CustomEase memakai empat angka yang
    // sama dengan token, jadi kurva JS identik dengan kurva CSS.
    outExpo: customEase.CustomEase.create('metmal-out-expo', '0.22,1,0.36,1'),
  };
}

/**
 * Satu pintu masuk GSAP untuk permukaan publik: satu dynamic import, satu
 * registrasi plugin, satu CustomEase. Semua pemakai berbagi promise yang sama,
 * jadi tidak ada registrasi berulang per section.
 *
 * Import dinamis tetap dipakai dengan alasan yang sama seperti sebelumnya: chunk
 * GSAP tidak boleh masuk bundle boot (lihat `manualChunks` di vite.config.ts).
 */
export function loadGsapMotion(): Promise<GsapMotion> {
  motionPromise ??= createMotion();
  return motionPromise;
}

/** True setelah modul GSAP benar-benar termuat. Dipakai jalur fail-open. */
export function isGsapMotionLoaded(): boolean {
  return motionLoaded;
}

/**
 * Refresh posisi trigger, digabung satu kali per frame. Beberapa section yang
 * selesai memuat data di tick yang sama tidak perlu me-reflow halaman berkali-kali.
 */
export function scheduleScrollRefresh(): void {
  if (refreshFrame || typeof window === 'undefined') return;
  refreshFrame = window.requestAnimationFrame(() => {
    refreshFrame = 0;
    void loadGsapMotion()
      .then(({ ScrollTrigger }) => ScrollTrigger.refresh())
      .catch(() => {});
  });
}
