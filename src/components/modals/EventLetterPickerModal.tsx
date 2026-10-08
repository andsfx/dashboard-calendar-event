import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Search } from 'lucide-react';
import { EventItem } from '../../types';
import { MdButton, MdTextField } from '../md';

interface Props {
  /** Warisan modal: kini opsional — komponen dirender sebagai isi halaman. */
  isOpen?: boolean;
  events: EventItem[];
  onClose: () => void;
  onSelect: (event: EventItem) => void;
}

export function EventLetterPickerModal({ events, onClose, onSelect }: Props) {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">Pilih event untuk membuat surat.</p>

        <MdButton
          variant="text"
          onClick={onClose}
          ariaLabel="Kembali ke Pusat Komando"
          className="shrink-0"
        >
          <ArrowLeft size={18} />
          Kembali
        </MdButton>
      </div>

      <div className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)]">
        <div className="space-y-3 px-4 py-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" />
            <MdTextField
              type="search"
              value={query}
              onChange={setQuery}
              ariaLabel="Cari event"
              placeholder="Cari event, lokasi, atau EO"
              className="w-full"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-[var(--wf-rule)]">
            {filteredEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--wf-ink-muted)]">
                Tidak ada event yang cocok untuk dipilih.
              </div>
            ) : (
              <div className="divide-y divide-[var(--wf-rule)]">
                {filteredEvents.map(event => (
                  <MdButton
                    key={event.id}
                    variant="text"
                    onClick={() => onSelect(event)}
                    className="w-full justify-between px-4 py-4 text-left"
                  >
                    <span className="min-w-0 space-y-1">
                      <span className="block font-semibold text-[var(--wf-ink)]">{event.acara}</span>
                      <span className="flex flex-wrap items-center gap-3 text-xs text-[var(--wf-ink-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {event.day}, {event.tanggal}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.lokasi || '-'}
                        </span>
                      </span>
                      {event.eo && <span className="block text-xs text-[var(--wf-ink-muted)]">EO: {event.eo}</span>}
                    </span>
                    <span className="shrink-0 rounded-lg border border-[var(--wf-accent)] px-3 py-1.5 text-xs font-medium text-[var(--wf-accent)]">
                      Pilih
                    </span>
                  </MdButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
