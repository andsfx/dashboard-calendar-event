import { memo } from 'react';
import { DraftProgress } from '../types';

const CONFIG: Record<DraftProgress, { label: string; className: string; dot: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300 ring-1 ring-brand-primary-300 dark:ring-brand-primary-700',
    dot: 'bg-brand-primary-400',
  },
  confirm: {
    label: 'Konfirmasi',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700',
    dot: 'bg-emerald-500',
  },
  cancel: {
    label: 'Batal',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-rose-300 dark:ring-rose-700',
    dot: 'bg-rose-400',
  },
};

export const DraftProgressBadge = memo(function DraftProgressBadge({ progress }: { progress: DraftProgress }) {
  const cfg = CONFIG[progress];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.className}`}
      aria-label={`Status: ${cfg.label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
});
