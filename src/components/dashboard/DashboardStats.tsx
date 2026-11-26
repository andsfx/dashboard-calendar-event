import { memo } from 'react';
import { CalendarDays, Radio, Clock3, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../ui/StatCard';

/** Satu sumber antrian yang gagal dimuat. */
export interface QueueSourceError {
  /** Nama sumber sebagaimana dibaca operator, mis. "Draf event". */
  label: string;
  message: string;
}

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
    /** Pengajuan partisipasi tenant (open booth & voucher) yang menunggu review. */
    pendingTenantParticipations?: number;
    /**
     * Sumber antrian yang gagal dimuat. Selama daftar ini tidak kosong angka
     * agregat tidak boleh dibaca sebagai nol: antrian yang gagal dimuat bukan
     * antrian yang kosong, jadi strip menampilkan `—` dan menyebut sumbernya.
     */
    errors?: QueueSourceError[];
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
          label="Akan datang"
          value={stats.upcoming}
          variant="amber"
        />
        <StatCard
          icon={<Radio className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
          label="Sedang berlangsung"
          value={stats.ongoing}
          variant="emerald"
          pulse
        />
      </div>
    );
  }

  const today: StatEntry[] = [
    { label: 'Sedang berlangsung', value: stats.ongoing, icon: <Radio className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'live' },
    { label: 'Akan datang', value: stats.upcoming, icon: <Clock3 className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'accent' },
  ];

  const queueErrors = attention?.errors ?? [];
  const hasQueueError = queueErrors.length > 0;
  const pendingTotal = attention
    ? attention.draftCount + attention.pendingRegistrations + attention.pendingExhibitionLeads + attention.pendingTenantProposals + (attention.pendingTenantParticipations ?? 0)
    : 0;
  const showQueueTier = Boolean(attention) && (pendingTotal > 0 || hasQueueError);

  return (
    <div className="wf-status-key">
      <div className={`grid gap-4 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4 sm:gap-0 sm:p-5 ${showQueueTier ? 'sm:grid-cols-[1.5fr_1fr_1fr]' : 'sm:grid-cols-2'}`}>
        {showQueueTier && (
        <div className="sm:pr-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className={`font-display font-extrabold leading-none ${hasQueueError ? 'text-3xl text-[var(--wf-ink-muted)]' : 'text-5xl text-[var(--wf-accent)] sm:text-6xl'}`}>
              {hasQueueError ? '—' : pendingTotal}
            </p>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--wf-ink)]">Perlu tindakan</p>
              <p
                className="text-xs text-[var(--wf-ink-muted)]"
                title={hasQueueError ? queueErrors.map(source => `${source.label}: ${source.message}`).join(' · ') : undefined}
              >
                {hasQueueError ? 'Total belum lengkap' : 'Pekerjaan menunggu tindak lanjut'}
              </p>
              {hasQueueError && (
                <span className="mt-1 inline-flex rounded-full bg-[var(--wf-action)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--wf-action)]">
                  Jumlah parsial
                </span>
              )}
            </div>
          </div>
        </div>
        )}

        {today.map(entry => (
          <div
            key={entry.label}
            className="flex items-center gap-3 border-t border-[var(--wf-rule)] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"
          >
            <p className="font-display text-2xl font-bold tabular-nums text-[var(--wf-ink)]">{entry.value}</p>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--wf-ink)]">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.tone === 'live' ? 'bg-[var(--wf-live)]' : 'bg-[var(--wf-action)]'}`}
                  aria-hidden
                />
                {entry.label}
              </p>
              <p className="text-xs text-[var(--wf-ink-muted)]">
                {entry.tone === 'live' ? 'Event aktif hari ini' : 'Dalam agenda berikutnya'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reference tier: the same two strings the strip always carried, at the
          weight they earn. `wf-code` marks them as measured, not decorative. */}
      <p className="wf-reference">
        <span className="wf-reference__item">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          <span>Total acara</span>
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
