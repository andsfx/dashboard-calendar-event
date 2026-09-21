import { Moon, Sun, CalendarDays, Shield, Users } from 'lucide-react';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';
const focusRingPylon = 'wf-focus-pylon focus-visible:outline-none';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
  isAdmin: boolean;
  onLoginClick: () => void;
  ongoingCount?: number;
}

export function Navbar({ isDark, onToggleDark, isAdmin, onLoginClick, ongoingCount = 0 }: Props) {
  // Admin chrome is the pylon's crossbar: same dark material as the sidebar, so
  // the sidebar and the bar read as one sign assembly. Public pages keep the
  // light marketing chrome untouched.
  if (isAdmin) {
    return (
      <nav className="wf-pylon sticky top-0 z-40 border-b-0">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 pl-10 lg:pl-0">
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--wf-accent)]" strokeWidth={1.5} aria-hidden />
            <span className="wf-pylon-plate truncate">Metropolitan Mall Bekasi</span>
            {ongoingCount > 0 && (
              <span className="wf-key wf-key--live hidden sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {ongoingCount} berlangsung
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href="/"
              title="Ruang Komunitas"
              className={`wf-btn wf-btn--quiet border-[var(--wf-pylon-rule)] text-[var(--wf-pylon-ink)] hover:bg-[var(--wf-pylon-2)] ${focusRingPylon}`}
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Komunitas</span>
            </a>

            <button
              onClick={onToggleDark}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-[var(--wf-pylon-ink-muted)] transition-colors hover:bg-[var(--wf-pylon-2)] hover:text-[var(--wf-pylon-ink)] ${focusRingPylon}`}
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="ui-dashboard-chrome sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary-600 shadow-md shadow-brand-primary-200 dark:shadow-brand-primary-900/40">
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
            <p className="truncate text-[10px] leading-tight ui-text-muted">Metropolitan Mall Bekasi</p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            onClick={onLoginClick}
            title="Masuk sebagai admin"
            className={`flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-primary-300 hover:bg-brand-primary-50 hover:text-brand-primary-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-primary-700 dark:hover:bg-brand-primary-900/20 dark:hover:text-brand-primary-400 sm:px-3 ${focusRing}`}
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
              className={`flex h-9 w-9 items-center justify-center rounded-xl ui-text-muted transition hover:bg-slate-100 dark:hover:bg-slate-800 ${focusRing}`}
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
            className={`flex h-9 w-9 items-center justify-center rounded-xl ui-text-muted transition hover:bg-slate-100 dark:hover:bg-slate-800 sm:hidden ${focusRing}`}
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {isDark
              ? <Sun className="h-4 w-4 text-amber-500" />
              : <Moon className="h-4 w-4" />
            }
          </button>
        </div>
      </div>
    </nav>
  );
}
