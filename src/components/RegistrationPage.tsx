import { ArrowLeft, Moon, SunMedium } from 'lucide-react';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { RegistrationForm } from './community/CommunityRegistrationForm';

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
  return (
    <div className="ui-dashboard-page min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
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
        <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <div className="pt-10">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-primary-600 dark:text-brand-primary-400">Database Marcomm</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Daftarkan Organisasi Kamu</h1>
            <p className="mt-3 text-sm leading-7 ui-text-secondary">
              Data kamu masuk ke database komunitas resmi Marcomm Metropolitan Mall Bekasi — EO, sekolah &amp; universitas, komunitas, organisasi kampus, perusahaan, instansi, dan yayasan. Tim kami memakainya untuk menawarkan peluang event &amp; kolaborasi yang cocok, lalu menghubungi kamu (review 3–5 hari kerja).
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
