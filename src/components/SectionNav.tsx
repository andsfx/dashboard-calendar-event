import { useEffect, useMemo, useState } from 'react';

export interface SectionNavItem {
  id: string;
  label: string;
}

interface Props {
  items: SectionNavItem[];
}

export function SectionNav({ items }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id || '');

  const ids = useMemo(() => items.map(item => item.id), [items]);

  useEffect(() => {
    if (items.length === 0) return;
    setActiveId(items[0].id);

    const sections = ids
      .map(id => document.getElementById(id))
      .filter((section): section is HTMLElement => !!section);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-140px 0px -55% 0px',
        threshold: [0.15, 0.3, 0.5, 0.75],
      }
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [ids, items]);

  if (items.length === 0) return null;

  return (
    <div className="sticky top-14 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/90">
      <div className="mx-auto max-w-7xl overflow-x-auto px-3 py-2 sm:px-4">
        <div className="flex min-w-max items-center gap-2">
          {items.map(item => (
            <button
              key={item.id}
      onClick={() => {
                const el = document.getElementById(item.id);
                if (!el) return;
                const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
              }}
              aria-current={activeId === item.id ? 'true' : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                activeId === item.id
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
