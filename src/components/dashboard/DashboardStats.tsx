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
          icon={<CalendarDays className="h-5 w-5 text-white" />}
          label="Total Acara"
          value={stats.total}
          subtitle="keseluruhan"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          icon={<Radio className="h-5 w-5 text-white" />}
          label="Sedang Berlangsung"
          value={stats.ongoing}
          subtitle="sedang aktif"
          gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
          pulse
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5 text-white" />}
          label="Akan Datang"
          value={stats.upcoming}
          subtitle="akan datang"
          gradient="linear-gradient(135deg, #f093fb 0%, #f5a623 100%)"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-white" />}
          label="Selesai"
          value={stats.past}
          subtitle="telah berlangsung"
          gradient="linear-gradient(135deg, #4facfe 0%, #6c757d 100%)"
        />
      </div>
    </section>
  );
});
