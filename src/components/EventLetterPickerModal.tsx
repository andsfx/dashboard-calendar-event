import { useMemo, useState } from 'react';
import { CalendarDays, FileText, MapPin, Search, X } from 'lucide-react';
import { EventItem } from '../types';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  events: EventItem[];
  onClose: () => void;
  onSelect: (event: EventItem) => void;
}

export function EventLetterPickerModal({ isOpen, events, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const filteredEvents = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return events;

    return events.filter(event => (
      event.acara.toLowerCase().includes(keyword)
      || event.lokasi.toLowerCase().includes(keyword)
      || event.eo.toLowerCase().includes(keyword)
      || event.tanggal.toLowerCase().includes(keyword)
    ));
  }, [events, query]);

  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">Pilih Event Untuk Surat</p>
              <p className="text-xs text-slate-400">Pilih event terlebih dahulu sebelum mengisi form surat.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari event, lokasi, atau EO"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            {filteredEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Tidak ada event yang cocok untuk dipilih.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onSelect(event)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-slate-800 dark:text-white">{event.acara}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {event.day}, {event.tanggal}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.lokasi || '-'}
                        </span>
                      </div>
                      {event.eo && <p className="text-xs text-slate-500 dark:text-slate-400">EO: {event.eo}</p>}
                    </div>
                    <span className="shrink-0 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-600 dark:border-violet-900/50 dark:text-violet-300">
                      Pilih
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
