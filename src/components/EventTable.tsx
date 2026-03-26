import { Calendar, Clock, MapPin, Users, FileText, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { EventItem } from '../types';
import { useState } from 'react';

interface EventTableProps {
  events: EventItem[];
  isAdmin: boolean;
  onEdit: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
}

function StatusBadge({ status }: { status: EventItem['status'] }) {
  const map = {
    ongoing: {
      label: 'Berlangsung',
      dot: 'bg-emerald-500',
      classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    upcoming: {
      label: 'Mendatang',
      dot: 'bg-blue-500',
      classes: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    },
    past: {
      label: 'Selesai',
      dot: 'bg-slate-400',
      classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'ongoing' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
}

function MobileEventCard({ event, isAdmin, onEdit, onDelete }: { event: EventItem; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition-all ${
      event.status === 'ongoing' ? 'ring-2 ring-emerald-500/20 border-emerald-200 dark:border-emerald-800' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <StatusBadge status={event.status} />
          <h4 className="font-bold text-slate-800 dark:text-white text-base mt-2">{event.acara}</h4>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>{event.day}, {event.tanggal}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{event.jam || '-'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>{event.lokasi || '-'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          <span>{event.eo || '-'}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 animate-slide-in">
          {event.keterangan && (
            <div className="flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
              <span>{event.keterangan}</span>
            </div>
          )}
          {isAdmin && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={onDelete}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EventTable({ events, isAdmin, onEdit, onDelete }: EventTableProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in-up">
        <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-400 dark:text-slate-500">Tidak ada acara</h3>
        <p className="text-sm text-slate-300 dark:text-slate-600 mt-1">Belum ada acara yang terdaftar untuk filter ini.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {events.map(event => (
          <MobileEventCard
            key={event.id}
            event={event}
            isAdmin={isAdmin}
            onEdit={() => onEdit(event)}
            onDelete={() => onDelete(event)}
          />
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Tanggal</th>
                  <th className="text-left py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Jam</th>
                  <th className="text-left py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Acara</th>
                  <th className="text-left py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Lokasi</th>
                  <th className="text-left py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">EO</th>
                  <th className="text-left py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Keterangan</th>
                  {isAdmin && (
                    <th className="text-center py-4 px-5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider w-24">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className={`transition-colors ${
                      event.status === 'ongoing'
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/5 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                        : event.status === 'past'
                        ? 'opacity-60 hover:opacity-80'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="py-3.5 px-5">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="font-medium text-slate-700 dark:text-slate-200">{event.day}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{event.tanggal}</div>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {event.jam || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-semibold text-slate-800 dark:text-white">{event.acara}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {event.lokasi || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">{event.eo || '-'}</td>
                    <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate">{event.keterangan || '-'}</td>
                    {isAdmin && (
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEdit(event)}
                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(event)}
                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
