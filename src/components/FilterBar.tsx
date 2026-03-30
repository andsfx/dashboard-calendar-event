import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { EventStatus } from '../types';

const STATUS_TABS: Array<{ key: EventStatus | 'Semua'; label: string; dot?: string }> = [
  { key: 'Semua',    label: 'Semua' },
  { key: 'draft',    label: 'Draft',        dot: 'bg-purple-400' },
  { key: 'ongoing',  label: 'Berlangsung',  dot: 'bg-emerald-500' },
  { key: 'upcoming', label: 'Mendatang',    dot: 'bg-amber-500' },
  { key: 'past',     label: 'Selesai',      dot: 'bg-slate-400' },
];


const PRIORITY_OPTIONS = [
  { key: 'Semua',  label: 'Semua Prioritas' },
  { key: 'high',   label: '🔴 Tinggi' },
  { key: 'medium', label: '🔵 Sedang' },
  { key: 'low',    label: '⚪ Rendah' },
];

/** Custom dropdown — consistent across all OS */
function CustomDropdown({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.key === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-xs font-medium shadow-sm transition dark:bg-slate-800 dark:text-slate-300 ${
          open
            ? 'border-violet-400 ring-2 ring-violet-100 dark:border-violet-600 dark:ring-violet-900/30'
            : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-600'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className="truncate text-left">{selected?.label ?? label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-full min-w-[160px] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {options.map(opt => (
            <button
              key={opt.key}
              type="button"
              role="option"
              aria-selected={value === opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                value === opt.key
                  ? 'bg-violet-50 font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {opt.label}
              {value === opt.key && <Check className="h-3 w-3 text-violet-600 dark:text-violet-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  activeFilter: EventStatus | 'Semua';
  onFilterChange: (f: EventStatus | 'Semua') => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  activePriority: string;
  onPriorityChange: (p: string) => void;
  months: string[];
  activeMonth: string;
  onMonthChange: (m: string) => void;
}

export function FilterBar({
  activeFilter, onFilterChange,
  categories, activeCategory, onCategoryChange,
  activePriority, onPriorityChange,
  months, activeMonth, onMonthChange,
}: Props) {
  const categoryOptions = (categories ?? []).map(c => ({ key: c, label: c === 'Semua' ? 'Semua Kategori' : c }));
  const monthOptions = (months ?? []).map(m => ({ key: m, label: m === 'Semua' ? 'Semua Bulan' : m }));

  return (
    <div className="flex flex-col gap-3">
      {/* Status pill tabs - scrollable on mobile */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              activeFilter === tab.key
                ? 'bg-white shadow text-slate-800 dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.dot && (
              <span className={`h-1.5 w-1.5 rounded-full ${tab.dot} ${tab.key === 'ongoing' && activeFilter === 'ongoing' ? 'animate-pulse' : ''}`} />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dropdowns row - wrap on mobile */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CustomDropdown
          value={activeMonth}
          options={monthOptions}
          onChange={onMonthChange}
          label="Semua Bulan"
        />
        <CustomDropdown
          value={activeCategory}
          options={categoryOptions}
          onChange={onCategoryChange}
          label="Semua Kategori"
        />
        <CustomDropdown
          value={activePriority}
          options={PRIORITY_OPTIONS}
          onChange={onPriorityChange}
          label="Semua Prioritas"
        />
      </div>
    </div>
  );
}
