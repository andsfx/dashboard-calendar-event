export interface BarItem {
  label: string;
  value: number;
  /** Kelas Tailwind untuk batang, mis. `bg-[var(--wf-accent)]`. */
  tone?: string;
  hint?: string;
}

export interface BarListProps {
  items: BarItem[];
  emptyMessage?: string;
  /** Angka maksimum untuk skala; default mengikuti nilai terbesar. */
  max?: number;
}

/**
 * Bar chart horizontal sederhana (CSS saja, tanpa library chart).
 * Lebar batang relatif terhadap nilai terbesar agar proporsi tetap terbaca.
 */
export function BarList({ items, emptyMessage = 'Belum ada data', max }: BarListProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--wf-ink-muted)]">{emptyMessage}</p>;
  }

  const peak = max ?? Math.max(...items.map(item => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map(item => {
        const percent = Math.max(2, Math.round((item.value / peak) * 100));
        return (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-[var(--wf-ink)]">{item.label}</span>
              <span className="shrink-0 tabular-nums text-[var(--wf-ink-muted)]">{item.hint ?? item.value}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--wf-board-2)]">
              <div
                className={`h-full rounded-full ${item.tone ?? 'bg-[var(--wf-accent)]'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
