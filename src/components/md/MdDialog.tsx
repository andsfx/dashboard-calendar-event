import * as React from 'react';

import '@material/web/dialog/dialog.js';

import { mdCreate, useMdEvent, useMdRef, type MdHost } from './md-internals';

export interface MdDialogProps {
  open: boolean;
  /** dipanggil SEKALI saat dialog selesai menutup */
  onClose: () => void;
  /** id elemen headline di dalam children; md memetakannya ke aria-labelledby */
  labelledBy?: string;
  /** dipakai bila tidak ada headline */
  ariaLabel?: string;
  /** role alertdialog (mis. konfirmasi destruktif) */
  alert?: boolean;
  className?: string;
  /** kelas untuk wrapper slot="content" (md-dialog tidak punya default slot) */
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Adapter tipis di atas `md-dialog`.
 *
 * Semua perilaku berat — focus trap, scroll lock, Escape, tumpukan modal
 * bersarang — disediakan native oleh `<dialog>` + `showModal()`. Itu pengganti
 * langsung `openModalStack`/focus-trap/scroll-lock manual di ModalWrapper lama.
 *
 * Catatan slot: md-dialog HANYA punya slot bernama `headline`, `content`, dan
 * `actions` — tidak ada default slot, jadi children wajib dibungkus
 * `slot="content"` agar terlihat. Shadow rule `slot[name='content']::slotted(*)`
 * memberi padding 24px; di-reset dari light DOM (aturan outer tree menang atas
 * `::slotted`, sama seperti `:host`).
 */
export function MdDialog({
  open,
  onClose,
  labelledBy,
  ariaLabel,
  alert = false,
  className,
  contentClassName,
  contentStyle,
  children,
}: MdDialogProps): React.ReactElement {
  const ref = useMdRef<MdHost>();
  // `isShown` = dialog sedang tampil karena prop `open`.
  const isShown = React.useRef(false);
  // true saat kita sendiri memicu close() dari perubahan prop `open` — supaya
  // event `closed` yang menyusul tidak memanggil `onClose` untuk kedua kalinya
  // (loop umpan balik: parent set open=false → closed → onClose lagi).
  const suppressClosed = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dialog = el as unknown as { show?: () => Promise<void>; close?: () => Promise<void> };
    if (open && !isShown.current) {
      isShown.current = true;
      suppressClosed.current = false;
      void dialog.show?.();
    } else if (!open && isShown.current) {
      isShown.current = false;
      suppressClosed.current = true;
      void dialog.close?.();
    }
  }, [ref, open]);

  // label: md-dialog memetakan headline-nya sendiri ke aria-labelledby="headline"
  // ketika ada konten di slot headline; `labelledBy` kita pakai saat caller
  // merender headline sendiri (mis. lewat ModalHeader).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (labelledBy) el.setAttribute('aria-labelledby', labelledBy);
    else el.removeAttribute('aria-labelledby');
    if (alert) el.setAttribute('type', 'alert');
    else el.removeAttribute('type');
  }, [ref, labelledBy, alert]);

  const handleClosed = React.useCallback(() => {
    // Sudah tertutup; penutupan dari prop `open` tidak boleh memicu `onClose`.
    if (suppressClosed.current) {
      suppressClosed.current = false;
      return;
    }
    // Penutupan oleh pengguna (Escape/scrim): prop `open` masih true di sini.
    if (!isShown.current) return;
    isShown.current = false;
    onClose();
  }, [onClose]);
  useMdEvent(ref, 'closed', handleClosed);

  return mdCreate(
    'md-dialog',
    { ref, class: className, 'aria-label': ariaLabel },
    mdCreate('div', { slot: 'content', class: `md-dialog-content ${contentClassName ?? ''}`, style: contentStyle }, children),
  );
}
