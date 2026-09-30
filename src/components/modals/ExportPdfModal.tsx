import { useMemo, useState } from 'react';
import { Loader2, X, FileText, CalendarDays, Palette, Eye } from 'lucide-react';
import type { AnnualTheme, EventPhoto, PhotoAlbum } from '../../types';
import { apiGet } from '../../lib/rest';
import { safeFileName } from '../../lib/download';
import { generateAlbumPdf, type AlbumPdfSection, type AlbumWithPhotos } from '../../utils/pdfExport';
import { describeRange, formatIsoId } from '../../utils/exportDateRange';
import { PdfExportOptionsModal, type PdfExportResult } from '../pdf/PdfExportOptionsModal';
import { PdfPreviewStage } from '../pdf/PdfPreviewStage';
import { ExportScopePicker } from '../pdf/ExportScopePicker';
import { useExportScope } from '../pdf/useExportScope';
import { ALBUM_SECTION_OPTIONS } from '../pdf/pdfSectionOptions';
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

interface DbAlbumRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  event_date: string;
  cover_photo_url: string;
  sort_order: number;
  event_id: string;
  lokasi: string;
  theme_id: string;
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





export function ExportPdfModal({ isOpen, onClose, albums, themes }: Props) {
  const [mode, setMode] = useState<FilterMode>('date');
  const [themeId, setThemeId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [progressText, setProgressText] = useState('');
  const [preview, setPreview] = useState<PdfExportResult | null>(null);
  const [isSectionPickerOpen, setIsSectionPickerOpen] = useState(false);

  const selectedTheme = useMemo(
    () => themes.find(theme => theme.id === themeId) || null,
    [themeId, themes],
  );

  /** Album yang lolos saringan mode (tema atau seluruh album). */
  const themeAlbums = useMemo(() => {
    if (mode !== 'theme') return albums;
    if (!themeId) return [];
    return albums.filter(album => {
      if (album.themeId === themeId) return true;
      if (!selectedTheme || album.themeId) return false;
      if (!album.eventDate) return false;
      return album.eventDate >= selectedTheme.dateStart && album.eventDate <= selectedTheme.dateEnd;
    });
  }, [albums, mode, selectedTheme, themeId]);

  // Cakupan ekspor: periode (hari/minggu/bulan/tahun/kustom) + pilih per album.
  const scope = useExportScope<PhotoAlbum>({
    items: themeAlbums,
    getId: (album) => album.id,
    getRange: (album) => ({ start: album.eventDate }),
  });

  const filteredAlbums = scope.selected;
  const canGenerate = filteredAlbums.length > 0 && !isGenerating;

  const handleGenerate = async (sections: string[]) => {
    setIsGenerating(true);
    setErrorMessage('');
    setProgressText('Menyiapkan foto…');

    try {
      const albumIds = filteredAlbums.map(album => album.id);
      // GET /albums publik — filter album_id client-side (Opsi B).
      const { photos } = await apiGet<{ albums: DbAlbumRow[]; photos: DbPhotoRow[] }>('/albums');
      const albumPhotos = photos
        .filter(p => p.album_id && albumIds.includes(p.album_id))
        .map(dbPhotoToEventPhoto);
      const photosByAlbum = new Map<string, EventPhoto[]>();
      for (const photo of albumPhotos) {
        if (!photo.albumId) continue;
        const existing = photosByAlbum.get(photo.albumId) || [];
        existing.push(photo);
        photosByAlbum.set(photo.albumId, existing);
      }

      const payload: AlbumWithPhotos[] = filteredAlbums.map(album => ({
        album,
        photos: photosByAlbum.get(album.id) || [],
      }));

      const blob = await generateAlbumPdf(
        payload,
        selectedTheme?.name,
        (current, total) => {
          setProgressText(`Mengompres foto ${current}/${total}…`);
        },
        undefined,
        { sections: sections as AlbumPdfSection[] },
      );
      setProgressText('Membuat PDF…');

      // Hasil ditahan sebagai pratinjau; unduhan baru terjadi setelah
      // pengguna memastikan dokumennya sudah benar.
      const rangeSuffix = scope.period === 'all' ? '' : describeRange(scope.range).toLowerCase();
      const suffix = selectedTheme?.name || rangeSuffix || 'all';
      setPreview({
        blob,
        fileName: `${safeFileName(`dokumentasi-event-${suffix}`.toLowerCase(), 'album-export')}.pdf`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membuat PDF.';
      setErrorMessage(message);
      throw error;
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleBackToFilter = () => {
    setPreview(null);
    setErrorMessage('');
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth={preview ? 'max-w-6xl' : 'max-w-2xl'} ariaLabel="Export album ke PDF">
      {preview ? (
        <PdfPreviewStage result={preview} onBack={handleBackToFilter} onClose={onClose} />
      ) : (
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-[var(--brand-card-light)] text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary-700 dark:text-brand-primary-300">Laporan PDF</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Export Album Foto</h2>
            <p className="mt-1 text-sm ui-text-muted">Generate report landscape berdasarkan tanggal atau tema event.</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
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

          {mode === 'theme' && (
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

          {mode === 'theme' && !themeId ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm ui-text-muted dark:border-slate-700">
              Pilih tema dulu untuk melihat album yang tersedia.
            </p>
          ) : (
            <ExportScopePicker
              scope={scope}
              getId={(album) => album.id}
              primary={(album) => album.name || '(tanpa nama)'}
              secondary={(album) => [album.eventDate ? formatIsoId(album.eventDate) : '', album.lokasi]
                .filter(Boolean)
                .join(' · ')}
              itemNoun="album"
              searchPlaceholder="Cari album atau lokasi…"
            />
          )}

          <div className="rounded-2xl border border-slate-200 bg-[var(--brand-card)] p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary-100 text-brand-primary-600 dark:bg-brand-primary-500/15 dark:text-brand-primary-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{filteredAlbums.length} album siap diexport</div>
                <div className="text-sm ui-text-muted">Format: Laporan PDF landscape A4.</div>
              </div>
            </div>
            {errorMessage ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => setIsSectionPickerOpen(true)}
            disabled={!canGenerate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-primary-600/20 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            {isGenerating ? (progressText || 'Membuat PDF…') : 'Preview PDF'}
          </button>
        </div>
      </div>
      )}

      <PdfExportOptionsModal
        isOpen={isSectionPickerOpen}
        onClose={() => setIsSectionPickerOpen(false)}
        title="Preview Album Foto"
        description={`${filteredAlbums.length} album siap diekspor. Pilih bagian yang ingin disertakan.`}
        sections={ALBUM_SECTION_OPTIONS}
        defaultSelected={['cover', 'header', 'photos', 'captions']}
        requiredSections={['photos']}
        onGenerate={handleGenerate}
        generateLabel="Preview PDF"
      />
    </ModalWrapper>
  );
}
