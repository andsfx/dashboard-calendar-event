import * as React from 'react';

import '@material/web/iconbutton/icon-button.js';
import '@material/web/iconbutton/filled-icon-button.js';
import '@material/web/iconbutton/outlined-icon-button.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export type MdIconButtonVariant = 'standard' | 'filled' | 'outlined';

export interface MdIconButtonProps {
  /** wajib — tombol ikon tidak punya label terlihat */
  ariaLabel: string;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  /** default 'standard' */
  variant?: MdIconButtonVariant;
  title?: string;
  className?: string;
  /**
   * Tombol toggle (mis. aktif/nonaktif). Wajib diset agar md merender
   * `aria-pressed`; tanpa `toggle`, md tidak menulis atribut itu sama sekali.
   */
  toggle?: boolean;
  /** state terpilih — hanya berpengaruh bila `toggle` true. */
  selected?: boolean;
  /**
   * Atribut `tabindex` host, mis. `-1` untuk mengeluarkan tombol dari urutan
   * Tab (skip-link). Ditulis sebagai ATTRIBUTE, bukan DOM property — lihat
   * komentar di `useMdTabIndex`.
   */
  tabIndex?: number;
  children: React.ReactNode;
}

const TAGS: Record<MdIconButtonVariant, string> = {
  standard: 'md-icon-button',
  filled: 'md-filled-icon-button',
  outlined: 'md-outlined-icon-button',
};

export function MdIconButton({
  ariaLabel,
  onClick,
  disabled = false,
  variant = 'standard',
  title,
  className,
  toggle = false,
  selected = false,
  tabIndex,
  children,
}: MdIconButtonProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, { disabled, toggle, selected });
  useMdTabIndex(ref, tabIndex);
  useMdEvent(ref, 'click', onClick ? (onClick as (e: Event) => void) : undefined, !disabled);

  return mdCreate(
    TAGS[variant],
    { ref, class: className, 'aria-label': ariaLabel, title },
    children,
  );
}

/**
 * Tulis `tabindex` sebagai ATTRIBUTE host.
 *
 * `md-icon-button` memakai `shadowRootOptions.delegatesFocus = true`
 * (node_modules/@material/web/iconbutton/internal/icon-button.js:189-191),
 * sehingga HOST-nya yang masuk urutan Tab, bukan `<button>` di dalam shadow —
 * `tabindex="-1"` pada host itulah yang mengeluarkan tombol dari urutan Tab.
 *
 * Sengaja imperatif, bukan prop `tabIndex` lewat `mdCreate`: React 19 menulis
 * prop ke DOM property bila nama itu ada di instance custom element, dan
 * heuristik itu tidak kami andalkan (lihat catatan di `md-internals`).
 * Attribute dipilih karena `tabindex` direfleksikan HTMLElement — nilainya
 * identik dengan property, tanpa bergantung pada cabang React mana yang jalan.
 */
function useMdTabIndex(ref: React.RefObject<HTMLElement | null>, tabIndex: number | undefined): void {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (tabIndex === undefined) el.removeAttribute('tabindex');
    else el.setAttribute('tabindex', String(tabIndex));
  }, [ref, tabIndex]);
}
