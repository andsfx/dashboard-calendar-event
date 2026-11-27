import { Plus } from 'lucide-react';
import { Button } from '../shadcn/button';
import { getWayfindingGroup, getWayfindingMap } from './dashboardNavigation';

interface DashboardHeaderProps {
  isAdmin: boolean;
  /**
   * The route's own primary action. Only supplied by routes that do not
   * already own a create control in the page body — otherwise the plate would
   * offer a second path to a different mutation. Previously every admin route
   * passed the event creator here, so the button labelled "Tambah" opened
   * "Tambah Acara Baru" on users, analytics, activity-log, registrations and
   * drafts alike.
   */
  primaryAction?: { label: string; onClick: () => void; className?: string };
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
  primaryAction,
  dashboardPath = '/',
}: DashboardHeaderProps) {
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-[var(--wf-ink)] sm:text-2xl">
            Jadwal event
          </h1>
          <p className="mt-0.5 text-sm font-medium text-[var(--wf-ink-muted)]">
            Jadwal acara publik Metropolitan Mall Bekasi
          </p>
        </div>
      </div>
    );
  }

  const { current } = getWayfindingMap(dashboardPath);
  const sectionGroup = getWayfindingGroup(dashboardPath);
  // An empty action container is not free: it is a flex item in the parent's
  // `flex-col gap-3`, so on mobile it still contributes a gap and leaves the
  // plate looking like it is missing something. Render it only when it has
  // content. (No `secondaryActions` slot: no route needs one, and a second
  // action here would reopen the "two paths to one mutation" bug documented
  // on `primaryAction`.)
  const hasActions = Boolean(primaryAction);

  return (
    <div className="px-1 py-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--wf-ink-muted)]">
            {sectionGroup ?? 'Ruang kerja'}
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[var(--wf-ink)] sm:text-[2rem]">
            {current.label}
          </h1>
          <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">{current.description}</p>
        </div>

        {hasActions && (
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            {primaryAction && (
              <Button variant="default" onClick={primaryAction.onClick} className={`shrink-0 ${primaryAction.className ?? ''}`}>
                <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden /> <span>{primaryAction.label}</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
