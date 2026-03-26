import { Filter } from 'lucide-react';
import { FilterType } from '../types';

interface FilterBarProps {
  filters: string[];
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterBar({ filters, activeFilter, onFilterChange, totalCount, filteredCount }: FilterBarProps) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Filter Bulan
          </h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Menampilkan <span className="text-slate-600 dark:text-slate-300">{filteredCount}</span> dari {totalCount} acara
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeFilter === filter
                ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}
