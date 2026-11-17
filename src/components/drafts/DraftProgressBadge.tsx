import { memo } from 'react';
import { DraftProgress } from '../../types';
import { Badge } from '../shadcn/badge';

const CONFIG: Record<DraftProgress, { label: string; className: string; dot: string }> = {
  draft: {
    label: 'Draf',
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
    // Teks status sudah terlihat; tanpa aria-label pada `<span>` generic
    // (axe aria-prohibited-attr). DESIGN.md:534: ketiga badge berbasis Badge.
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 rounded-full border-transparent px-2.5 py-1 text-xs font-medium ${cfg.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </Badge>
  );
});
