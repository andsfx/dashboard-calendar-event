import { RevealSection } from './CommunityRevealPrimitives';

function StatBadge({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 sm:text-3xl">{number}</span>
      <span className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 leading-tight">{label}</span>
    </div>
  );
}

export function CommunitySocialProof() {
  return (
    <RevealSection className="border-b border-black/5 bg-white px-4 py-14 dark:bg-slate-900 dark:border-slate-800 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Dipercaya oleh komunitas di Bekasi
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <StatBadge number="100+" label="Event Terlaksana" />
          <StatBadge number="50+" label="Komunitas Bergabung" />
          <StatBadge number="10,000+" label="Total Pengunjung" />
        </div>
      </div>
    </RevealSection>
  );
}
