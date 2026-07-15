import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, X, FileText, CalendarDays, Palette, ArrowLeft, Eye } from 'lucide-react';
import type { AnnualTheme, EventPhoto, PhotoAlbum } from '../types';
import { supabase } from '../lib/supabase';
import { generateAlbumPdf, type AlbumWithPhotos } from '../utils/pdfExport';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  albums: PhotoAlbum[];
  themes: AnnualTheme[];
}

type FilterMode = 'date' | 'theme';

interface DbPhotoRow {
  id: string;
  url: string;
  caption: string | null;
  event_date: string | null;
  sort_order: number | null;
  album_id: string | null;
}

function dbPhotoToEventPhoto(row: DbPhotoRow): EventPhoto {
  return {
    id: row.id,
    url: row.url,
    caption: row.caption || '',
    eventDate: row.event_date || '',
    sortOrder: row.sort_order || 0,
    albumId: row.album_id || '',
  };
}

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'album-export';
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportPdfModal({ isOpen, onClose, albums, themes }: Props) {
  const [mode, setMode] = useState<FilterMode>('date');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [themeId, setThemeId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [progressText, setProgressText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedTheme = useMemo(
    () => themes.find(theme => theme.id === themeId) || null,
    [themeId, themes],
  );

  const filteredAlbums = useMemo(() => {
    if (mode === 'theme') {
      if (!themeId) return [];
      return albums.filter(album => {
        if (album.themeId === themeId) return true;
        if (!selectedTheme || album.themeId) return false;
        if (!album.eventDate) return false;
        return album.eventDate >= selectedTheme.dateStart && album.eventDate <= selectedTheme.dateEnd;
      });
    }

    return albums.filter(album => {
      if (!album.eventDate) return false;
      if (dateStart && album.eventDate < dateStart) return false;
      if (dateEnd && album.eventDate > dateEnd) return false;
      return true;
    });
  }, [albums, dateEnd, dateStart, mode, selectedTheme, themeId]);

  const canGenerate = filteredAlbums.length > 0 && !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setErrorMessage('');
    setProgressText('Menyiapkan foto...');

    try {
      const albumIds = filteredAlbums.map(album => album.id);
      const { data, error } = await supabase
        .from('event_photos')
        .select('*')
        .in('album_id', albumIds)
        .order('sort_order', { ascending: true });

      if (error) throw new Error(error.message);

      const photos = ((data || []) as DbPhotoRow[]).map(dbPhotoToEventPhoto);
      const photosByAlbum = new Map<string, EventPhoto[]>();
      for (const photo of photos) {
        if (!photo.albumId) continue;
        const existing = photosByAlbum.get(photo.albumId) || [];
        existing.push(photo);
        photosByAlbum.set(photo.albumId, existing);
      }

      const payload: AlbumWithPhotos[] = filteredAlbums.map(album => ({
        album,
        photos: photosByAlbum.get(album.id) || [],
      }));

      const blob = await generateAlbumPdf(payload, selectedTheme?.name, (current, total) => {
        setProgressText(`Mengompres foto ${current}/${total}...`);
      });
      setProgressText('Membuat PDF...');
      
      // Show preview instead of direct download
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewBlob(blob);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membuat PDF.';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleDownload = () => {
    if (!previewBlob) return;
    const suffix = selectedTheme?.name || [dateStart, dateEnd].filter(Boolean).join('-to-') || 'all';
    downloadBlob(previewBlob, `${safeFileName(`dokumentasi-event-${suffix}`)}.pdf`);
  };

  const handleBackToFilter = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setErrorMessage('');
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth={previewUrl ? 'max-w-6xl' : 'max-w-2xl'} ariaLabel="Export album ke PDF">
      <div className="overflow-hidden rounded-3xl bg-[var(--brand-card-light)] text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary-500">PDF Report</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{previewUrl ? 'Preview PDF' : 'Export Album Foto'}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{previewUrl ? 'Cek dulu hasilnya sebelum download.' : 'Generate report landscape berdasarkan tanggal atau tema event.'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {previewUrl ? (
          <div className="bg-slate-100 p-3 dark:bg-slate-950">
            <iframe
              src={previewUrl}
              title="Preview PDF"
              className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-white shadow-inner dark:border-slate-800"
            />
          </div>
        ) : (
          <div className="space-y-6 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('date')}
              className={`rounded-2xl border p-4 text-left transition ${mode === 'date' ? 'border-brand-primary-500 bg-brand-primary-50 text-brand-primary-950 dark:bg-brand-primary-500/15 dark:text-brand-primary-100' : 'border-slate-200 bg-[var(--brand-card)] text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}
            >
              <CalendarDays className="h-5 w-5" />
              <div className="mt-3 font-semibold">Berdasarkan Tanggal</div>
              <div className="mt-1 text-xs opacity-75">Pilih range tanggal event.</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('theme')}
              className={`rounded-2xl border p-4 text-left transition ${mode === 'theme' ? 'border-brand-primary-500 bg-brand-primary-50 text-brand-primary-950 dark:bg-brand-primary-500/15 dark:text-brand-primary-100' : 'border-slate-200 bg-[var(--brand-card)] text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}
            >
              <Palette className="h-5 w-5" />
              <div className="mt-3 font-semibold">Berdasarkan Tema</div>
              <div className="mt-1 text-xs opacity-75">Export satu tema event.</div>
            </button>
          </div>

          {mode === 'date' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Tanggal mulai</span>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(event) => setDateStart(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Tanggal akhir</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(event) => setDateEnd(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Tema event</span>
              <select
                value={themeId}
                onChange={(event) => setThemeId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Pilih tema</option>
                {themes.map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            </label>
          )}

          <div className="rounded-2xl border border-slate-200 bg-[var(--brand-card)] p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary-100 text-brand-primary-600 dark:bg-brand-primary-500/15 dark:text-brand-primary-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{filteredAlbums.length} album siap diexport</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Format: PDF report landscape A4.</div>
              </div>
            </div>
            {errorMessage ? <p className="mt-3 text-sm text-red-500">{errorMessage}</p> : null}
          </div>
        </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
          {previewUrl ? (
            <>
              <button
                type="button"
                onClick={handleBackToFilter}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-primary-600/20 transition hover:bg-brand-primary-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-primary-600/20 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {isGenerating ? (progressText || 'Membuat PDF...') : 'Preview PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
