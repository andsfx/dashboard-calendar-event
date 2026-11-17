import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check, Copy, Download, X } from 'lucide-react';
import { Button } from '../shadcn/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../shadcn/dialog';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { downloadBlob } from '../../lib/download';
import {
  CALENDAR_ICS_FILE_NAME,
  buildEventsIcsBlob,
  calendarFeedUrl,
  googleCalendarSubscribeUrl,
} from '../../utils/calendarLinks';
import type { EventItem } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Event yang tersedia di halaman. Bila diisi, dialog menawarkan unduhan .ics
   * berisi semuanya sebagai fallback langganan. Di halaman detail (hanya satu
   * event yang dimuat) properti ini dikosongkan.
   */
  events?: EventItem[];
}

/**
 * Satu pintu untuk "sinkronkan jadwal ke kalender":
 * - langganan Google Calendar lewat feed ICS publik (perubahan jadwal ikut),
 * - salin URL untuk Apple Calendar/Outlook,
 * - unduh semua event sebagai .ics sekali klik.
 *
 * Langganan memakai URL server (`/api/v1/calendar.ics`), bukan data event di
 * browser, supaya event baru tetap masuk tanpa membuka halaman ini lagi.
 */
export function CalendarSyncDialog({ isOpen, onClose, events }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const feedUrl = useMemo(() => calendarFeedUrl(), []);
  const subscribeUrl = useMemo(() => googleCalendarSubscribeUrl(feedUrl), [feedUrl]);
  const canPublishFeed = /^https:\/\//i.test(feedUrl);
  /**
   * Build produksi tanpa `VITE_API_URL` akan menembak `/api/v1/calendar.ics`
   * ke origin Vercel yang tidak punya API: URL terlihat sah tetapi 404. Jangan
   * tawarkan langganan yang pasti gagal; unduhan .ics tetap tersedia.
   */
  const feedConfigured = !import.meta.env.PROD || Boolean(import.meta.env.VITE_API_URL);
  const downloadable = Array.isArray(events) && events.length > 0;

  // Status salin tidak boleh terbawa saat dialog dibuka lagi.
  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setCopyFailed(false);
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard tidak tersedia');
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  const handleDownload = () => {
    if (!events || events.length === 0) return;
    downloadBlob(buildEventsIcsBlob(events), CALENDAR_ICS_FILE_NAME);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2"
            aria-label="Tutup"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>Sinkronkan jadwal ke kalender</DialogTitle>
          <DialogDescription>
            Berlangganan sekali, lalu event baru dan perubahan jadwal dari Metropolitan Mall Bekasi
            masuk otomatis ke kalendermu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {feedConfigured ? (
            <>
              <Button asChild size="lg" className="w-full gap-2">
                <a href={subscribeUrl} target="_blank" rel="noopener noreferrer">
                  <CalendarPlus aria-hidden="true" />
                  Tambah ke Google Calendar
                </a>
              </Button>

              <p className="text-xs leading-5 text-muted-foreground">
                Di Google Calendar, buka <strong>Kalender lain</strong> &gt; <strong>Dari URL</strong>,
                lalu tempel URL langganan di bawah. Google biasanya memperbarui beberapa jam sekali.
              </p>

              <div>
                <Label htmlFor="calendar-feed-url" className="text-xs text-foreground">
                  URL langganan
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="calendar-feed-url"
                    readOnly
                    value={feedUrl}
                    title={feedUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    className="h-auto min-h-9 flex-1 rounded-lg border-[var(--wf-rule)]! bg-[var(--wf-board-2)]! px-3 py-2 font-mono text-[11px] md:text-[11px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    className="h-auto shrink-0 gap-1.5 px-3"
                    aria-label={copied ? 'URL langganan tersalin' : 'Salin URL langganan'}
                  >
                    {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {copied ? 'Tersalin' : 'Salin'}
                  </Button>
                </div>
                <p role="status" aria-live="polite" className="mt-1.5 text-xs text-muted-foreground">
                  {copyFailed ? 'Gagal menyalin otomatis. Pilih teks URL lalu salin manual.' : ''}
                </p>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              Tautan langganan belum aktif: <code>VITE_API_URL</code> belum diisi untuk build ini.
              Hubungi tim web, atau unduh .ics di bawah untuk impor sekali.
            </p>
          )}

          {downloadable && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDownload}
              className="w-full gap-2"
            >
              <Download aria-hidden="true" />
              Unduh semua event (.ics)
            </Button>
          )}

          <p className="text-[11px] leading-5 text-muted-foreground">
            Hanya event yang belum selesai yang dikirim. Apple Calendar dan Outlook memakai URL
            langganan yang sama; unduhan .ics berguna untuk impor sekali.
          </p>

          {feedConfigured && !canPublishFeed && (
            <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              Mode lokal: Google Calendar tidak dapat mengambil URL localhost. Gunakan unduhan .ics
              untuk menguji.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}