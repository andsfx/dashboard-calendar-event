import { Plus } from 'lucide-react';
import { SearchBar } from '../SearchBar';
import { getWayfindingMap } from './dashboardNavigation';

interface DashboardHeaderProps {
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddNew?: () => void;
  /** Admin route path relative to /dashboard ('/', '/events', …) */
  dashboardPath?: string;
}

/**
 * The location plate: the route's own `h1`, its description, and its actions,
 * under a breadcrumb that states where the reader is. There is deliberately no
 * kicker line above the heading — the heading carries its own weight — and no
 * sibling index, which would only duplicate the pylon.
 */
export function DashboardHeader({
  isAdmin,
  searchQuery,
  onSearchChange,
  onAddNew,
  dashboardPath = '/',
}: DashboardHeaderProps) {
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-[var(--wf-ink)] sm:text-2xl">
            Jadwal Event
          </h1>
          <p className="mt-0.5 text-sm font-medium text-[var(--wf-ink-muted)]">
            Jadwal acara publik Metropolitan Mall Bekasi
          </p>
        </div>
      </div>
    );
  }

  const { current } = getWayfindingMap(dashboardPath);

  return (
    <div className="wf-plate px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-[var(--wf-ink)] sm:text-2xl">
            {current.label}
          </h1>
          <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">{current.description}</p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-[260px]">
            <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Cari acara…" />
          </div>
          {onAddNew && (
            <button onClick={onAddNew} className="wf-btn wf-btn--primary shrink-0">
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden /> <span>Tambah</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
