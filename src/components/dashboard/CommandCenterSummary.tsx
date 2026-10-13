import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { AnnualTheme, CommunityRegistration, DraftEventItem, ExhibitionLead } from '../../types';
import type { Permissions } from '../../hooks/usePermission';
import { getCommandCenterCards } from './dashboardNavigation';

interface CommandCenterSummaryProps {
  activeDrafts: DraftEventItem[];
  annualThemes: AnnualTheme[];
  communityRegistrations: CommunityRegistration[];
  /** Pengajuan pameran/aktivasi yang menunggu review manusia. */
  exhibitionLeads?: ExhibitionLead[];
  draftsError?: string | null;
  permissions: Permissions;
}

/**
 * Register "Perlu tindakan": modul yang benar-benar menunggu keputusan
 * manusia, dan hanya itu.
 *
 * Modul pasif tidak ikut di sini; mereka ada di register direktori
 * (`CommandCenterDirectory`). Pemisahan itu yang membuat bobot sebuah modul
 * mengikuti keadaannya, bukan mengikuti ukuran kartunya: yang menunggu manusia
 * tampil sebagai baris penuh dengan angka, keadaan, dan aksi; yang tidak,
 * sekadar baris tujuan.
 *
 * Angkanya tidak diulang di tempat lain: total antrian memimpin strip status
 * (`DashboardStats`), sedangkan tiap modul menyebut angkanya sekali di sini.
 *
 * Isinya berasal dari `getCommandCenterCards`, yang memakai **predicate izin
 * yang sama** dengan rail: modul yang tidak boleh dibuka role tidak pernah
 * muncul di sini.
 */
export const CommandCenterSummary = memo(function CommandCenterSummary({
  activeDrafts,
  annualThemes,
  communityRegistrations,
  exhibitionLeads,
  draftsError,
  permissions,
}: CommandCenterSummaryProps) {
  const queues = getCommandCenterCards({
    activeDrafts,
    annualThemes,
    communityRegistrations,
    exhibitionLeads,
    draftsError,
    permissions,
  }).filter(card => card.queue);

  return (
    <section aria-labelledby="cc-queue-title">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="cc-queue-title" className="font-display text-base font-semibold text-[var(--wf-ink)]">
          Perlu tindakan
        </h2>
        <p className="text-xs text-[var(--wf-ink-muted)]">Modul yang menunggu keputusan manusia.</p>
      </div>

      {queues.length > 0 ? (
        <div className="wf-register">
          {queues.map(card => (
            <Link key={card.id} to={card.route} className="wf-row wf-row--queue">
              <span className="wf-row__icon" aria-hidden>
                {card.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--wf-ink)]">{card.title}</span>
                <span className="block text-xs text-[var(--wf-ink-muted)]">
                  {card.queue!.error
                    ? `Antrian gagal dimuat: ${card.queue!.error}`
                    : card.queue!.state}
                </span>
              </span>
              <span className="wf-code wf-row__count">{card.queue!.error ? '—' : card.queue!.count}</span>
              <span className="wf-row__action">
                <span className="wf-row__action-label">{card.queue!.action}</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="wf-queue-empty">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--wf-live)]" strokeWidth={1.5} aria-hidden />
          Tidak ada modul yang menunggu tindakan. Antrian kosong.
        </p>
      )}
    </section>
  );
});
