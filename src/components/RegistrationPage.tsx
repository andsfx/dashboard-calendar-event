import { ArrowLeft, Moon, SunMedium } from 'lucide-react';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { RegistrationForm } from './community/CommunityRegistrationForm';
import { usePageMeta } from '../utils/pageMeta';

const focusRing = 'ui-focus-ring';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

/**
 * Halaman publik khusus pendaftaran organisasi (EO, sekolah, komunitas, dll).
 * Membungkus `RegistrationForm` yang sama dengan embed landing /community & /events —
 * tanpa logika form baru; URL ini untuk distribusi link langsung (bio IG, WA, QR).
 */
export function RegistrationPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Daftar Komunitas — Metropolitan Mall Bekasi',
    description: 'Daftarkan komunitas atau organisasimu untuk berkolaborasi dengan Metropolitan Mall Bekasi.',
  });

  return (
    <div className="ui-dashboard-page min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <header className="ui-dashboard-chrome sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              className="ui-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-600 shadow-sm transition hover:bg-white dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')}
              className={`${focusRing} inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800`}
            >
              <ArrowLeft className="h-4 w-4" />Kembali
            </button>
          </div>
        </div>
      </header>
        <main id="konten-utama" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <div className="pt-10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Daftarkan Event Komunitas di Metropolitan Mall Bekasi</h1>
            <p className="mt-3 text-sm leading-7 ui-text-secondary">
              Terbuka untuk semua jenis komunitas yang ingin mengadakan event di Metropolitan Mall Bekasi. Isi datanya, pendaftaran kamu akan kami review secepatnya. Tim kami yang akan menghubungi kamu untuk langkah selanjutnya.
            </p>
          </div>

          <div className="mt-8">
            <RegistrationForm />
          </div>
        </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
      </footer>
    </div>
  );
}
