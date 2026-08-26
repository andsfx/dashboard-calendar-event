import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FileText, MapPin, Search } from 'lucide-react';
import { EventItem } from '../types';
import { ModalWrapper } from './ModalWrapper';
import { ModalHeader } from './ui/ModalHeader';

interface Props {
  isOpen: boolean;
  events: EventItem[];
  onClose: () => void;
  onSelect: (event: EventItem) => void;
}

export function EventLetterPickerModal({ isOpen, events, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

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
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" ariaLabelledBy="letter-picker-title">
      <div className="rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800">
        <ModalHeader
          titleId="letter-picker-title"
          title="Pilih Event Untuk Surat"
          subtitle="Pilih event terlebih dahulu sebelum mengisi form surat."
          icon={<FileText />}
          onClose={onClose}
          closeAriaLabel="Tutup"
        />

        <div className="space-y-3 px-4 py-4 sm:px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari event, lokasi, atau EO"
              className="w-full rounded-xl border border-slate-200 bg-[var(--brand-card)] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
                      <div className="flex flex-wrap items-center gap-3 text-xs ui-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {event.day}, {event.tanggal}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.lokasi || '-'}
                        </span>
                      </div>
                      {event.eo && <p className="text-xs ui-text-muted">EO: {event.eo}</p>}
                    </div>
                    <span className="shrink-0 rounded-lg border border-brand-primary-200 px-3 py-1.5 text-xs font-medium text-brand-primary-600 dark:border-brand-primary-900/50 dark:text-brand-primary-300">
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
