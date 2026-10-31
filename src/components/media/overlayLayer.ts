import { useEffect } from 'react';

/**
 * Kunci latar aplikasi (`#root`) selama overlay modal terbuka.
 *
 * Overlay galeri/lightbox dirender lewat `createPortal(..., document.body)`,
 * jadi simpul dialog berada di luar `#root`. Menandai `#root` `inert` +
 * `aria-hidden` mematikan fokus dan pembaca layar untuk seluruh halaman di
 * belakang overlay tanpa ikut melumpuhkan dialognya sendiri.
 *
 * `<dialog>` + `showModal()` (jalur modal dashboard, `ModalWrapper` → `md-dialog`)
 * melakukan ini secara native, tetapi elemen `<dialog>` belum diimplementasikan
 * jsdom sehingga tes unit kehilangan isi dialog. Karena itu lightbox memakai
 * portal + hook ini.
 *
 * Penghitung modul menjaga overlay bertumpuk: hanya lapisan pertama yang
 * menyimpan/memasang atribut, dan hanya lapisan terakhir yang memulihkannya
 * persis seperti sebelum dibuka (tanda milik pemilik lain tidak dicabut).
 */
let openLayers = 0;
let snapshot: { hadInert: boolean; ariaHidden: string | null } | null = null;

export function useBackgroundInert(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = document.getElementById('root');
    if (!root) return;

    openLayers += 1;
    if (openLayers === 1) {
      snapshot = {
        hadInert: root.hasAttribute('inert'),
        ariaHidden: root.getAttribute('aria-hidden'),
      };
      root.setAttribute('inert', '');
      root.setAttribute('aria-hidden', 'true');
    }

    return () => {
      openLayers -= 1;
      if (openLayers > 0 || !snapshot) return;
      const el = document.getElementById('root');
      const prev = snapshot;
      snapshot = null;
      if (!el) return;
      if (!prev.hadInert) el.removeAttribute('inert');
      if (prev.ariaHidden === null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', prev.ariaHidden);
    };
  }, [active]);
}
