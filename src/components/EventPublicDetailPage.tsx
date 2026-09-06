import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CalendarPlus, Check, Download, Link2, MapPin, MessageCircle, RefreshCw, Zap } from 'lucide-react';
import { buildGoogleCalendarUrl, buildIcsBlob, icsFileName } from '../utils/calendarLinks';
import { EventPhotoGallery } from './EventPhotoGallery';
import { EventDetailContent, getEventAccentColor } from './EventDetailContent';
import { CategoryBadges } from './CategoryBadges';
import { StatusBadge } from './StatusBadge';
import type { EventItem } from '../types';
import { fetchEventById } from '../utils/supabaseApi';
import { isMultiDayEvent, getEventDuration, isRecurringEvent } from '../utils/eventUtils';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export function EventPublicDetailPage({ isDark, onToggleDark }: Props) {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    fetchEventById(id)
      .then((row) => {
        if (cancelled) return;
        setEvent(row);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, retryCount]);

  // ─── Meta client-side (tab title; OG server-side via api/event-og.js) ───
  const metaDescription = useMemo(() => {
    if (!event) return undefined;
    const parts = [event.tanggal, event.lokasi, event.jam].filter(Boolean);
    return parts.length > 0 ? `${event.acara} — ${parts.join(' · ')} di Metropolitan Mall Bekasi.` : `${event.acara} di Metropolitan Mall Bekasi.`;
  }, [event]);
  usePageMeta({
    title: event ? `${event.acara} — Jadwal Event Metropolitan Mall Bekasi` : 'Jadwal Event — Metropolitan Mall Bekasi',
    description: metaDescription,
  });

  const shareUrl = typeof window !== 'undefined' && event ? `${window.location.origin}/events/${event.id}` : '';
  const waShareUrl = useMemo(() => {
    if (!event) return '';
    const text = `${event.acara}\n${[event.tanggal, event.jam, event.lokasi].filter(Boolean).join(' · ')}\n${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [event, shareUrl]);

  // Tombol kalender hanya untuk event yang belum lewat (tanggal valid diperiksa util).
  const googleCalendarUrl = useMemo(() => {
    if (!event || event.status === 'past') return null;
    return buildGoogleCalendarUrl(event);
  }, [event]);
  const icsBlobAvailable = useMemo(() => {
    if (!event || event.status === 'past') return false;
    return buildIcsBlob(event) !== null;
  }, [event]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleDownloadIcs = () => {
    if (!event) return;
    const blob = buildIcsBlob(event);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = icsFileName(event);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const isMultiDay = event ? isMultiDayEvent(event) : false;
  const isRecurring = event ? isRecurringEvent(event) : false;
  const accent = event ? getEventAccentColor(event) : '#00918e';

  return (
    <div className="events-landing min-h-screen overflow-x-clip bg-[var(--color-neutral-page)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header — konsisten EventsLandingPage */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <header className="sticky top-0 z-50 border-b border-black/6 bg-[var(--color-neutral-page)]/96 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/96">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <Link to="/events" className="flex shrink-0 items-center gap-2 rounded-lg outline-none ui-focus-ring" aria-label="Kembali ke Jadwal Event">
            <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-300" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Jadwal Event</span>
          </Link>
          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 ui-focus-ring"
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            <span className="text-sm">{isDark ? '☀' : '☾'}</span>
          </button>
        </div>
      </header>

      <main id="konten-utama" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="animate-pulse" aria-label="Memuat detail event">
            <div className="mb-3 flex gap-2">
              <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="mb-6 h-9 w-3/4 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-700/60" />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && fetchError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <RefreshCw className="h-7 w-7 text-red-500 dark:text-red-400" aria-hidden="true" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Gagal memuat event</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Terjadi kesalahan saat memuat data. Periksa koneksi internet Anda.</p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700 ui-focus-ring"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Coba lagi
            </button>
          </div>
        )}

        {/* 404 state — termasuk draft/internal (fetch sudah exclude) */}
        {!isLoading && !fetchError && !event && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <CalendarDays className="h-7 w-7 text-slate-500 dark:text-slate-300" aria-hidden="true" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Event tidak ditemukan</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Event yang kamu cari tidak tersedia atau sudah dihapus.</p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700 ui-focus-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Lihat semua event
            </Link>
          </div>
        )}

        {/* Event detail */}
        {!isLoading && event && (
          <article className="space-y-6">
            {/* Header card */}
            <div
              className="relative overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-white px-5 pb-6 pt-7 shadow-[var(--shadow-card-soft)] sm:px-8 dark:border-slate-700 dark:bg-slate-900"
              style={{ '--event-color': accent } as React.CSSProperties}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />
              <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]" style={{ background: accent }} />

              <div className="relative mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={event.status} />
                <CategoryBadges categories={event.categories} />
                {event.status === 'ongoing' && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <Zap className="h-3 w-3" aria-hidden="true" /> LIVE
                  </span>
                )}
                {isMultiDay && (
                  <span className="flex items-center gap-1 rounded-full bg-brand-primary-100 px-2.5 py-1 text-xs font-bold text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" /> Rangkaian {getEventDuration(event.dateStr, event.dateEnd)} hari
                  </span>
                )}
                {isRecurring && (
                  <span className="rounded-full bg-brand-primary-100 px-2.5 py-1 text-xs font-bold text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                    Event reguler
                  </span>
                )}
              </div>
              <h1 className="relative font-display text-2xl font-bold leading-tight text-slate-900 sm:text-3xl dark:text-white">
                {event.acara}
              </h1>
              {event.lokasi && (
                <p className="relative mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-300">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {event.lokasi}
                </p>
              )}
            </div>

            {/* Detail body — shared dengan modal */}
            <EventDetailContent event={event} isAdmin={false} />

            {/* Share row */}
            <div className="flex flex-wrap items-center gap-2.5">
              {waShareUrl && (
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100 active:scale-95 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40 ui-focus-ring"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Bagikan via WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ui-focus-ring"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                {copied ? 'Link tersalin' : 'Salin link'}
              </button>
              {googleCalendarUrl && (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 ui-focus-ring"
                >
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Google Calendar
                </a>
              )}
              {icsBlobAvailable && (
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ui-focus-ring"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Unduh .ics
                </button>
              )}
            </div>

            {/* Survey CTA untuk event past */}
            {event.status === 'past' && (
              <a
                href={`/survey/${event.id}`}
                className="flex items-center gap-3 rounded-xl border border-brand-primary-200 bg-brand-primary-50 p-3.5 transition hover:bg-brand-primary-100 dark:border-brand-primary-800 dark:bg-brand-primary-900/20 dark:hover:bg-brand-primary-900/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary-100 dark:bg-brand-primary-900/50">
                  <Check className="h-4 w-4 text-brand-primary-600 dark:text-brand-primary-400" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-primary-700 dark:text-brand-primary-300">Isi Survey Kepuasan</p>
                  <p className="text-[11px] text-brand-primary-500 dark:text-brand-primary-400">Bantu kami meningkatkan kualitas layanan</p>
                </div>
                <span className="shrink-0 rounded-lg bg-brand-primary-600 px-3 py-1.5 text-xs font-semibold text-white">Isi Survey</span>
              </a>
            )}

            {/* Foto event (read-only) */}
            <div className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <EventPhotoGallery eventId={event.id} eventName={event.acara} canUpload={false} />
            </div>

            <div className="flex justify-center pt-2">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ui-focus-ring"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Lihat semua event
              </Link>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
