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
  isLegacy?: boolean;
  permissions: Permissions;
  onOpenInstagramSettings: () => void;
  onOpenAlbumManager: () => void;
  onOpenLetterPicker: () => void;
  onOpenNewsManager: () => void;
  onLoginClick: () => void;
  ongoingCount: number;
  upcomingCount: number;
  publicSectionItems: SectionNavItem[];
  children: ReactNode;
  modals: ReactNode;
  toasts: ReactNode;
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
  isLegacy,
  permissions,
  onOpenInstagramSettings,
  onOpenAlbumManager,
  onOpenLetterPicker,
  onOpenNewsManager,
  onLoginClick,
  ongoingCount,
  upcomingCount,
  publicSectionItems,
  children,
  modals,
  toasts,
}: DashboardShellProps) {
  const { pathname } = useLocation();
  return (
    <div className="ui-dashboard-page min-h-screen transition-colors duration-300 dark:bg-slate-950">
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
          isLegacy={isLegacy}
          permissions={permissions}
          onOpenInstagramSettings={onOpenInstagramSettings}
          onOpenAlbumManager={onOpenAlbumManager}
          onOpenLetterPicker={onOpenLetterPicker}
          onOpenNewsManager={onOpenNewsManager}
        />
      )}

      <div className={isAdmin ? 'lg:ml-64' : ''}>
        <Navbar
          isDark={isDark}
          onToggleDark={onToggleDark}
          isAdmin={isAdmin}
          isSuperadmin={isSuperadmin}
          isLegacy={isLegacy}
          user={user}
          onLoginClick={onLoginClick}
          onLogout={onLogout}
          ongoingCount={ongoingCount}
        />

        {!isAdmin && !isLoading && <SectionNav items={publicSectionItems} />}

        {isLoading ? (
          <DashboardSkeleton isAdmin={isAdmin} />
        ) : (
          <main id="main-content" className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 transition-opacity duration-150">
            <div key={pathname} className="dashboard-fade">
              {children}
            </div>

            <footer className="border-t border-slate-200 pt-4 sm:pt-6 pb-4 dark:border-slate-800">
              <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
                <p>&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end sm:gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary-500 live-dot" aria-hidden="true" />
                    <span>{ongoingCount} berlangsung</span>
                  </span>
                  <span className="hidden sm:inline">·</span>
                  <span>{upcomingCount} mendatang</span>
                </div>
              </div>
            </footer>
          </main>
        )}
      </div>

      {modals}
      {toasts}
    </div>
  );
}
