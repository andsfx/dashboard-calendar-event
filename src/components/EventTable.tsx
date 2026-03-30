import { Clock, MapPin, Edit2, Trash2, ArrowUpDown, ExternalLink, Download, CalendarDays } from 'lucide-react';
import { EventItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { CategoryBadge } from './CategoryBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  events: EventItem[];
  isAdmin: boolean;
  onEdit: (ev: EventItem) => void;
  onDelete: (ev: EventItem) => void;
  onDetail: (ev: EventItem) => void;
}

function exportCSV(events: EventItem[]) {
  const headers = ['Tanggal', 'Hari', 'Jam', 'Acara', 'Lokasi', 'EO', 'Kategori', 'Prioritas', 'Status', 'Keterangan'];
  const rows = events.map(e => [
    e.tanggal, e.day, e.jam, e.acara, e.lokasi, e.eo, e.category, e.priority, e.status, e.keterangan
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
        {events.map(ev => (
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
                <CategoryBadge category={ev.category} />
                <PriorityBadge priority={ev.priority} />
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
                {ev.eo && <p className="text-slate-600 dark:text-slate-300">EO: {ev.eo}</p>}
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">EO</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {events.map(ev => (
              <tr
                key={ev.id}
                className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${ev.status === 'past' ? 'opacity-60' : ''}`}
                onClick={() => onDetail(ev)}
              >
                {/* Date */}
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{ev.day}</div>
                  <div className="text-xs text-slate-400">{ev.tanggal}</div>
                </td>
                {/* Time */}
                <td className="whitespace-nowrap px-4 py-3" onClick={e => e.stopPropagation()}>
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
                  <div className="mt-1">
                    <PriorityBadge priority={ev.priority} />
                  </div>
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
                  <CategoryBadge category={ev.category} />
                </td>
                {/* EO */}
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {ev.eo || '–'}
                </td>
                {/* Actions */}
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
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
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-xs text-slate-400">Menampilkan {events.length} acara</p>
        <button
          onClick={() => exportCSV(events)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </div>
    </div>
  );
}
