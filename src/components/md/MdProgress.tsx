import * as React from 'react';

import '@material/web/progress/linear-progress.js';
import '@material/web/progress/circular-progress.js';

import { mdCreate, useMdProps, useMdRef, type MdHost } from './md-internals';

export interface MdLinearProgressProps {
  /** 0..1 */
  value: number;
  ariaLabel: string;
  className?: string;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function MdLinearProgress({ value, ariaLabel, className }: MdLinearProgressProps): React.ReactElement {
  const ref = useMdRef<MdHost>();
  useMdProps(ref, { value: clamp01(value) });
  return mdCreate('md-linear-progress', { ref, class: className, 'aria-label': ariaLabel });
}

export interface MdCircularProgressProps {
  indeterminate?: boolean;
  /** 0..1, diabaikan saat indeterminate */
  value?: number;
  ariaLabel?: string;
  className?: string;
}

export function MdCircularProgress({
  indeterminate = true,
  value = 0,
  ariaLabel,
  className,
}: MdCircularProgressProps): React.ReactElement {
  const ref = useMdRef<MdHost>();
  useMdProps(ref, { indeterminate, value: clamp01(value) });
  return mdCreate('md-circular-progress', { ref, class: className, 'aria-label': ariaLabel });
}
