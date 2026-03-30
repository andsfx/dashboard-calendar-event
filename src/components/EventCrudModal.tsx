import { useState, useEffect } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { EventItem } from '../types';
import { createId } from '../utils/eventUtils';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EventItem>) => void;
  editingEvent: EventItem | null;
  events: EventItem[];
}

function getUniqueSuggestions(events: EventItem[], key: 'jam' | 'lokasi' | 'eo') {
  const counts = new Map<string, number>();

  for (const event of events) {
    const value = event[key]?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);
}

function getPlaceholder(values: string[], fallback: string) {
  if (values.length === 0) return fallback;
  return values.slice(0, 3).join(' / ');
}

const DAY_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const CATEGORIES = ['Bazaar','Festival','Workshop','Kompetisi','Fashion','Seminar','Pameran','Konser','Sosial','Seni','Hiburan','Karir','Produk','Lainnya'];

function dateToMeta(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: DAY_ID[d.getDay()],
    tanggal: `${d.getDate()} ${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`,
    month: MONTH_ID[d.getMonth()],
  };
}

const EMPTY: {
  dateStr: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  keterangan: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  isDraft: boolean;
} = {
  dateStr: '',
  jam: '',
  acara: '',
  lokasi: '',
  eo: '',
  keterangan: '',
  category: 'Festival',
  priority: 'medium',
  isDraft: false,
};

export function EventCrudModal({ isOpen, onClose, onSave, editingEvent, events }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const jamSuggestions = getUniqueSuggestions(events, 'jam');
  const lokasiSuggestions = getUniqueSuggestions(events, 'lokasi');
  const eoSuggestions = getUniqueSuggestions(events, 'eo');

  const jamPlaceholder = getPlaceholder(jamSuggestions, '09:00 - 17:00');
  const lokasiPlaceholder = getPlaceholder(lokasiSuggestions, 'Atrium Lt.1 / Hall A / Main Lobby');
  const eoPlaceholder = getPlaceholder(eoSuggestions, 'Internal MMB / EO Partner / Organizer Event');

  useEffect(() => {
    if (editingEvent) {
      setForm({
        dateStr: editingEvent.dateStr,
        jam: editingEvent.jam,
        acara: editingEvent.acara,
        lokasi: editingEvent.lokasi,
        eo: editingEvent.eo,
        keterangan: editingEvent.keterangan,
        category: editingEvent.category,
        priority: editingEvent.priority,
        isDraft: editingEvent.status === 'draft',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [editingEvent, isOpen]);

  if (!isOpen) return null;

  const set = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.acara.trim()) errs.acara = 'Nama acara wajib diisi';
    if (!form.dateStr) errs.dateStr = 'Tanggal wajib diisi';
    if (!form.lokasi.trim()) errs.lokasi = 'Lokasi wajib diisi';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const { isDraft, ...formData } = form;
    const meta = formData.dateStr ? dateToMeta(formData.dateStr) : { day: '', tanggal: '', month: '' };
    const now = new Date().toISOString().split('T')[0];
    const autoStatus = formData.dateStr < now ? 'past' : formData.dateStr === now ? 'ongoing' : 'upcoming';
    const finalStatus = isDraft ? 'draft' : autoStatus;

    onSave({
      ...(editingEvent ? { id: editingEvent.id, rowIndex: editingEvent.rowIndex } : { id: createId(), rowIndex: 0 }),
      ...formData,
      ...meta,
      status: finalStatus,
    });
  };

  const isEdit = !!editingEvent;
  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div
        className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">{isEdit ? 'Edit Acara' : 'Tambah Acara Baru'}</p>
              <p className="text-xs text-slate-400">{isEdit ? `Mengubah: ${editingEvent.acara}` : 'Isi detail acara di bawah'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:px-6">
          {/* Nama acara */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Nama Acara <span className="text-red-500">*</span>
            </label>
            <input
              value={form.acara}
              onChange={e => set('acara', e.target.value)}
              placeholder="Masukkan nama acara"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                errors.acara
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
              }`}
            />
            {errors.acara && <p className="mt-1 text-xs text-red-500">{errors.acara}</p>}
          </div>

          {/* Tanggal + Jam */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dateStr}
                onChange={e => set('dateStr', e.target.value)}
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${
                  errors.dateStr
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
                }`}
              />
              {errors.dateStr && <p className="mt-1 text-xs text-red-500">{errors.dateStr}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jam</label>
              <input
                value={form.jam}
                onChange={e => set('jam', e.target.value)}
                placeholder={jamPlaceholder}
                list="jam-suggestions"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <datalist id="jam-suggestions">
                {jamSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
            </div>
          </div>

          {/* Lokasi */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Lokasi <span className="text-red-500">*</span>
            </label>
            <input
              value={form.lokasi}
              onChange={e => set('lokasi', e.target.value)}
              placeholder={lokasiPlaceholder}
              list="lokasi-suggestions"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                errors.lokasi
                  ? 'border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
              }`}
            />
            <datalist id="lokasi-suggestions">
              {lokasiSuggestions.map(item => <option key={item} value={item} />)}
            </datalist>
            {errors.lokasi && <p className="mt-1 text-xs text-red-500">{errors.lokasi}</p>}
          </div>

          {/* EO */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Event Organizer (EO)</label>
            <input
              value={form.eo}
              onChange={e => set('eo', e.target.value)}
              placeholder={eoPlaceholder}
              list="eo-suggestions"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <datalist id="eo-suggestions">
              {eoSuggestions.map(item => <option key={item} value={item} />)}
            </datalist>
          </div>

          {/* Kategori + Prioritas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Kategori</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Prioritas</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value as 'high' | 'medium' | 'low')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="high">🔴 Tinggi</option>
                <option value="medium">🔵 Sedang</option>
                <option value="low">⚪ Rendah</option>
              </select>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={e => set('keterangan', e.target.value)}
              rows={3}
              placeholder="Deskripsi singkat tentang acara..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Draft toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-800/50 dark:bg-purple-900/20">
            <input
              type="checkbox"
              checked={form.isDraft}
              onChange={e => setForm(prev => ({ ...prev, isDraft: e.target.checked }))}
              className="h-4 w-4 rounded accent-purple-600"
            />
            <div>
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Tandai sebagai Draft</p>
              <p className="text-xs text-purple-500 dark:text-purple-400">Event direncanakan namun belum dikonfirmasi</p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 dark:shadow-violet-900/30"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Simpan Perubahan' : 'Tambahkan Acara'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
