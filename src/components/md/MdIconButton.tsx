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
  children,
}: MdIconButtonProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, { disabled, toggle, selected });
  useMdEvent(ref, 'click', onClick ? (onClick as (e: Event) => void) : undefined, !disabled);

  return mdCreate(
    TAGS[variant],
    { ref, class: className, 'aria-label': ariaLabel, title },
    children,
  );
}
