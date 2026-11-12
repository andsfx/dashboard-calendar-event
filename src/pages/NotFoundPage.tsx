import { ArrowLeft, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/shadcn/button';

/** Fallback route untuk URL yang tidak dikenal — cegah blank page di SPA. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="ui-dashboard-page flex min-h-screen items-center justify-center bg-[var(--wf-page)] px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-accent-soft)]">
          <SearchX className="h-7 w-7 text-[var(--wf-accent)]" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-[var(--wf-ink)]">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm leading-6 ui-text-secondary">
          Halaman yang kamu cari tidak ada atau sudah dipindah. Kembali ke beranda untuk lanjut jelajah.
        </p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/')}
          className="ui-focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-page)]! h-auto border-0 rounded-full! font-bold! active:translate-y-0! hover:text-[var(--wf-accent-ink)]!"
        >
          <ArrowLeft className="size-4" />
          Kembali ke beranda
        </Button>
      </div>
    </div>
  );
}