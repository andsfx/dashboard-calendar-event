import * as React from 'react';

import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export interface MdSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MdSelectProps {
  value: string;
  options: MdSelectOption[];
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  id?: string;
  className?: string;
}

/**
 * `md-select-option` TIDAK merefleksikan `value`/`selected` ke attribute, jadi
 * nilainya harus di-set sebagai DOM property. Kita lakukan lewat callback ref
 * per opsi (bukan lewat React prop) supaya tidak bergantung pada heuristik
 * property-vs-attribute React.
 */
function SelectOption({ option }: { option: MdSelectOption }): React.ReactElement {
  const setRef = React.useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      (el as MdHost).value = option.value;
      if (option.disabled !== undefined) (el as MdHost).disabled = option.disabled;
    },
    [option.value, option.disabled],
  );
  return mdCreate(
    'md-select-option',
    { ref: setRef },
    mdCreate('div', { slot: 'headline' }, option.label),
  );
}

export function MdSelect({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  disabled = false,
  required = false,
  error = false,
  errorText,
  id,
  className,
}: MdSelectProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, {
    label: label ?? '',
    disabled,
    required,
    error,
    errorText: errorText ?? '',
  });

  // `value` hanya ditulis bila berbeda: setter md-select melakukan DOM query dan
  // menulis ulang display text.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.value !== value) el.value = value;
  }, [ref, value, options]);

  const handleChange = React.useCallback(
    (event: Event) => {
      const host = event.currentTarget as MdHost | null;
      onChange(typeof host?.value === 'string' ? host.value : '');
    },
    [onChange],
  );
  useMdEvent(ref, 'change', handleChange, !disabled);

  return mdCreate(
    'md-outlined-select',
    { ref, id, class: className, 'aria-label': ariaLabel },
    options.map((option) => React.createElement(SelectOption, { key: option.value, option })),
  );
}
