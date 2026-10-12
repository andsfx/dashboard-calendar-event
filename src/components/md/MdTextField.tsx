import * as React from 'react';

import '@material/web/textfield/outlined-text-field.js';

import { mdCreate, useForwardRef, useMdEvent, useMdRef, type MdHost } from './md-internals';

/** Subset yang didukung md-text-field. `date`/`datalist` TIDAK didukung. */
export type MdTextFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'password'
  | 'search'
  | 'tel'
  | 'url'
  | 'textarea';

export interface MdTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** label floating md — sekaligus accessible name */
  label?: string;
  /** dipakai bila tidak ada label terlihat */
  ariaLabel?: string;
  /** default 'text' */
  type?: MdTextFieldType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** hanya type="textarea" */
  rows?: number;
  maxLength?: number;
  error?: boolean;
  /** menggantikan supporting text saat error */
  errorText?: string;
  supportingText?: string;
  autoFocus?: boolean;
  id?: string;
  className?: string;
  inputRef?: React.Ref<HTMLElement>;
  onKeyDown?: (event: KeyboardEvent) => void;
  /** konten slot md, mis. `<Search slot="leading-icon" />`. */
  children?: React.ReactNode;
}

export function MdTextField({
  value,
  onChange,
  label,
  ariaLabel,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  rows,
  maxLength,
  error = false,
  errorText,
  supportingText,
  autoFocus = false,
  id,
  className,
  inputRef,
  onKeyDown,
  children,
}: MdTextFieldProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  // Prop non-teks: ditulis ulang setiap render, aman.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next: Record<string, unknown> = {
      label: label ?? '',
      placeholder: placeholder ?? '',
      type,
      required,
      disabled,
      readOnly,
      error,
      errorText: errorText ?? '',
      supportingText: supportingText ?? '',
    };
    if (rows !== undefined) next.rows = rows;
    for (const key of Object.keys(next)) {
      const val = next[key];
      if (el[key] !== val) el[key] = val;
    }
  });

  // `value` terpisah + guard: menulis ulang value tiap render memindahkan caret
  // ke ujung pada tiap ketikan (md merender ulang inner <input>).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.value !== value) el.value = value;
  }, [ref, value]);

  const handleInput = React.useCallback(
    (event: Event) => {
      const host = event.currentTarget as MdHost | null;
      const raw = typeof host?.value === 'string' ? host.value : '';
      // `maxLength` ditegakkan di sini, bukan diteruskan ke md: men-set
      // `maxLength` pada md-text-field memunculkan baris counter "n / N"
      // bawaan shadow DOM (tampilan pra-migrasi tidak punya itu).
      // Lewati saat IME composition — memotong di tengah komposisi merusak
      // input CJK.
      if (
        maxLength !== undefined &&
        raw.length > maxLength &&
        !(event instanceof InputEvent && event.isComposing)
      ) {
        const clamped = raw.slice(0, maxLength);
        if (host) host.value = clamped;
        onChange(clamped);
        return;
      }
      onChange(raw);
    },
    [onChange, maxLength],
  );
  // `input` dan `change` sama-sama dipetakan ke `onChange`: md meriwayatkan
  // keduanya dari input internalnya (lihat `redispatchEvent`/`handleInput` di
  // md-text-field), dan React sendiri memperlakukan `change` pada elemen teks
  // sebagai "nilai berubah". Satu aksi pengguna tetap menghasilkan satu
  // panggilan, karena `input` dan `change` adalah dua event berbeda.
  useMdEvent(ref, 'input', handleInput, !disabled && !readOnly);
  useMdEvent(ref, 'change', handleInput, !disabled && !readOnly);
  useMdEvent(ref, 'keydown', onKeyDown ? (onKeyDown as (e: Event) => void) : undefined, !disabled);

  useForwardRef(ref, inputRef);

  React.useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus();
  }, [ref, autoFocus]);

  return mdCreate(
    'md-outlined-text-field',
    {
      ref,
      id,
      class: className,
      'aria-label': ariaLabel,
      'aria-labelledby': undefined,
    },
    children,
  );
}
