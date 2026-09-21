import { memo, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Moon,
  Sun,
  LogOut,
  Shield,
  Crown,
  Menu,
  X,
} from 'lucide-react';
import type { AuthUser } from '../../types/auth';
import type { Permissions } from '../../hooks/usePermission';
import { getDashboardNavGroups, getWayfindingMap } from './dashboardNavigation';
import mallLogo from '../../assets/brand/LOGOMETMAL2016-01.svg';
import type { DashboardNavItem } from './dashboardNavigation';

interface AdminSidebarProps {
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
}

/**
 * The rail: the admin navigation panel. A board surface like every other panel,
 * separated from the page by a hairline — the active row is an accent FILL, not
 * a coloured side-stripe. Group labels come from getDashboardNavGroups, so the
 * rail never invents a destination. All focus management below is load-bearing
 * — keep it.
 */
export const AdminSidebar = memo(function AdminSidebar({
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
}: AdminSidebarProps) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  // Track lg breakpoint so `inert` only applies to the closed mobile drawer
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const navGroups = useMemo(() => getDashboardNavGroups(permissions, {
    onOpenInstagramSettings,
    onOpenAlbumManager,
    onOpenLetterPicker,
    onOpenNewsManager,
    onOpenSponsorManager,
    onOpenEventAreaManager,
  }), [onOpenInstagramSettings, onOpenAlbumManager, onOpenLetterPicker, onOpenNewsManager, onOpenSponsorManager, onOpenEventAreaManager, permissions]);

  // Same source the page header reads, so the two can never disagree.
  const currentLocation = useMemo(
    () => getWayfindingMap(location.pathname.replace(/^\/dashboard/, '') || '/').current,
    [location.pathname],
  );

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const handleNavClick = (item: DashboardNavItem) => {
    if (item.action === 'callback' && item.callback) {
      item.callback();
    }
    setIsMobileOpen(false);
  };

  const isActive = (item: DashboardNavItem) => {
    if (item.action === 'route' && item.route) {
      return location.pathname === item.route;
    }
    return false;
  };

  // Escape + basic focus trap when mobile drawer open
  useEffect(() => {
    if (!isMobileOpen) {
      if (wasOpenRef.current) {
        hamburgerRef.current?.focus();
        wasOpenRef.current = false;
      }
      return;
    }
    wasOpenRef.current = true;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobile();
        return;
      }
      if (e.key !== 'Tab' || !asideRef.current) return;

      const focusable = asideRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Focus first focusable in drawer
    requestAnimationFrame(() => {
      const first = asideRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      first?.focus();
    });

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileOpen, closeMobile]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Identity: the mall wordmark, then where you are right now. The current
          route label is the same string the page header uses, so the rail and
          the plate can never disagree. */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--wf-rail-rule)] px-4 py-4">
        <div className="min-w-0">
          {/* The wordmark's darkest fills (deep tosca, maroon) measure 1.39:1 on
              the dark rail and 11.89:1 on white, so dark mode gives it a plate.
              On the light rail it sits directly on the board — a white box
              there would read as a stray card. */}
          <span className="inline-flex items-center rounded-lg dark:bg-white dark:px-2 dark:py-1.5">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-7 w-auto" />
          </span>
          <p className="mt-1.5 truncate text-[11px] text-[var(--wf-rail-ink-muted)]">
            {currentLocation.label}
          </p>
        </div>
        <button
          type="button"
          onClick={closeMobile}
          className="wf-focus-rail relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--wf-rail-ink-muted)] transition-colors hover:bg-[var(--wf-rail-2)] hover:text-[var(--wf-rail-ink)] lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navigasi admin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h3 className="wf-rail-plate mb-1.5 px-2.5">{group.label}</h3>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item);
                return item.action === 'route' && item.route ? (
                  <Link
                    key={item.id}
                    to={item.route}
                    onClick={() => handleNavClick(item)}
                    aria-current={active ? 'page' : undefined}
                    className="wf-rail-row wf-focus-rail"
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item)}
                    className="wf-rail-row wf-focus-rail w-full"
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1.5 border-t border-[var(--wf-rail-rule)] px-3 py-3">
        <button
          type="button"
          onClick={onToggleDark}
          aria-pressed={isDark}
          className="wf-rail-row wf-focus-rail w-full"
        >
          {isDark ? (
            <>
              <Sun className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span>Mode Terang</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span>Mode Gelap</span>
            </>
          )}
        </button>

        {/* Role plate. Role identity is not a status, so it takes no colour from
            the legend — the label carries it and the icon stays rail ink. */}
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--wf-rail-rule)] px-2.5 py-2.5">
          {isSuperadmin ? (
            <Crown className="h-4 w-4 shrink-0 text-[var(--wf-rail-ink-muted)]" strokeWidth={1.5} aria-hidden />
          ) : (
            <Shield className="h-4 w-4 shrink-0 text-[var(--wf-rail-ink-muted)]" strokeWidth={1.5} aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--wf-rail-ink)]">
              {user?.display_name || 'Admin'}
            </p>
            <p className="text-[11px] text-[var(--wf-rail-ink-muted)]">
              {isSuperadmin ? 'Superadmin' : 'Administrator'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="wf-rail-row wf-focus-rail w-full text-red-700 hover:bg-red-600/10 dark:text-red-300 dark:hover:bg-red-500/15"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={hamburgerRef}
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="ui-focus-ring fixed left-3 top-2.5 z-50 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        aria-label="Buka menu"
        aria-expanded={isMobileOpen}
        aria-controls="admin-sidebar"
      >
        <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" strokeWidth={1.5} aria-hidden />
      </button>

      {isMobileOpen && (
        <button
          type="button"
          onClick={closeMobile}
          className="fixed inset-0 z-40 h-full w-full cursor-default bg-black/50 backdrop-blur-sm lg:hidden"
          aria-label="Tutup menu"
          tabIndex={-1}
        />
      )}

      <aside
        ref={asideRef}
        id="admin-sidebar"
        className={`wf-rail wf-rail--side fixed left-0 top-0 z-50 h-dvh w-64 transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu admin"
        inert={!isMobileOpen && !isDesktop}
      >
        {sidebarContent}
      </aside>
    </>
  );
});
