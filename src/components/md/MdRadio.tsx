import * as React from 'react';

import '@material/web/radio/radio.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export interface MdRadioProps {
  /** grup radio dikelompokkan lewat `name` yang sama */
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  /** wajib — radio md tidak punya label terlihat */
  ariaLabel: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function MdRadio({
  name,
  value,
  checked,
  onChange,
  ariaLabel,
  disabled = false,
  id,
  className,
}: MdRadioProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, { checked, disabled });

  // md-radio mengelompokkan radio lewat `getAttribute('name')`, dan `name`
  // adalah Lit property NON-reflecting — React akan menulis property, bukan
  // attribute, sehingga grouping gagal. Karena itu `name` di-set sebagai
  // attribute eksplisit, dan `value` (dipakai untuk form submission) sebagai
  // property. Ref internal dipertahankan agar useMdProps/useMdEvent tetap hidup.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getAttribute('name') !== name) el.setAttribute('name', name);
    if (el.value !== value) el.value = value;
  }, [ref, name, value]);

  const handleChange = React.useCallback(
    (event: Event) => {
      const host = event.currentTarget as MdHost | null;
      if (host?.checked === true) onChange(value);
    },
    [onChange, value],
  );
  useMdEvent(ref, 'change', handleChange, !disabled);

  return mdCreate('md-radio', {
    ref,
    id,
    class: className,
    // md menaruh peran ini di `ElementInternals.role`/`.ariaChecked`, yang benar
    // bagi screen reader tetapi tidak terbaca alat otomasi berbasis DOM
    // (Playwright `getByRole`, axe). Atribut eksplisit menyamakan keduanya;
    // nilainya identik dengan yang dipasang md.
    role: 'radio',
    'aria-checked': checked ? 'true' : 'false',
    'aria-label': ariaLabel,
  });
}
