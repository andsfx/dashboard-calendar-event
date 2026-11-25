import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { X, Edit2, Trash2, Zap, CalendarDays, CalendarPlus, Check, Repeat, QrCode, ExternalLink, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventItem } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EventDetailContent } from '../events/EventDetailContent';
import { EventPosterBanner } from '../events/EventPosterBanner';

const SurveyQRCode = lazy(() => import('../survey/SurveyQRCode'));
import { EventPhotoGallery } from '../events/EventPhotoGallery';
import { CategoryBadges } from '../ui/CategoryBadges';
import { PriorityBadge } from '../ui/PriorityBadge';
import { CATEGORY_COLORS, isMultiDayEvent, getEventDuration, isRecurringEvent } from '../../utils/eventUtils';
import { Button } from '../shadcn/button';
import { downloadBlob } from '../../lib/download';
import { buildIcsBlob, icsFileName } from '../../utils/calendarLinks';
import { fetchSurveyStatus, isSurveyPromoted } from '../../utils/api/surveysApi';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  event: EventItem | null;
  events?: EventItem[];
  onClose: () => void;
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
  onDeleteSeries?: (groupId: string) => void;
  isAdmin?: boolean;
}

export function EventDetailModal({ isOpen, event, events = [], onClose, onEdit, onDelete, onDeleteSeries, isAdmin = false }: Props) {
  // Hook harus dipanggil tanpa syarat: `event` boleh null saat modal tertutup,
  // jadi early-return baru boleh setelah baris ini.
  const [icsSaved, setIcsSaved] = useState(false);
  const eventId = event?.id;
  // Blob dihitung sekali per event: null berarti tanggal tak terbaca dan
  // tombol simpan tidak ditawarkan (bukan tombol yang diam saat diklik).
  const icsBlob = useMemo(
    () => (event && event.status !== 'past' ? buildIcsBlob(event) : null),
    [event],
  );
  // Umpan balik simpan kalender tidak boleh terbawa ke event berikutnya atau
  // modal yang dibuka ulang.
  useEffect(() => {
    setIcsSaved(false);
  }, [eventId, isOpen]);

  // Status discoverability survey kepuasan — event tanpa config atau status
  // yang gagal dimuat tetap menampilkan CTA (perilaku lama); hanya penonaktifan
  // eksplisit yang menyembunyikannya. Admin tetap melihat bagian ini untuk
  // pratinjau dan pembagian QR.
  const [surveyStatus, setSurveyStatus] = useState<{ is_active: boolean; has_config: boolean } | null>(null);
  useEffect(() => {
    if (!event || event.status !== 'past') {
      setSurveyStatus(null);
      return;
    }
    let cancelled = false;
    fetchSurveyStatus(event.id)
      .then((status) => { if (!cancelled) setSurveyStatus(status); })
      .catch(() => { if (!cancelled) setSurveyStatus(null); });
    return () => { cancelled = true; };
  }, [event]);

  if (!event) return null;

  const color = CATEGORY_COLORS[event.category] ?? 'var(--wf-accent)';
  const isOngoing = event.status === 'ongoing';
  const isMultiDay = isMultiDayEvent(event);
  const duration = isMultiDay ? getEventDuration(event.dateStr, event.dateEnd) : 1;
  const isRecurring = isRecurringEvent(event);

  const handleDownloadIcs = () => {
    if (!icsBlob) return;
    downloadBlob(icsBlob, icsFileName(event));
    setIcsSaved(true);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="event-detail-title">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--wf-board)]">
        {/* Color accent header */}
        <div
          className="relative px-4 pb-5 pt-6 sm:px-6"
          style={{ '--event-color': color } as React.CSSProperties}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}44)` }} />
          {/* Subtle bg tint — works in both light and dark */}
          <div className="absolute inset-0 rounded-t-2xl opacity-10 dark:opacity-5" style={{ background: color }} />
          <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `${color}44` }} />

          {event.posterUrl && (
            <div className="relative -mx-4 -mt-6 mb-5 sm:-mx-6">
              <EventPosterBanner src={event.posterUrl} alt={event.acara} className="rounded-t-2xl" />
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tutup"
            onClick={onClose}
            className={`absolute right-4 top-4 ${event.posterUrl
              ? 'bg-black/45 text-white backdrop-blur-sm hover:bg-black/65'
              : 'text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]'}`}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="mb-3 flex flex-wrap items-center gap-2 pr-8 sm:pr-10">
            <StatusBadge status={event.status} />
            <CategoryBadges categories={event.categories} />
            {!!isAdmin && <PriorityBadge priority={event.priority} />}
            {isOngoing && (
              <span aria-label="Event sedang berlangsung" className="flex items-center gap-1 rounded-full bg-[var(--wf-live)]/10 px-2.5 py-1 text-xs font-bold text-[var(--wf-live)]">
                <Zap className="h-3 w-3" aria-hidden="true" /> LIVE
              </span>
            )}
            {isMultiDay && (
              <span aria-label={`Rangkaian acara ${duration} hari`} className="flex items-center gap-1 rounded-full bg-[var(--wf-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--wf-accent)]">
                <CalendarDays className="h-3 w-3" aria-hidden="true" /> Rangkaian acara · {duration} hari
              </span>
            )}
            {isRecurring && (
              <span aria-label="Event reguler berulang" className="flex items-center gap-1 rounded-full bg-[var(--wf-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--wf-accent)]">
                <Repeat className="h-3 w-3" aria-hidden="true" /> Event reguler
              </span>
            )}
          </div>

          <h2 id="event-detail-title" className="pr-8 text-lg font-bold leading-snug text-[var(--wf-ink)] sm:pr-10 sm:text-xl">
            {event.acara}
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-3 px-4 py-5 sm:px-6">
          <EventDetailContent event={event} isAdmin={isAdmin} allEvents={events} />
        </div>

        {/* Photo Gallery — always show, upload only for ongoing/past admin */}
        <div className="border-t border-[var(--wf-rule)] px-4 pt-4 sm:px-6">
          <EventPhotoGallery
            eventId={event.id}
            eventName={event.acara}
            canUpload={!!isAdmin && (event.status === 'ongoing' || event.status === 'past')}
          />
        </div>

        {/* Survey section — for past events (both admin & public) */}
        {event.status === 'past' && (
          <div className="border-t border-[var(--wf-rule)] px-4 pt-4 sm:px-6">
            {/* Public: CTA banner — hanya saat admin menandai survei aktif */}
            {!isAdmin && isSurveyPromoted(surveyStatus) && (
              <a
                href={`/survey/${event.id}`}
                className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-3 transition-colors hover:bg-[var(--wf-board-2)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wf-accent-soft)]">
                  <ClipboardCheckIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--wf-accent)]">Isi survei kepuasan</p>
                  <p className="text-[11px] text-[var(--wf-accent)]">Bantu kami meningkatkan kualitas layanan</p>
                </div>
                <span className="shrink-0 rounded-lg bg-[var(--wf-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-accent-ink)]">
                  Isi Survey
                </span>
              </a>
            )}

            {!isAdmin && surveyStatus?.has_config === true && surveyStatus.is_active === false && (
              <p className="mb-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2.5 text-[11px] text-[var(--wf-ink-muted)]">
                Survei kepuasan untuk event ini sedang tidak dibuka.
              </p>
            )}

            {isAdmin && (
              <p className="mb-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2.5 text-[11px] text-[var(--wf-ink-muted)]">
                {surveyStatus === null ? (
                  'Status ajakan belum terbaca — ajakan tetap tampil seperti tautan lama.'
                ) : !surveyStatus.has_config ? (
                  <>
                    Belum diatur — ajakan tampil (default).{' '}
                    <Link to="/dashboard/survey" className="font-semibold text-[var(--wf-action)] underline-offset-2 hover:underline">
                      Atur di Survei kepuasan
                    </Link>
                    .
                  </>
                ) : surveyStatus.is_active ? (
                  'Ajakan survei tampil di halaman event publik.'
                ) : (
                  <>
                    Ajakan survei disembunyikan dari halaman event publik.{' '}
                    <Link to="/dashboard/survey" className="font-semibold text-[var(--wf-action)] underline-offset-2 hover:underline">
                      Aktifkan di Survei kepuasan
                    </Link>
                    .
                  </>
                )}
              </p>
            )}

            {/* QR Code survei kepuasan — publik hanya saat aktif */}
            {(isAdmin || isSurveyPromoted(surveyStatus)) && (
            <details className="group">
<summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--wf-ink-muted)] hover:text-[var(--wf-accent)]">
                <QrCode className="h-3.5 w-3.5" />
                <span>Kode QR survei</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] group-open:hidden">Tampilkan</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] hidden group-open:inline">Sembunyikan</span>
              </summary>
              <div className="mt-3">
                <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" /></div>}>
                  <SurveyQRCode eventId={event.id} eventName={event.acara} />
                </Suspense>
              </div>
            </details>
            )}
            {/* QR Code Tenant Self-Assessment */}
            <details className="group">
<summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--wf-ink-muted)] hover:text-[var(--wf-accent)]">
                <ClipboardCheckIcon />
                <span>Kode QR penilaian mandiri tenant</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] group-open:hidden">Tampilkan</span>
                <span className="ml-auto text-[10px] text-[var(--wf-ink-muted)] hidden group-open:inline">Sembunyikan</span>
              </summary>
              <div className="mt-3">
                <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" /></div>}>
                  <SurveyQRCode
                    eventId={event.id}
                    eventName={event.acara}
                    basePath="/tenant-survey"
                    label="Penilaian mandiri tenant"
                    showTypeTabs={false}
                  />
                </Suspense>
              </div>
            </details>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-[var(--wf-rule)] px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} className="min-h-11 flex-1">
            Tutup
          </Button>
          {!isAdmin && icsBlob && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadIcs}
              aria-describedby="event-ics-status"
              className="min-h-11 flex-1"
            >
              {icsSaved ? <Check className="h-3.5 w-3.5 text-[var(--wf-live)]" aria-hidden="true" /> : <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />}
              {icsSaved ? 'Berkas kalender terunduh' : 'Tambah ke kalender'}
            </Button>
          )}
          <span id="event-ics-status" role="status" aria-live="polite" className="sr-only">
            {icsSaved ? 'Berkas .ics sudah diunduh.' : ''}
          </span>
          {!isAdmin && (
            <Link
              to={`/events/${event.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] py-2.5 text-sm font-semibold text-[var(--wf-accent)] transition-colors hover:bg-[var(--wf-board-2)] active:scale-95"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Buka halaman event
            </Link>
          )}
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { onClose(); onEdit(event); }}
              className="flex-1"
            >
              <Edit2 className="h-3.5 w-3.5" /> Ubah
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => { onClose(); onDelete(event); }}
              className="flex-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </Button>
          )}
          {isRecurring && onDeleteSeries && event.recurrenceGroupId && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => { onClose(); onDeleteSeries(event.recurrenceGroupId!); }}
              className="flex-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus seluruh rangkaian
            </Button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}

/** ClipboardCheck icon (lucide, lazy-adjacent, keeps imports tidy) */
function ClipboardCheckIcon() {
  return (
    <ClipboardCheck className="h-4 w-4 text-[var(--wf-accent)]" aria-hidden="true" />
  );
}
