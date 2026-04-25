import { useNavigate } from 'react-router-dom';
import { Moon, SunMedium, CalendarDays } from 'lucide-react';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export function GalleryHeader({ isDark, onToggleDark }: Props) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-black/6 bg-[#fbfaf7]/96 backdrop-blur-md dark:bg-slate-950/96 dark:border-slate-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
        <button
          onClick={() => navigate('/')}
          className="shrink-0 flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label="Kembali ke halaman utama"
        >
          <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-auto w-[88px] sm:w-[124px]" />
        </button>
        <span className="hidden text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200 sm:block">
          Gallery Event
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDark}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700"
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)' }}
          >
            <CalendarDays className="h-4 w-4" /> Dashboard
          </button>
        </div>
      </div>
    </header>
  );
}
