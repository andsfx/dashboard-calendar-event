import { memo } from 'react';
import { CalendarDays, Radio, Clock3, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../StatCard';

interface DashboardStatsProps {
  stats: {
    total: number;
    ongoing: number;
    upcoming: number;
    past: number;
  };
}

export const DashboardStats = memo(function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <section id="summary" className="scroll-mt-32">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-white" strokeWidth={1.5} />}
          label="Total Acara"
          value={stats.total}
          subtitle="keseluruhan"
          variant="slate"
        />
        <StatCard
          icon={<Radio className="h-5 w-5 text-white" strokeWidth={1.5} />}
          label="Sedang Berlangsung"
          value={stats.ongoing}
          subtitle="sedang aktif"
          variant="emerald"
          pulse
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5 text-white" strokeWidth={1.5} />}
          label="Akan Datang"
          value={stats.upcoming}
          subtitle="akan datang"
          variant="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-white" strokeWidth={1.5} />}
          label="Selesai"
          value={stats.past}
          subtitle="telah berlangsung"
          variant="slate"
        />
      </div>
    </section>
  );
});
