import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { DashboardSkeleton } from '../DashboardSkeleton';
import { SectionNav } from '../SectionNav';
import type { SectionNavItem } from '../SectionNav';
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
  isSuperadmin?: boolean;
  permissions: Permissions;
  onOpenInstagramSettings: () => void;
  onOpenAlbumManager: () => void;
  onOpenLetterPicker: () => void;
  onOpenNewsManager: () => void;
  onOpenSponsorManager: () => void;
  onOpenEventAreaManager: () => void;
  onLoginClick: () => void;
  ongoingCount: number;
  upcomingCount: number;
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
  isSuperadmin,
  permissions,
  onOpenInstagramSettings,
  onOpenAlbumManager,
  onOpenLetterPicker,
  onOpenNewsManager,
  onOpenSponsorManager,
  onOpenEventAreaManager,
  onLoginClick,
  ongoingCount,
  upcomingCount,
  publicSectionItems,
  children,
  modals,
}: DashboardShellProps) {
  const { pathname } = useLocation();
  return (
    <div className="ui-dashboard-page wf-page min-h-dvh transition-colors duration-300 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none ui-focus-ring"
      >
        Lewati ke konten utama
      </a>

      {isAdmin && (
        <AdminSidebar
          isDark={isDark}
          onToggleDark={onToggleDark}
          onLogout={onLogout}
          user={user}
          isSuperadmin={isSuperadmin}
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
            <div key={pathname} className="dashboard-fade">
              {children}
            </div>

            <footer className="mt-2 border-t border-[var(--wf-rule)] pb-4 pt-4">
              <div className="flex flex-col gap-2 text-left text-xs text-[var(--wf-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
                <p>&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
                <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                  <span className="wf-key wf-key--live wf-key--plain">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    {ongoingCount} berlangsung
                  </span>
                  <span className="wf-key wf-key--idle wf-key--plain">
                    <span className="h-1.5 w-1.5 rounded-full border border-current" aria-hidden="true" />
                    {upcomingCount} mendatang
                  </span>
                </div>
              </div>
            </footer>
          </main>
        )}
      </div>

      {modals}
    </div>
  );
}
