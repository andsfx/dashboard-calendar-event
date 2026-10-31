import { useCallback, useEffect, useRef, useState } from 'react';
import { isGsapMotionLoaded, loadGsapMotion, scheduleScrollRefresh } from '../lib/gsapMotion';
import type { GsapMotion } from '../lib/gsapMotion';

/** Jarak pre-state; sama dengan `--reveal-distance` di `motion.css`. */
const REVEAL_DISTANCE = 16;
/** Satu durasi untuk stage dan anak-anaknya, supaya seluruh section terbaca satu gerak. */
const REVEAL_DURATION = 0.5;
/** Jeda antar anak. Cukup untuk terbaca berurutan, tidak sampai terasa lambat. */
const REVEAL_STAGGER = 0.06;
/** Anak mulai sedikit setelah stage: "stage dulu, lalu isinya". */
const CHILD_OFFSET = 0.08;
/** Batas tunggu chunk GSAP sebelum jalur fail-open dipakai. */
const FALLBACK_DELAY = 2500;

/**
 * Anak yang di-tween GSAP. Urutannya cermin dari pre-state di `motion.css`:
 * kalau stage punya item bertanda `[data-reveal-item]`, hanya item itu yang
 * disembunyikan CSS (dan hanya itu yang di-tween); kalau tidak ada, semua anak
 * langsung stage yang di-tween. Dua mode ini saling eksklusif, jadi tidak ada
 * simpul yang disembunyikan satu aturan tetapi di-tween aturan lain.
 */
function animatedChildren(stage: HTMLElement): HTMLElement[] {
  const tagged = Array.from(stage.querySelectorAll<HTMLElement>('[data-reveal-item]'));
  if (tagged.length > 0) return tagged;
  return Array.from(stage.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
}

/**
 * Reveal saat section masuk viewport. GSAP adalah satu-satunya penggerak:
 * `motion.css` hanya menyimpan pre-state dan end state jalur gagal.
 *
 * Satu timeline per penyalaan: stage (`opacity` + `y`) lalu anak-anaknya dengan
 * stagger seragam, easing `metmal-out-expo`. `reveal-visible` tetap dipasang
 * sebagai penanda bahwa trigger sudah menyala, tetapi CSS tidak lagi
 * menganimasikannya; end state CSS hanya dipakai jalur fail-open lewat
 * `reveal-fallback`. `immediateRender` menulis nilai awal secara sinkron saat
 * tween dibuat, sehingga penambahan class sesudahnya tidak sempat menampilkan
 * simpul di end state (efeknya: kedip satu frame sebelum tween mengambil alih).
 *
 * Keterbacaan lebih dulu dari animasi. Chunk GSAP dimuat dinamis (tidak ikut
 * bundle boot), jadi ada tiga jalur yang berakhir di end state tanpa tween:
 * reduced motion, chunk gagal, dan chunk yang menggantung. Jalur terakhir butuh
 * timer sendiri: `.catch` hanya menangkap rejection, sedangkan request yang
 * tidak pernah selesai membuat semua section bertahan di `opacity: 0` (pre-state
 * CSS) tanpa ada yang membukanya. Semua jalur itu menyalakan `settled`, sehingga
 * tween yang datang terlambat tidak pernah menyalakan ulang gerak di halaman
 * yang sudah tampil apa adanya.
 *
 * `once`: tidak diulang saat scroll balik. `refreshKey`: pemanggil yang
 * kontennya datang belakangan (skeleton diganti data) mengirim nilai yang
 * berubah saat data tiba. Selain menghitung ulang posisi trigger, perubahan itu
 * juga memutar tween untuk simpul yang mount setelah trigger menyala; kalau
 * tidak, konten yang datang terlambat (mis. berita dari fetch) akan permanen di
 * `opacity: 0` karena trigger `once` sudah habis.
 *
 * Hook ini juga dipakai tanpa `.reveal-stage` (mis. `AnimatedStatBadge` hanya
 * butuh `isVisible` untuk memulai count-up). Dalam mode itu tidak ada simpul
 * yang di-tween dan tidak ada yang disembunyikan.
 */
export function useScrollReveal(refreshKey?: unknown) {
  const ref = useRef<HTMLElement | null>(null);
  const motionRef = useRef<GsapMotion | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const lastRefreshKey = useRef(refreshKey);
  /** Penanda "satu tween per simpul", diisi sinkron saat tween dibuat. */
  const tweenedChildren = useRef<WeakSet<HTMLElement>>(new WeakSet());
  const tweenedStages = useRef<WeakSet<HTMLElement>>(new WeakSet());
  /** End state sudah final (reduced motion / chunk gagal / menggantung): jangan pernah tween lagi. */
  const settled = useRef(false);

  /**
   * Tween semua simpul yang belum pernah disentuh GSAP.
   *
   * Penanda `tweenedChildren` diisi sinkron saat tween dibuat, bukan dengan
   * membaca inline `opacity`: dua panggilan dalam frame yang sama (mis. effect
   * `refreshKey` dan `MutationObserver` saat data berita tiba) sama-sama melihat
   * `opacity === ''` dan membuat tween kedua pada simpul yang sama kalau
   * penandanya bergantung pada timing GSAP.
   */
  const revealItems = useCallback(() => {
    const target = ref.current;
    const motion = motionRef.current;
    if (!target || !motion || settled.current) return;

    // Stage milik section ini saja; `RevealSection` selalu merendernya sebagai
    // anak langsung, jadi section bersarang tidak saling menyerobot.
    const stage = target.querySelector<HTMLElement>(':scope > .reveal-stage');
    if (!stage) return;

    const pending = animatedChildren(stage).filter((node) => !tweenedChildren.current.has(node));
    const needsStage = !tweenedStages.current.has(stage);
    if (!needsStage && pending.length === 0) return;

    // Tandai sebelum `fromTo`: panggilan kedua di frame yang sama harus melihat
    // simpul ini sudah dimiliki tween.
    if (needsStage) tweenedStages.current.add(stage);
    pending.forEach((node) => tweenedChildren.current.add(node));

    const timeline = motion.gsap.timeline();
    if (needsStage) {
      timeline.fromTo(
        stage,
        { opacity: 0, y: REVEAL_DISTANCE },
        { opacity: 1, y: 0, duration: REVEAL_DURATION, ease: motion.outExpo, immediateRender: true },
        0,
      );
    }
    if (pending.length > 0) {
      timeline.fromTo(
        pending,
        { opacity: 0, y: REVEAL_DISTANCE },
        {
          opacity: 1,
          y: 0,
          duration: REVEAL_DURATION,
          ease: motion.outExpo,
          stagger: REVEAL_STAGGER,
          immediateRender: true,
        },
        CHILD_OFFSET,
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = ref.current;
    if (!target) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settled.current = true;
      setIsVisible(true);
      setIsFallback(true);
      return;
    }

    let cancelled = false;
    let trigger: { kill: () => void } | undefined;

    // Satu pintu untuk semua jalur tanpa tween: end state CSS dipasang, dan
    // `settled` memastikan tween yang datang belakangan tidak menghidupkan
    // ulang konten yang sudah terbaca.
    const failOpen = () => {
      settled.current = true;
      setIsVisible(true);
      setIsFallback(true);
    };

    // Fail-open: kalau chunk GSAP belum termuat setelah 2,5 detik (request
    // menggantung, bukan rejection), tampilkan section apa adanya. Tanpa ini
    // `.catch` tidak pernah jalan dan seluruh halaman tetap kosong.
    const timer = window.setTimeout(() => {
      if (cancelled || isGsapMotionLoaded()) return;
      failOpen();
    }, FALLBACK_DELAY);

    void loadGsapMotion()
      .then((motion) => {
        // Timer sudah menang: section tampil tanpa gerak, jangan dipasang trigger.
        if (cancelled || settled.current) return;
        motionRef.current = motion;
        try {
          trigger = motion.ScrollTrigger.create({
            trigger: target,
            start: 'top 84%',
            once: true,
            onEnter: () => {
              window.clearTimeout(timer);
              revealItems();
              setIsVisible(true);
            },
          });
        } catch {
          // ScrollTrigger butuh layout; kalau gagal dibuat, konten tetap harus terbaca.
          window.clearTimeout(timer);
          failOpen();
        }
      })
      .catch(() => {
        // Chunk gagal dimuat: tampilkan seksi tanpa menunggu trigger.
        if (cancelled) return;
        window.clearTimeout(timer);
        failOpen();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      trigger?.kill();
    };
  }, [revealItems]);

  // Konten yang datang setelah tinggi section berubah (skeleton ke data):
  // posisi trigger dihitung ulang, dan kalau section sudah menyala, simpul yang
  // baru mount ikut di-tween supaya tidak tertinggal di pre-state.
  // `scheduleScrollRefresh` menggabungkan refresh satu kali per frame.
  useEffect(() => {
    if (refreshKey === lastRefreshKey.current) return;
    lastRefreshKey.current = refreshKey;
    if (isVisible) revealItems();
    scheduleScrollRefresh();
  }, [refreshKey, isVisible, revealItems]);

  // Jaring kedua untuk konten yang diganti saat section sudah terlihat.
  //
  // `once` mematikan trigger setelah onEnter, dan `ScrollTrigger.refresh()`
  // hanya menghitung ulang posisi trigger yang masih hidup; keduanya tidak
  // pernah memicu tween untuk node yang baru mount. Penggantian set artikel
  // dengan jumlah yang sama bahkan tidak mengubah `refreshKey`. Karena itu
  // subtree dipantau langsung: setiap simpul baru yang belum tersentuh GSAP
  // (item `[data-reveal-item]`, atau anak langsung stage pada stage tanpa item)
  // ikut di-tween.
  useEffect(() => {
    if (!isVisible) return;
    const target = ref.current;
    if (!target || typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(() => {
      revealItems();
    });
    observer.observe(target, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isVisible, revealItems]);

  return { ref, isVisible, isFallback };
}
