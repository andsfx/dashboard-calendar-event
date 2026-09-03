import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Download, Eye, EyeOff, Save, Share2, X } from 'lucide-react';
import { LetterRequestItem, GeneratedLetter, EventItem, DraftEventItem } from '../types';
import { ModalWrapper } from './ModalWrapper';
import { EditableText, EditableArea } from './ui/Editable';
import { downloadLetterPdf, openLetterPdfPreview, renderLetterPdfBase64 } from '../utils/letterPdfExport';
import { fetchGeneratedLetters, createGeneratedLetter, updateGeneratedLetter } from '../utils/supabaseApi';
import { useToast } from '../hooks/useToast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event?: EventItem | null;
  draftEvent?: DraftEventItem | null;
}

const EMPTY_LETTER: LetterRequestItem = {
  tanggalSurat: '',
  nomorSurat: '',
  namaEO: '',
  penanggungJawab: '',
  alamatEO: '',
  namaEvent: '',
  lokasi: '',
  hariTanggalPelaksanaan: '',
  waktuPelaksanaan: '',
  nomorTelepon: '',
  hariTanggalLoading: '',
  waktuLoading: '',
};

export function LetterGenerator({ isOpen, onClose, event, draftEvent }: Props) {
  const [letter, setLetter] = useState<LetterRequestItem>(EMPTY_LETTER);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<GeneratedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Initialize letter data from event/draftEvent
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().split('T')[0] || '';
    
    // Start with empty letter
    let initialLetter: LetterRequestItem = { ...EMPTY_LETTER, tanggalSurat: today };

    // Populate from event if available
    if (event) {
      initialLetter = {
        ...initialLetter,
        namaEO: event.eo || '',
        penanggungJawab: event.pic || '',
        alamatEO: '', // Not available in event
        namaEvent: event.acara || '',
        lokasi: event.lokasi || '',
        hariTanggalPelaksanaan: `${event.day}, ${event.tanggal}`,
        waktuPelaksanaan: event.jam || '',
        nomorTelepon: event.phone || '',
        // Loading fields need to be filled manually
        hariTanggalLoading: '',
        waktuLoading: '',
      };
    }
    // Populate from draftEvent if available (and no event)
    else if (draftEvent) {
      initialLetter = {
        ...initialLetter,
        namaEO: draftEvent.eo || '',
        penanggungJawab: draftEvent.pic || '',
        alamatEO: '', // Not available in draft
        namaEvent: draftEvent.acara || '',
        lokasi: draftEvent.lokasi || '',
        hariTanggalPelaksanaan: `${draftEvent.day}, ${draftEvent.tanggal}`,
        waktuPelaksanaan: draftEvent.jam || '',
        nomorTelepon: draftEvent.phone || '',
        // Loading fields need to be filled manually
        hariTanggalLoading: '',
        waktuLoading: '',
      };
    }

    setLetter(initialLetter);
    setIsPreviewMode(false);
    setGeneratedLetter(null);
  }, [isOpen, event, draftEvent]);

  const handleSave = async () => {
    if (!isOpen) return;
    
    try {
      setIsLoading(true);
      
      // Generate PDF base64 for storage
      const pdfBase64 = await renderLetterPdfBase64(letter);
      
      let savedLetter: GeneratedLetter;
      
      if (generatedLetter) {
        // Update existing
        savedLetter = await updateGeneratedLetter(generatedLetter.id, {
          letterData: letter,
          pdfBase64,
        });
      } else {
        // Create new
        savedLetter = await createGeneratedLetter({
          eventId: event?.id,
          draftEventId: draftEvent?.id,
          letterData: letter,
          pdfBase64,
        });
      }
      
      setGeneratedLetter(savedLetter);
      showToast('success', 'Dokumen disimpan', 'Surat berhasil disimpan ke database');
    } catch (error) {
      console.error('Save failed:', error);
      showToast('error', 'Gagal menyimpan', 'Terjadi kesalahan saat menyimpan surat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadLetterPdf(letter);
      showToast('success', 'PDF diunduh', 'File PDF berhasil diunduh');
    } catch (error) {
      console.error('Download failed:', error);
      showToast('error', 'Gagal mengunduh', 'Terjadi kesalahan saat mengunduh PDF');
    }
  };

  const handlePreview = async () => {
    try {
      await openLetterPdfPreview(letter);
      showToast('info', 'Pratinjau terbuka', 'PDF dibuka di tab baru');
    } catch (error) {
      console.error('Preview failed:', error);
      showToast('error', 'Gagal membuka pratinjau', 'Terjadi kesalahan saat membuka pratinjau');
    }
  };

  const handleShare = async () => {
    if (!generatedLetter) {
      // Save first if not saved
      await handleSave();
      if (!generatedLetter) return; // Still no generated letter
    }
    
    try {
      const shareUrl = `${window.location.origin}/letter/${generatedLetter.id}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast('success', 'Link disalin', 'Link berbagi telah disalin ke clipboard');
    } catch (error) {
      console.error('Share failed:', error);
      showToast('error', 'Gagal menyalin link', 'Pastikan browser mendukung clipboard API');
    }
  };

  // Required field validation
  const requiredFields: Array<keyof LetterRequestItem> = [
    'tanggalSurat', 'nomorSurat', 'namaEO', 'penanggungJawab', 
    'alamatEO', 'namaEvent', 'lokasi', 'hariTanggalPelaksanaan', 
    'hariTanggalLoading', 'waktuLoading'
  ];
  
  const hasRequiredFields = requiredFields.every(field => 
    letter[field] && letter[field].toString().trim() !== ''
  );

  const isModified = useMemo(() => {
    // Compare current letter with initial state based on event/draftEvent
    const today = new Date().toISOString().split('T')[0] || '';
    const initialLetter: LetterRequestItem = { ...EMPTY_LETTER, tanggalSurat: today };
    
    if (event) {
      Object.assign(initialLetter, {
        namaEO: event.eo || '',
        penanggungJawab: event.pic || '',
        namaEvent: event.acara || '',
        lokasi: event.lokasi || '',
        hariTanggalPelaksanaan: `${event.day}, ${event.tanggal}`,
        waktuPelaksanaan: event.jam || '',
        nomorTelepon: event.phone || '',
      });
    } else if (draftEvent) {
      Object.assign(initialLetter, {
        namaEO: draftEvent.eo || '',
        penanggungJawab: draftEvent.pic || '',
        namaEvent: draftEvent.acara || '',
        lokasi: draftEvent.lokasi || '',
        hariTanggalPelaksanaan: `${draftEvent.day}, ${draftEvent.tanggal}`,
        waktuPelaksanaan: draftEvent.jam || '',
        nomorTelepon: draftEvent.phone || '',
      });
    }
    
    return JSON.stringify(letter) !== JSON.stringify(initialLetter);
  }, [letter, event, draftEvent]);

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      ariaLabel="Editor Surat Konfirmasi Event"
    >
      <div className="flex h-[90vh] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Editor Surat Konfirmasi Event
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {event ? `Event: ${event.acara}` : draftEvent ? `Draft: ${draftEvent.acara}` : 'Surat Baru'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isPreviewMode
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
              {isPreviewMode ? 'Ubah' : 'Pratinjau'}
            </button>
            
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label="Tutup editor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor/Preview Panel */}
          <div className="flex flex-1 flex-col overflow-auto p-6">
            {isPreviewMode ? (
              <div className="flex h-full items-start justify-center overflow-auto bg-slate-100 dark:bg-slate-800 p-4 sm:p-8">
                <div className="w-full max-w-[210mm] rounded-lg bg-white shadow-xl dark:bg-white">
                  {/* Halaman surat */}
                  <div className="mx-auto p-8 sm:p-12 md:p-16" style={{ fontFamily: 'Times New Roman, serif' }}>
                    {/* Kop Surat */}
                    <div className="border-b-2 border-slate-900 pb-3 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded bg-slate-800 text-white text-xl font-bold shrink-0">
                          M
                        </div>
                        <div>
                          <h1 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Times New Roman, serif' }}>
                            METROPOLITAN MALL BEKASI
                          </h1>
                          <p className="text-[10px] font-semibold text-slate-700">
                            Marketing &amp; Tenant Relations Division
                          </p>
                          <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
                            Jl. KH. Noer Ali No.1, Pekayon Jaya, Bekasi Selatan<br />
                            Telp. (021) 8243 7000
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Meta surat */}
                    <div className="text-[11px] mb-4 space-y-1">
                      <div className="flex">
                        <span className="w-16 text-slate-500">Nomor</span>
                        <span className="w-3 text-slate-500">:</span>
                        <span className="font-semibold text-slate-900">{letter.nomorSurat || <span className="italic text-slate-400">—</span>}</span>
                      </div>
                      <div className="flex">
                        <span className="w-16 text-slate-500">Tanggal</span>
                        <span className="w-3 text-slate-500">:</span>
                        <span className="font-semibold text-slate-900">{letter.tanggalSurat || <span className="italic text-slate-400">—</span>}</span>
                      </div>
                      <div className="flex">
                        <span className="w-16 text-slate-500">Perihal</span>
                        <span className="w-3 text-slate-500">:</span>
                        <span className="font-semibold text-slate-900">Konfirmasi Pelaksanaan Event</span>
                      </div>
                    </div>

                    {/* Kepada */}
                    <div className="text-[11px] mb-5">
                      <p className="font-semibold">Kepada Yth.</p>
                      <p className="font-semibold">{letter.namaEO || <span className="italic text-slate-400">—</span>}</p>
                      {letter.penanggungJawab && <p className="text-slate-600">u.p. {letter.penanggungJawab}</p>}
                      {letter.alamatEO && <p className="text-slate-600">{letter.alamatEO}</p>}
                      {letter.nomorTelepon && <p className="text-slate-600">Telp. {letter.nomorTelepon}</p>}
                    </div>

                    {/* Body */}
                    <div className="text-[11px] leading-relaxed text-justify space-y-3 mb-4">
                      <p>Dengan hormat,</p>
                      <p>
                        Melalui surat ini kami sampaikan konfirmasi pelaksanaan event yang
                        akan diselenggarakan di Metropolitan Mall Bekasi dengan rincian
                        sebagai berikut:
                      </p>

                      {/* Data event box */}
                      <div className="border-l-4 border-cyan-600 bg-cyan-50 py-2 pl-3 pr-2 space-y-1 text-[10px]">
                        <p className="font-bold text-slate-800 text-[10px] uppercase tracking-wide">DATA EVENT</p>
                        <div className="flex"><span className="w-36 text-slate-500">Nama Event</span><span className="w-2">:</span><span className="font-semibold flex-1">{letter.namaEvent}</span></div>
                        <div className="flex"><span className="w-36 text-slate-500">Lokasi</span><span className="w-2">:</span><span className="font-semibold flex-1">{letter.lokasi}</span></div>
                        <div className="flex"><span className="w-36 text-slate-500">Hari/Tanggal</span><span className="w-2">:</span><span className="font-semibold flex-1">{letter.hariTanggalPelaksanaan}</span></div>
                        {letter.waktuPelaksanaan && <div className="flex"><span className="w-36 text-slate-500">Waktu</span><span className="w-2">:</span><span className="font-semibold flex-1">{letter.waktuPelaksanaan}</span></div>}

                        {(letter.hariTanggalLoading || letter.waktuLoading) && (
                          <>
                            <div className="border-t border-cyan-200 my-1.5" />
                            <p className="font-bold text-slate-800 text-[10px] uppercase tracking-wide">JADWAL LOADING</p>
                            {letter.hariTanggalLoading && <div className="flex"><span className="w-36 text-slate-500">Hari/Tanggal</span><span className="w-2">:</span><span className="font-semibold flex-1">{letter.hariTanggalLoading}</span></div>}
                            {letter.waktuLoading && <div className="flex"><span className="w-36 text-slate-500">Waktu</span><span className="w-2">:</span><span className="font-semibold flex-1">{letter.waktuLoading}</span></div>}
                          </>
                        )}
                      </div>

                      <p>
                        Demikian surat konfirmasi ini kami sampaikan. Mohon agar seluruh
                        persiapan dilakukan sesuai jadwal yang telah disepakati.
                      </p>
                      <p>Demikian, atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>
                    </div>

                    {/* Tanda tangan */}
                    <div className="flex justify-end mt-8">
                      <div className="text-center w-48">
                        <p className="text-[10px] text-slate-500">Hormat kami,</p>
                        <p className="text-[9px] text-slate-500 mt-1">Marketing Manager</p>
                        <div className="h-14" />
                        <div className="border-t border-slate-800 pt-1">
                          <p className="text-[11px] font-bold">{letter.penanggungJawab || <span className="italic text-slate-400">________________</span>}</p>
                          <p className="text-[9px] text-slate-500">Metropolitan Mall Bekasi</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Metadata Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Data Surat
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tanggal Surat *
                      </label>
                      <EditableText
                        value={letter.tanggalSurat}
                        onChange={(value: string) => setLetter({ ...letter, tanggalSurat: value })}
                        placeholder="YYYY-MM-DD"
                        className="block w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nomor Surat *
                      </label>
                      <EditableText
                        value={letter.nomorSurat}
                        onChange={(value: string) => setLetter({ ...letter, nomorSurat: value })}
                        placeholder="Nomor surat resmi"
                        className="block w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* EO & Event Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Data EO & Event
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nama EO *
                      </label>
                      <EditableText
                        value={letter.namaEO}
                        onChange={(value: string) => setLetter({ ...letter, namaEO: value })}
                        placeholder="Nama Event Organizer"
                        className="block w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Penanggung Jawab *
                      </label>
                      <EditableText
                        value={letter.penanggungJawab}
                        onChange={(value: string) => setLetter({ ...letter, penanggungJawab: value })}
                        placeholder="Nama PIC/Contact Person"
                        className="block w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Alamat EO *
                    </label>
                      <EditableArea
                        value={letter.alamatEO}
                        onChange={(value: string) => setLetter({ ...letter, alamatEO: value })}
                        placeholder="Alamat lengkap Event Organizer"
                        className="block w-full"
                        rows={2}
                      />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nama Event *
                      </label>
                      <EditableText
                        value={letter.namaEvent}
                        onChange={(value: string) => setLetter({ ...letter, namaEvent: value })}
                        placeholder="Nama acara/event"
                        className="block w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Lokasi *
                      </label>
                      <EditableText
                        value={letter.lokasi}
                        onChange={(value: string) => setLetter({ ...letter, lokasi: value })}
                        placeholder="Lokasi pelaksanaan event"
                        className="block w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Hari/Tanggal Pelaksanaan *
                      </label>
                      <EditableText
                        value={letter.hariTanggalPelaksanaan}
                        onChange={(value: string) => setLetter({ ...letter, hariTanggalPelaksanaan: value })}
                        placeholder="Contoh: Sabtu, 15 Juni 2025"
                        className="block w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Waktu Pelaksanaan
                      </label>
                      <EditableText
                        value={letter.waktuPelaksanaan}
                        onChange={(value: string) => setLetter({ ...letter, waktuPelaksanaan: value })}
                        placeholder="Contoh: 10:00 - 18:00"
                        className="block w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nomor Telepon
                    </label>
                    <EditableText
                      value={letter.nomorTelepon}
                        onChange={(value: string) => setLetter({ ...letter, nomorTelepon: value })}
                      placeholder="Nomor kontak EO"
                      className="block w-full"
                    />
                  </div>
                </div>

                {/* Loading Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Jadwal Loading
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Hari/Tanggal Bongkar Muat *
                      </label>
                      <EditableText
                        value={letter.hariTanggalLoading}
                        onChange={(value: string) => setLetter({ ...letter, hariTanggalLoading: value })}
                        placeholder="Contoh: Jumat, 14 Juni 2025"
                        className="block w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Waktu Bongkar Muat *
                      </label>
                      <EditableText
                        value={letter.waktuLoading}
                        onChange={(value: string) => setLetter({ ...letter, waktuLoading: value })}
                        placeholder="Contoh: 08:00 - 10:00"
                        className="block w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {!hasRequiredFields && (
                <span className="text-red-600 dark:text-red-400">
                  * Isi semua field yang wajib
                </span>
              )}
              {isModified && !generatedLetter && (
                <span className="text-amber-600 dark:text-amber-400">
                  Belum disimpan
                </span>
              )}
              {generatedLetter && (
                <span className="text-green-600 dark:text-green-400">
                  Tersimpan ({new Date(generatedLetter.createdAt).toLocaleDateString('id-ID')})
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                disabled={!hasRequiredFields}
                className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye size={16} />
                Pratinjau
              </button>
              
              <button
                onClick={handleDownload}
                disabled={!hasRequiredFields}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                Unduh PDF
              </button>
              
              <button
                onClick={handleSave}
                disabled={!hasRequiredFields || !isModified}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                Simpan
              </button>
              
              {generatedLetter && (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-700"
                >
                  <Share2 size={16} />
                  Bagikan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}