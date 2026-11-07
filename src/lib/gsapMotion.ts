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
 * Tunda pemuatan GSAP sampai setelah LCP.
 *
 * Regresi 2026-11-07 (terukur di produksi): hook landing memanggil
 * `loadGsapMotion()` di effect mount, jadi ketiga chunk GSAP (~51 kB br) mulai
 * diunduh bersamaan dengan decode gambar hero. Long task 423 ms jatuh tepat di
 * 2.245 ms — saat hero image selesai — dan LCP tertahan di 4,2 dtk.
 *
 * `requestIdleCallback` menunggu frame idle pertama setelah load; `timeout`
 * menjamin GSAP tidak pernah tertahan lebih lama dari `GSAP_IDLE_TIMEOUT_MS`
 * (browser tanpa requestIdleCallback memakai fallback setTimeout).
 *
 * Keselamatan konten: pre-state CSS hero/section di `motion.css` hanya dilepas
 * oleh tween GSAP, dan jalur fail-open-nya berjalan pada `FALLBACK_DELAY`
 * (2.500 ms) di tiap pemakai. Penundaan ini sengaja di bawah itu supaya
 * animasi tidak pernah "kalah balapan" hanya karena penjadwalan.
 */
const GSAP_IDLE_TIMEOUT_MS = 1200;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

function afterLcp(start: () => void): void {
  if (typeof window === 'undefined') {
    start();
    return;
  }
  const idle = (window as IdleWindow).requestIdleCallback;
  if (typeof idle === 'function') {
    idle(start, { timeout: GSAP_IDLE_TIMEOUT_MS });
    return;
  }
  window.setTimeout(start, 200);
}

/**
 * Satu pintu masuk GSAP untuk permukaan publik: satu dynamic import, satu
 * registrasi plugin, satu CustomEase. Semua pemakai berbagi promise yang sama,
 * jadi tidak ada registrasi berulang per section.
 *
 * Import dinamis tetap dipakai dengan alasan yang sama seperti sebelumnya: chunk
 * GSAP tidak boleh masuk bundle boot (lihat `manualChunks` di vite.config.ts).
 *
 * Pemuatan ditunda ke frame idle (lihat `afterLcp`) agar tidak berebut CPU
 * dengan render/LCP. Pemanggil yang butuh GSAP untuk klik pengguna (akordeon
 * FAQ, toast) tetap mendapatkannya — hanya mundur beberapa ratus milidetik.
 */
export function loadGsapMotion(): Promise<GsapMotion> {
  motionPromise ??= ((): Promise<GsapMotion> => {
    // Konsisten dengan `Promise.withResolvers` yang sudah dipakai di
    // useConfirmDialog.tsx (browser modern; tidak ada polyfill tambahan).
    const { promise, resolve, reject } = Promise.withResolvers<GsapMotion>();
    afterLcp(() => {
      createMotion().then(resolve, reject);
    });
    return promise;
  })();
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
