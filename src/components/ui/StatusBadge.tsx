import { memo } from 'react';
import { EventStatus } from '../../types';
import { Badge } from '../shadcn/badge';

const CONFIG: Record<EventStatus, { label: string; className: string; dotClass: string }> = {
  draft: {
    // Internal Event flag — not Draft antrian (CONTEXT.md)
    label: 'Internal',
    className: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)] ring-1 ring-[var(--wf-accent)]',
    dotClass: 'bg-[var(--wf-accent)]',
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
    className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] ring-1 ring-[var(--wf-rule)]',
    dotClass: 'bg-[var(--wf-rule-strong)]',
  },
};

interface Props {
  status: EventStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge = memo(function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status];
  return (
    <Badge
      variant="outline"
      aria-label={cfg.label}
      className={`inline-flex w-auto items-center gap-1.5 rounded-full border-transparent text-xs font-medium ${size === 'sm' ? 'h-auto px-2 py-0.5' : 'h-auto px-2.5 py-1'} ${cfg.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} aria-hidden="true" />
      {cfg.label}
    </Badge>
  );
});
