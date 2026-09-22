import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Search } from 'lucide-react';
import { EventItem } from '../types';

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

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg bg-[var(--wf-board-2)] px-3 py-2 text-sm font-medium text-[var(--wf-ink-muted)] transition-colors hover:text-[var(--wf-ink)]"
          aria-label="Kembali ke Pusat Komando"
        >
          <ArrowLeft size={18} />
          Kembali
        </button>
      </div>

      <div className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)]">
        <div className="space-y-3 px-4 py-4 sm:px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari event, lokasi, atau EO"
              className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] py-2 pl-9 pr-3 text-sm text-[var(--wf-ink)] outline-none transition-colors focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent)]/20"
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
                  <button
                    key={event.id}
                    onClick={() => onSelect(event)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--wf-board-2)]"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-[var(--wf-ink)]">{event.acara}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--wf-ink-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {event.day}, {event.tanggal}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.lokasi || '-'}
                        </span>
                      </div>
                      {event.eo && <p className="text-xs text-[var(--wf-ink-muted)]">EO: {event.eo}</p>}
                    </div>
                    <span className="shrink-0 rounded-lg border border-[var(--wf-accent)] px-3 py-1.5 text-xs font-medium text-[var(--wf-accent)]">
                      Pilih
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
