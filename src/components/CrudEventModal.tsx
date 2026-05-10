import { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, CalendarDays, Clock, MapPin, Users, FileText, Image, Trash2, Upload } from 'lucide-react';
import { EventItem } from '../types';
import { parseTimeRange } from '../utils/eventDateTime';
import { INPUT_LIMITS } from '../constants';
import { uploadToR2 } from '../utils/supabaseApi';

interface CrudEventModalProps {
  isOpen: boolean;
  editingEvent: EventItem | null;
  onClose: () => void;
  onSave: (data: Partial<EventItem>) => void;
}

const NUM_BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function isValidTimeRange(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return parseTimeRange(trimmed) !== null;
}

function dateInputToDisplay(dateStr: string): { tanggal: string; dateStr: string; day: string; month: string } {
  if (!dateStr) return { tanggal: '', dateStr: '', day: '', month: '' };
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return { tanggal: '', dateStr: '', day: '', month: '' };
  const dateObj = new Date(y, m - 1, d);
  const monthName = NUM_BULAN[m] ?? '';
  const dayName = HARI[dateObj.getDay()] ?? '';
  return {
    tanggal: `${d} ${monthName} ${y}`,
    dateStr: dateStr,
    day: dayName,
    month: monthName,
  };
}
export default function CrudEventModal({ isOpen, editingEvent, onClose, onSave }: CrudEventModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    jam: '',
    acara: '',
    eo: '',
    lokasi: '',
    keterangan: '',
  });
  const [saving, setSaving] = useState(false);
  const [jamError, setJamError] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState('');
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setFormData({
          date: editingEvent.dateStr || '',
          jam: editingEvent.jam || '',
          acara: editingEvent.acara || '',
          eo: editingEvent.eo || '',
          lokasi: editingEvent.lokasi || '',
          keterangan: editingEvent.keterangan || '',
        });
        setPosterUrl(editingEvent.posterUrl || '');
      } else {
        setFormData({ date: '', jam: '', acara: '', eo: '', lokasi: '', keterangan: '' });
        setPosterUrl('');
      }
      setSaving(false);
      setJamError('');
      setPosterError('');
    }
  }, [editingEvent, isOpen]);

  if (!isOpen) return null;

  async function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPosterError('File harus berupa gambar (JPG, PNG, WebP, dll).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPosterError('Ukuran file maksimal 10 MB.');
      return;
    }
    setPosterError('');
    setPosterUploading(true);
    try {
      const url = await uploadToR2(file);
      setPosterUrl(url);
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : 'Upload gagal. Coba lagi.');
    } finally {
      setPosterUploading(false);
      // reset input so same file can be re-selected
      if (posterInputRef.current) posterInputRef.current.value = '';
    }
  }

  function handleRemovePoster() {
    setPosterUrl('');
    setPosterError('');
    if (posterInputRef.current) posterInputRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.date || !formData.acara.trim()) return;
    if (!isValidTimeRange(formData.jam)) {
      setJamError('Format jam tidak valid. Gunakan format seperti 10:00 - 14:00.');
      return;
    }

    setSaving(true);
    const dateInfo = dateInputToDisplay(formData.date);

    // Slight delay for feedback
    setTimeout(() => {
      onSave({
        ...(editingEvent ? { id: editingEvent.id, rowIndex: editingEvent.rowIndex, sheetRow: editingEvent.sheetRow } : {}),
        tanggal: dateInfo.tanggal,
        dateStr: dateInfo.dateStr,
        day: dateInfo.day,
        month: dateInfo.month,
        jam: formData.jam,
        acara: formData.acara.trim(),
        eo: formData.eo.trim(),
        lokasi: formData.lokasi.trim(),
        keterangan: formData.keterangan.trim(),
        posterUrl: posterUrl || '',
      });
      setSaving(false);
      onClose();
    }, 300);
  }

  const isEditing = !!editingEvent;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-slide-in max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditing ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
            {isEditing ? <Save className="w-5 h-5 text-amber-600 dark:text-amber-400" /> : <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {isEditing ? 'Edit Acara' : 'Tambah Acara Baru'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {isEditing ? 'Perbarui detail acara yang ada' : 'Isi form untuk membuat acara baru'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Waktu / Jam
              </label>
              <input
                type="text"
                value={formData.jam}
                onChange={e => {
                  setFormData({ ...formData, jam: e.target.value });
                  if (jamError) setJamError('');
                }}
                placeholder="Contoh: 10:00 - 14:00"
                title="Format: HH:MM - HH:MM"
                maxLength={INPUT_LIMITS.JAM}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all"
              />
              {jamError && <p className="text-red-500 text-xs mt-1.5 font-medium">{jamError}</p>}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-500" />
              Nama Acara <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.acara}
              onChange={e => setFormData({ ...formData, acara: e.target.value })}
              placeholder="Masukkan nama acara..."
              maxLength={INPUT_LIMITS.ACARA}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                Event Organizer
              </label>
              <input
                type="text"
                value={formData.eo}
                onChange={e => setFormData({ ...formData, eo: e.target.value })}
                placeholder="Nama EO..."
                maxLength={INPUT_LIMITS.EO}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Lokasi
              </label>
              <input
                type="text"
                value={formData.lokasi}
                onChange={e => setFormData({ ...formData, lokasi: e.target.value })}
                placeholder="Lokasi acara..."
                maxLength={INPUT_LIMITS.LOKASI}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Detail Keterangan
            </label>
            <textarea
              value={formData.keterangan}
              onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
              placeholder="Tambahkan deskripsi..."
              rows={3}
              maxLength={INPUT_LIMITS.KETERANGAN}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm resize-none transition-all"
            />
          </div>

          {/* ── Poster / Flyer ── */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Image className="w-3.5 h-3.5 text-emerald-500" />
              Poster / Flyer Event
            </label>

            {posterUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <img
                  src={posterUrl}
                  alt="Poster acara"
                  className="w-full max-h-48 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex gap-2 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    disabled={posterUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Ganti
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePoster}
                    disabled={posterUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => posterInputRef.current?.click()}
                disabled={posterUploading}
                className="w-full flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:border-emerald-400 hover:text-emerald-500 dark:hover:border-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posterUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-xs font-medium">Mengupload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-medium">Klik untuk upload poster / flyer</span>
                    <span className="text-[10px]">JPG, PNG, WebP — maks. 10 MB</span>
                  </>
                )}
              </button>
            )}

            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePosterChange}
            />

            {posterError && <p className="text-red-500 text-xs mt-1.5 font-medium">{posterError}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || posterUploading}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-indigo-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isEditing ? (
                <Save className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Acara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
