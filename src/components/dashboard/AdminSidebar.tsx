import { memo, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  CalendarDays,
  FileEdit,
  Palette,
  Users,
  Globe,
  Image,
  FileText,
  Moon,
  Sun,
  LogOut,
  Shield,
  Crown,
  Menu,
  X,
  ClipboardCheck,
  UserCog,
  Activity,
} from 'lucide-react';
import type { AuthUser } from '../../types/auth';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: 'route' | 'callback';
  route?: string;
  callback?: () => void;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  user?: AuthUser | null;
  isSuperadmin?: boolean;
  isLegacy?: boolean;
  onOpenInstagramSettings: () => void;
  onOpenAlbumManager: () => void;
  onOpenLetterPicker: () => void;
}

export const AdminSidebar = memo(function AdminSidebar({
  isDark,
  onToggleDark,
  onLogout,
  user,
  isSuperadmin,
  isLegacy,
  onOpenInstagramSettings,
  onOpenAlbumManager,
  onOpenLetterPicker,
}: AdminSidebarProps) {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navGroups: NavGroup[] = useMemo(() => [
    {
      label: 'Overview',
      items: [
        { id: 'overview', label: 'Command Center', icon: <LayoutDashboard className="h-4 w-4" />, action: 'route', route: '/dashboard' },
        { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, action: 'route', route: '/dashboard/analytics' },
      ],
    },
    {
      label: 'Event Management',
      items: [
        { id: 'events', label: 'Event Schedule', icon: <CalendarDays className="h-4 w-4" />, action: 'route', route: '/dashboard/events' },
        { id: 'drafts', label: 'Draft Queue', icon: <FileEdit className="h-4 w-4" />, action: 'route', route: '/dashboard/drafts' },
        { id: 'themes', label: 'Annual Themes', icon: <Palette className="h-4 w-4" />, action: 'route', route: '/dashboard/themes' },
      ],
    },
    {
      label: 'Engagement',
      items: [
        { id: 'registrations', label: 'Registrations', icon: <Users className="h-4 w-4" />, action: 'route', route: '/dashboard/registrations' },
        { id: 'survey', label: 'Satisfaction Survey', icon: <ClipboardCheck className="h-4 w-4" />, action: 'route', route: '/dashboard/survey' },
      ],
    },
    {
      label: 'System',
      items: [
        ...(isSuperadmin ? [{ id: 'users', label: 'User Management', icon: <UserCog className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/users' }] : []),
        { id: 'activity-log', label: 'Activity Log', icon: <Activity className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/activity-log' },
      ],
    },
    {
      label: 'Content Settings',
      items: [
        { id: 'landing-page', label: 'Landing Page', icon: <Globe className="h-4 w-4" />, action: 'callback', callback: onOpenInstagramSettings },
        { id: 'album-gallery', label: 'Album Gallery', icon: <Image className="h-4 w-4" />, action: 'callback', callback: onOpenAlbumManager },
        { id: 'letter', label: 'Create Letter', icon: <FileText className="h-4 w-4" />, action: 'callback', callback: onOpenLetterPicker },
      ],
    },
  ], [onOpenInstagramSettings, onOpenAlbumManager, onOpenLetterPicker, isSuperadmin]);

  const handleNavClick = (item: NavItem) => {
    if (item.action === 'callback' && item.callback) {
      item.callback();
      setIsMobileOpen(false);
    }
    // For route items, Link component will handle navigation
    setIsMobileOpen(false);
  };

  const isActive = (item: NavItem) => {
    if (item.action === 'route' && item.route) {
      return location.pathname === item.route;
    }
    return false;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg ui-gradient-primary shadow-md">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Admin Panel</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Event Dashboard</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
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
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? 'ui-gradient-primary text-white shadow-lg shadow-violet-500/30'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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

      {/* Bottom controls */}
      <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
        <div className="space-y-2">
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span>Mode Gelap</span>
              </>
            )}
          </button>

          {/* User badge */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            {isSuperadmin ? (
              <Crown className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <Shield className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                {user?.display_name || (isLegacy ? 'Admin' : 'Admin')}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isSuperadmin ? 'Superadmin' : 'Administrator'}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-20 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-lg transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - desktop fixed, mobile overlay */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
});
