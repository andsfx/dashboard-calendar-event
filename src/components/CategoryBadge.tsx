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
]);

export const CategoryBadge = memo(function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#6366f1';
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
