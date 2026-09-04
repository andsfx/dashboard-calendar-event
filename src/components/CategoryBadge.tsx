import { memo } from 'react';
import { CATEGORY_COLORS } from '../utils/eventUtils';

// Categories that need dark text for WCAG AA contrast (4.5:1) with their background color
const DARK_TEXT_CATEGORIES = new Set([
  'Festival',   // #f59e0b (amber)
  'Anak',       // #fb923c (orange)
  'Kuliner',    // #d97706 (dark amber)
  'Karir',      // #84cc16 (lime)
  'Olahraga',   // #22c55e (green)
  'Seni',       // #f97316 (orange)
  'Workshop',   // #06b6d4 (cyan — light, needs dark text)
  'Seminar',    // #3b82f6 (blue-500 — white on it = 3.68:1 < AA)
  'Kompetisi',  // #f43f5e (rose-500 — white on it = 3.67:1 < AA)
  'Pameran',    // #10b981 (emerald — light, needs dark text)
  'Hiburan',    // #0ea5e9 (sky-500 — white on it = 2.77:1, worst offender)
]);

export const CategoryBadge = memo(function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#00918e';
  const useDarkText = DARK_TEXT_CATEGORIES.has(category);
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${useDarkText ? 'text-slate-900' : 'text-white'}`}
      style={{ backgroundColor: color }}
    >
      {category}
    </span>
  );
});
