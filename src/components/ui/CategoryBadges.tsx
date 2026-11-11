import { memo } from 'react';
import { Badge } from '../shadcn/badge';
import { CategoryBadge } from './CategoryBadge';

export const CategoryBadges = memo(function CategoryBadges({ categories, maxVisible }: { categories: string[]; maxVisible?: number }) {
  const uniqueCategories = Array.from(new Set(categories.filter(Boolean)));
  const visible = typeof maxVisible === 'number' ? uniqueCategories.slice(0, maxVisible) : uniqueCategories;
  const remaining = uniqueCategories.length - visible.length;

  if (uniqueCategories.length === 0) {
    return null;
  }

  return (
    <>
      {visible.map(category => <CategoryBadge key={category} category={category} />)}
      {remaining > 0 && (
        <Badge
          variant="outline"
          aria-label={`${remaining} kategori lainnya`}
          className="inline-flex h-auto w-auto items-center rounded-md border-transparent bg-[var(--wf-board-2)] px-2 py-0.5 text-xs font-medium text-[var(--wf-ink-muted)]"
        >
          +{remaining}
        </Badge>
      )}
    </>
  );
});
