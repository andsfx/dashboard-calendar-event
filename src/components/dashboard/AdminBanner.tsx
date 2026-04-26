import { memo } from 'react';
import { ShieldCheck } from 'lucide-react';

interface AdminBannerProps {
  onLogout: () => void;
}

export const AdminBanner = memo(function AdminBanner({ onLogout }: AdminBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800/50 dark:bg-violet-900/20">
      <ShieldCheck className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Mode Admin Aktif</p>
        <p className="text-xs text-violet-600 dark:text-violet-400">Bisa tambah, edit, hapus acara</p>
      </div>
      <button
        onClick={onLogout}
        className="flex items-center gap-1.5 rounded-xl border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40 dark:focus-visible:ring-offset-slate-950"
      >
        Keluar
      </button>
    </div>
  );
});
