import { memo } from 'react';
import { CalendarDays, Radio, Clock3, CheckCircle2, ArrowUp } from 'lucide-react';
import { StatCard } from '../ui/StatCard';

interface DashboardStatsProps {
  stats: {
    total: number;
    ongoing: number;
    upcoming: number;
    past: number;
  };
  /** compact = ringkasan publik: hanya Akan Datang + Sedang Berlangsung */
  compact?: boolean;
  /**
   * Antrian yang benar-benar menunggu keputusan manusia. Hanya diisi di Pusat
   * Komando; kalau kosong pita perhatian tidak dirender sama sekali (bukan
   * dirender dengan angka 0, yang akan terbaca sebagai "ada antrian").
   */
  attention?: {
    draftCount: number;
    pendingRegistrations: number;
    /** Pengajuan pameran/aktivasi yang menunggu review manusia. */
    pendingExhibitionLeads: number;
    /** Pengajuan kolaborasi tenant yang menunggu review manusia. */
    pendingTenantProposals: number;
    draftsError?: string | null;
  } | null;
}

interface StatEntry {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'live' | 'accent';
}

/**
 * Strip status admin: satu garis terukur, dibaca dari kiri ke kanan, diurutkan
 * menurut apa yang ditindak lebih dulu.
 *
 * Tiga tingkat, bukan lima kartu setara:
 *  1. **Menunggu keputusan**: satu angka yang menuntut keputusan hari ini,
 *     memimpin dengan angka terbesar dan aksen.
 *  2. **Sedang Berlangsung · Akan Datang**: keadaan operasional hari ini.
 *  3. **Total Acara · Selesai**: rujukan, ditulis sebagai satu baris tenang
 *     supaya tidak ikut bersaing: dua angka yang tidak pernah ditindak tidak
 *     boleh tampil seberat dua angka yang harus ditindak.
 *
 * Rincian antrian (berapa draft, berapa pendaftaran) sengaja TIDAK ditulis di
 * sini: kalimat itu hidup sekali di register "Perlu tindakan"
 * (`CommandCenterSummary`), di sebelah aksinya.
 */
export const DashboardStats = memo(function DashboardStats({ stats, compact, attention }: DashboardStatsProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon={<Clock3 className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
          label="Akan Datang"
          value={stats.upcoming}
          variant="amber"
        />
        <StatCard
          icon={<Radio className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
          label="Sedang Berlangsung"
          value={stats.ongoing}
          variant="emerald"
          pulse
        />
      </div>
    );
  }

  const today: StatEntry[] = [
    { label: 'Sedang Berlangsung', value: stats.ongoing, icon: <Radio className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'live' },
    { label: 'Akan Datang', value: stats.upcoming, icon: <Clock3 className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'accent' },
  ];

  const pendingTotal = attention
    ? attention.draftCount + attention.pendingRegistrations + attention.pendingExhibitionLeads + attention.pendingTenantProposals
    : 0;

  return (
    <div className="wf-status-key">
      {/* The queue leads: it is the one number that needs a decision today. */}
      {attention && (pendingTotal > 0 || attention.draftsError) && (
        <div className="wf-metric wf-metric--lead">
          <div className="wf-metric__top">
            <span className="wf-metric__label">Menunggu keputusan</span>
            <span className="wf-metric__icon">
              <ArrowUp className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </span>
          </div>
          <p className="wf-metric__value">{attention.draftsError ? '—' : pendingTotal}</p>
          <p className="wf-metric__hint">
            {attention.draftsError
              ? `Sebagian antrian gagal dimuat: ${attention.draftsError}`
              : 'Antrian yang menunggu keputusan manusia hari ini.'}
          </p>
        </div>
      )}

      <div className="wf-metrics">
        {today.map(entry => (
          <div key={entry.label} className="wf-metric wf-metric--secondary">
            <div className="wf-metric__top">
              <span className="wf-metric__label">{entry.label}</span>
              <span className={`wf-metric__icon wf-key--${entry.tone}`}>{entry.icon}</span>
            </div>
            <p className="wf-metric__value">{entry.value}</p>
          </div>
        ))}
      </div>

      {/* Reference tier: the same two strings the strip always carried, at the
          weight they earn. `wf-code` marks them as measured, not decorative. */}
      <p className="wf-reference">
        <span className="wf-reference__item">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          <span>Total Acara</span>
          <span className="wf-code">{stats.total}</span>
        </span>
        <span aria-hidden>·</span>
        <span className="wf-reference__item">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          <span>Selesai</span>
          <span className="wf-code">{stats.past}</span>
        </span>
      </p>
    </div>
  );
});
