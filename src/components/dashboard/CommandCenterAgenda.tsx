import { memo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarDays, MapPin, Radio } from 'lucide-react';
import type { EventItem } from '../../types';
import { formatDateRange } from '../../utils/eventUtils';

interface CommandCenterAgendaProps {
  /** Event yang sedang berjalan sekarang (sudah disaring izin jadwal internal). */
  ongoingEvents: EventItem[];
  /** Event berikutnya menurut jadwal; hanya beberapa baris pertama dipakai. */
  upcomingEvents: EventItem[];
  /** Pesan gagal muat jadwal; bila ada, daftarnya diganti pesan yang menyebut sebab. */
  error?: string | null;
  onDetail: (event: EventItem) => void;
}

/** Berapa baris jadwal yang masih berguna untuk triage. Lebih dari ini sudah
 *  jadi penjelajahan jadwal, dan halaman itu ada (`/dashboard/events`). */
const AGENDA_LIMIT = 3;

/**
 * Pintu masuk jadwal di Pusat Komando.
 *
 * Menggantikan salinan penuh halaman Jadwal Event yang dulu dirender di sini
 * (tabel + FilterBar + pemilih tampilan + paginasi): halaman triage tidak perlu
 * alat penjelajahan milik rute lain. Yang dibawa hanya yang dipakai untuk
 * memutuskan, yaitu apa yang sedang berjalan dan apa yang berjalan berikutnya,
 * plus satu tautan ke rute yang memiliki jadwal lengkap.
 */
export const CommandCenterAgenda = memo(function CommandCenterAgenda({
  ongoingEvents,
  upcomingEvents,
  error,
  onDetail,
}: CommandCenterAgendaProps) {
  const upcoming = upcomingEvents.slice(0, AGENDA_LIMIT);
  const hasError = Boolean(error);
  const hasOngoing = ongoingEvents.length > 0;

  const renderRow = (event: EventItem, marker: 'live' | 'idle') => (
    <li key={event.id}>
      <button
        type="button"
        onClick={() => onDetail(event)}
        className="wf-agenda-row w-full text-left"
      >
        <span className="wf-agenda-row__mark" aria-hidden>
          {marker === 'live' ? (
            <Radio className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--wf-ink)]">{event.acara}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--wf-ink-muted)]">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} aria-hidden />
              {event.lokasi || 'Lokasi belum diisi'}
            </span>
            <span aria-hidden>·</span>
            <span>{formatDateRange(event.dateStr, event.dateEnd)}</span>
            {event.jam ? (
              <>
                <span aria-hidden>·</span>
                <span className="wf-code">{event.jam}</span>
              </>
            ) : null}
          </span>
        </span>
        <span className={`wf-key ${marker === 'live' ? 'wf-key--live' : 'wf-key--idle'}`}>
          <span
            className={marker === 'live' ? 'wf-dot' : 'h-2 w-2 shrink-0 rounded-full border border-current'}
            aria-hidden
          />
          {marker === 'live' ? 'Berlangsung' : 'Berikutnya'}
        </span>
      </button>
    </li>
  );

  return (
    <section aria-labelledby="cc-agenda-title" className="wf-agenda">
      <div className="wf-agenda__head">
        <div className="min-w-0">
          <h2 id="cc-agenda-title" className="font-display text-base font-semibold text-[var(--wf-ink)]">
            Hari ini di mall
          </h2>
          <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
            {hasOngoing
              ? 'Yang sedang berjalan dan yang berjalan berikutnya.'
              : 'Tidak ada event yang sedang berlangsung sekarang. Buka Jadwal Event untuk melihat agenda berikutnya.'}
          </p>
        </div>
        <Link to="/dashboard/events" className="wf-btn wf-btn--quiet shrink-0">
          <span>Buka Jadwal Event</span>
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </Link>
      </div>

      {hasError ? (
        <p className="wf-agenda__error">
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <span>
            Jadwal event gagal dimuat: {error}. Buka Jadwal Event untuk mencoba lagi.
          </span>
        </p>
      ) : (
        <div className={`wf-agenda__columns${hasOngoing ? '' : ' wf-agenda__columns--single'}`}>
          {hasOngoing && (
            <div className="min-w-0">
              <h3 className="wf-group-label mb-1.5">Sedang berlangsung</h3>
              <ul className="wf-register">{ongoingEvents.slice(0, AGENDA_LIMIT).map(event => renderRow(event, 'live'))}</ul>
            </div>
          )}

          <div className="min-w-0">
            <h3 className="wf-group-label mb-1.5">Berikutnya</h3>
            {upcoming.length > 0 ? (
              <ul className="wf-register">{upcoming.map(event => renderRow(event, 'idle'))}</ul>
            ) : (
              <p className="wf-agenda__empty">
                Belum ada event mendatang di jadwal. Tambahkan event lewat Jadwal Event.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
});
