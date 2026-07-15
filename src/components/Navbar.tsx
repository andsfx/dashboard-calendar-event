import { Moon, Sun, CalendarDays, LogOut, Shield, Users, Crown } from 'lucide-react';
import type { AuthUser } from '../types/auth';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
  isAdmin: boolean;
  isSuperadmin?: boolean;
  isLegacy?: boolean;
  user?: AuthUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
  ongoingCount?: number;
}

function RoleBadge({ user, isLegacy, isSuperadmin }: { user?: AuthUser | null; isLegacy?: boolean; isSuperadmin?: boolean }) {
  if (isSuperadmin && user) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300 sm:flex">
        <Crown className="h-3 w-3" />
        <span className="max-w-[100px] truncate">{user.display_name}</span>
      </span>
    );
  }

  if (user) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300 sm:flex">
        <Shield className="h-3 w-3" />
        <span className="max-w-[100px] truncate">{user.display_name}</span>
      </span>
    );
  }

  if (isLegacy) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300 sm:flex">
        <Shield className="h-3 w-3" /> Admin
      </span>
    );
  }

  return null;
}

export function Navbar({ isDark, onToggleDark, isAdmin, isSuperadmin, isLegacy, user, onLoginClick, onLogout, ongoingCount = 0 }: Props) {
  return (
    <nav className="ui-dashboard-chrome sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">

        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary-500 to-brand-primary-600 shadow-md shadow-brand-primary-200 dark:shadow-brand-primary-900/40">
            <CalendarDays className="h-5 w-5 text-white" />
            {/* Live events indicator */}
            {ongoingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow live-dot">
                {ongoingCount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-800 dark:text-white">Dashboard Event</p>
            <p className="truncate text-[10px] leading-tight text-slate-500 dark:text-slate-400">Metropolitan Mall Bekasi</p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Admin view - simplified (sidebar handles most controls) */}
          {isAdmin ? (
            <>
              <a
                href="/"
                title="Ruang Komunitas"
                className={`flex h-9 items-center gap-1.5 rounded-xl border border-brand-primary-200 bg-brand-primary-50 px-2.5 py-1.5 text-xs font-semibold text-brand-primary-700 transition hover:bg-brand-primary-100 dark:border-brand-primary-800/50 dark:bg-brand-primary-900/20 dark:text-brand-primary-300 dark:hover:bg-brand-primary-900/30 sm:px-3 ${focusRing}`}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Komunitas</span>
              </a>
            </>
          ) : (
            <>
              <button
                onClick={onLoginClick}
                title="Masuk sebagai admin"
                className={`flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-primary-300 hover:bg-brand-primary-50 hover:text-brand-primary-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-primary-700 dark:hover:bg-brand-primary-900/20 dark:hover:text-brand-primary-400 sm:px-3 ${focusRing}`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Admin</span>
              </button>

              <a
                href="/"
                title="Ruang Komunitas"
                className={`flex h-9 items-center gap-1.5 rounded-xl border border-brand-primary-200 bg-brand-primary-50 px-2.5 py-1.5 text-xs font-semibold text-brand-primary-700 transition hover:bg-brand-primary-100 dark:border-brand-primary-800/50 dark:bg-brand-primary-900/20 dark:text-brand-primary-300 dark:hover:bg-brand-primary-900/30 sm:px-3 ${focusRing}`}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Komunitas</span>
              </a>

              {/* Divider */}
              <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Dark mode toggle */}
              <div className="tooltip-parent hidden sm:block">
                <button
                  onClick={onToggleDark}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${focusRing}`}
                  aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
                >
                  {isDark
                    ? <Sun className="h-4 w-4 text-amber-500" />
                    : <Moon className="h-4 w-4" />
                  }
                </button>
                <span className="tooltip-box">{isDark ? 'Mode terang' : 'Mode gelap'}</span>
              </div>
              <button
                onClick={onToggleDark}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:hidden ${focusRing}`}
                aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
              >
                {isDark
                  ? <Sun className="h-4 w-4 text-amber-500" />
                  : <Moon className="h-4 w-4" />
                }
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
