import { memo } from 'react';
import { Badge } from '../shadcn/badge';

const CONFIG = {
  high:   { label: 'Prioritas Tinggi', className: 'bg-[var(--wf-danger)]/10 text-[var(--wf-danger)]' },
  medium: { label: 'Sedang',           className: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]' },
  low:    { label: 'Rendah',           className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' },
};

export const PriorityBadge = memo(function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const cfg = CONFIG[priority];
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center h-auto w-auto rounded-md border-transparent px-2 py-0.5 text-xs font-medium ${cfg.className}`}
      aria-label={cfg.label}
    >
      {cfg.label}
    </Badge>
  );
});
