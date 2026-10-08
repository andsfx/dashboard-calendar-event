import * as React from 'react';

import '@material/web/checkbox/checkbox.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export interface MdCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
  indeterminate?: boolean;
  id?: string;
  className?: string;
}

export function MdCheckbox({
  checked,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
  indeterminate = false,
  id,
  className,
}: MdCheckboxProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, { checked, disabled, indeterminate });

  const handleChange = React.useCallback(
    (event: Event) => {
      const host = event.currentTarget as MdHost | null;
      onChange(host?.checked === true);
    },
    [onChange],
  );
  useMdEvent(ref, 'change', handleChange, !disabled);

  return mdCreate('md-checkbox', {
    ref,
    id,
    class: className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  });
}
