import { Fragment, useMemo } from 'react';
import { Clock, MapPin, Edit2, Trash2, ArrowUpDown, ExternalLink, Download, CalendarDays } from 'lucide-react';
import { EventItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { CategoryBadges } from './CategoryBadges';
import { PriorityBadge } from './PriorityBadge';
import { sortTableEvents } from '../utils/eventUtils';

interface Props {
  events: EventItem[];
  isAdmin: boolean;
  onEdit: (ev: EventItem) => void;
  onDelete: (ev: EventItem) => void;
  onDetail: (ev: EventItem) => void;
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
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1] ?? month;
  return `${monthName} ${year} • ${count} acara`;
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

export function EventTable({ events, isAdmin, onEdit, onDelete, onDetail }: Props) {
  const groupedEvents = useMemo(() => {
    const sortedEvents = sortTableEvents(events);
    const groups: Array<{ monthKey: string; monthLabel: string; events: EventItem[] }> = [];

    for (const event of sortedEvents) {
      const monthKey = event.dateStr.slice(0, 7);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.monthKey !== monthKey) {
        groups.push({
          monthKey,
          monthLabel: getMonthLabel(event.dateStr, 0),
          events: [event],
        });
        continue;
      }

      lastGroup.events.push(event);
    }

    return groups.map(group => ({
      ...group,
      monthLabel: getMonthLabel(`${group.monthKey}-01`, group.events.length),
    }));
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50">
        <CalendarDays className="mb-3 h-10 w-10 opacity-60" />
        <p className="text-sm font-medium">Tidak ada acara ditemukan</p>
        <p className="mt-1 text-xs">Coba ubah filter atau kata kunci pencarian</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50 md:hidden">
        {groupedEvents.map(group => (
          <div key={group.monthKey}>
            <div className="border-y border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
              {group.monthLabel}
            </div>
            {group.events.map(ev => (
              <div key={ev.id} className={`space-y-3 p-4 ${ev.status === 'past' ? 'opacity-70' : ''}`}>
                <button
                  onClick={() => onDetail(ev)}
                  className="w-full cursor-pointer text-left"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{ev.keterangan}</p>
                      )}
                    </div>
                    <StatusBadge status={ev.status} />
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

                  <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{ev.day}, {ev.tanggal}</span>
                      {ev.jam && <span className="text-slate-400">· {ev.jam}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{ev.lokasi || '–'}</span>
                    </div>
                    {ev.eo && <p className="text-slate-600 dark:text-slate-300">{isAdmin ? 'EO' : 'Penyelenggara'}: {ev.eo}</p>}
                  </div>
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onDetail(ev)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Detail
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => onEdit(ev)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => onDelete(ev)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[750px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <ArrowUpDown className="h-3 w-3" /> Tanggal
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Waktu</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Acara</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lokasi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Kategori</th>
              {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Model</th>}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{isAdmin ? 'EO' : 'Penyelenggara'}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {groupedEvents.map(group => (
              <Fragment key={group.monthKey}>
                <tr key={`${group.monthKey}-header`} className="border-y border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/70">
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {group.monthLabel}
                  </td>
                </tr>
                {group.events.map(ev => (
                  <tr
                    key={ev.id}
                    className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 focus-visible:bg-violet-50 dark:focus-visible:bg-violet-900/20 focus-visible:outline-none ${ev.status === 'past' ? 'opacity-60' : ''}`}
                    onClick={() => onDetail(ev)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetail(ev); } }}
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{ev.day}</div>
                      <div className="text-xs text-slate-400">{ev.tanggal}</div>
                    </td>
                    {/* Time */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {ev.jam || '–'}
                      </span>
                    </td>
                    {/* Event name */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 dark:text-white">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{ev.keterangan}</p>
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
                        <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <span className="line-clamp-2">{ev.lokasi || '–'}</span>
                      </span>
                    </td>
                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={ev.status} />
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
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {ev.eo || '–'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onDetail(ev)}
                          title="Detail"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onEdit(ev)}
                              title="Edit"
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(ev)}
                              title="Hapus"
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-xs text-slate-400">Menampilkan {events.length} acara</p>
        {isAdmin && (
          <button
            onClick={() => exportCSV(events)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>
        )}
      </div>
    </div>
  );
}
