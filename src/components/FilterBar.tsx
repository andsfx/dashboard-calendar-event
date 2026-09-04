import { useState, useRef, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { EventStatus } from '../types';

const focusRing = 'ui-focus-ring';

const STATUS_TABS: Array<{ key: EventStatus | 'Semua'; label: string; dot?: string }> = [
  { key: 'Semua',    label: 'Semua' },
  { key: 'draft',    label: 'Internal',     dot: 'bg-brand-primary-400' },
  { key: 'ongoing',  label: 'Berlangsung',  dot: 'bg-emerald-500' },
  { key: 'upcoming', label: 'Mendatang',    dot: 'bg-amber-500' },
  { key: 'past',     label: 'Selesai',      dot: 'bg-slate-400' },
];


const PRIORITY_OPTIONS = [
  { key: 'Semua',  label: 'Semua Prioritas' },
  { key: 'high',   label: 'Tinggi' },
  { key: 'medium', label: 'Sedang' },
  { key: 'low',    label: 'Rendah' },
];

function normalizeOptionKeys(values: string[]) {
  return Array.from(
    new Set(
      values
        .flatMap(value => String(value || '').split(/[|,]/))
        .map(value => value.trim())
        .filter(Boolean)
    )
  );
}

/** Custom dropdown - consistent across all OS */
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
  const listboxRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.key === value);
  const currentIndex = options.findIndex(o => o.key === value);
  const cleanLabel = label.replace(/\s+/g, '-').toLowerCase();

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
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (currentIndex + 1) % options.length;
        const nextOption = options[next];
        if (nextOption) onChange(nextOption.key);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (currentIndex - 1 + options.length) % options.length;
        const prevOption = options[prev];
        if (prevOption) onChange(prevOption.key);
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, currentIndex, options, onChange]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`ui-dashboard-control flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-xs font-medium transition dark:text-slate-300 ${focusRing} ${
          open
            ? 'border-brand-primary-400 ring-2 ring-brand-primary-100 dark:border-brand-primary-600 dark:ring-brand-primary-900/30'
            : 'text-slate-700 hover:border-slate-300 dark:border-slate-600'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-controls={open ? `listbox-${cleanLabel}` : undefined}
        aria-activedescendant={open && value ? `opt-${cleanLabel}-${value}` : undefined}
      >
        <span className="truncate text-left">{selected?.label ?? label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div 
          id={`listbox-${cleanLabel}`} 
          ref={listboxRef} 
          role="listbox" 
          aria-label={label} 
          className="ui-dashboard-control absolute left-0 top-full z-40 mt-1.5 max-h-64 w-full min-w-[160px] overflow-y-auto rounded-xl py-1 shadow-xl"
        >
          {options.map(opt => (
            <button
              key={opt.key}
              id={`opt-${cleanLabel}-${opt.key}`}
              type="button"
              role="option"
              aria-selected={value === opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 ${focusRing} ${
                value === opt.key
                  ? 'bg-brand-primary-50 font-semibold text-brand-primary-700 dark:bg-brand-primary-900/30 dark:text-brand-primary-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {opt.label}
              {value === opt.key && <Check className="h-3 w-3 text-brand-primary-600 dark:text-brand-primary-400" />}
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
  showDraft?: boolean;
  showPriority?: boolean;
}

export function FilterBar({
  activeFilter, onFilterChange,
  categories, activeCategory, onCategoryChange,
  activePriority, onPriorityChange,
  months, activeMonth, onMonthChange,
  showDraft = true,
  showPriority = true,
}: Props) {
  const categoryOptions = normalizeOptionKeys(categories ?? []).map(c => ({ key: c, label: c === 'Semua' ? 'Semua Kategori' : c }));
  const monthOptions = (months ?? []).map(m => ({ key: m, label: m === 'Semua' ? 'Semua Bulan' : m }));
  const statusTabs = showDraft ? STATUS_TABS : STATUS_TABS.filter(tab => tab.key !== 'draft');
  const dropdownCols = showPriority ? 'grid grid-cols-1 gap-2 sm:grid-cols-3' : 'grid grid-cols-1 gap-2 sm:grid-cols-2';

  const statusRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleStatusKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % statusTabs.length;
      const nextTab = statusTabs[nextIndex];
      if (nextTab) {
        onFilterChange(nextTab.key);
        setTimeout(() => statusRefs.current[nextIndex]?.focus(), 0);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + statusTabs.length) % statusTabs.length;
      const prevTab = statusTabs[prevIndex];
      if (prevTab) {
        onFilterChange(prevTab.key);
        setTimeout(() => statusRefs.current[prevIndex]?.focus(), 0);
      }
    }
  };

  const activeChips = [
    activeFilter !== 'Semua' ? { key: 'status', label: `Status: ${statusTabs.find(tab => tab.key === activeFilter)?.label ?? activeFilter}`, clear: () => onFilterChange('Semua') } : null,
    activeMonth !== 'Semua' ? { key: 'month', label: `Bulan: ${activeMonth}`, clear: () => onMonthChange('Semua') } : null,
    activeCategory !== 'Semua' ? { key: 'category', label: `Kategori: ${activeCategory}`, clear: () => onCategoryChange('Semua') } : null,
    showPriority && activePriority !== 'Semua' ? { key: 'priority', label: `Prioritas: ${PRIORITY_OPTIONS.find(option => option.key === activePriority)?.label ?? activePriority}`, clear: () => onPriorityChange('Semua') } : null,
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => chip !== null);

  return (
    <div className="flex flex-col gap-3">
      {/* Status pill tabs - scrollable on mobile */}
      <div className="ui-dashboard-muted flex w-full gap-1 overflow-x-auto rounded-[0.85rem] border border-[var(--border-subtle)] p-1 dark:border-slate-700" role="tablist" aria-label="Filter status acara">
        {statusTabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(node) => { statusRefs.current[index] = node; }}
            type="button"
            role="tab"
            onClick={() => onFilterChange(tab.key)}
            onKeyDown={(e) => handleStatusKeyDown(e, index)}
            aria-selected={activeFilter === tab.key}
            tabIndex={activeFilter === tab.key ? 0 : -1}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${focusRing} ${
              activeFilter === tab.key
                ? 'bg-[var(--brand-card-light)] text-slate-800 shadow dark:bg-slate-700 dark:text-white'
: 'ui-text-muted hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.dot && (
              <span className={`h-1.5 w-1.5 rounded-full ${tab.dot} ${tab.key === 'ongoing' && activeFilter === 'ongoing' ? 'motion-safe:animate-pulse' : ''}`} aria-hidden="true" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dropdowns row - wrap on mobile */}
      <div className={dropdownCols}>
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
        {showPriority && (
          <CustomDropdown
            value={activePriority}
            options={PRIORITY_OPTIONS}
            onChange={onPriorityChange}
            label="Semua Prioritas"
          />
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filter aktif">
          {activeChips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className={`inline-flex items-center gap-1.5 rounded-full border border-brand-primary-200 bg-brand-primary-50 px-2.5 py-1 text-[11px] font-semibold text-brand-primary-700 transition hover:border-brand-primary-300 hover:bg-brand-primary-100 dark:border-brand-primary-900/50 dark:bg-brand-primary-950/40 dark:text-brand-primary-300 ${focusRing}`}
              aria-label={`Hapus filter ${chip.label}`}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
