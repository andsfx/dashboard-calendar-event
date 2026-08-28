import { ArrowLeft, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Fallback route untuk URL yang tidak dikenal — cegah blank page di SPA. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="ui-dashboard-page flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary-50 dark:bg-brand-primary-950/30">
          <SearchX className="h-7 w-7 text-brand-primary-500" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-white">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm leading-6 ui-text-secondary">
          Halaman yang kamu cari tidak ada atau sudah dipindah. Kembali ke beranda untuk lanjut jelajah.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="ui-focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--brand-tosca-dark)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}