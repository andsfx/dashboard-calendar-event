import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../ui/Navbar';
import { DashboardSkeleton } from '../ui/DashboardSkeleton';
import { SectionNav } from '../ui/SectionNav';
import type { SectionNavItem } from '../ui/SectionNav';
import { AdminSidebar } from './AdminSidebar';
import type { AuthUser } from '../../types/auth';
import type { Permissions } from '../../hooks/usePermission';

export interface DashboardShellProps {
  isAdmin: boolean;
  isLoading: boolean;
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  user?: AuthUser | null;
  permissions: Permissions;
  onOpenInstagramSettings: () => void;
  onOpenAlbumManager: () => void;
  onOpenLetterPicker: () => void;
  onOpenNewsManager: () => void;
  onOpenSponsorManager: () => void;
  onOpenEventAreaManager: () => void;
  onLoginClick: () => void;
  ongoingCount: number;
  publicSectionItems: SectionNavItem[];
  children: ReactNode;
  modals: ReactNode;
}

/** Chrome for /dashboard/* — sidebar, navbar, skip-link, main frame. Sections stay in App. */
export function DashboardShell({
  isAdmin,
  isLoading,
  isDark,
  onToggleDark,
  onLogout,
  user,
  permissions,
  onOpenInstagramSettings,
  onOpenAlbumManager,
  onOpenLetterPicker,
  onOpenNewsManager,
  onOpenSponsorManager,
  onOpenEventAreaManager,
  onLoginClick,
  ongoingCount,
  publicSectionItems,
  children,
  modals,
}: DashboardShellProps) {
  const { pathname } = useLocation();
  return (
    <div className="ui-dashboard-page wf-page min-h-dvh transition-colors duration-300">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)] focus:shadow-lg focus:outline-none ui-focus-ring"
      >
        Lewati ke konten utama
      </a>

      {isAdmin && (
        <AdminSidebar
          isDark={isDark}
          onToggleDark={onToggleDark}
          onLogout={onLogout}
          user={user}
          permissions={permissions}
          onOpenInstagramSettings={onOpenInstagramSettings}
          onOpenAlbumManager={onOpenAlbumManager}
          onOpenLetterPicker={onOpenLetterPicker}
          onOpenNewsManager={onOpenNewsManager}
          onOpenSponsorManager={onOpenSponsorManager}
          onOpenEventAreaManager={onOpenEventAreaManager}
        />
      )}

      <div className={isAdmin ? 'lg:ml-64' : ''}>
        <Navbar
          isDark={isDark}
          onToggleDark={onToggleDark}
          isAdmin={isAdmin}
          onLoginClick={onLoginClick}
          ongoingCount={ongoingCount}
        />

        {!isAdmin && !isLoading && <SectionNav items={publicSectionItems} />}

        {isLoading ? (
          <DashboardSkeleton isAdmin={isAdmin} />
        ) : (
          <main
            id="main-content"
            tabIndex={-1}
            className={`${isAdmin ? 'w-full px-4 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl px-3 sm:px-4'} py-4 sm:py-6 space-y-4 sm:space-y-6 transition-opacity duration-150 outline-none`}
          >
            {/* `space-y-6` lives here, not on <main>: the fade wrapper is
                <main>'s only child, so the sections inside it would otherwise
                have no gap between them. Admin only — public sections already
                carry their own spacing. */}
            <div key={pathname} className={`dashboard-fade ${isAdmin ? 'space-y-6' : ''}`}>
              {children}
            </div>

            {/* Footer: one line, no counts. The ongoing/upcoming numbers
                already live in the topbar beacon and in DashboardStats; a third
                copy down here repeated them at the lowest visual weight, which
                made the page look like it had three sources of truth.
                The right-hand label is conditional: this shell also renders the
                public /tenant-survey-results page, so claiming "Panel Admin"
                unconditionally would mislabel a visitor-facing surface. */}
            <footer className="mt-2 border-t border-[var(--wf-rule)] pb-4 pt-4">
              <div className="flex flex-col gap-2 text-left text-xs text-[var(--wf-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
                <p>&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
                <p className="sm:text-right">
                  {isAdmin ? 'Jadwal Event \u00b7 Panel Admin' : 'Jadwal Event'}
                </p>
              </div>
            </footer>
          </main>
        )}
      </div>

      {modals}
    </div>
  );
}
