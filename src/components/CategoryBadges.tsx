import { CategoryBadge } from './CategoryBadge';

export function CategoryBadges({ categories, maxVisible }: { categories: string[]; maxVisible?: number }) {
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
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          +{remaining}
        </span>
      )}
    </>
  );
}
