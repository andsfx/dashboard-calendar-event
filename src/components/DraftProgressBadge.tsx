import { DraftProgress } from '../types';

const CONFIG: Record<DraftProgress, { label: string; className: string; dot: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-1 ring-purple-300 dark:ring-purple-700',
    dot: 'bg-purple-400',
  },
  confirm: {
    label: 'Confirm',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700',
    dot: 'bg-emerald-500',
  },
  cancel: {
    label: 'Cancel',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-rose-300 dark:ring-rose-700',
    dot: 'bg-rose-400',
  },
};

export function DraftProgressBadge({ progress }: { progress: DraftProgress }) {
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
}
