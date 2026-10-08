import * as React from 'react';

import '@material/web/chips/filter-chip.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export interface MdChipProps {
  label: string;
  /** untuk chip removable, dipakai sebagai nama aksesibel tombol hapus */
  ariaLabel?: string;
  removable?: boolean;
  /** chip toggle (mis. pil hari pada event berulang) */
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function MdChip({
  label,
  ariaLabel,
  removable = false,
  selected = false,
  onClick,
  onRemove,
  disabled = false,
  className,
}: MdChipProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, { label, removable, selected, disabled });

  const handleRemove = React.useCallback(() => onRemove?.(), [onRemove]);
  const handleClick = React.useCallback(() => onClick?.(), [onClick]);
  useMdEvent(ref, 'remove', onRemove ? handleRemove : undefined, !disabled);
  useMdEvent(ref, 'click', !removable && onClick ? handleClick : undefined, !disabled);

  return mdCreate('md-filter-chip', {
    ref,
    class: className,
    'aria-label': ariaLabel,
  });
}
