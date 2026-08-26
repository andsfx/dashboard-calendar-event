import { memo } from 'react';
import { EventStatus } from '../types';

const CONFIG: Record<EventStatus, { label: string; className: string; dotClass: string }> = {
  draft: {
    // Internal Event flag — not Draft antrian (CONTEXT.md)
    label: 'Internal',
    className: 'bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300 ring-1 ring-brand-primary-300 dark:ring-brand-primary-700',
    dotClass: 'bg-brand-primary-400',
  },
  ongoing: {
    label: 'Berlangsung',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700',
    dotClass: 'bg-emerald-500 motion-safe:animate-pulse',
  },
  upcoming: {
    label: 'Mendatang',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700',
    dotClass: 'bg-amber-500',
  },
  past: {
    label: 'Selesai',
className: 'bg-slate-100 ui-text-muted dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700',
    dotClass: 'bg-slate-400',
  },
};

interface Props {
  status: EventStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge = memo(function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'} ${cfg.className}`}
      aria-label={cfg.label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
});
