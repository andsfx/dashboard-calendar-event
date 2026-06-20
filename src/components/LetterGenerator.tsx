import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Download, Eye, EyeOff, FileText, Save, Share2, X } from 'lucide-react';
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
              {isPreviewMode ? 'Edit' : 'Pratinjau'}
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
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 text-slate-400" />
                  <h3 className="mb-2 text-lg font-medium text-slate-700 dark:text-slate-300">
                    Pratinjau PDF
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Klik tombol "Pratinjau" untuk membuka PDF di tab baru
                  </p>
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
                        Hari/Tanggal Loading *
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
                        Waktu Loading *
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
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
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