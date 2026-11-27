import { memo } from 'react';
import { Badge } from '../shadcn/badge';

const CONFIG = {
  // Merah pekat + teks `--wf-accent-ink`: latar tint 10% di atas nada kartu
  // (mis. `--wf-action`/10 di Timeline) hanya 4.46:1 — di bawah ambang 4.5.
  // Isian pekat membuat rasio tidak lagi bergantung pada latar induk.
  high:   { label: 'Prioritas Tinggi', className: 'bg-[var(--wf-danger)] text-[var(--wf-accent-ink)]' },
  medium: { label: 'Sedang',           className: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]' },
  low:    { label: 'Rendah',           className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' },
};

export const PriorityBadge = memo(function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const cfg = CONFIG[priority];
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center h-auto w-auto rounded-md border-transparent px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </Badge>
  );
});
