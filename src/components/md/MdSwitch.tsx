import * as React from 'react';

import '@material/web/switch/switch.js';

import { mdCreate, useMdEvent, useMdProps, useMdRef, type MdHost } from './md-internals';

export interface MdSwitchProps {
  selected: boolean;
  onChange: (selected: boolean) => void;
  /** wajib — md-switch tidak punya label terlihat */
  ariaLabel: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function MdSwitch({
  selected,
  onChange,
  ariaLabel,
  disabled = false,
  id,
  className,
}: MdSwitchProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  useMdProps(ref, { selected, disabled });

  const handleChange = React.useCallback(
    (event: Event) => {
      const host = event.currentTarget as MdHost | null;
      onChange(host?.selected === true);
    },
    [onChange],
  );
  useMdEvent(ref, 'change', handleChange, !disabled);

  return mdCreate('md-switch', { ref, id, class: className, 'aria-label': ariaLabel });
}
