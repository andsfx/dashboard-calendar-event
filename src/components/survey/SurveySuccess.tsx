import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../shadcn/button';

interface SurveySuccessProps {
  eventName: string;
  onBack: () => void;
}

export default function SurveySuccess({ eventName, onBack }: SurveySuccessProps) {
  // Catatan konversi: sufiks `!` pada className menaklukkan default primitif
  // (h-8/px-2.5/hover:bg-primary-opacity/focus-visible:ring-3) yang urutannya lebih
  // akhir di CSS; warna --wf-* asli tetap dipakai apa adanya.
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Animated checkmark */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle className="h-10 w-10 text-emerald-500 animate-[scale-in_0.4s_ease-out]" />
      </div>

      <h2 className="mb-2 text-xl font-bold text-[var(--wf-ink)] ">
        Terima Kasih!
      </h2>
      <p className="mb-1 text-sm text-[var(--wf-ink-muted)] ">
        Feedback kamu untuk event
      </p>
      <p className="mb-6 text-sm font-semibold text-[var(--wf-accent)] ">
        "{eventName}"
      </p>
      <p className="mb-8 max-w-xs text-sm text-[var(--wf-ink-muted)]">
        telah berhasil disimpan. Masukan kamu sangat berarti untuk meningkatkan kualitas layanan kami.
      </p>

      <Button
        type="button"
        onClick={onBack}
        className="h-auto inline-flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] shadow-sm transition-colors hover:bg-[var(--wf-accent)]! focus:outline-none focus-visible:ring-2! focus-visible:ring-[var(--wf-accent)]! focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Dashboard
      </Button>
    </div>
  );
}
