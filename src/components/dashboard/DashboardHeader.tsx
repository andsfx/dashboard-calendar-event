import { Plus } from 'lucide-react';
import { SearchBar } from '../SearchBar';

interface DashboardHeaderProps {
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddNew?: () => void;
}

export function DashboardHeader({
  isAdmin,
  searchQuery,
  onSearchChange,
  onAddNew,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {isAdmin ? 'Dashboard Event' : 'Jadwal Event'}
        </h1>
        <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
          {isAdmin
            ? '10 acara dalam pipeline · 2 sedang berlangsung'
            : 'Jadwal acara publik Metropolitan Mall Bekasi'}
        </p>
      </div>
      {isAdmin && (
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-[320px]">
            <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Cari acara…" />
          </div>
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="flex items-center justify-center gap-1.5 rounded-xl ui-btn-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-primary-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 focus-visible:ring-offset-2 dark:shadow-brand-primary-900/30 dark:focus-visible:ring-offset-slate-950 shrink-0"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden /> <span>Tambah</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
