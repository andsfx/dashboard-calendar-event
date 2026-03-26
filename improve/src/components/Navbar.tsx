import { Moon, Sun, CalendarDays, LogOut, Shield } from 'lucide-react';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  ongoingCount?: number;
}

export function Navbar({ isDark, onToggleDark, isAdmin, onLoginClick, onLogout, ongoingCount = 0 }: Props) {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-200 dark:shadow-violet-900/40">
            <CalendarDays className="h-5 w-5 text-white" />
            {/* Live events indicator */}
            {ongoingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow live-dot">
                {ongoingCount}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-800 dark:text-white">Event Dashboard</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Metropolitan Mall Bekasi</p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {isAdmin ? (
            <>
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300 sm:flex">
                <Shield className="h-3 w-3" /> Admin
              </span>
              <button
                onClick={onLogout}
                title="Keluar dari mode admin"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              title="Masuk sebagai admin"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-violet-700 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Divider */}
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Dark mode toggle */}
          <div className="tooltip-parent">
            <button
              onClick={onToggleDark}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark
                ? <Sun className="h-4 w-4 text-amber-500" />
                : <Moon className="h-4 w-4" />
              }
            </button>
            <span className="tooltip-box">{isDark ? 'Mode terang' : 'Mode gelap'}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
