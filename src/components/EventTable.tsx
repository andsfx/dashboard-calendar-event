import { Fragment, useMemo } from 'react';
import { Clock, MapPin, Edit2, Trash2, ArrowUpDown, ExternalLink, Download, CalendarDays, Layers } from 'lucide-react';
import { EventItem, EventArea } from '../types';
import { StatusBadge } from './StatusBadge';
import { CategoryBadges } from './CategoryBadges';
import { PriorityBadge } from './PriorityBadge';
import { sortTableEvents, formatDateRange, getMultiDayJamDisplay, isMultiDayEvent, isRecurringEvent } from '../utils/eventUtils';
import { resolveAreaDisplay } from '../utils/areaGrouping';

interface Props {
  events: EventItem[];
  isAdmin: boolean;
  areas?: EventArea[];
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
  onDetail: (ev: EventItem) => void;
}

/** Internal table group — month within optional area section */
interface TableGroup {
  monthKey: string;
  monthLabel: string;
  events: EventItem[];
  areaKey?: string;
  areaName?: string;
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getEventModelBadge(eventModel: EventItem['eventModel']) {
  if (eventModel === 'free') {
    return { label: 'Free', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300' };
  }
  if (eventModel === 'bayar') {
    return { label: 'Bayar', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300' };
  }
  if (eventModel === 'support') {
    return { label: 'Support', className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-300' };
  }
  return null;
}

function getMonthLabel(dateStr: string, count: number) {
  const [year, month] = dateStr.split('-');
  const monthIndex = month ? parseInt(month, 10) - 1 : 0;
  const monthName = MONTH_NAMES[monthIndex] ?? month ?? '';
  return `${monthName} ${year ?? ''} • ${count} acara`;
}

function exportCSV(events: EventItem[]) {
  const headers = ['Tanggal', 'Hari', 'Jam', 'Acara', 'Lokasi', 'EO', 'Kategori', 'Prioritas', 'Status', 'Keterangan'];
  const rows = events.map(e => [
    e.tanggal, e.day, e.jam, e.acara, e.lokasi, e.eo, e.categories.join(' | '), e.priority, e.status, e.keterangan
  ].map(v => `"${(v ?? '').replace(/"/g, '""')}"`));
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EventTable({ events, isAdmin, areas, onEdit, onDelete, onDetail }: Props) {
  const groupedEvents: TableGroup[] = useMemo(() => {
    const sortedEvents = sortTableEvents(events);

    // ── Area→month grouping (active when areas & >1 area bucket) ──
    if (areas && areas.length > 0) {
      const areaMap = new Map(areas.map(a => [a.id, a]));
      const areaBuckets = new Map<string, EventItem[]>();

      for (const ev of sortedEvents) {
        // `areaId` bisa menunjuk area yang sudah dihapus/nonaktif sehingga
        // tidak ada di `areaMap`. Perlakukan sebagai unmapped agar tidak
        // menghasilkan bucket tanpa nama (dulu crash saat render).
        const key = ev.areaId && areaMap.has(ev.areaId) ? ev.areaId : '__unmapped__';
        const bucket = areaBuckets.get(key) ?? [];
        bucket.push(ev);
        if (!areaBuckets.has(key)) areaBuckets.set(key, bucket);
      }

      // Only area-group if >1 distinct bucket (avoid noise on single-bucket or all-unmapped)
      if (areaBuckets.size > 1) {
        // Sort area keys: active areas by sortOrder→name, then unmapped last
        const orderedKeys = [...areaBuckets.keys()].sort((a, b) => {
          if (a === '__unmapped__') return 1;
          if (b === '__unmapped__') return -1;
          const aa = areaMap.get(a);
          const ab = areaMap.get(b);
          const so = (aa?.sortOrder ?? 999) - (ab?.sortOrder ?? 999);
          if (so !== 0) return so;
          return (aa?.name ?? a).localeCompare(ab?.name ?? b, 'id');
        });

        const tableGroups: TableGroup[] = [];
        for (const areaKey of orderedKeys) {
          const areaEvts = areaBuckets.get(areaKey)!;
          // `areaKey` berasal dari `ev.areaId`, yang bisa menunjuk area yang
          // sudah dihapus/nonaktif sehingga tidak ada di `areaMap`. Fallback ke
          // key mentah agar baris tetap tampil alih-alih crash (dulu `!`).
          const areaName = areaKey === '__unmapped__'
            ? 'Tanpa lokasi'
            : (areaMap.get(areaKey)?.name ?? areaKey);

          // Sub-group area events by month
          const monthBuckets: { monthKey: string; events: EventItem[] }[] = [];
          for (const ev of areaEvts) {
            const mk = ev.dateStr.slice(0, 7);
            const last = monthBuckets[monthBuckets.length - 1];
            if (!last || last.monthKey !== mk) {
              monthBuckets.push({ monthKey: mk, events: [ev] });
            } else {
              last.events.push(ev);
            }
          }
          for (const mb of monthBuckets) {
            tableGroups.push({
              areaKey,
              areaName,
              monthKey: mb.monthKey,
              monthLabel: getMonthLabel(`${mb.monthKey}-01`, mb.events.length),
              events: mb.events,
            });
          }
        }
        return tableGroups;
      }
    }

    // ── Fallback: month-only ──
    const groups: TableGroup[] = [];
    for (const event of sortedEvents) {
      const monthKey = event.dateStr.slice(0, 7);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.monthKey !== monthKey) {
        groups.push({ monthKey, monthLabel: getMonthLabel(event.dateStr, 0), events: [event] });
      } else {
        lastGroup.events.push(event);
      }
    }
    return groups.map(g => ({ ...g, monthLabel: getMonthLabel(`${g.monthKey}-01`, g.events.length) }));
  }, [events, areas]);

  if (events.length === 0) {
    return (
      <div 
        className="ui-empty-panel flex flex-col items-center justify-center py-20 text-slate-500"
        aria-live="polite"
        role="status"
      >
        <CalendarDays className="mb-3 h-10 w-10 opacity-60" aria-hidden="true" />
        <p className="text-sm font-medium">Tidak ada acara ditemukan</p>
        <p className="mt-1 text-xs">Coba ubah filter atau kata kunci pencarian</p>
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50 md:hidden">
        {groupedEvents.map((group, i) => {
          const prevGrp: TableGroup | null = i > 0 ? (groupedEvents[i - 1] as TableGroup | undefined) ?? null : null;
          const showAreaHeader = group.areaKey && group.areaKey !== prevGrp?.areaKey;
          return (
          <Fragment key={`${group.areaKey || 'm'}-${group.monthKey}`}>
            {showAreaHeader && (
              <div className="ui-btn-primary px-4 py-2 text-[12px] font-bold text-white">
                <Layers className="inline h-3.5 w-3.5 -mt-0.5 mr-1.5" aria-hidden="true" />
                {group.areaName}
              </div>
            )}
          <div>
<div className="ui-dashboard-muted border-y border-black/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide ui-text-muted dark:border-slate-700 ">
              {group.monthLabel}
            </div>
            {group.events.map(ev => (
              <div key={ev.id} className={`space-y-3 p-4 ${ev.status === 'past' ? 'opacity-80' : ''}`}>
                {/* Mobile card — use div+role instead of nested buttons */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onDetail(ev)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetail(ev); } }}
                  aria-label={`Lihat detail ${ev.acara}`}
                  className="ui-focus-ring w-full cursor-pointer rounded-lg text-left"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold ui-text-strong">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">{ev.keterangan}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={ev.status} />
                      {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-brand-primary-100 px-2 py-0.5 text-[10px] font-semibold text-brand-primary-700 dark:bg-brand-primary-900/30 dark:text-brand-primary-300">Reguler</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadges categories={ev.categories} maxVisible={2} />
                    {isAdmin && <PriorityBadge priority={ev.priority} />}
                    {isAdmin && (() => {
                      const modelBadge = getEventModelBadge(ev.eventModel);
                      return modelBadge ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${modelBadge.className}`}>
                          {modelBadge.label}
                        </span>
                      ) : null;
                    })()}
                  </div>

                   <div className="mt-3 space-y-1.5 text-xs ui-text-muted">
                     <div className="flex items-center gap-1.5">
                       <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                       <span>{isMultiDayEvent(ev) ? formatDateRange(ev.dateStr, ev.dateEnd) : `${ev.day}, ${ev.tanggal}`}</span>
                       {(isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : ev.jam) && <span className="text-slate-500 dark:text-slate-300">· {isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : ev.jam}</span>}
                     </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="line-clamp-2">{ev.lokasi || '–'}</span>
                    </div>
                    {ev.eo && <p className="text-slate-600 dark:text-slate-300">{isAdmin ? 'EO' : 'Penyelenggara'}: {ev.eo}</p>}
                  </div>
                   </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onDetail(ev)}
                    className="ui-focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Detail
                  </button>
                  {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(ev)}
                        className="ui-focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                      >
                        <Edit2 className="h-3.5 w-3.5" aria-hidden /> Ubah
                      </button>
                  )}
                  {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(ev)}
                        className="ui-focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Hapus
                      </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          </Fragment>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[750px] text-sm">
          <caption className="sr-only">Tabel jadwal event</caption>
          <thead className="sticky top-0 z-10 bg-[var(--brand-card-light)] dark:bg-[#1a241e]">
            <tr className="ui-dashboard-muted border-b border-black/[0.08] dark:border-slate-700">
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ui-text-muted">
                  <ArrowUpDown className="h-3 w-3" aria-hidden="true" /> Tanggal
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">Waktu</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">Acara</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">Lokasi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">Kategori</th>
              {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">Model</th>}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">{isAdmin ? 'EO' : 'Penyelenggara'}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide ui-text-muted">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {groupedEvents.map((group, i) => {
              const prevGrp: TableGroup | null = i > 0 ? (groupedEvents[i - 1] as TableGroup | undefined) ?? null : null;
              const showAreaHeader = group.areaKey && group.areaKey !== prevGrp?.areaKey;
              return (
              <Fragment key={`${group.areaKey || 'm'}-${group.monthKey}`}>
                {showAreaHeader && (
                  <tr className="ui-btn-primary">
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2 text-xs font-bold text-white">
                      <Layers className="inline h-3.5 w-3.5 -mt-0.5 mr-1.5" aria-hidden="true" />
                      {group.areaName}
                    </td>
                  </tr>
                )}
                <tr key={`${group.monthKey}-header`} className="ui-dashboard-muted border-y border-black/[0.04] dark:border-slate-700">
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ui-text-muted">
                    {group.monthLabel}
                  </td>
                </tr>
                {group.events.map(ev => (
                  <tr
                    key={ev.id}
                    className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 focus-visible:bg-brand-primary-50 dark:focus-visible:bg-brand-primary-900/20 focus-visible:outline-none ${ev.status === 'past' ? 'opacity-80' : ''}`}
                    onClick={() => onDetail(ev)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Lihat detail ${ev.acara}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetail(ev); } }}
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {isMultiDayEvent(ev) ? (
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDateRange(ev.dateStr, ev.dateEnd)}</div>
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{ev.day}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-300">{ev.tanggal}</div>
                        </>
                      )}
                    </td>
                    {/* Time */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : (ev.jam || '–')}
                      </span>
                    </td>
                    {/* Event name */}
                    <td className="px-4 py-3">
                      <p className="font-semibold ui-text-strong">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-300">{ev.keterangan}</p>
                      )}
                      {isAdmin && (
                        <div className="mt-1">
                          <PriorityBadge priority={ev.priority} />
                        </div>
                      )}
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-slate-500" />
                        <span className="line-clamp-2">{resolveAreaDisplay(ev.areaId, ev.lokasi, areas ?? []) || '–'}</span>
                      </span>
                    </td>
                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={ev.status} />
                        {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-brand-primary-100 px-2 py-0.5 text-[10px] font-semibold text-brand-primary-700 dark:bg-brand-primary-900/30 dark:text-brand-primary-300">Reguler</span>}
                      </div>
                    </td>
                    {/* Category */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <CategoryBadges categories={ev.categories} maxVisible={2} />
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-4 py-3">
                        {(() => {
                          const modelBadge = getEventModelBadge(ev.eventModel);
                          return modelBadge ? (
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${modelBadge.className}`}>
                              {modelBadge.label}
                            </span>
                          ) : <span className="text-xs text-slate-300 dark:text-slate-600">-</span>;
                        })()}
                      </td>
                    )}
                    {/* EO */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs ui-text-muted">
                      {ev.eo || '–'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onDetail(ev)}
                          aria-label="Lihat detail"
                          className="ui-focus-ring rounded-lg min-h-11 min-w-11 p-1.5 text-slate-500 transition hover:bg-brand-primary-50 hover:text-brand-primary-600 dark:hover:bg-brand-primary-900/30 dark:hover:text-brand-primary-400"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {(onEdit || onDelete) && (
                          <>
                            {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(ev)}
                              aria-label='Ubah acara'
                              className="ui-focus-ring rounded-lg min-h-11 min-w-11 p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                            >
                              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            )}
                            {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(ev)}
                              aria-label="Hapus acara"
                              className="ui-focus-ring rounded-lg min-h-11 min-w-11 p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="ui-dashboard-muted flex items-center justify-between border-t border-black/[0.04] px-4 py-2.5 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-300">Menampilkan {events.length} acara</p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => exportCSV(events)}
className="ui-focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium ui-text-muted transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Download className="h-3 w-3" aria-hidden /> Ekspor CSV
          </button>
        )}
      </div>
    </div>
  );
}
