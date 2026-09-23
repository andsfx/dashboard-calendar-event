import { memo } from 'react';
import { DraftProgress } from '../../types';

const CONFIG: Record<DraftProgress, { label: string; className: string; dot: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-[var(--wf-action)]/10 text-[var(--wf-action)] ring-1 ring-[var(--wf-action)]/30',
    dot: 'bg-[var(--wf-action)]',
  },
  confirm: {
    label: 'Konfirmasi',
    className: 'bg-[var(--wf-live)]/10 text-[var(--wf-live)] ring-1 ring-[var(--wf-live)]/30',
    dot: 'bg-[var(--wf-live)]',
  },
  cancel: {
    label: 'Batal',
    className: 'bg-red-600/10 text-red-700 ring-1 ring-red-600/30 dark:text-red-300',
    dot: 'bg-red-600',
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
