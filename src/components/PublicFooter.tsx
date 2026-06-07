import { EventItem } from '../types';
import { LogoMark } from './PublicShared';

interface PublicFooterProps {
  ongoingEvents: EventItem[];
  upcomingEvents: EventItem[];
}

export function PublicFooter({ ongoingEvents, upcomingEvents }: PublicFooterProps) {
  return (
<footer className="border-t border-slate-200/50 bg-[#fbfaf7] px-4 py-8 text-sm text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-auto w-[102px] opacity-90" />
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Kalender publik Metropolitan Mall Bekasi</p>
              <p className="mt-1">Pantau agenda publik, cari acara akhir pekan, dan ajukan aktivasi baru dari halaman resmi Metropolitan Mall Bekasi.</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p>{ongoingEvents.length} acara berlangsung | {upcomingEvents.length} acara mendatang</p>
            <p className="mt-1">© {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
          </div>
        </div>
      </footer>
  );
}
