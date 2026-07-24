import { memo } from 'react';
import { ShieldCheck } from 'lucide-react';

interface AdminBannerProps {
  onLogout: () => void;
}

export const AdminBanner = memo(function AdminBanner({ onLogout }: AdminBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-2xl border border-brand-primary-200 bg-brand-primary-50 px-4 py-3 dark:border-brand-primary-800/50 dark:bg-brand-primary-900/20">
      <ShieldCheck className="h-5 w-5 shrink-0 text-brand-primary-600 dark:text-brand-primary-300" strokeWidth={1.5} aria-hidden />
      <div className="flex-1">
        <p className="text-sm font-semibold text-brand-primary-800 dark:text-brand-primary-300">Mode Admin Aktif</p>
        <p className="text-xs text-brand-primary-600 dark:text-brand-primary-400">Bisa tambah, edit, hapus acara</p>
      </div>
      <button
        onClick={onLogout}
        className="flex items-center gap-1.5 rounded-xl border border-brand-primary-300 px-3 py-1.5 text-xs font-medium text-brand-primary-700 transition hover:bg-brand-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 focus-visible:ring-offset-2 dark:border-brand-primary-700 dark:text-brand-primary-300 dark:hover:bg-brand-primary-900/40 dark:focus-visible:ring-offset-slate-950"
      >
        Keluar
      </button>
    </div>
  );
});
