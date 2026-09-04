import { memo } from 'react';

const CONFIG = {
  high:   { label: 'Prioritas Tinggi', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  medium: { label: 'Sedang',           className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  low:    { label: 'Rendah',           className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

export const PriorityBadge = memo(function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const cfg = CONFIG[priority];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cfg.className}`}
      aria-label={cfg.label}
    >
      {cfg.label}
    </span>
  );
});
