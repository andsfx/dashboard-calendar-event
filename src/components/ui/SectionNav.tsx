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
    const firstItem = items[0];
    if (firstItem) {
      setActiveId(firstItem.id);
    }

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
    <div className="sticky top-14 z-30 border-b border-[var(--wf-rule)] bg-[var(--wf-board)]/90 backdrop-blur-md">
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
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--wf-board)] ${
                activeId === item.id
                  ? 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]'
                  : 'text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]'
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
