import { EventStatus } from '../../types';
import { MdChip, MdSelect } from '../md';

const STATUS_TABS: Array<{ key: EventStatus | 'Semua'; label: string; dot?: string }> = [
  { key: 'Semua',    label: 'Semua' },
  { key: 'draft',    label: 'Internal',     dot: 'bg-[var(--wf-accent)]' },
  { key: 'ongoing',  label: 'Berlangsung',  dot: 'bg-[var(--wf-live)]' },
  { key: 'upcoming', label: 'Mendatang',    dot: 'bg-[var(--wf-action)]' },
  { key: 'past',     label: 'Selesai',      dot: 'bg-[var(--wf-ink-muted)]' },
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

/**
 * Baris filter dashboard.
 *
 * Status memakai grup chip toggle `md-filter-chip` (`aria-pressed` dipasang md
 * pada button internalnya) — BUKAN `md-tabs`: tidak ada tabpanel di bawah baris
 * ini, jadi `role="tablist"`/`role="tab"` akan menjanjikan navigasi panah
 * antar-panel yang tidak ada. `md-tabs` tetap dipakai untuk berpindah VIEW
 * (Tabel/Kalender/Kanban/Timeline) di `DashboardViewsSection`.
 * Dropdown memakai `md-outlined-select`, dan chip filter aktif memakai
 * `md-filter-chip` removable. Handler keyboard/`listbox` manual yang dulu ada
 * di sini sudah tidak diperlukan.
 */
export function FilterBar({
  activeFilter, onFilterChange,
  categories, activeCategory, onCategoryChange,
  activePriority, onPriorityChange,
  months, activeMonth, onMonthChange,
  showDraft = true,
  showPriority = true,
}: Props) {
  const categoryOptions = normalizeOptionKeys(categories ?? []).map(c => ({ value: c, label: c === 'Semua' ? 'Semua Kategori' : c }));
  const monthOptions = (months ?? []).map(m => ({ value: m, label: m === 'Semua' ? 'Semua Bulan' : m }));
  const priorityOptions = PRIORITY_OPTIONS.map(o => ({ value: o.key, label: o.label }));
  const statusTabs = showDraft ? STATUS_TABS : STATUS_TABS.filter(tab => tab.key !== 'draft');
  const dropdownCols = showPriority ? 'grid grid-cols-1 gap-2 sm:grid-cols-3' : 'grid grid-cols-1 gap-2 sm:grid-cols-2';

  const activeChips = [
    activeFilter !== 'Semua' ? { key: 'status', label: `Status: ${statusTabs.find(tab => tab.key === activeFilter)?.label ?? activeFilter}`, clear: () => onFilterChange('Semua') } : null,
    activeMonth !== 'Semua' ? { key: 'month', label: `Bulan: ${activeMonth}`, clear: () => onMonthChange('Semua') } : null,
    activeCategory !== 'Semua' ? { key: 'category', label: `Kategori: ${activeCategory}`, clear: () => onCategoryChange('Semua') } : null,
    showPriority && activePriority !== 'Semua' ? { key: 'priority', label: `Prioritas: ${PRIORITY_OPTIONS.find(option => option.key === activePriority)?.label ?? activePriority}`, clear: () => onPriorityChange('Semua') } : null,
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => chip !== null);

  return (
    <div className="flex flex-col gap-3">
      {/* Filter status — grup chip toggle (`aria-pressed` dari md-filter-chip),
          bukan tablist: tidak ada tabpanel di bawah baris ini.
          Scrollable di mobile (chip `shrink-0` supaya tidak terkompresi). */}
      <div
        role="group"
        aria-label="Filter status acara"
        className="flex w-full items-center gap-2 overflow-x-auto"
      >
        {statusTabs.map(tab => (
          <MdChip
            key={tab.key}
            label={tab.label}
            selected={activeFilter === tab.key}
            onClick={() => onFilterChange(tab.key)}
            className="shrink-0"
            leadingIcon={tab.dot ? <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} aria-hidden="true" /> : undefined}
          />
        ))}
      </div>

      {/* Dropdowns row - wrap on mobile */}
      <div className={dropdownCols}>
        <MdSelect
          value={activeMonth}
          options={monthOptions}
          onChange={onMonthChange}
          ariaLabel="Semua Bulan"
        />
        <MdSelect
          value={activeCategory}
          options={categoryOptions}
          onChange={onCategoryChange}
          ariaLabel="Semua Kategori"
        />
        {showPriority && (
          <MdSelect
            value={activePriority}
            options={priorityOptions}
            onChange={onPriorityChange}
            ariaLabel="Semua Prioritas"
          />
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filter aktif">
          {activeChips.map(chip => (
            <MdChip
              key={chip.key}
              label={chip.label}
              removable
              ariaLabel={`Hapus filter ${chip.label}`}
              onRemove={chip.clear}
            />
          ))}
        </div>
      )}
    </div>
  );
}
