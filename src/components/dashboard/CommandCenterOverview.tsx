import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import type { CommunityRegistration, DraftEventItem, EventArea, EventItem } from '../../types';
import type { Permissions } from '../../hooks/usePermission';
import { BarList } from './BarList';
import { Card } from './Card';
import {
  computeAreaUsage,
  computeAreaUtilisation,
  computeCategoryCounts,
  computeMonthlyCounts,
} from '../../utils/dashboardOverview';

interface CommandCenterOverviewProps {
  /** Himpunan penuh event internal untuk grafik & tabel (bukan hasil filter tabel). */
  events: EventItem[];
  areas: EventArea[];
  activeDrafts: DraftEventItem[];
  communityRegistrations: CommunityRegistration[];
  permissions: Permissions;
}

/**
 * Analitik Pusat Komando: grafik kategori/utilisasi, tren bulanan & beban per
 * area, tabel area paling sering dipakai, dan bilah peringatan antrian.
 *
 * Ia sengaja TIDAK lagi memimpin halaman. Deretan enam kartu metrik berukuran
 * sama yang dulu ada di sini menduplikasi strip status dan register modul, dan
 * pola itu justru yang ditolak kontrak arah (modul kritis dan pasif terbaca
 * setara). Strip status + register kini dirender lebih dulu oleh DashboardPage.
 *
 * Warna memakai token `--wf-*` (bukan `--brand-*` referensi) supaya terang
 * identik dan tema gelap admin tetap benar.
 */
export function CommandCenterOverview({
  events,
  areas,
  activeDrafts,
  communityRegistrations,
  permissions,
}: CommandCenterOverviewProps) {
  const year = new Date().getFullYear();
  const categories = useMemo(() => computeCategoryCounts(events), [events]);
  const monthly = useMemo(() => computeMonthlyCounts(events, year), [events, year]);
  const areaUsage = useMemo(() => computeAreaUsage(events, areas), [events, areas]);
  const utilisation = useMemo(() => computeAreaUtilisation(events, areas), [events, areas]);

  const pendingRegistrations = communityRegistrations.filter(r => r.status === 'pending').length;
  const monthlyPeak = Math.max(...monthly.map(row => row.value), 0);

  return (
    <div className="space-y-6">
      {/* 1. Utilisasi area + event per kategori */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Utilisasi area">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tabular-nums text-[var(--wf-ink)]">
              {utilisation.inUseNow}
            </span>
            <span className="text-sm text-[var(--wf-ink-muted)]">
              dari {utilisation.totalActive} area aktif
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
            Area yang sedang dipakai event berjalan.
          </p>
        </Card>

        <Card title="Event per kategori" className="lg:col-span-2">
          <BarList
            emptyMessage="Belum ada event"
            items={categories.slice(0, 8).map(row => ({ label: row.label, value: row.value }))}
          />
        </Card>
      </section>

      {/* 3. Tren bulanan + beban per area */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title={`Tren event per bulan (${year})`}>
          <BarList
            emptyMessage="Belum ada data bulanan"
            max={monthlyPeak || 1}
            items={monthly.map(row => ({ label: row.label, value: row.value }))}
          />
        </Card>

        <Card title="Event per area" subtitle="Perbandingan beban area event">
          <BarList
            emptyMessage="Belum ada data area"
            items={areaUsage.slice(0, 10).map(row => ({
              label: row.name,
              value: row.totalEvents,
              hint: `${row.totalEvents} total`,
            }))}
          />
        </Card>
      </section>

      {/* 4. Tabel area paling sering dipakai */}
      <Card title="Area paling sering dipakai" bodyClassName="p-0">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[var(--wf-board-2)]">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                  Area
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                  Total event
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                  Dipakai sekarang
                </th>
              </tr>
            </thead>
            <tbody>
              {areaUsage.slice(0, 20).map(row => (
                <tr key={row.id} className="border-t border-[var(--wf-rule)]">
                  <td className="px-4 py-3 font-medium text-[var(--wf-ink)]">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-[var(--wf-ink-muted)]" aria-hidden />
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--wf-ink-muted)]">{row.totalEvents}</td>
                  <td className="px-4 py-3">
                    {row.inUseNow ? (
                      <span className="inline-flex items-center gap-1 text-[var(--wf-live)]">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Ya
                      </span>
                    ) : (
                      <span className="text-[var(--wf-ink-muted)]">Tidak</span>
                    )}
                  </td>
                </tr>
              ))}
              {areaUsage.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-[var(--wf-ink-muted)]">
                    Belum ada area
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Bilah peringatan antrian */}
      {permissions.canViewRegistrations && (pendingRegistrations > 0 || activeDrafts.length > 0) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--wf-action)] bg-[var(--wf-action)]/10 px-4 py-3 text-sm text-[var(--wf-ink)]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--wf-action)]" aria-hidden />
          <span>
            Ada {activeDrafts.length} draft menunggu dipublikasikan dan {pendingRegistrations} pendaftaran
            komunitas menunggu review.
          </span>
          <Link
            to="/dashboard/registrations"
            className="font-semibold text-[var(--wf-action)] underline underline-offset-2"
          >
            Buka pendaftaran
          </Link>
        </div>
      ) : null}
    </div>
  );
}
