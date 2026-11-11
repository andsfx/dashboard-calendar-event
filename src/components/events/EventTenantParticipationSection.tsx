import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Store, Tag } from 'lucide-react';
import type { TenantParticipationOptionPublic, TenantParticipationPublicItem } from '../../types';
import {
  fetchEventTenantParticipations,
  fetchTenantParticipationOptions,
  tenantParticipationOptionLabel,
} from '../../utils/domainApi';
import { formatDateRange } from '../../utils/eventUtils';

interface Props {
  eventId: string;
  /** Event sudah lewat → CTA ajukan diganti catatan arsip, bukan link mati. */
  isPast: boolean;
}

/**
 * Label opsi baca dari daftar dinamis server (termasuk opsi custom admin) via
 * `tenantParticipationOptionLabel`: fallback statis + humanize ditangani di
 * sana, jadi nilai apa pun (custom, lama, sudah dihapus) tetap punya teks tampil.
 */

/**
 * "Tenant di event ini" — booth & voucher tenant yang sudah disetujui Marcomm.
 *
 * Data dari endpoint publik per event (hanya status approved, kolom aman saja:
 * kontak PIC, kebutuhan fasilitas, dan catatan internal tidak pernah keluar
 * dari server). Gagal memuat = section hilang tanpa pesan error: halaman detail
 * event tidak boleh rusak karena bagian pendukung ini.
 */
export function EventTenantParticipationSection({ eventId, isPast }: Props) {
  const [items, setItems] = useState<TenantParticipationPublicItem[]>([]);
  const [options, setOptions] = useState<TenantParticipationOptionPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    // Opsi label dimuat paralel; gagal = label jatuh ke fallback statis (helper).
    fetchTenantParticipationOptions()
      .then((rows) => { if (!cancelled) setOptions(rows); })
      .catch(() => { /* biarkan kosong — helper memakai fallback + humanize */ });
    fetchEventTenantParticipations(eventId)
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  // Kosong dan bukan loading: tidak ada booth/voucher disetujui untuk event ini.
  // Tetap tampilkan ajakan ikut serta untuk event yang belum lewat.
  if (isLoading) {
    return (
 <div className="rounded-[1.5rem] border p-4 border-[var(--wf-rule)] bg-[var(--wf-board)]" aria-hidden="true">
        <div className="h-5 w-40 animate-pulse rounded bg-[var(--wf-rule)] " />
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-[var(--wf-rule)] " />
      </div>
    );
  }

  if (items.length === 0 && isPast) return null;

  return (
    <section
      aria-labelledby="tenant-partisipasi-title"
 className="rounded-[1.5rem] border p-5 border-[var(--wf-rule)] bg-[var(--wf-board)]"
    >
      <h2 id="tenant-partisipasi-title" className="flex items-center gap-2 font-display text-lg font-bold">
        <Store className="h-5 w-5 text-[var(--wf-accent)] " aria-hidden="true" />
        Tenant di event ini
      </h2>

      {items.length > 0 ? (
        <>
          <p className="mt-1 text-sm ui-text-secondary">
            {items.length} tenant ikut memeriahkan event ini. Dukung mereka dengan berkunjung dan menukarkan vouchernya.
          </p>
          <ul className="mt-4 space-y-3">
            {items.map((item, index) => {
              const showBooth = item.kind !== 'voucher';
              const showVoucher = item.kind !== 'booth';
              return (
                <li
                  key={`${item.tenantName}-${index}`}
                  className="rounded-[var(--radius-card)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4  "
                >
                  <div className="flex items-start gap-3">
                    {item.tenantLogo ? (
                      <img
                        src={item.tenantLogo}
                        alt=""
                        loading="lazy"
                        className="h-11 w-11 shrink-0 rounded-lg border border-[var(--wf-rule-strong)] bg-white object-contain p-1"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--wf-rule-strong)] text-[var(--wf-ink-muted)] bg-[var(--wf-board)] "
                      >
                        <Store className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--wf-ink)] ">
                        {item.tenantName}
                        {item.unitNumber && (
                          <span className="ml-2 text-xs font-normal text-[var(--wf-ink-muted)] ">Unit {item.unitNumber}</span>
                        )}
                      </p>
                      {item.tenantCategory && (
                        <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">{item.tenantCategory}</p>
                      )}
                    </div>
                  </div>

                  {showBooth && (
                    <div className="mt-3 space-y-1.5 border-t border-[var(--wf-rule)] pt-3 ">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[var(--wf-accent)] ">
                        <span className="inline-flex items-center gap-1">
                          <Store className="h-3.5 w-3.5" aria-hidden="true" /> Open booth
                        </span>
                        {item.boothArea && (
                          <span className="inline-flex items-center gap-1 font-normal text-[var(--wf-ink-muted)] ">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {item.boothArea}
                          </span>
                        )}
                        {item.boothStart && (
                          <span className="inline-flex items-center gap-1 font-normal text-[var(--wf-ink-muted)] ">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDateRange(item.boothStart, item.boothEnd || item.boothStart)}
                          </span>
                        )}
                      </p>
                      {item.boothProducts && (
                        <p className="text-xs text-[var(--wf-ink-muted)]  [overflow-wrap:anywhere]">
                          {item.boothProducts}
                          {item.boothSize && <span className="ml-2 text-[var(--wf-ink-muted)]">· {item.boothSize}</span>}
                        </p>
                      )}
                    </div>
                  )}

                  {showVoucher && item.voucherTerms && (
                    <div className="mt-3 space-y-1.5 border-t border-[var(--wf-rule)] pt-3 ">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-brand-secondary-700 dark:text-brand-secondary-300">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" aria-hidden="true" /> Voucher
                        </span>
                        <span className="font-normal text-[var(--wf-ink-muted)] ">{tenantParticipationOptionLabel('voucher_type', item.voucherType, options)}</span>
                        <span className="font-normal text-[var(--wf-ink-muted)]">
                          {tenantParticipationOptionLabel('voucher_format', item.voucherFormat, options)}
                          {item.voucherQuota !== null && ` · ${item.voucherQuota} voucher`}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--wf-ink-muted)]  [overflow-wrap:anywhere]">{item.voucherTerms}</p>
                      <p className="text-[11px] text-[var(--wf-ink-muted)]">
                        Penukaran langsung di tenant penerbit selama event berlangsung.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm ui-text-secondary">
          Belum ada tenant yang terdaftar untuk event ini. Jadilah yang pertama memeriahkan event.
        </p>
      )}

      {/* CTA — hanya untuk event yang belum berjalan (pengajuan ditutup H-1). */}
      {!isPast && (
        <Link
          to={`/partisipasi-tenant?event=${encodeURIComponent(eventId)}`}
          className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] p-3.5 transition hover:bg-[var(--wf-accent-soft)]    ui-focus-ring"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wf-accent-soft)] ">
            <Store className="h-4 w-4 text-[var(--wf-accent)] " aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[var(--wf-accent)] ">Punya tenant di Metropolitan Mall?</span>
            <span className="block text-[11px] text-[var(--wf-accent)] ">Ajukan open booth atau voucher untuk event ini</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--wf-accent)] " aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
