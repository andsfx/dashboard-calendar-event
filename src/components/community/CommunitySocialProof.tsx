import { type RefObject } from 'react';
import { RevealSection } from './CommunityRevealPrimitives';
import { formatCount } from './countFormat';
import { COMMUNITY_STAT_LABELS } from './communityStats';
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
        {value > 0 ? formatCount(counted) + '+' : '-'}
      </span>
      <span className="text-left text-xs font-medium leading-tight text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  );
}

function StatBadgeSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
      <span className="text-left text-xs font-medium leading-tight text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  );
}

export function CommunitySocialProof({ totalEvents = 0, totalCompleted = 0, totalOrganizers = 0, isLoading = false }: Props) {
  return (
    <RevealSection className="border-b border-black/5 bg-[var(--section-alt)] px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl text-center">
        <p className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">
          Dipercaya oleh komunitas di Bekasi
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4" aria-live="polite" aria-busy={isLoading}>
          {isLoading ? (
            <>
              <StatBadgeSkeleton label={COMMUNITY_STAT_LABELS.completed} />
              <StatBadgeSkeleton label={COMMUNITY_STAT_LABELS.organizers} />
              <StatBadgeSkeleton label={COMMUNITY_STAT_LABELS.total} />
            </>
          ) : (
            <>
              <AnimatedStatBadge value={totalCompleted} label={COMMUNITY_STAT_LABELS.completed} />
              <AnimatedStatBadge value={totalOrganizers} label={COMMUNITY_STAT_LABELS.organizers} />
              <AnimatedStatBadge value={totalEvents} label={COMMUNITY_STAT_LABELS.total} />
            </>
          )}
        </div>
      </div>
    </RevealSection>
  );
}
