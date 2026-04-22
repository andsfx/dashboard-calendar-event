import { useState, useEffect } from 'react';
import { X, Save, Calendar, Copy, Trash2 } from 'lucide-react';
import { EventItem, EventModel, DayTimeSlot } from '../types';
import { createId, parseDateStrLocal, getDateRange } from '../utils/eventUtils';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EventItem>) => Promise<boolean>;
  editingEvent: EventItem | null;
  events: EventItem[];
}

function getUniqueSuggestions(events: EventItem[], key: 'jam' | 'lokasi' | 'eo' | 'pic' | 'phone') {
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

const CATEGORIES = ['Bazaar','Festival','Workshop','Kompetisi','Fashion','Seminar','Pameran','Konser','Sosial','Seni','Hiburan','Karir','Produk','Anak','Kuliner','Olahraga','Teknologi','Kesehatan','Umum'];
const EVENT_MODELS: Array<{ value: EventModel; label: string }> = [
  { value: '', label: 'Pilih model' },
  { value: 'free', label: 'Free' },
  { value: 'bayar', label: 'Bayar' },
  { value: 'support', label: 'Support' },
];

function dateToMeta(dateStr: string) {
  const d = parseDateStrLocal(dateStr) || new Date();
  return {
    day: DAY_ID[d.getDay()],
    tanggal: `${d.getDate()} ${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`,
    month: MONTH_ID[d.getMonth()],
  };
}

const EMPTY: {
  dateStr: string;
  dateEnd: string;
  isMultiDay: boolean;
  dayTimeSlots: DayTimeSlot[];
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  categories: string[];
  category: string;
  priority: 'high' | 'medium' | 'low';
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
} = {
  dateStr: '',
  dateEnd: '',
  isMultiDay: false,
  dayTimeSlots: [],
  jam: '',
  acara: '',
  lokasi: '',
  eo: '',
  pic: '',
  phone: '',
  keterangan: '',
  categories: [],
  category: '',
  priority: 'medium',
  eventModel: '',
  eventNominal: '',
  eventModelNotes: '',
};

export function EventCrudModal({ isOpen, onClose, onSave, editingEvent, events }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jamSuggestions = getUniqueSuggestions(events, 'jam');
  const lokasiSuggestions = getUniqueSuggestions(events, 'lokasi');
  const eoSuggestions = getUniqueSuggestions(events, 'eo');
  const picSuggestions = getUniqueSuggestions(events, 'pic');
  const phoneSuggestions = getUniqueSuggestions(events, 'phone');

  const jamPlaceholder = getPlaceholder(jamSuggestions, '09:00 - 17:00');
  const lokasiPlaceholder = getPlaceholder(lokasiSuggestions, 'Atrium Lt.1 / Hall A / Main Lobby');
  const eoPlaceholder = getPlaceholder(eoSuggestions, 'Internal MMB / EO Partner / Organizer Event');
  const picPlaceholder = getPlaceholder(picSuggestions, 'Nama penanggung jawab event');
  const phonePlaceholder = getPlaceholder(phoneSuggestions, '08xxxxxxxxxx');

  useEffect(() => {
    if (editingEvent) {
      setForm({
        dateStr: editingEvent.dateStr,
        dateEnd: editingEvent.dateEnd || '',
        isMultiDay: editingEvent.isMultiDay || false,
        dayTimeSlots: editingEvent.dayTimeSlots || [],
        jam: editingEvent.jam,
        acara: editingEvent.acara,
        lokasi: editingEvent.lokasi,
        eo: editingEvent.eo,
        pic: editingEvent.pic || '',
        phone: editingEvent.phone || '',
        keterangan: editingEvent.keterangan,
        categories: editingEvent.categories?.length ? editingEvent.categories : [editingEvent.category],
        category: editingEvent.category,
        priority: editingEvent.priority,
        eventModel: editingEvent.eventModel || '',
        eventNominal: editingEvent.eventNominal || '',
        eventModelNotes: editingEvent.eventModelNotes || '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setIsSubmitting(false);
  }, [editingEvent, isOpen]);

  if (!isOpen) return null;

  const set = (key: string, val: string | boolean) => {
    setForm(prev => {
      if (key === 'eventModel') {
        const nextModel = val as EventModel;
        if (nextModel === 'bayar' || nextModel === 'support') {
          return { ...prev, eventModel: nextModel };
        }
        return { ...prev, eventModel: nextModel, eventNominal: '', eventModelNotes: '' };
      }
      
      if (key === 'isMultiDay') {
        const isMulti = val as boolean;
        if (!isMulti) {
          // Switching to single-day: clear multi-day fields
          return { ...prev, isMultiDay: false, dateEnd: '', dayTimeSlots: [] };
        } else {
          // Switching to multi-day: initialize dayTimeSlots
          const dates = prev.dateStr ? getDateRange(prev.dateStr, prev.dateStr) : [];
          return { ...prev, isMultiDay: true, dayTimeSlots: dates.map(d => ({ date: d, jam: prev.jam })) };
        }
      }
      
      if (key === 'dateStr' || key === 'dateEnd') {
        const newForm = { ...prev, [key]: val };
        // Auto-generate dayTimeSlots if multi-day and both dates are set
        if (newForm.isMultiDay && newForm.dateStr && newForm.dateEnd) {
          const dates = getDateRange(newForm.dateStr, newForm.dateEnd);
          newForm.dayTimeSlots = dates.map(d => {
            const existing = prev.dayTimeSlots.find(s => s.date === d);
            return existing || { date: d, jam: prev.jam };
          });
        }
        return newForm;
      }
      
      return { ...prev, [key]: val };
    });
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const setDayTimeSlot = (index: number, jam: string) => {
    setForm(prev => {
      const dayTimeSlots = [...prev.dayTimeSlots];
      dayTimeSlots[index] = { ...dayTimeSlots[index], jam };
      return { ...prev, dayTimeSlots };
    });
  };

  const copyFromPreviousDay = (index: number) => {
    if (index === 0) return;
    setForm(prev => {
      const dayTimeSlots = [...prev.dayTimeSlots];
      dayTimeSlots[index] = { ...dayTimeSlots[index], jam: dayTimeSlots[index - 1].jam };
      return { ...prev, dayTimeSlots };
    });
  };

  const addCategory = (category: string) => {
    if (!category) return;
    setForm(prev => {
      if (prev.categories.includes(category)) return prev;
      const categories = [...prev.categories, category];
      return { ...prev, categories, category: categories[0] || 'Umum' };
    });
    setErrors(prev => ({ ...prev, categories: '', category: '' }));
  };

  const removeCategory = (category: string) => {
    setForm(prev => {
      const categories = prev.categories.filter(item => item !== category);
      return { ...prev, categories, category: categories[0] || '' };
    });
    setErrors(prev => ({ ...prev, categories: '', category: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.acara.trim()) errs.acara = 'Nama acara wajib diisi';
    if (!form.dateStr) errs.dateStr = 'Tanggal wajib diisi';
    if (!form.lokasi.trim()) errs.lokasi = 'Lokasi wajib diisi';
    if (form.categories.length === 0) errs.categories = 'Minimal pilih satu jenis acara';
    if ((form.eventModel === 'bayar' || form.eventModel === 'support') && !form.eventNominal.trim()) errs.eventNominal = 'Nominal wajib diisi';
    if ((form.eventModel === 'bayar' || form.eventModel === 'support') && !form.eventModelNotes.trim()) errs.eventModelNotes = 'Keterangan model event wajib diisi';
    
    // Multi-day validation
    if (form.isMultiDay) {
      if (!form.dateEnd) errs.dateEnd = 'Tanggal selesai wajib diisi untuk rangkaian acara';
      if (form.dateEnd && form.dateStr && form.dateEnd < form.dateStr) {
        errs.dateEnd = 'Tanggal selesai harus >= tanggal mulai';
      }
    }
    
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const formData = form;
    const normalizedFormData = {
      ...formData,
      categories: formData.categories,
      category: formData.categories[0] || 'Umum',
      isMultiDay: formData.isMultiDay,
      dateEnd: formData.isMultiDay ? formData.dateEnd : undefined,
      dayTimeSlots: formData.isMultiDay ? formData.dayTimeSlots : undefined,
    };
    const meta = formData.dateStr ? dateToMeta(formData.dateStr) : { day: '', tanggal: '', month: '' };
    const now = new Date().toISOString().split('T')[0];
    const autoStatus = formData.dateStr < now ? 'past' : formData.dateStr === now ? 'ongoing' : 'upcoming';
    const finalStatus = autoStatus;

    setIsSubmitting(true);
    const success = await onSave({
      ...(editingEvent ? { id: editingEvent.id, rowIndex: editingEvent.rowIndex } : { id: createId(), rowIndex: 0 }),
      ...normalizedFormData,
      ...meta,
      status: finalStatus,
    });
    if (!success) setIsSubmitting(false);
  };

  const isEdit = !!editingEvent;
  const showModelDetails = form.eventModel === 'bayar' || form.eventModel === 'support';
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
            disabled={isSubmitting}
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

          {/* Multi-day toggle */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-700">
            <input
              type="checkbox"
              id="isMultiDay"
              checked={form.isMultiDay}
              onChange={e => set('isMultiDay', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="isMultiDay" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Rangkaian acara?
            </label>
          </div>

          {/* Multi-day fields */}
          {form.isMultiDay && (
            <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/30 dark:bg-violet-900/10">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Tanggal Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dateEnd}
                  onChange={e => set('dateEnd', e.target.value)}
                  className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${
                    errors.dateEnd
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
                  }`}
                />
                {errors.dateEnd && <p className="mt-1 text-xs text-red-500">{errors.dateEnd}</p>}
              </div>

              {/* Day time slots */}
              {form.dayTimeSlots.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Jam per hari:</p>
                  {form.dayTimeSlots.map((slot, idx) => {
                    const date = parseDateStrLocal(slot.date);
                    const dayName = date ? DAY_ID[date.getDay()] : '';
                    const dayLabel = date ? `${dayName}, ${date.getDate()} ${MONTH_ID[date.getMonth()]}` : slot.date;
                    
                    return (
                      <div key={slot.date} className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            Hari {idx + 1}: {dayLabel}
                          </label>
                          <input
                            type="text"
                            value={slot.jam}
                            onChange={e => setDayTimeSlot(idx, e.target.value)}
                            placeholder={jamPlaceholder}
                            list="jam-suggestions"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-500 dark:bg-slate-600 dark:text-white"
                          />
                        </div>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => copyFromPreviousDay(idx)}
                            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500"
                            title="Salin dari hari sebelumnya"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Penanggung Jawab</label>
              <input
                value={form.pic}
                onChange={e => set('pic', e.target.value)}
                placeholder={picPlaceholder}
                list="pic-suggestions"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <datalist id="pic-suggestions">
                {picSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nomor Handphone</label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder={phonePlaceholder}
                list="phone-suggestions"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <datalist id="phone-suggestions">
                {phoneSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
            </div>
          </div>

          {/* Jenis Acara + Prioritas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jenis Acara</label>
              <select
                value=""
                onChange={e => {
                  addCategory(e.target.value);
                  e.target.value = '';
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Pilih jenis acara</option>
                {CATEGORIES.filter(category => !form.categories.includes(category)).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.categories.map(category => (
                  <span key={category} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-300">
                    {category}
                    <button
                      type="button"
                      onClick={() => removeCategory(category)}
                      className="rounded-full p-0.5 text-violet-500 transition hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30"
                      aria-label={`Hapus kategori ${category}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {errors.categories && <p className="mt-1 text-xs text-red-500">{errors.categories}</p>}
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

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Model Event</label>
            <select
              value={form.eventModel}
              onChange={e => set('eventModel', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {EVENT_MODELS.map(option => <option key={option.value || 'empty'} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {showModelDetails && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nominal <span className="text-red-500">*</span></label>
                <input
                  value={form.eventNominal}
                  onChange={e => set('eventNominal', e.target.value)}
                  placeholder="Contoh: 5000000"
                  className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                    errors.eventNominal
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
                  }`}
                />
                {errors.eventNominal && <p className="mt-1 text-xs text-red-500">{errors.eventNominal}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Keterangan Model Event <span className="text-red-500">*</span></label>
                <input
                  value={form.eventModelNotes}
                  onChange={e => set('eventModelNotes', e.target.value)}
                  placeholder="Contoh: sharing revenue / disupport internal"
                  className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                    errors.eventModelNotes
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
                  }`}
                />
                {errors.eventModelNotes && <p className="mt-1 text-xs text-red-500">{errors.eventModelNotes}</p>}
              </div>
            </div>
          )}

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

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-violet-900/30"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambahkan Acara'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
