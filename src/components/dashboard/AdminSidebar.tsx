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
import { getDashboardNavGroups } from './dashboardNavigation';
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
 * The pylon: a dark mall-directory totem. Group headings are zone plates, nav
 * rows are directory entries, and the current row is marked with a sign pointer
 * ("you are here"). All focus management below is load-bearing — keep it.
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
      {/* Lit logo panel — the pylon's one illuminated element */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--wf-pylon-rule)] px-4 py-4">
        <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5">
          <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-7 w-auto" />
        </span>
        <button
          type="button"
          onClick={closeMobile}
          className="wf-focus-pylon relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--wf-pylon-ink-muted)] transition-colors hover:bg-[var(--wf-pylon-2)] hover:text-[var(--wf-pylon-ink)] lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div className="px-4 pb-1 pt-4">
        <p className="wf-pylon-plate">Direktori</p>
        <p className="mt-0.5 text-[13px] font-semibold text-[var(--wf-pylon-ink)]">Menu admin</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navigasi admin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h3 className="wf-pylon-plate mb-1.5 px-2.5">{group.label}</h3>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item);
                return item.action === 'route' && item.route ? (
                  <Link
                    key={item.id}
                    to={item.route}
                    onClick={() => handleNavClick(item)}
                    aria-current={active ? 'page' : undefined}
                    className="wf-pylon-row wf-focus-pylon"
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item)}
                    className="wf-pylon-row wf-focus-pylon w-full"
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

      <div className="space-y-1.5 border-t border-[var(--wf-pylon-rule)] px-3 py-3">
        <button
          type="button"
          onClick={onToggleDark}
          aria-pressed={isDark}
          className="wf-pylon-row wf-focus-pylon w-full"
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
            the legend — the label carries it, and the icon stays pylon ink. */}
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--wf-pylon-rule)] bg-[var(--wf-pylon-2)] px-2.5 py-2.5">
          {isSuperadmin ? (
            <Crown className="h-4 w-4 shrink-0 text-[var(--wf-pylon-ink-muted)]" strokeWidth={1.5} aria-hidden />
          ) : (
            <Shield className="h-4 w-4 shrink-0 text-[var(--wf-pylon-ink-muted)]" strokeWidth={1.5} aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--wf-pylon-ink)]">
              {user?.display_name || 'Admin'}
            </p>
            <p className="text-[11px] text-[var(--wf-pylon-ink-muted)]">
              {isSuperadmin ? 'Superadmin' : 'Administrator'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="wf-pylon-row wf-focus-pylon w-full text-red-300 hover:bg-red-500/15 hover:text-red-200"
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
        className={`wf-pylon wf-pylon--side fixed left-0 top-0 z-50 h-dvh w-64 transition-transform duration-300 lg:translate-x-0 ${
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
