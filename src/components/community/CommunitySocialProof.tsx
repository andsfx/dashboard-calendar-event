import { type RefObject } from 'react';
import { RevealSection } from './CommunityRevealPrimitives';
import { formatCount } from './countFormat';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useCountUp } from './useCountUp';

interface Props {
  totalEvents?: number;
  totalCompleted?: number;
  totalOrganizers?: number;
  isLoading?: boolean;
}

function AnimatedStatBadge({ value, label }: { value: number; label: string }) {
  const { ref, isVisible } = useScrollReveal();
  const counted = useCountUp(value, isVisible);
  return (
    <div ref={ref as RefObject<HTMLDivElement>} className="flex items-center gap-3">
      <span className="text-2xl font-extrabold tabular-nums text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)] sm:text-3xl">
        {value > 0 ? formatCount(counted) + '+' : '—'}
      </span>
      <span className="text-left text-xs font-medium leading-tight text-slate-600 dark:text-slate-400">{label}</span>
    </div>
  );
}

function StatBadgeSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
      <span className="text-left text-xs font-medium leading-tight text-slate-600 dark:text-slate-400">{label}</span>
    </div>
  );
}

export function CommunitySocialProof({ totalEvents = 0, totalCompleted = 0, totalOrganizers = 0, isLoading = false }: Props) {
  return (
    <RevealSection className="border-b border-black/5 bg-[var(--section-alt)] px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl text-center">
        <p className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400">
          Dipercaya oleh komunitas di Bekasi
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4" aria-live="polite" aria-busy={isLoading}>
          {isLoading ? (
            <>
              <StatBadgeSkeleton label="Event Terlaksana" />
              <StatBadgeSkeleton label="Penyelenggara" />
              <StatBadgeSkeleton label="Total Event" />
            </>
          ) : (
            <>
              <AnimatedStatBadge value={totalCompleted} label="Event Terlaksana" />
              <AnimatedStatBadge value={totalOrganizers} label="Penyelenggara" />
              <AnimatedStatBadge value={totalEvents} label="Total Event" />
            </>
          )}
        </div>
      </div>
    </RevealSection>
  );
}
