import { Calendar, Moon, Sun, Shield, ShieldCheck, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  isDark: boolean;
  toggleDark: () => void;
  isAdmin: boolean;
  onAdminClick: () => void;
  onLogout: () => void;
}

export default function Navbar({ isDark, toggleDark, isAdmin, onAdminClick, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-primary/25">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white">
                MMB <span className="text-primary">Events</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-0.5 font-medium tracking-wider uppercase">
                Metropolitan Mall Bekasi
              </p>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              <div className="relative w-4 h-4">
                <Sun className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${isDark ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`} />
                <Moon className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${isDark ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} />
              </div>
            </button>

            {/* Admin button */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </div>
                <button
                  onClick={onLogout}
                  className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAdminClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition-all"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="sm:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden pb-4 pt-2 space-y-2 animate-slide-in border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => { toggleDark(); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? 'Mode Terang' : 'Mode Gelap'}
            </button>

            {isAdmin ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Mode Aktif
                </div>
                <button
                  onClick={() => { onLogout(); setMobileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Admin
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onAdminClick(); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin Login
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
