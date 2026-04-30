import { CheckCircle, ArrowLeft } from 'lucide-react';

interface SurveySuccessProps {
  eventName: string;
  onBack: () => void;
}

export default function SurveySuccess({ eventName, onBack }: SurveySuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Animated checkmark */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle className="h-10 w-10 text-emerald-500 animate-[scale-in_0.4s_ease-out]" />
      </div>

      <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
        Terima Kasih!
      </h2>
      <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
        Feedback Anda untuk event
      </p>
      <p className="mb-6 text-sm font-semibold text-violet-600 dark:text-violet-400">
        "{eventName}"
      </p>
      <p className="mb-8 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        telah berhasil disimpan. Masukan Anda sangat berarti untuk meningkatkan kualitas layanan kami.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Dashboard
      </button>
    </div>
  );
}
