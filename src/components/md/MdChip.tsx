import * as React from 'react';

import '@material/web/chips/filter-chip.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export interface MdChipProps {
  label: string;
  /**
   * Konten awal (node lucide atau titik status), dirender ke slot `icon`
   * md-filter-chip — bukan slot default, yang isinya masuk `.label`
   * (`overflow: hidden` + ellipsis) sehingga terpotong.
   *
   * Perilaku md: chip `selected` menukar slot `icon` dengan slot
   * `selected-icon` (bawaan md: centang). Jadi konten ini tampil pada chip
   * yang tidak terpilih; chip terpilih menampilkan centang.
   */
  leadingIcon?: React.ReactNode;
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
  leadingIcon,
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

  /**
   * md-filter-chip men-toggle `selected` internalnya sendiri di jalur klik
   * (`chips/internal/filter-chip.js` → `handleClickOnChild`), lalu me-redispatch
   * event dari host. Kalau konsumen menetapkan filter yang sama saat chip
   * diklik ulang (mis. `onFilterChange(tab.key)` di FilterBar), state React
   * tidak berubah — tidak ada render ulang, jadi tidak ada yang menulis ulang
   * property `selected` dan chip tampil tidak terpilih padahal filternya masih
   * aktif. Karena itu property dikembalikan ke nilai prop SETELAH toggle md
   * berjalan: listener host menyala setelah handler internal md dan sebelum
   * React mem-flush state konsumen, sehingga `selected` tetap sepenuhnya
   * terkontrol (satu sumber kebenaran: prop).
   *
   * Chip `removable` tidak lewat jalur ini — kliknya adalah aksi hapus (`remove`).
   */
  const handleClick = React.useCallback(() => {
    onClick?.();
    const el = ref.current as MdHost | null;
    if (el && el.selected !== selected) el.selected = selected;
  }, [onClick, ref, selected]);

  useMdEvent(ref, 'remove', onRemove ? handleRemove : undefined, !disabled);
  useMdEvent(ref, 'click', !removable ? handleClick : undefined, !disabled);

  return mdCreate(
    'md-filter-chip',
    {
      ref,
      class: className,
      'aria-label': ariaLabel,
    },
    // md-filter-chip membaca konten awal dari slot bernama `icon`
    // (chips/internal/chip.js → `renderLeadingIcon`). Tanpa atribut `slot`,
    // node masuk slot default dan ikut ke `.label` yang memotongnya.
    leadingIcon != null
      ? mdCreate(
          'span',
          { slot: 'icon', class: 'inline-flex shrink-0 items-center justify-center' },
          leadingIcon,
        )
      : null,
  );
}
