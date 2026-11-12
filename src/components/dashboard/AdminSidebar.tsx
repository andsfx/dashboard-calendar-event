import { memo, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Moon,
  Sun,
  LogOut,
  Shield,
  Crown,
  Menu,
  Wrench,
  X,
} from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent } from '../shadcn/sheet';
import { Button } from '../shadcn/button';
import type { AuthUser } from '../../types/auth';
import type { Permissions } from '../../hooks/usePermission';
import { ROLE_DISPLAY_NAMES } from '../../utils/roleDisplay';
import { getDashboardNavGroups, getWayfindingMap } from './dashboardNavigation';
import mallLogo from '../../assets/brand/LOGOMETMAL2016-01.svg';
import type { DashboardNavItem } from './dashboardNavigation';

interface AdminSidebarProps {
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
}

/**
 * The rail: the admin navigation panel. A board surface like every other panel,
 * separated from the page by a hairline.
 *
 * Mobile drawer: a shadcn Sheet (Radix Dialog). Radix natively handles Escape,
 * the Tab focus trap, scroll lock and aria-modal, so the manual keydown trap
 * and the manual backdrop button were removed — behavioural outcome is
 * identical. Focus restore to the hamburger is kept explicitly: Radix returns
 * focus to the trigger on Escape, but closing via the drawer's own "Tutup"
 * button or a nav row unmounts the sheet instead, so the effect below is the
 * guaranteed restore path for every close route.
 *
 * The sheet is portaled to document.body, so the wf-rail surface classes ride
 * on SheetContent's className (unlayered .wf-rail/.wf-rail--side still win over
 * Sheet's layered bg-popover / border-r utilities — no colour change).
 */
export const AdminSidebar = memo(function AdminSidebar({
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
}: AdminSidebarProps) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
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

  // Focus restore to the hamburger on drawer close (was part of the manual
  // Escape/Tab trap effect; Radix Sheet covers Escape + Tab trap + scroll lock
  // itself, only this close-focus guarantee is kept).
  useEffect(() => {
    if (!isMobileOpen) {
      if (wasOpenRef.current) {
        hamburgerRef.current?.focus();
        wasOpenRef.current = false;
      }
      return;
    }
    wasOpenRef.current = true;
  }, [isMobileOpen]);

  // Shared rail body: rendered inside the desktop <aside> AND the mobile Sheet.
  // Pure markup — no state lives here, so the two surfaces can never diverge.
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
        <Button
          type="button"
          variant="ghost"
          onClick={closeMobile}
          className="wf-focus-rail relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg px-0 text-[var(--wf-rail-ink-muted)] transition-colors hover:bg-[var(--wf-rail-2)] hover:text-[var(--wf-rail-ink)] focus-visible:ring-0 focus-visible:border-transparent active:translate-y-0 lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </Button>
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
                    {item.maintenance ? (
                      <span className="wf-rail-flag ml-auto" title="Sedang diperbaiki">
                        <Wrench className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                        <span className="sr-only">Sedang diperbaiki</span>
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleNavClick(item)}
                    className="wf-rail-row wf-focus-rail h-auto w-full focus-visible:ring-0 focus-visible:border-transparent active:translate-y-0"
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                    {item.maintenance ? (
                      <span className="wf-rail-flag ml-auto" title="Sedang diperbaiki">
                        <Wrench className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                        <span className="sr-only">Sedang diperbaiki</span>
                      </span>
                    ) : null}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1.5 border-t border-[var(--wf-rail-rule)] px-3 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onToggleDark}
          aria-pressed={isDark}
          className="wf-rail-row wf-focus-rail h-auto w-full focus-visible:ring-0 focus-visible:border-transparent active:translate-y-0"
        >
          {isDark ? (
            <>
              <Sun className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span>Mode terang</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span>Mode gelap</span>
            </>
          )}
        </Button>

        {/* Role plate. Role identity is not a status, so it takes no colour from
            the legend — the label carries it and the icon stays rail ink.
            The label reads the REAL role: the rail is rendered for every
            authenticated role (App.tsx `isAdmin = canViewDashboard`), so
            hardcoding a generic admin label told viewers, demo accounts, and
            tenants they were admins.
            Superadmin is the one role that changes what the rest of the rail
            can do, so its crown sits at full ink while every other role's
            shield stays muted. That is weight, not a status hue — it keeps the
            "no legend colour on role identity" rule intact. */}
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--wf-rail-rule)] px-2.5 py-2.5">
          {user?.role === 'superadmin' ? (
            <Crown className="h-4 w-4 shrink-0 text-[var(--wf-rail-ink)]" strokeWidth={1.5} aria-hidden />
          ) : (
            <Shield className="h-4 w-4 shrink-0 text-[var(--wf-rail-ink-muted)]" strokeWidth={1.5} aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--wf-rail-ink)]">
              {user?.display_name || 'Pengguna'}
            </p>
            <p className="text-[11px] text-[var(--wf-rail-ink-muted)]">
              {user ? ROLE_DISPLAY_NAMES[user.role] : 'Pengguna'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onLogout}
          className="wf-rail-row wf-rail-row--danger wf-focus-rail h-auto w-full focus-visible:ring-0 focus-visible:border-transparent active:translate-y-0"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <span>Keluar</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile drawer: shadcn Sheet. The hamburger is now a shadcn Button
          (ghost/icon) with the primitive chrome neutralized (h-9!/w-9!/p-0!/
          border-0! + hover/aria-expanded counters) so the fixed 36px square,
          its classes, ref, aria-label 'Buka menu' and aria-controls target
          (the desktop aside) are unchanged; Radix's trigger click replaces the
          manual onClick={open}. The drawer header keeps its own Tutup button,
          so the Sheet's built-in close is disabled (showCloseButton={false})
          and the [&>button]:hidden guard is belt-and-braces. w-64!/max-w-none!
          override the Sheet's responsive data-[side=left] width utilities while
          keeping the rail width. */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button
            ref={hamburgerRef}
            type="button"
            variant="ghost"
            size="icon"
            className="ui-focus-ring flex! fixed left-3 top-2.5 z-50 h-9! w-9! items-center justify-center rounded-lg border-0! p-0! text-[var(--wf-ink-muted)] transition-colors! hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink-muted)]! aria-expanded:bg-transparent! aria-expanded:text-[var(--wf-ink-muted)]! focus-visible:ring-0 active:translate-y-0! lg:hidden"
            aria-label="Buka menu"
            aria-expanded={isMobileOpen}
            aria-controls="admin-sidebar"
          >
            <Menu className="size-5 text-[var(--wf-ink-muted)]" strokeWidth={1.5} aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          aria-label="Menu admin"
          className="wf-rail wf-rail--side w-64! max-w-none! p-0 shadow-none [&>button]:hidden"
        >
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop rail: unchanged static aside (lg:translate-x-0). `inert` keeps
          the closed drawer's content unreachable; the Sheet content is only
          mounted while open, so Radix covers the <lg path. */}
      <aside
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
