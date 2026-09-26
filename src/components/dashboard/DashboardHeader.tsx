import { Plus } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { getWayfindingMap } from './dashboardNavigation';

interface DashboardHeaderProps {
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /**
   * The route's own primary action. Only supplied by routes that do not
   * already own a create control in the page body — otherwise the plate would
   * offer a second path to a different mutation. Previously every admin route
   * passed the event creator here, so the button labelled "Tambah" opened
   * "Tambah Acara Baru" on users, analytics, activity-log, registrations and
   * drafts alike.
   */
  primaryAction?: { label: string; onClick: () => void };
  /**
   * Whether this route has an event list the plate search actually filters.
   * The plate search writes to the shared event filter, so on every other
   * route it was a visible control that changed nothing.
   */
  searchable?: boolean;
  /** Admin route path relative to /dashboard ('/', '/events', …) */
  dashboardPath?: string;
}

/**
 * The location plate: the route's own `h1`, its description, and its actions.
 * There is deliberately no kicker line above the heading — the heading carries
 * its own weight — and no sibling index, which would only duplicate the pylon.
 */
export function DashboardHeader({
  isAdmin,
  searchQuery,
  onSearchChange,
  primaryAction,
  searchable = false,
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
          {searchable && (
            <div className="w-full sm:w-[260px]">
              <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Cari acara…" />
            </div>
          )}
          {primaryAction && (
            <button onClick={primaryAction.onClick} className="wf-btn wf-btn--primary shrink-0">
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden /> <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
