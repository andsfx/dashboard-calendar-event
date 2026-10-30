import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Route di-lazy; target `#hash` sering baru ter-mount setelah initial commit. */
const HASH_LOOKUP_BUDGET_MS = 1000;

/**
 * Reset posisi scroll saat rute berubah.
 *
 * Reset ke atas hanya terjadi ketika `pathname` berubah (PUSH/REPLACE) tanpa
 * `hash`. Perubahan search param saja (`?waktu=`, `?kategori=`) membuat entri
 * lokasi baru dengan `key` baru tetapi `pathname` tetap, jadi halaman tidak
 * boleh melompat ke atas di tengah daftar. Perubahan hash saja pada pathname
 * yang sama tetap menggulir ke target anchor.
 *
 * Yang dikecualikan hanya `POP` ke entri riwayat lama (back/forward, ber-hash
 * maupun tidak): browser sudah memulihkan posisi tersimpan untuk entri itu,
 * dan memaksa `top: 0` atau melompat ke anchor menghapus pemulihan tersebut.
 * Initial load tetap diproses — reload tanpa hash tidak boleh merebut
 * pemulihan browser, sedangkan initial load ber-hash (`/events#calendar` dari
 * tautan bersama) perlu dipaksa karena target hash biasanya baru ter-mount
 * setelah chunk lazy selesai, jadi scroll bawaan browser tidak bisa diandalkan.
 */
export function ScrollToTop(): null {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const initialEntryKeyRef = useRef(key);
  const initialEntryConsumedRef = useRef(false);
  /** `pathname` terakhir yang sudah diproses komponen ini. */
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    // Entri awal hanya diproses sekali; setelah pengguna pindah, POP kembali ke
    // entri itu milik browser (memulihkan posisi), bukan milik komponen ini.
    const isInitialEntry = key === initialEntryKeyRef.current && !initialEntryConsumedRef.current;
    if (!isInitialEntry) initialEntryConsumedRef.current = true;
    if (navigationType === 'POP' && !isInitialEntry) {
      // Scroll milik browser, tetapi pathname yang tampil tetap berubah — ref
      // harus mengikutinya agar PUSH berikutnya dibandingkan dengan benar.
      previousPathnameRef.current = pathname;
      return;
    }

    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!hash) {
      if (isInitialEntry) return;
      // Search-param-only (filter `?waktu=`/`?kategori=`) bukan pindah halaman.
      if (pathname === previousPathname) return;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }

    const targetId = hash.slice(1);
    if (!targetId) return;

    let frame = 0;
    const deadline = performance.now() + HASH_LOOKUP_BUDGET_MS;

    const focusWhenReady = () => {
      const target = document.getElementById(targetId);
      if (target) {
        if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
        target.scrollIntoView();
        return;
      }
      if (performance.now() < deadline) {
        frame = requestAnimationFrame(focusWhenReady);
      }
    };

    focusWhenReady();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [pathname, hash, navigationType, key]);

  return null;
}
