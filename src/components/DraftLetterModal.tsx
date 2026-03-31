import { useEffect, useMemo, useState } from 'react';
import { FileText, Save, X } from 'lucide-react';
import { LetterRequestItem } from '../types';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<LetterRequestItem> | null;
  onSubmit: (data: LetterRequestItem) => Promise<boolean>;
}

const EMPTY: LetterRequestItem = {
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

export function DraftLetterModal({ isOpen, onClose, initialData, onSubmit }: Props) {
  const [form, setForm] = useState<LetterRequestItem>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof LetterRequestItem, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultData = useMemo<LetterRequestItem>(() => ({
    ...EMPTY,
    ...initialData,
  }), [initialData]);

  useEffect(() => {
    if (isOpen) {
      setForm(defaultData);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, defaultData]);

  if (!isOpen || !initialData) return null;

  const setField = (key: keyof LetterRequestItem, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof LetterRequestItem, string>> = {};
    if (!form.tanggalSurat.trim()) nextErrors.tanggalSurat = 'Tanggal surat wajib diisi';
    if (!form.nomorSurat.trim()) nextErrors.nomorSurat = 'Nomor surat wajib diisi';
    if (!form.namaEO.trim()) nextErrors.namaEO = 'Nama EO wajib diisi';
    if (!form.penanggungJawab.trim()) nextErrors.penanggungJawab = 'Penanggung jawab wajib diisi';
    if (!form.alamatEO.trim()) nextErrors.alamatEO = 'Alamat EO wajib diisi';
    if (!form.namaEvent.trim()) nextErrors.namaEvent = 'Nama event wajib diisi';
    if (!form.lokasi.trim()) nextErrors.lokasi = 'Lokasi wajib diisi';
    if (!form.hariTanggalPelaksanaan.trim()) nextErrors.hariTanggalPelaksanaan = 'Hari/Tanggal pelaksanaan wajib diisi';
    if (!form.hariTanggalLoading.trim()) nextErrors.hariTanggalLoading = 'Hari/Tanggal loading wajib diisi';
    if (!form.waktuLoading.trim()) nextErrors.waktuLoading = 'Waktu loading wajib diisi';
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(form);
    setIsSubmitting(false);
    if (success) onClose();
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white';
  const errorClass = 'border-red-400 focus:ring-red-100';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">Form Surat Izin Konfirmasi Event</p>
              <p className="text-xs text-slate-400">Data akan dikirim ke spreadsheet AutoCrat untuk proses dokumen.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-4 py-5 sm:px-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Surat Konfirmasi Event</h3>
              <p className="text-xs text-slate-400">Lengkapi data untuk surat konfirmasi utama.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tanggal Surat <span className="text-red-500">*</span></label>
                <input value={form.tanggalSurat} onChange={e => setField('tanggalSurat', e.target.value)} placeholder="23 Februari 2026" className={`${inputClass} ${errors.tanggalSurat ? errorClass : ''}`} />
                {errors.tanggalSurat && <p className="mt-1 text-xs text-red-500">{errors.tanggalSurat}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nomor Surat <span className="text-red-500">*</span></label>
                <input value={form.nomorSurat} onChange={e => setField('nomorSurat', e.target.value)} placeholder="090/MMB/MKT.MC/II/2026" className={`${inputClass} ${errors.nomorSurat ? errorClass : ''}`} />
                {errors.nomorSurat && <p className="mt-1 text-xs text-red-500">{errors.nomorSurat}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama EO</label>
                <input value={form.namaEO} onChange={e => setField('namaEO', e.target.value)} className={`${inputClass} ${errors.namaEO ? errorClass : ''}`} />
                {errors.namaEO && <p className="mt-1 text-xs text-red-500">{errors.namaEO}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Penanggung Jawab</label>
                <input value={form.penanggungJawab} onChange={e => setField('penanggungJawab', e.target.value)} className={`${inputClass} ${errors.penanggungJawab ? errorClass : ''}`} />
                {errors.penanggungJawab && <p className="mt-1 text-xs text-red-500">{errors.penanggungJawab}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Alamat EO <span className="text-red-500">*</span></label>
              <textarea value={form.alamatEO} onChange={e => setField('alamatEO', e.target.value)} rows={3} placeholder="Alamat lengkap EO" className={`${inputClass} resize-none ${errors.alamatEO ? errorClass : ''}`} />
              {errors.alamatEO && <p className="mt-1 text-xs text-red-500">{errors.alamatEO}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Event</label>
                <input value={form.namaEvent} onChange={e => setField('namaEvent', e.target.value)} className={`${inputClass} ${errors.namaEvent ? errorClass : ''}`} />
                {errors.namaEvent && <p className="mt-1 text-xs text-red-500">{errors.namaEvent}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Lokasi</label>
                <input value={form.lokasi} onChange={e => setField('lokasi', e.target.value)} className={`${inputClass} ${errors.lokasi ? errorClass : ''}`} />
                {errors.lokasi && <p className="mt-1 text-xs text-red-500">{errors.lokasi}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hari / Tanggal Pelaksanaan</label>
                <input value={form.hariTanggalPelaksanaan} onChange={e => setField('hariTanggalPelaksanaan', e.target.value)} className={`${inputClass} ${errors.hariTanggalPelaksanaan ? errorClass : ''}`} />
                {errors.hariTanggalPelaksanaan && <p className="mt-1 text-xs text-red-500">{errors.hariTanggalPelaksanaan}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Waktu Pelaksanaan</label>
                <input value={form.waktuPelaksanaan} onChange={e => setField('waktuPelaksanaan', e.target.value)} className={inputClass} />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Surat Izin Kerja</h3>
              <p className="text-xs text-slate-400">Lengkapi kebutuhan loading sesuai koordinasi event.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nomor Telepon</label>
              <input value={form.nomorTelepon} onChange={e => setField('nomorTelepon', e.target.value)} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hari/Tanggal Loading <span className="text-red-500">*</span></label>
                <input value={form.hariTanggalLoading} onChange={e => setField('hariTanggalLoading', e.target.value)} placeholder="Sabtu, 25 April 2026" className={`${inputClass} ${errors.hariTanggalLoading ? errorClass : ''}`} />
                {errors.hariTanggalLoading && <p className="mt-1 text-xs text-red-500">{errors.hariTanggalLoading}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Waktu Loading <span className="text-red-500">*</span></label>
                <input value={form.waktuLoading} onChange={e => setField('waktuLoading', e.target.value)} placeholder="06.00 - 20.00" className={`${inputClass} ${errors.waktuLoading ? errorClass : ''}`} />
                {errors.waktuLoading && <p className="mt-1 text-xs text-red-500">{errors.waktuLoading}</p>}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-violet-900/30">
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Mengirim...' : 'Kirim ke AutoCrat'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
