// TSX · src/components/letters/LetterWorkspace.tsx · Vite/React 19
// Local-first: opens directly on an editable SKE/SIK pair. Server only for explicit publish.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EventItem, GeneratedLetter, LetterDocType, LetterRequestItem, SikRequestItem } from '../../types';
import { EventLetterPickerModal } from '../modals/EventLetterPickerModal';
import { LetterPaper } from './LetterPaper';
import { SikPaper } from './SikPaper';
import { LetterHistoryList } from './LetterHistoryList';
import { renderLetterPdfBase64, downloadLetterPdf } from '../../utils/letterPdfExport';
import { renderSikPdfBase64, downloadSikPdf } from '../../utils/sikPdfExport';
import { createGeneratedLetter, updateGeneratedLetter } from '../../utils/domainApi';
import { useToast } from '../../hooks/useToast';
import { Button } from '../shadcn/button';
import { Label } from '../shadcn/label';
import { Tabs, TabsList, TabsTrigger } from '../shadcn/tabs';
import { ArrowLeft, Download, Eye, EyeOff, History, RefreshCw, Save, Share2, Upload } from 'lucide-react';
import { useConfirmDialog } from '../modals/useConfirmDialog';
import {
  DOC_TYPE_LABEL, EMPTY_SKE, EMPTY_SIK, buildInitialPair,
  SKE_REQUIRED_FIELDS, SIK_REQUIRED_FIELDS, SKE_ERRORS, SIK_ERRORS,
  validateRequired, todayIso, type LetterErrors,
} from './letterDocuments';
import { parsePair, type LetterPair } from '../../lib/letterStudio/schema';
import { loadDraft, saveDraft, loadPairs, savePairs } from '../../lib/letterStudio/persistence';
import { exportBackup, importBackup } from '../../lib/letterStudio/backup';
import { suggestNumber } from '../../lib/letterStudio/numbering';
import { installAutomation } from '../../lib/letterStudio/automation';

type WorkspaceMode = 'write' | 'history';

interface LetterWorkspaceProps { events: EventItem[]; readOnly: boolean; }

interface Errors { ske: LetterErrors<LetterRequestItem>; sik: LetterErrors<SikRequestItem>; }

interface SavedRef { ske: GeneratedLetter | null; sik: GeneratedLetter | null; }

const EMPTY_ERRORS: Errors = { ske: {}, sik: {} };

function skeDocument(value: LetterRequestItem): GeneratedLetter['letterData'] {
  return { ...value, docType: 'ske' };
}
function sikDocument(value: SikRequestItem): GeneratedLetter['letterData'] {
  return { ...value, docType: 'sik' };
}

function pairToState(pair: LetterPair) {
  return {
    ske: { ...EMPTY_SKE, ...(pair.ske as Partial<LetterRequestItem>) } as LetterRequestItem,
    sik: { ...EMPTY_SIK, ...(pair.sik as Partial<SikRequestItem>) } as SikRequestItem,
  };
}

function numbersOf(pairs: LetterPair[], docType: LetterDocType): string[] {
  return pairs.map((p) => {
    const doc = docType === 'ske' ? p.ske : p.sik;
    return typeof doc.nomorSurat === 'string' ? doc.nomorSurat : '';
  });
}

function makeFreshPair(existing: LetterPair[]): { pair: LetterPair; ske: LetterRequestItem; sik: SikRequestItem } {
  const now = new Date().toISOString();
  const skeNum = suggestNumber('ske', numbersOf(existing, 'ske'), new Date());
  const sikNum = suggestNumber('sik', numbersOf(existing, 'sik'), new Date());
  const ske = { ...EMPTY_SKE, nomorSurat: skeNum, tanggalSurat: todayIso() };
  const sik = { ...EMPTY_SIK, nomorSurat: sikNum, tanggalSurat: todayIso() };
  const pair: LetterPair = {
    id: crypto.randomUUID(), title: '', ske, sik, status: 'draft',
    createdAt: now, updatedAt: now,
  };
  return { pair, ske, sik };
}
export function LetterWorkspace({ events, readOnly }: LetterWorkspaceProps) {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const initial = useMemo(() => {
    const draft = loadDraft();
    if (draft) return { pair: draft, ...pairToState(draft) };
    return makeFreshPair(loadPairs());
  }, []);

  const [mode, setMode] = useState<WorkspaceMode>('write');
  const [showPicker, setShowPicker] = useState(false);
  const [docType, setDocType] = useState<LetterDocType>('ske');
  const [activeId, setActiveId] = useState<string>(initial.pair.id);
  const [createdAt, setCreatedAt] = useState(initial.pair.createdAt);
  const [eventId, setEventId] = useState<string | undefined>(initial.pair.eventId);
  const [status, setStatus] = useState<'draft' | 'published'>(initial.pair.status);
  const [publishedIds, setPublishedIds] = useState<{ ske?: string; sik?: string } | undefined>(initial.pair.publishedIds);
  const [ske, setSke] = useState<LetterRequestItem>(initial.ske);
  const [sik, setSik] = useState<SikRequestItem>(initial.sik);
  const [baseline, setBaseline] = useState({ ske: initial.ske, sik: initial.sik });
  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [pratinjauBersih, setPratinjauBersih] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pairs, setPairs] = useState<LetterPair[]>(loadPairs);

  const savedRef = useRef<SavedRef>({
    ske: initial.pair.publishedIds?.ske ? ({ id: initial.pair.publishedIds.ske } as GeneratedLetter) : null,
    sik: initial.pair.publishedIds?.sik ? ({ id: initial.pair.publishedIds.sik } as GeneratedLetter) : null,
  });

  const dirty = useMemo(
    () => JSON.stringify({ ske, sik }) !== JSON.stringify(baseline),
    [ske, sik, baseline],
  );

  // Explicit install: automation.ts stays a pure module (no import-time side effect).
  useEffect(() => {
    try { installAutomation(); } catch { /* storage disabled / CSP */ }
  }, []);

  // Debounced autosave: draft key + versioned history key, on every change.
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = new Date().toISOString();
      const next: LetterPair = {
        id: activeId,
        eventId,
        title: ske.namaEvent || sik.namaEvent || 'Surat tanpa judul',
        ske: ske as unknown as Record<string, unknown>,
        sik: sik as unknown as Record<string, unknown>,
        status,
        createdAt,
        updatedAt: now,
        publishedIds,
      };
      if (!parsePair(next)) return;
      saveDraft(next);
      const others = loadPairs().filter((p) => p.id !== activeId);
      savePairs([next, ...others]);
      setPairs([next, ...others]);
      setBaseline({ ske: { ...ske }, sik: { ...sik } });
    }, 300);
    return () => clearTimeout(timer);
  }, [ske, sik, status, publishedIds, activeId, createdAt, eventId]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers still require returnValue; harmless alongside preventDefault.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const handleSelectEvent = useCallback(async (event: EventItem) => {
    // Konfirmasi hanya saat ada isian nyata, bukan nomor/tanggal hasil auto-suggest.
    const hasTypedContent = Boolean(ske.namaEO || sik.namaEO || ske.alamatEO || sik.jenisKegiatan);
    if (hasTypedContent && !(await confirm({
      title: 'Timpa isian yang sudah diketik?',
      message: 'Isi dari event akan menimpa isian yang sudah diketik.',
      confirmLabel: 'Lanjutkan',
      tone: 'neutral',
    }))) return;
    const built = buildInitialPair(event);
    setSke(built.ske);
    setSik(built.sik);
    setEventId(event.id);
    setStatus('draft');
    setPublishedIds(undefined);
    savedRef.current = { ske: null, sik: null };
    setErrors(EMPTY_ERRORS);
    setShowPicker(false);
    showToast('success', 'Data event dimuat', 'Isian surat terisi otomatis');
  }, [confirm, showToast, ske, sik]);

  const validateCurrent = useCallback((): Errors => ({
    ske: validateRequired(ske, SKE_REQUIRED_FIELDS, SKE_ERRORS),
    sik: validateRequired(sik, SIK_REQUIRED_FIELDS, SIK_ERRORS),
  }), [ske, sik]);

  const allErrors = useMemo(validateCurrent, [validateCurrent]);
  const allValid = Object.keys(allErrors.ske).length === 0 && Object.keys(allErrors.sik).length === 0;

  /** Terbitkan KEDUA dokumen: dua baris, dua snapshot PDF, dua id disimpan pada pair. */
  const doSave = useCallback(async (): Promise<SavedRef | null> => {
    const next = validateCurrent();
    setErrors(next);
    if (Object.keys(next.ske).length > 0 || Object.keys(next.sik).length > 0) {
      showToast('error', 'Data belum lengkap', 'Lengkapi isian wajib pada surat konfirmasi event dan surat izin kerja');
      return null;
    }
    setIsSaving(true);
    try {
      const [skePdf, sikPdf] = await Promise.all([
        renderLetterPdfBase64(ske),
        renderSikPdfBase64(sik),
      ]);
      const current = savedRef.current;
      const [savedSke, savedSik] = await Promise.all([
        current.ske?.id
          ? updateGeneratedLetter(current.ske.id, { letterData: skeDocument(ske), pdfBase64: skePdf })
          : createGeneratedLetter({ eventId, letterData: skeDocument(ske), pdfBase64: skePdf }),
        current.sik?.id
          ? updateGeneratedLetter(current.sik.id, { letterData: sikDocument(sik), pdfBase64: sikPdf })
          : createGeneratedLetter({ eventId, letterData: sikDocument(sik), pdfBase64: sikPdf }),
      ]);
      const ids = { ske: savedSke.id, sik: savedSik.id };
      savedRef.current = { ske: savedSke, sik: savedSik };
      setPublishedIds(ids);
      setStatus('published');
      setBaseline({ ske: { ...ske }, sik: { ...sik } });
      const published: LetterPair = {
        id: activeId, eventId,
        title: ske.namaEvent || sik.namaEvent || 'Surat tanpa judul',
        ske: ske as unknown as Record<string, unknown>,
        sik: sik as unknown as Record<string, unknown>,
        status: 'published',
        createdAt,
        updatedAt: new Date().toISOString(),
        publishedIds: ids,
      };
      const others = loadPairs().filter((p) => p.id !== activeId);
      savePairs([published, ...others]);
      saveDraft(published);
      setPairs([published, ...others]);
      showToast('success', 'Dua dokumen diterbitkan', 'Surat konfirmasi dan surat izin kerja berhasil disimpan.');
      return savedRef.current;
    } catch (err) {
      showToast('error', 'Gagal menerbitkan', err instanceof Error ? err.message : 'Terjadi kesalahan');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [ske, sik, eventId, activeId, createdAt, showToast, validateCurrent]);

  const canShare = Boolean(publishedIds?.ske && publishedIds?.sik);

  const handleShare = useCallback(async () => {
    const saved = savedRef.current;
    if (!saved.ske?.id || !saved.sik?.id || !publishedIds?.ske || !publishedIds?.sik) {
      showToast('error', 'Belum diterbitkan', 'Terbitkan dokumen sebelum membagikan tautan');
      return;
    }
    try {
      const text = [
        `${DOC_TYPE_LABEL.ske}: ${window.location.origin}/letter/${saved.ske.id}`,
        `${DOC_TYPE_LABEL.sik}: ${window.location.origin}/letter/${saved.sik.id}`,
      ].join('\n');
      await navigator.clipboard.writeText(text);
      showToast('success', 'Dua tautan disalin', 'Tautan surat konfirmasi event dan surat izin kerja sudah disalin');
    } catch {
      showToast('error', 'Gagal menyalin tautan', 'Salin manual dari kotak tautan, atau coba browser lain.');
    }
  }, [publishedIds, showToast]);

  const handleDownload = useCallback(async () => {
    try {
      if (docType === 'ske') await downloadLetterPdf(ske);
      else await downloadSikPdf(sik);
      showToast('success', 'PDF diunduh', `PDF ${DOC_TYPE_LABEL[docType]} berhasil diunduh`);
    } catch (err) {
      showToast('error', 'Gagal mengunduh', err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunduh');
    }
  }, [docType, ske, sik, showToast]);

  /** Regresi pasangan: buka SATU entri riwayat → hidrasi KEDUA sisi pair yang sama. */
  const handleOpenPair = useCallback((pair: LetterPair) => {
    const state = pairToState(pair);
    setSke(state.ske);
    setSik(state.sik);
    setActiveId(pair.id);
    setCreatedAt(pair.createdAt);
    setEventId(pair.eventId);
    setStatus(pair.status);
    setPublishedIds(pair.publishedIds);
    // Reset kedua sisi: id null kalau pair ini belum pernah diterbitkan.
    savedRef.current = {
      ske: pair.publishedIds?.ske ? ({ id: pair.publishedIds.ske } as GeneratedLetter) : null,
      sik: pair.publishedIds?.sik ? ({ id: pair.publishedIds.sik } as GeneratedLetter) : null,
    };
    setBaseline({ ske: state.ske, sik: state.sik });
    setErrors(EMPTY_ERRORS);
    setPratinjauBersih(false);
    setDocType('ske');
    setMode('write');
  }, []);

  const handleOpenLetter = useCallback((id: string) => {
    const found = loadPairs().find((p) => p.id === id);
    if (found) handleOpenPair(found);
    else showToast('error', 'Surat tidak ditemukan', 'Muat ulang riwayat lalu coba lagi');
  }, [handleOpenPair, showToast]);

  const handleDuplicate = useCallback((pair: LetterPair) => {
    const state = pairToState(pair);
    const now = new Date().toISOString();
    const all = loadPairs();
    const skeNum = suggestNumber('ske', [...numbersOf(all, 'ske'), state.ske.nomorSurat], new Date());
    const sikNum = suggestNumber('sik', [...numbersOf(all, 'sik'), state.sik.nomorSurat], new Date());
    const ns = { ...state.ske, nomorSurat: skeNum };
    const nk = { ...state.sik, nomorSurat: sikNum };
    const next: LetterPair = {
      id: crypto.randomUUID(),
      eventId: pair.eventId,
      title: pair.title,
      ske: ns as unknown as Record<string, unknown>,
      sik: nk as unknown as Record<string, unknown>,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    savePairs([next, ...all]);
    saveDraft(next);
    setPairs([next, ...all]);
    handleOpenPair(next);
    showToast('success', 'Diduplikasi', 'Dokumen baru dibuat dengan nomor baru');
  }, [handleOpenPair, showToast]);

  const handleDeletePair = useCallback(async (pair: LetterPair) => {
    if (!(await confirm({
      title: 'Hapus dokumen lokal ini?',
      message: 'Dokumen dihapus dari riwayat lokal dan tidak bisa dikembalikan.',
      confirmLabel: 'Hapus',
      tone: 'danger',
    }))) return;
    const next = loadPairs().filter((p) => p.id !== pair.id);
    savePairs(next);
    setPairs(next);
    showToast('success', 'Dihapus', 'Dokumen dihapus dari riwayat lokal');
  }, [confirm, showToast]);

  const handleRefreshNumber = useCallback(() => {
    const all = loadPairs();
    const currentNumber = docType === 'ske' ? ske.nomorSurat : sik.nomorSurat;
    const next = suggestNumber(docType, [...numbersOf(all, docType), currentNumber], new Date());
    if (docType === 'ske') setSke((s) => ({ ...s, nomorSurat: next }));
    else setSik((s) => ({ ...s, nomorSurat: next }));
  }, [docType, ske.nomorSurat, sik.nomorSurat]);

  const handleExportBackup = useCallback(() => {
    exportBackup(loadPairs());
    showToast('success', 'Cadangan diekspor', 'Berkas JSON diunduh');
  }, [showToast]);

  const handleImportBackup = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { merged, added, skipped } = importBackup(reader.result, loadPairs());
      savePairs(merged);
      setPairs(merged);
      showToast('success', 'Cadangan diimpor', `+${added} dokumen, ${skipped} dilewati`);
    };
    reader.readAsText(file);
  }, [showToast]);

  if (mode === 'history') {
    return (
      <div className="space-y-4">
        {dialog}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--wf-ink)]">Riwayat dokumen lokal</h2>
            <p className="text-xs text-[var(--wf-ink-muted)]">Cari, buka, duplikat, atau hapus.</p>
          </div>
          <Button variant="outline" onClick={() => setMode('write')} aria-label="Kembali ke editor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali
          </Button>
        </div>
        <LetterHistoryList
          localPairs={pairs}
          isLoading={false}
          readOnly={readOnly}
          onOpen={handleOpenLetter}
          onOpenPair={handleOpenPair}
          onDuplicate={handleDuplicate}
          onDeletePair={(p) => void handleDeletePair(p)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dialog}
      {showPicker && (
        <EventLetterPickerModal events={events} onClose={() => setShowPicker(false)} onSelect={(e) => void handleSelectEvent(e)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {status === 'published' ? 'Terbit' : 'Draf lokal'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowPicker(true)} aria-label="Isi dari event" disabled={readOnly}>
            Isi dari event
          </Button>
          <Button variant="outline" onClick={() => { setPairs(loadPairs()); setMode('history'); }} aria-label="Buka riwayat surat">
            <History className="mr-1 h-4 w-4" />
            Riwayat
          </Button>
          <Button variant="outline" onClick={() => setPratinjauBersih((v) => !v)} aria-label="Pratinjau tanpa editor">
            {pratinjauBersih ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
            {pratinjauBersih ? 'Tampilkan isian' : 'Pratinjau tanpa editor'}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleRefreshNumber} aria-label="Nomor baru" disabled={readOnly}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Nomor baru
          </Button>
          {/* Draft lokal yang belum lengkap pun harus bisa diunduh / diekspor. */}
          <Button variant="outline" onClick={() => void handleDownload()} aria-label="Unduh PDF">
            <Download className="mr-1 h-4 w-4" />
            Unduh PDF
          </Button>
          {!readOnly && (
            <>
              <Button onClick={() => void doSave()} disabled={!allValid || isSaving} aria-label="Terbitkan surat">
                <Save className="mr-1 h-4 w-4" />
                Terbitkan
              </Button>
              <Button onClick={() => void handleShare()} disabled={!canShare || isSaving} aria-label="Bagikan surat">
                <Share2 className="mr-1 h-4 w-4" />
                Bagikan
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportBackup} aria-label="Ekspor cadangan">
            <Upload className="mr-1 h-4 w-4" />
            Ekspor cadangan
          </Button>
          <Label className="inline-flex cursor-pointer items-center font-normal">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportBackup(file);
                e.target.value = '';
              }}
            />
            <span className="rounded-md border border-[var(--wf-rule)] px-3 py-1.5 text-sm">Impor cadangan</span>
          </Label>
        </div>
      </div>

      {/*
        Trigger memakai `data-[state=active]`: `radix-ui` →
        `@radix-ui/react-tabs` hanya menulis `data-state="active" | "inactive"`,
        jadi seluruh kelas `data-active:*` bawaan `shadcn/tabs` tidak pernah
        cocok di app ini. Sisa bawaan Trigger dinetralkan di sini:
        `flex-none`+`h-auto` (bukan `flex-1`/`h-[calc(100%-1px)]`), `gap-0`
        (jarak label–titik error tetap dari `ml-1.5`), `border-0` (pil terpilih
        tetap tanpa border), plus cermin `dark:*` agar token `wf` menang juga di
        tema gelap. `aria-controls={undefined}` karena panel nyata
        (`LetterPaper`/`SikPaper`) di-swap di luar `Tabs` — sama seperti
        `ViewToggle`/`DashboardCalendarView`.
      */}
      <Tabs value={docType} onValueChange={(v) => setDocType(v as 'ske' | 'sik')}>
        <TabsList
          aria-label="Jenis dokumen surat"
          className="h-auto w-auto flex-wrap items-center gap-2 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto"
        >
          {(['ske', 'sik'] as const).map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              aria-controls={undefined}
              className={`flex-none h-auto gap-0 rounded-full border-0 px-4 py-1.5 text-sm font-semibold transition data-[state=active]:bg-[var(--wf-accent)] dark:data-[state=active]:bg-[var(--wf-accent)] ${
                docType === t
                  ? 'text-[var(--wf-accent-ink)] hover:text-[var(--wf-accent-ink)] dark:text-[var(--wf-accent-ink)] dark:hover:text-[var(--wf-accent-ink)] data-[state=active]:text-[var(--wf-accent-ink)] data-[state=active]:hover:text-[var(--wf-accent-ink)] dark:data-[state=active]:text-[var(--wf-accent-ink)] dark:data-[state=active]:hover:text-[var(--wf-accent-ink)]'
                  : 'border border-[var(--wf-rule)] text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink-muted)] dark:text-[var(--wf-ink-muted)] dark:hover:text-[var(--wf-ink-muted)]'
              }`}
            >
              {DOC_TYPE_LABEL[t]}
              {Object.keys(allErrors[t]).length > 0 && (
                <span className="ml-1.5 text-rose-600 dark:text-rose-300" aria-label="ada field wajib belum diisi">•</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {docType === 'ske' ? (
        <LetterPaper letter={ske} onChange={setSke} readOnly={readOnly || pratinjauBersih} errors={pratinjauBersih ? {} : errors.ske} />
      ) : (
        <SikPaper letter={sik} onChange={setSik} readOnly={readOnly || pratinjauBersih} errors={pratinjauBersih ? {} : errors.sik} />
      )}
    </div>
  );
}
