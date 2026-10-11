import * as React from 'react';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export type MdButtonVariant = 'filled' | 'outlined' | 'text';

export interface MdButtonProps {
  /** default 'filled' */
  variant?: MdButtonVariant;
  /** default 'button' — pakai 'submit' untuk tombol submit di dalam <form> */
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  /** destruktif: isi rose. DESIGN.md: error/destructive = rose, bukan tosca. */
  danger?: boolean;
  className?: string;
  ariaLabel?: string;
  /** status terpilih untuk tombol toggle (mis. pil periode) */
  ariaPressed?: boolean;
  title?: string;
  children: React.ReactNode;
}

const TAGS: Record<MdButtonVariant, string> = {
  filled: 'md-filled-button',
  outlined: 'md-outlined-button',
  text: 'md-text-button',
};

/**
 * MD3 hanya punya slot ikon bernama `icon`. Ikon `<svg>` yang ditaruh di slot
 * default ikut masuk `.label` yang `overflow: hidden + ellipsis`, jadi label
 * kepotong dan tombol menyusut. Helper ini memindah ikon langsung ke slot
 * `icon` setelah mount (slot attribute dibaca saat slot assignment).
 */
function useMdIconSlot(ref: React.RefObject<HTMLElement | null>): void {
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (const child of Array.from(el.children)) {
      if (child instanceof SVGElement && child.getAttribute('slot') !== 'icon') {
        child.setAttribute('slot', 'icon');
      }
    }
  });
}

/** Token destruktif (rose-800 #9f1239 ≈ 6.9:1 dengan teks putih). */
const DANGER: Record<MdButtonVariant, React.CSSProperties> = {
  filled: {
    '--md-filled-button-container-color': '#9f1239',
    '--md-filled-button-label-text-color': '#ffffff',
    '--md-filled-button-icon-color': '#ffffff',
    '--md-filled-button-hover-label-text-color': '#ffffff',
    '--md-filled-button-focus-label-text-color': '#ffffff',
    '--md-filled-button-pressed-label-text-color': '#ffffff',
    '--md-filled-button-hover-icon-color': '#ffffff',
    '--md-filled-button-focus-icon-color': '#ffffff',
    '--md-filled-button-pressed-icon-color': '#ffffff',
  } as React.CSSProperties,
  outlined: {
    '--md-outlined-button-label-text-color': '#9f1239',
    '--md-outlined-button-icon-color': '#9f1239',
    '--md-outlined-button-outline-color': '#9f1239',
    '--md-outlined-button-hover-label-text-color': '#9f1239',
    '--md-outlined-button-focus-label-text-color': '#9f1239',
    '--md-outlined-button-pressed-label-text-color': '#9f1239',
    '--md-outlined-button-pressed-outline-color': '#9f1239',
    '--md-outlined-button-hover-icon-color': '#9f1239',
    '--md-outlined-button-focus-icon-color': '#9f1239',
    '--md-outlined-button-pressed-icon-color': '#9f1239',
  } as React.CSSProperties,
  text: {
    '--md-text-button-label-text-color': '#9f1239',
    '--md-text-button-icon-color': '#9f1239',
    '--md-text-button-hover-label-text-color': '#9f1239',
    '--md-text-button-focus-label-text-color': '#9f1239',
    '--md-text-button-pressed-label-text-color': '#9f1239',
    '--md-text-button-hover-icon-color': '#9f1239',
    '--md-text-button-focus-icon-color': '#9f1239',
    '--md-text-button-pressed-icon-color': '#9f1239',
  } as React.CSSProperties,
};

export function MdButton({
  variant = 'filled',
  type = 'button',
  onClick,
  disabled = false,
  danger = false,
  className,
  ariaLabel,
  ariaPressed,
  title,
  children,
}: MdButtonProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, { disabled, type });
  // Ikon (svg) di child harus masuk slot "icon" MD3, bukan slot default —
  // kalau tidak, ikut ke .label yang overflow:hidden sehingga label terpotong.
  useMdIconSlot(ref);

  useMdEvent(ref, 'click', onClick ? (onClick as (e: Event) => void) : undefined, !disabled);

  return mdCreate(
    TAGS[variant],
    {
      ref,
      class: className,
      'aria-label': ariaLabel,
      'aria-pressed': ariaPressed === undefined ? undefined : String(ariaPressed),
      title,
      style: danger ? DANGER[variant] : undefined,
    },
    children,
  );
}
