import { useId } from 'react';
import { Search } from 'lucide-react';
import { EventStatus } from '../../types';
import { Label } from '../shadcn/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../shadcn/select';
import { NativeSelect } from '../shadcn/native-select';
import { Input } from '../shadcn/input';

const STATUS_TABS: Array<{ key: EventStatus | 'Semua'; label: string; dot?: string }> = [
  { key: 'Semua',    label: 'Semua' },
  { key: 'draft',    label: 'Internal',     dot: 'bg-[var(--wf-accent)]' },
  { key: 'ongoing',  label: 'Berlangsung',  dot: 'bg-[var(--wf-live)]' },
  { key: 'upcoming', label: 'Mendatang',    dot: 'bg-[var(--wf-action)]' },
  { key: 'past',     label: 'Selesai',      dot: 'bg-[var(--wf-ink-muted)]' },
];


const PRIORITY_OPTIONS = [
  { key: 'Semua',  label: 'Semua prioritas' },
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
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
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
  dateFrom?: string;
  onDateFromChange?: (value: string) => void;
  dateTo?: string;
  onDateToChange?: (value: string) => void;
  showDraft?: boolean;
  showPriority?: boolean;
}

/**
 * Baris filter dashboard.
 *
 * Toolbar filter berlabel di atas kontrol (pola `toolbar` prototipe Open
 * Design): cari, status, kategori, bulan, prioritas. Penghapusan filter terjadi
 * di satu tempat — tombol "Hapus filter" pada topline hasil — bukan lewat chip
 * per-filter yang menduplikasi keadaan kontrol di atasnya.
 */
export function FilterBar({
  searchQuery = '',
  onSearchChange,
  activeFilter, onFilterChange,
  categories, activeCategory, onCategoryChange,
  activePriority, onPriorityChange,
  months, activeMonth, onMonthChange,
  dateFrom = '',
  onDateFromChange,
  dateTo = '',
  onDateToChange,
  showDraft = true,
  showPriority = true,
}: Props) {
  const fieldLabel = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wf-ink-muted)]';
  const filterId = useId();
  const categoryOptions = normalizeOptionKeys(categories ?? []).map(c => ({ value: c, label: c === 'Semua' ? 'Semua kategori' : c }));
  const monthOptions = (months ?? []).map(m => ({ value: m, label: m === 'Semua' ? 'Semua bulan' : m }));
  const priorityOptions = PRIORITY_OPTIONS.map(o => ({ value: o.key, label: o.label }));
  const statusTabs = showDraft ? STATUS_TABS : STATUS_TABS.filter(tab => tab.key !== 'draft');
  const dropdownCols = showPriority ? 'grid grid-cols-1 gap-2 sm:grid-cols-3' : 'grid grid-cols-1 gap-2 sm:grid-cols-2';

  return (
    /* Blok kontrol filter = landmark `search`, bukan `<div>`: pengguna SR bisa
       melompat langsung ke sini dan filter halaman lain (survei, arsip) tidak
       tertukar dengan tabel di bawahnya. */
    <search
      aria-label="Filter acara"
      className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-3 sm:p-4"
    >
      {/* Toolbar filter: label di atas kontrol, satu baris di layar lebar —
          pola yang sama dengan `toolbar` prototipe Open Design. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <div className="sm:col-span-2 lg:col-span-1">
          <Label htmlFor={`${filterId}-cari`} className={fieldLabel}>Cari nama event</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--wf-ink-muted)]"
              aria-hidden="true"
            />
            <Input
              id={`${filterId}-cari`}
              type="search"
              value={searchQuery}
              onChange={event => onSearchChange?.(event.target.value)}
              placeholder="Cari nama event…"
              autoComplete="off"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`${filterId}-status`} className={fieldLabel}>Status</Label>
          <NativeSelect
            id={`${filterId}-status`}
            value={activeFilter}
            onChange={event => onFilterChange(event.target.value as EventStatus | 'Semua')}
            className="w-full"
          >
            {statusTabs.map(tab => (
              <option key={tab.key} value={tab.key}>
                {tab.key === 'Semua' ? 'Semua status' : tab.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div>
          <Label htmlFor={`${filterId}-kategori`} className={fieldLabel}>Kategori</Label>
          <Select value={activeCategory} onValueChange={onCategoryChange}>
            <SelectTrigger id={`${filterId}-kategori`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${filterId}-bulan`} className={fieldLabel}>Bulan</Label>
          <Select value={activeMonth} onValueChange={onMonthChange}>
            <SelectTrigger id={`${filterId}-bulan`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${filterId}-dari`} className={fieldLabel}>Dari tanggal</Label>
          <Input
            id={`${filterId}-dari`}
            type="date"
            value={dateFrom}
            onChange={event => onDateFromChange?.(event.target.value)}
            max={dateTo || undefined}
            className="h-10"
          />
        </div>

        <div>
          <Label htmlFor={`${filterId}-sampai`} className={fieldLabel}>Sampai tanggal</Label>
          <Input
            id={`${filterId}-sampai`}
            type="date"
            value={dateTo}
            onChange={event => onDateToChange?.(event.target.value)}
            min={dateFrom || undefined}
            className="h-10"
          />
        </div>

        {showPriority && (
          <div>
            <Label htmlFor={`${filterId}-prioritas`} className={fieldLabel}>Prioritas</Label>
            <Select value={activePriority} onValueChange={onPriorityChange}>
              <SelectTrigger id={`${filterId}-prioritas`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

    </search>
  );
}
