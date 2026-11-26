import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { AnnualTheme, CommunityRegistration, DraftEventItem, ExhibitionLead, TenantEventProposal, TenantParticipation } from '../../types';
import type { Permissions } from '../../hooks/usePermission';
import { DASHBOARD_GROUP_ORDER, getCommandCenterCards } from './dashboardNavigation';
import { Button } from '../shadcn/button';

interface CommandCenterDirectoryProps {
  activeDrafts: DraftEventItem[];
  annualThemes: AnnualTheme[];
  communityRegistrations: CommunityRegistration[];
  /** Pengajuan pameran/aktivasi yang menunggu review manusia. */
  exhibitionLeads?: ExhibitionLead[];
  /** Pengajuan kolaborasi tenant yang menunggu review manusia. */
  tenantProposals?: TenantEventProposal[];
  tenantParticipations?: TenantParticipation[];
  draftsError?: string | null;
  queueErrors?: Partial<Record<'exhibitions' | 'tenantProposals' | 'tenantParticipations', string | null>>;
  permissions: Permissions;
}

/**
 * Register "Semua modul": direktori tujuan, bukan panel antrian.
 *
 * Satu baris ringkas per modul, dikelompokkan per Dashboard Group, disusun dua
 * kolom di layar lebar supaya direktori 18 tujuan tidak mengambil tinggi yang
 * sama dengan blok yang benar-benar perlu ditindak. Baris direktori sengaja
 * **tidak membawa angka**: angka antrian hidup sekali di register "Perlu
 * tindakan" (`CommandCenterSummary`) dan totalnya di strip status.
 *
 * Izinnya identik dengan rail (`canViewSettings` / `canViewSponsorship` /
 * `canViewDrafts` / …), jadi modul yang tidak boleh dibuka role tidak muncul.
 */
export const CommandCenterDirectory = memo(function CommandCenterDirectory({
  activeDrafts,
  annualThemes,
  communityRegistrations,
  exhibitionLeads,
  tenantProposals,
  tenantParticipations,
  draftsError,
  queueErrors,
  permissions,
}: CommandCenterDirectoryProps) {
  const cards = getCommandCenterCards({
    activeDrafts,
    annualThemes,
    communityRegistrations,
    exhibitionLeads,
    tenantProposals,
    tenantParticipations,
    draftsError,
    queueErrors,
    permissions,
  });

  // Urutan grup mengikuti konstanta kanonik; grup tanpa modul yang boleh dibuka
  // role ini dibuang (mis. Konten untuk viewer).
  const groups = DASHBOARD_GROUP_ORDER
    .map(label => ({ label, cards: cards.filter(card => card.group === label) }))
    .filter(group => group.cards.length > 0);

  if (cards.length === 0) {
    return (
      <section aria-labelledby="cc-directory-title">
        <h2 id="cc-directory-title" className="font-display text-base font-semibold text-[var(--wf-ink)]">
          Semua modul
        </h2>
        <p className="wf-queue-empty mt-2">
          Tidak ada modul yang bisa dibuka peran ini. Hubungi admin mall untuk menambah hak akses.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="cc-directory-title">
      <h2 id="cc-directory-title" className="mb-1 font-display text-base font-semibold text-[var(--wf-ink)]">
        <span className="mr-2 text-xs font-semibold tabular-nums text-[var(--wf-ink-muted)]">03</span>
        Semua modul
      </h2>
      <p className="mb-3 text-xs text-[var(--wf-ink-muted)]">Temukan ruang kerja sesuai kebutuhan Anda.</p>

      <div className="wf-directory">
        {groups.map(group => (
          <div key={group.label} className="min-w-0">
            <h3 className="wf-group-label mb-1.5">{group.label}</h3>
            <div className="wf-register">
              {group.cards.map(card => (
                <Button
                  asChild
                  key={card.id}
                  variant="ghost"
                  className="wf-row wf-row--directory h-auto rounded-none border-0 font-normal whitespace-normal focus-visible:ring-0 active:translate-y-0"
                >
                  <Link to={card.route}>
                    <span className="wf-row__icon" aria-hidden>
                      {card.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--wf-ink)]">
                        {card.title}
                      </span>
                      <span className="block truncate text-xs text-[var(--wf-ink-muted)]">
                        {card.state ?? card.subtitle}
                      </span>
                    </span>
                    {card.queue && !card.queue.error && (
                      <span className="wf-dot wf-dot--queue" aria-hidden />
                    )}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});
