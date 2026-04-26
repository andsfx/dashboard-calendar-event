import { Plus, Settings, ChevronDown, FileText } from 'lucide-react';
import { SearchBar } from '../SearchBar';

interface DashboardHeaderProps {
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSettingsMenu: boolean;
  onToggleSettingsMenu: () => void;
  onCloseSettingsMenu: () => void;
  onOpenInstagramSettings: () => void;
  onOpenAlbumManager: () => void;
  onOpenLetterPicker: () => void;
  onAddNew: () => void;
}

export function DashboardHeader({
  isAdmin,
  searchQuery,
  onSearchChange,
  showSettingsMenu,
  onToggleSettingsMenu,
  onCloseSettingsMenu,
  onOpenInstagramSettings,
  onOpenAlbumManager,
  onOpenLetterPicker,
  onAddNew,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {isAdmin ? 'Dashboard Event' : 'Jadwal Event'}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? 'Pantau & kelola semua acara' : 'Jadwal acara publik Metropolitan Mall Bekasi'}
        </p>
      </div>
      {isAdmin && (
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-[320px]">
            <SearchBar value={searchQuery} onChange={onSearchChange} />
          </div>
          <div className="relative shrink-0">
            <button
              onClick={onToggleSettingsMenu}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-950 shrink-0"
              aria-label="Menu pengaturan"
              aria-expanded={showSettingsMenu}
              aria-haspopup="menu"
            >
              <Settings className="h-4 w-4" />
              <ChevronDown className={`h-3 w-3 transition ${showSettingsMenu ? 'rotate-180' : ''}`} />
            </button>
            {showSettingsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseSettingsMenu} />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 z-50">
                  <button
                    onClick={() => { onOpenInstagramSettings(); onCloseSettingsMenu(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Landing Page
                  </button>
                  <button
                    onClick={() => { onOpenAlbumManager(); onCloseSettingsMenu(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Album Gallery
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onOpenLetterPicker}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30 dark:focus-visible:ring-offset-slate-950 shrink-0"
          >
            <FileText className="h-4 w-4" /> <span>Buat Surat</span>
          </button>
          <button
            onClick={onAddNew}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:shadow-violet-900/30 dark:focus-visible:ring-offset-slate-950 shrink-0"
          >
            <Plus className="h-4 w-4" /> <span>Tambah</span>
          </button>
        </div>
      )}
    </div>
  );
}
