import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Jarak pemicu ↔ gelembung. */
const GAP = 8;
/** Jarak minimum gelembung dari tepi viewport. */
const EDGE = 8;
/** Tunda buka saat hover supaya pointer yang sekadar melintas tidak memicu tip. */
const HOVER_DELAY_MS = 100;
/** Toleransi saat pointer meninggalkan pemicu, supaya pointer masih bisa masuk gelembung. */
const HOVER_CLOSE_MS = 120;

export interface InfoTipProps {
  /** aria-label pemicu — satu-satunya nama tombol ikon ini. */
  label: string;
  /** isi gelembung; `children` dipakai bila `content` tidak diberikan. */
  content?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Container portal gelembung.
 *
 * Biasanya `document.body`. Bila pemicu berada di dalam modal
 * (`<dialog>` + `showModal()`, yaitu `md-dialog`), target berpindah ke subtree
 * modal itu sendiri: elemen top layer memblokir hit-test seluruh elemen di
 * luar subtree dialog, jadi gelembung di `body` akan TERLIHAT di atas modal
 * tetapi tidak bisa di-hover maupun diklik. Elemen yang dikembalikan adalah
 * anak light DOM dari host modal — satu-satunya bagian subtree yang sudah
 * ter-render lewat slot `content`, sehingga aman dipakai sebagai container.
 */
function resolvePortalTarget(trigger: HTMLElement): HTMLElement {
  let el: HTMLElement | null = trigger;
  while (el) {
    const parent: HTMLElement | null = el.parentElement;
    if (parent?.shadowRoot) {
      const modal = Array.from(parent.shadowRoot.querySelectorAll('dialog'))
        .find((dialog) => dialog.matches(':modal'));
      if (modal) return el;
    }
    el = parent;
  }
  return document.body;
}

/**
 * Satu gelembung pada satu waktu.
 *
 * Setiap pemicu punya tiga jalur buka sendiri (hover, fokus keyboard, klik),
 * jadi menutup tip lain dari dalam handler tidak cukup: tip yang sudah terbuka
 * karena fokus keyboard tetap `open` ketika tip kedua dibuka lewat hover, dan
 * dua gelembung tampil bersamaan. Terukur di Chromium: keadaan itu bertahan
 * >1,1 detik — sampai pointer menjauh dan timer tutup pemilik pertama berjalan
 * (atau selamanya bila pointer berhenti di pemicu kedua). Karena itu pemilik
 * sebelumnya ditutup tepat saat kepemilikan diambil alih.
 */
let openTipClose: (() => void) | null = null;

/** Ambil alih kepemilikan gelembung; tutup pemilik sebelumnya bila ada. */
function claimSingleOpenTip(close: () => void): void {
  const previous = openTipClose;
  openTipClose = close;
  if (previous !== null && previous !== close) previous();
}

/** Lepaskan kepemilikan hanya bila masih milik pemanggil (tutup ganda aman). */
function releaseSingleOpenTip(close: () => void): void {
  if (openTipClose === close) openTipClose = null;
}

/**
 * Panduan singkat di balik tombol ikon info.
 *
 * Gelembung dirender lewat `createPortal` dan diposisikan `fixed` dari
 * `getBoundingClientRect()` pemicu, jadi tidak ada container `overflow` yang
 * bisa memotongnya — daftar opsi di modal "Kelola opsi" memang menggulung
 * (`overflow-y-auto`), dan tip di dalamnya akan terpotong kalau dirender
 * in-flow. Container portal: `document.body`, atau subtree modal bila pemicu
 * ada di dalam `md-dialog` yang sedang `showModal()` — lihat
 * `resolvePortalTarget`.
 *
 * Atribut `popover="manual"` ditambahkan karena modal admin memakai
 * `md-dialog` + `showModal()` (top layer): `position: fixed` biasa tetap
 * dicat **di bawah** lapisan top-layer itu. Popover menaikkan gelembung ke
 * top layer yang sama; `manual` mematikan light-dismiss bawaan supaya
 * penutupan tetap satu jalur dengan penanganan klik-di-luar di bawah.
 * Peramban tanpa Popover API (termasuk jsdom di unit test) mengabaikannya dan
 * tetap mendapat perilaku `fixed` biasa.
 */
export function InfoTip({ label, content, children, className }: InfoTipProps): ReactNode {
  const body = content ?? children;
  const tipId = `infotip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  /** Container portal — ditentukan saat dibuka (lihat `resolvePortalTarget`). */
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  /** Posisi terukur; null selama belum diukur (gelembung masih disembunyikan). */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const showTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  /** true selama interaksi pointer berjalan — agar klik tidak ikut memicu buka-on-focus. */
  const pointerActive = useRef(false);
  /** Popover hanya boleh ditampilkan sekali per elemen (StrictMode menjalankan efek dua kali). */
  const popoverShown = useRef(false);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  /**
   * Kunci kepemilikan gelembung milik instance ini.
   *
   * `close` stabil (dep-nya dua `useCallback([])`), tapi `close` perlu
   * mereferensikan dirinya sendiri untuk melepas kepemilikan — itu tidak bisa
   * ditulis langsung di dalam body-nya, jadi identitasnya disimpan di ref yang
   * dideklarasikan lebih dulu dan diisi tepat setelah `close` dibuat.
   */
  const closeRef = useRef<() => void>(() => {});

  const close = useCallback(() => {
    clearShowTimer();
    clearCloseTimer();
    releaseSingleOpenTip(closeRef.current);
    setOpen(false);
    setPos(null);
  }, [clearShowTimer, clearCloseTimer]);
  closeRef.current = close;

  /**
   * Target portal ditentukan saat dibuka, bukan saat render: pemicu di dalam
   * modal harus memakai subtree modal (lihat `resolvePortalTarget`), dan
   * pembacaan DOM di jalur render melanggar aturan render React.
   */
  const openTip = useCallback(() => {
    clearShowTimer();
    clearCloseTimer();
    const trigger = triggerRef.current;
    setPortalTarget(trigger ? resolvePortalTarget(trigger) : document.body);
    claimSingleOpenTip(closeRef.current);
    setOpen(true);
  }, [clearShowTimer, clearCloseTimer]);

  /**
   * Utamakan di atas pemicu; flip ke bawah bila ruang atas kurang, lalu clamp
   * agar selalu utuh minimal `EDGE` px dari tepi viewport.
   */
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;
    const triggerRect = trigger.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = triggerRect.top - bubbleRect.height - GAP;
    if (top < EDGE) top = triggerRect.bottom + GAP;
    top = Math.min(Math.max(top, EDGE), Math.max(EDGE, viewportHeight - bubbleRect.height - EDGE));

    let left = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
    left = Math.min(Math.max(left, EDGE), Math.max(EDGE, viewportWidth - bubbleRect.width - EDGE));

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      popoverShown.current = false;
      return;
    }
    const bubble = bubbleRef.current;
    if (bubble && !popoverShown.current) {
      const withPopover = bubble as HTMLDivElement & { showPopover?: () => void };
      if (typeof withPopover.showPopover === 'function') {
        popoverShown.current = true;
        // Atribut dipasang di sini, bukan di JSX: UA stylesheet menetapkan
        // `[popover]:not(:popover-open) { display: none }`, jadi di lingkungan
        // tanpa Popover API (jsdom di unit test) elemen akan selamanya
        // disembunyikan kalau atributnya selalu ada.
        bubble.setAttribute('popover', 'manual');
        withPopover.showPopover();
      }
    }
    reposition();
  }, [open, reposition]);

  // Pemicu bisa bergerak (daftar opsi digulir, modal berubah ukuran) selama
  // gelembung terbuka, jadi posisi dihitung ulang — termasuk scroll di
  // container mana pun lewat listener capture.
  useEffect(() => {
    if (!open) return;
    const onViewportChange = () => reposition();
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    return () => {
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || bubbleRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Escape menutup tip ini lebih dulu; tanpa preventDefault dialog induk
      // (md-dialog) ikut tertutup pada penekanan yang sama.
      event.preventDefault();
      close();
    };
    document.addEventListener('pointerdown', onPointerDownOutside, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDownOutside, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, close]);

  // Komponen bisa di-unmount saat tip terbuka (mis. <details> ditutup, kartu
  // hilang karena filter). Timer dibersihkan dan kepemilikan dilepas: kalau
  // tidak, registry masih menunjuk `close` milik instance mati.
  useEffect(() => () => {
    if (showTimer.current !== null) window.clearTimeout(showTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    releaseSingleOpenTip(closeRef.current);
  }, []);

  const handlePointerEnter = (event: ReactPointerEvent<HTMLButtonElement>) => {
    // Sentuh/pena tidak punya hover: jangan buka di sini, biar klik yang menentukan.
    if (event.pointerType !== 'mouse') return;
    clearCloseTimer();
    if (open) return;
    clearShowTimer();
    showTimer.current = window.setTimeout(() => {
      showTimer.current = null;
      openTip();
    }, HOVER_DELAY_MS);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') return;
    clearShowTimer();
    if (!open) return;
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      close();
    }, HOVER_CLOSE_MS);
  };

  // Focus hanya membuka bila datang dari keyboard: klik pointer sudah punya
  // jalur toggle sendiri (pointerdown → focus → pointerup → click).
  const handleFocus = () => {
    if (pointerActive.current) return;
    openTip();
  };

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    // Pemicu di dalam <summary> "Koreksi isian tenant": tanpa preventDefault,
    // klik tombol ini sekaligus membuka/menutup <details>-nya.
    event.preventDefault();
    pointerActive.current = false;
    if (open) {
      close();
      return;
    }
    openTip();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    // Cegah klik sintetis bawaan <button> supaya Enter/Space selalu membuka
    // (bukan toggle-tertutup saat tip sudah terbuka karena fokus).
    event.preventDefault();
    openTip();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        className={cn(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full align-middle text-[var(--wf-ink-muted)] transition-colors hover:text-[var(--wf-ink)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--wf-board)] focus-visible:outline-none',
          className,
        )}
        onPointerDown={() => { pointerActive.current = true; }}
        onPointerUp={() => { pointerActive.current = false; }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={close}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && createPortal(
        <div
          ref={bubbleRef}
          id={tipId}
          role="tooltip"
          // `w-max` (= `width: max-content`) WAJIB ada di samping `max-w-*`.
          //
          // Gelembung ini `position: fixed` tanpa `width`, jadi lebarnya
          // shrink-to-fit: ruang tersedia dihitung dari `left` ke tepi kanan
          // viewport. Karena `left` diisi hasil pengukuran lebar sebelumnya,
          // lebar dan posisi saling makan — terukur di Chromium saat viewport
          // 1280→700 px dengan tip terbuka: lebar runtuh 272 → 250,8 → 176,4 →
          // 91,2 px, tepi kanan menempel viewport (0 px, melanggar `EDGE` 8 px),
          // dan teks terpecah jadi banyak baris. `max-content` melepas lebar
          // dari `left`: nilainya selalu lebar alami konten, dipotong `max-w-*`.
          //
          // `max-w-*` memakai `min()` agar di viewport lebih sempit dari
          // `17rem + 2*EDGE` gelembung menyempit mengikuti layar, bukan meluber.
          className="fixed z-50 w-max max-w-[min(17rem,calc(100vw-1rem))] rounded-[var(--radius-control)] bg-[var(--wf-ink)] px-2.5 py-2 text-xs leading-5 text-[var(--wf-board)] transition-opacity duration-150 motion-reduce:transition-none"
          style={{
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            right: 'auto',
            bottom: 'auto',
            margin: 0,
            opacity: pos ? 1 : 0,
            visibility: pos ? 'visible' : 'hidden',
          }}
          onPointerEnter={clearCloseTimer}
          onPointerLeave={close}
        >
          {body}
        </div>,
        portalTarget ?? document.body,
      )}
    </>
  );
}
