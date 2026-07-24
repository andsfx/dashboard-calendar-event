import { memo, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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
import type { DashboardNavItem } from './dashboardNavigation';

interface AdminSidebarProps {
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
}

const navItemBase =
  'ui-focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition';

export const AdminSidebar = memo(function AdminSidebar({
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
}: AdminSidebarProps) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  const navGroups = useMemo(() => getDashboardNavGroups(permissions, {
    onOpenInstagramSettings,
    onOpenAlbumManager,
    onOpenLetterPicker,
  }), [onOpenInstagramSettings, onOpenAlbumManager, onOpenLetterPicker, permissions]);

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
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg ui-gradient-primary shadow-md">
            <LayoutDashboard className="h-4 w-4 text-white" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Panel Admin</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Dashboard Event</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeMobile}
          className="ui-focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Navigasi admin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map(item => {
                const active = isActive(item);
                return item.action === 'route' && item.route ? (
                  <Link
                    key={item.id}
                    to={item.route}
                    onClick={() => handleNavClick(item)}
                    aria-current={active ? 'page' : undefined}
                    className={`${navItemBase} ${
                      active
                        ? 'ui-gradient-primary text-white shadow-lg shadow-brand-primary-500/30'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item)}
                    className={`${navItemBase} w-full text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-black/[0.06] px-3 py-3 dark:border-slate-700">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onToggleDark}
            className={`${navItemBase} w-full text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800`}
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-500" strokeWidth={1.5} aria-hidden />
                <span>Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                <span>Mode Gelap</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-[var(--brand-card)] px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            {isSuperadmin ? (
              <Crown className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" strokeWidth={1.5} aria-hidden />
            ) : (
              <Shield className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                {user?.display_name || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isSuperadmin ? 'Superadmin' : isLegacy ? 'Admin (legacy)' : 'Administrator'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className={`${navItemBase} w-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20`}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={hamburgerRef}
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="ui-dashboard-control ui-focus-ring fixed left-4 top-20 z-40 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition hover:bg-[var(--brand-card)] dark:hover:bg-slate-700 lg:hidden"
        aria-label="Buka menu"
        aria-expanded={isMobileOpen}
        aria-controls="admin-sidebar"
      >
        <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" strokeWidth={1.5} aria-hidden />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        id="admin-sidebar"
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-black/[0.06] bg-[var(--brand-card-light)] shadow-xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu admin"
      >
        {sidebarContent}
      </aside>
    </>
  );
});
