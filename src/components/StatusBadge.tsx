import { EventStatus } from '../types';

const CONFIG: Record<EventStatus, { label: string; className: string; dot: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-1 ring-purple-300 dark:ring-purple-700',
    dot: 'bg-purple-400',
  },
  ongoing: {
    label: 'Berlangsung',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700',
    dot: 'bg-emerald-500 animate-pulse',
  },
  upcoming: {
    label: 'Mendatang',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700',
    dot: 'bg-amber-500',
  },
  past: {
    label: 'Selesai',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700',
    dot: 'bg-slate-400',
  },
};


interface Props {
  status: EventStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'} ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
