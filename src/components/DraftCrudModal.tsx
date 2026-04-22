import { useEffect, useMemo, useState } from 'react';
import { Calendar, Copy, Save, X } from 'lucide-react';
import { DraftEventItem, DraftProgress, EventItem, EventModel, DayTimeSlot, EventType, RecurrenceRule, RecurrenceFrequency } from '../types';
import { createId, parseDateStrLocal, getDateRange, generateRecurringDates, MONTH_NAMES } from '../utils/eventUtils';
import { getDraftDateMeta, getDraftSuggestions, getSuggestionPlaceholder } from '../utils/draftUtils';
import { ModalWrapper } from './ModalWrapper';

const CATEGORIES = ['Bazaar','Festival','Workshop','Kompetisi','Fashion','Seminar','Pameran','Konser','Sosial','Seni','Hiburan','Karir','Produk','Anak','Kuliner','Olahraga','Teknologi','Kesehatan','Umum'];
const EVENT_MODELS: Array<{ value: EventModel; label: string }> = [
  { value: '', label: 'Pilih model' },
  { value: 'free', label: 'Free' },
  { value: 'bayar', label: 'Bayar' },
  { value: 'support', label: 'Support' },
];

const DAY_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DraftEventItem>) => Promise<boolean>;
  editingDraft: DraftEventItem | null;
  events: EventItem[];
  draftEvents: DraftEventItem[];
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
  internalNote: string;
  categories: string[];
  category: string;
  priority: 'high' | 'medium' | 'low';
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
  progress: DraftProgress;
  eventType: EventType;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number;
  recurrenceInterval: number;
  recurrenceEndDate: string;
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
  internalNote: '',
  categories: [] as string[],
  category: '',
  priority: 'medium' as const,
  eventModel: '' as EventModel,
  eventNominal: '',
  eventModelNotes: '',
  progress: 'draft' as DraftProgress,
  eventType: 'single' as EventType,
  recurrenceFrequency: 'weekly' as RecurrenceFrequency,
  recurrenceDaysOfWeek: [] as number[],
  recurrenceDayOfMonth: 1,
  recurrenceInterval: 7,
  recurrenceEndDate: '',
};

export function DraftCrudModal({ isOpen, onClose, onSave, editingDraft, events, draftEvents }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestionSource = useMemo(
    () => [
      ...events.map(event => ({ jam: event.jam, lokasi: event.lokasi, eo: event.eo })),
      ...draftEvents.map(draft => ({ jam: draft.jam, lokasi: draft.lokasi, eo: draft.eo })),
    ],
    [events, draftEvents]
  );

  const jamSuggestions = getDraftSuggestions(suggestionSource, 'jam');
  const lokasiSuggestions = getDraftSuggestions(suggestionSource, 'lokasi');
  const eoSuggestions = getDraftSuggestions(suggestionSource, 'eo');

  useEffect(() => {
    if (editingDraft) {
      // Determine eventType from existing draft data
      let eventType: EventType = 'single';
      if (editingDraft.isRecurring || editingDraft.eventType === 'recurring') {
        eventType = 'recurring';
      } else if (editingDraft.isMultiDay) {
        eventType = 'multi_day';
      }

      setForm({
        dateStr: editingDraft.dateStr,
        dateEnd: editingDraft.dateEnd || '',
        isMultiDay: editingDraft.isMultiDay || false,
        dayTimeSlots: editingDraft.dayTimeSlots || [],
        jam: editingDraft.jam,
        acara: editingDraft.acara,
        lokasi: editingDraft.lokasi,
        eo: editingDraft.eo,
        pic: editingDraft.pic,
        phone: editingDraft.phone,
        keterangan: editingDraft.keterangan,
        internalNote: editingDraft.internalNote || '',
        categories: editingDraft.categories?.length ? editingDraft.categories : [editingDraft.category],
        category: editingDraft.category || '',
        priority: editingDraft.priority || 'medium',
        eventModel: editingDraft.eventModel || '',
        eventNominal: editingDraft.eventNominal || '',
        eventModelNotes: editingDraft.eventModelNotes || '',
        progress: editingDraft.progress,
        eventType,
        recurrenceFrequency: 'weekly',
        recurrenceDaysOfWeek: [],
        recurrenceDayOfMonth: 1,
        recurrenceInterval: 7,
        recurrenceEndDate: '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setIsSubmitting(false);
  }, [editingDraft, isOpen]);

  if (!isOpen) return null;

  const set = (key: string, value: string | boolean | number) => {
    setForm(prev => {
      if (key === 'eventType') {
        const nextType = value as EventType;
        if (nextType === 'single') {
          // Clear multi-day and recurring fields
          return { ...prev, eventType: nextType, isMultiDay: false, dateEnd: '', dayTimeSlots: [], recurrenceFrequency: 'weekly' as RecurrenceFrequency, recurrenceDaysOfWeek: [], recurrenceDayOfMonth: 1, recurrenceInterval: 7, recurrenceEndDate: '' };
        }
        if (nextType === 'multi_day') {
          // Clear recurring fields, set isMultiDay=true
          const dates = prev.dateStr ? getDateRange(prev.dateStr, prev.dateStr) : [];
          return { ...prev, eventType: nextType, isMultiDay: true, dayTimeSlots: dates.map(d => ({ date: d, jam: prev.jam })), recurrenceFrequency: 'weekly' as RecurrenceFrequency, recurrenceDaysOfWeek: [], recurrenceDayOfMonth: 1, recurrenceInterval: 7, recurrenceEndDate: '' };
        }
        if (nextType === 'recurring') {
          // Clear multi-day fields, set isMultiDay=false
          return { ...prev, eventType: nextType, isMultiDay: false, dateEnd: '', dayTimeSlots: [] };
        }
        return { ...prev, eventType: nextType };
      }

      if (key === 'eventModel') {
        const nextModel = value as EventModel;
        if (nextModel === 'bayar' || nextModel === 'support') {
          return { ...prev, eventModel: nextModel };
        }
        return { ...prev, eventModel: nextModel, eventNominal: '', eventModelNotes: '' };
      }
      
      if (key === 'isMultiDay') {
        const isMulti = value as boolean;
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
        const newForm = { ...prev, [key]: value };
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
      
      return { ...prev, [key]: value };
    });
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const addCategory = (category: string) => {
    if (!category) return;
    setForm(prev => {
      if (prev.categories.includes(category)) return prev;
      const categories = [...prev.categories, category];
      return { ...prev, categories, category: categories[0] || 'Umum' };
    });
    setErrors(prev => ({ ...prev, categories: '' }));
  };

  const removeCategory = (category: string) => {
    setForm(prev => {
      const categories = prev.categories.filter(item => item !== category);
      return { ...prev, categories, category: categories[0] || '' };
    });
    setErrors(prev => ({ ...prev, categories: '' }));
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

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.dateStr) nextErrors.dateStr = 'Tanggal wajib diisi';
    if (!form.acara.trim()) nextErrors.acara = 'Nama event wajib diisi';
    if (!form.lokasi.trim()) nextErrors.lokasi = 'Lokasi wajib diisi';
    if (!form.pic.trim()) nextErrors.pic = 'Penanggung jawab wajib diisi';
    if (!form.phone.trim()) nextErrors.phone = 'Nomor telepon wajib diisi';
    if (form.categories.length === 0) nextErrors.categories = 'Minimal pilih satu jenis acara';
    if ((form.eventModel === 'bayar' || form.eventModel === 'support') && !form.eventNominal.trim()) nextErrors.eventNominal = 'Nominal wajib diisi';
    if ((form.eventModel === 'bayar' || form.eventModel === 'support') && !form.eventModelNotes.trim()) nextErrors.eventModelNotes = 'Keterangan model event wajib diisi';
    
    // Multi-day validation
    if (form.eventType === 'multi_day') {
      if (!form.dateEnd) nextErrors.dateEnd = 'Tanggal selesai wajib diisi untuk rangkaian acara';
      if (form.dateEnd && form.dateStr && form.dateEnd < form.dateStr) {
        nextErrors.dateEnd = 'Tanggal selesai harus >= tanggal mulai';
      }
    }

    // Recurring validation
    if (form.eventType === 'recurring') {
      if (!form.recurrenceEndDate) {
        nextErrors.recurrenceEndDate = 'Tanggal akhir recurring wajib diisi';
      } else if (form.dateStr && form.recurrenceEndDate <= form.dateStr) {
        nextErrors.recurrenceEndDate = 'Tanggal akhir harus setelah tanggal mulai';
      }
      if ((form.recurrenceFrequency === 'weekly' || form.recurrenceFrequency === 'biweekly') && form.recurrenceDaysOfWeek.length === 0) {
        nextErrors.recurrenceDaysOfWeek = 'Pilih minimal 1 hari';
      }
      if (form.recurrenceFrequency === 'custom' && form.recurrenceInterval < 1) {
        nextErrors.recurrenceInterval = 'Interval minimal 1 hari';
      }
    }
    
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // For recurring drafts, validate that dates would be generated
    if (form.eventType === 'recurring' && form.dateStr && form.recurrenceEndDate) {
      const rule: RecurrenceRule = {
        frequency: form.recurrenceFrequency,
        daysOfWeek: form.recurrenceDaysOfWeek,
        dayOfMonth: form.recurrenceDayOfMonth,
        interval: form.recurrenceInterval,
        endDate: form.recurrenceEndDate,
      };
      const dates = generateRecurringDates(form.dateStr, rule);
      if (dates.length === 0) {
        setErrors({ recurrenceEndDate: 'Tidak ada tanggal yang dihasilkan dari aturan ini' });
        return;
      }
    }

    const meta = getDraftDateMeta(form.dateStr);
    setIsSubmitting(true);
    const success = await onSave({
      ...(editingDraft ? { id: editingDraft.id, rowIndex: editingDraft.rowIndex } : { id: createId(), rowIndex: 0 }),
      ...form,
      category: form.categories[0] || 'Umum',
      isMultiDay: form.eventType === 'multi_day',
      dateEnd: form.eventType === 'multi_day' ? form.dateEnd : undefined,
      dayTimeSlots: form.eventType === 'multi_day' ? form.dayTimeSlots : undefined,
      eventType: form.eventType,
      isRecurring: form.eventType === 'recurring',
      ...meta,
      published: editingDraft?.published ?? false,
      publishedAt: editingDraft?.publishedAt || '',
      deleted: editingDraft?.deleted ?? false,
      deletedAt: editingDraft?.deletedAt || '',
    });
    if (!success) setIsSubmitting(false);
  };

  const isEdit = !!editingDraft;
  const showModelDetails = form.eventModel === 'bayar' || form.eventModel === 'support';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">{isEdit ? 'Edit Draft Event' : 'Tambah Draft Event'}</p>
              <p className="text-xs text-slate-400">{isEdit ? `Mengubah: ${editingDraft.acara}` : 'Isi data antrian event untuk ditindaklanjuti'}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tanggal <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.dateStr}
                onChange={e => set('dateStr', e.target.value)}
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${errors.dateStr ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              {errors.dateStr && <p className="mt-1 text-xs text-red-500">{errors.dateStr}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jam</label>
              <input
                value={form.jam}
                onChange={e => set('jam', e.target.value)}
                placeholder={getSuggestionPlaceholder(jamSuggestions, '09:00 - 17:00 / 10:00 - 22:00')}
                list="draft-jam-suggestions"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
               <datalist id="draft-jam-suggestions">
                 {jamSuggestions.map(item => <option key={item} value={item} />)}
               </datalist>
             </div>
           </div>

          {/* Tipe acara */}
          <div className="space-y-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tipe Acara</label>
            <div className="flex flex-wrap gap-3">
              {([
                { value: 'single', label: 'Acara biasa' },
                { value: 'multi_day', label: 'Rangkaian acara' },
                { value: 'recurring', label: 'Event reguler' },
              ] as const).map(opt => (
                <label key={opt.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  form.eventType === opt.value
                    ? 'border-violet-400 bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="draftEventType"
                    value={opt.value}
                    checked={form.eventType === opt.value}
                    onChange={() => set('eventType', opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Multi-day fields */}
          {form.eventType === 'multi_day' && (
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
                            placeholder={getSuggestionPlaceholder(jamSuggestions, '09:00 - 17:00')}
                            list="draft-jam-suggestions"
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

          {/* Recurring fields */}
          {form.eventType === 'recurring' && (
            <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/30 dark:bg-violet-900/10">
              {/* Frequency selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Frekuensi</label>
                <select
                  value={form.recurrenceFrequency}
                  onChange={e => set('recurrenceFrequency', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="weekly">Setiap minggu</option>
                  <option value="biweekly">Setiap 2 minggu</option>
                  <option value="monthly">Setiap bulan</option>
                  <option value="custom">Custom (setiap N hari)</option>
                </select>
              </div>

              {/* Days of week for weekly/biweekly */}
              {(form.recurrenceFrequency === 'weekly' || form.recurrenceFrequency === 'biweekly') && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hari</label>
                  <div className="flex flex-wrap gap-2">
                    {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm(prev => {
                            const days = prev.recurrenceDaysOfWeek.includes(idx)
                              ? prev.recurrenceDaysOfWeek.filter(d => d !== idx)
                              : [...prev.recurrenceDaysOfWeek, idx].sort();
                            return { ...prev, recurrenceDaysOfWeek: days };
                          });
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          form.recurrenceDaysOfWeek.includes(idx)
                            ? 'bg-violet-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 dark:bg-slate-600 dark:border-slate-500 dark:text-slate-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {errors.recurrenceDaysOfWeek && <p className="mt-1 text-xs text-red-500">{errors.recurrenceDaysOfWeek}</p>}
                </div>
              )}

              {/* Day of month for monthly */}
              {form.recurrenceFrequency === 'monthly' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Setiap tanggal</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.recurrenceDayOfMonth}
                    onChange={e => set('recurrenceDayOfMonth', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              )}

              {/* Interval for custom */}
              {form.recurrenceFrequency === 'custom' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Setiap berapa hari?</label>
                  <input
                    type="number"
                    min={1}
                    value={form.recurrenceInterval}
                    onChange={e => set('recurrenceInterval', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              )}

              {/* End date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Sampai tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.recurrenceEndDate}
                  onChange={e => set('recurrenceEndDate', e.target.value)}
                  className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${
                    errors.recurrenceEndDate
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
                  }`}
                />
                {errors.recurrenceEndDate && <p className="mt-1 text-xs text-red-500">{errors.recurrenceEndDate}</p>}
              </div>

              {/* Preview */}
              {(() => {
                if (!form.dateStr || !form.recurrenceEndDate) return null;
                const rule: RecurrenceRule = {
                  frequency: form.recurrenceFrequency,
                  daysOfWeek: form.recurrenceDaysOfWeek,
                  dayOfMonth: form.recurrenceDayOfMonth,
                  interval: form.recurrenceInterval,
                  endDate: form.recurrenceEndDate,
                };
                const dates = generateRecurringDates(form.dateStr, rule);
                if (dates.length === 0) return null;
                
                return (
                  <div className="rounded-xl border border-violet-300 bg-white p-3 dark:border-violet-700 dark:bg-slate-800/60">
                    <p className="mb-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
                      Preview: {dates.length} event akan dibuat saat dipublish
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {dates.map((dateStr) => {
                        const d = parseDateStrLocal(dateStr);
                        if (!d) return null;
                        const dayName = DAY_ID[d.getDay()];
                        return (
                          <div key={dateStr} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-700/40">
                            <span className="text-slate-700 dark:text-slate-200">
                              {dayName}, {d.getDate()} {MONTH_ID[d.getMonth()]} {d.getFullYear()}
                            </span>
                            <span className="text-slate-400">{form.jam || '–'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

           <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Event <span className="text-red-500">*</span></label>
            <input
              value={form.acara}
              onChange={e => set('acara', e.target.value)}
              placeholder="Masukkan nama event yang akan diproses"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.acara ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
            />
            {errors.acara && <p className="mt-1 text-xs text-red-500">{errors.acara}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama EO</label>
              <input
                value={form.eo}
                onChange={e => set('eo', e.target.value)}
                placeholder={getSuggestionPlaceholder(eoSuggestions, 'Internal MMB / EO Partner / Organizer Event')}
                list="draft-eo-suggestions"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <datalist id="draft-eo-suggestions">
                {eoSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Lokasi <span className="text-red-500">*</span></label>
              <input
                value={form.lokasi}
                onChange={e => set('lokasi', e.target.value)}
                placeholder={getSuggestionPlaceholder(lokasiSuggestions, 'Atrium Lt.1 / Hall A / Main Lobby')}
                list="draft-lokasi-suggestions"
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.lokasi ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              <datalist id="draft-lokasi-suggestions">
                {lokasiSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
              {errors.lokasi && <p className="mt-1 text-xs text-red-500">{errors.lokasi}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                value={form.pic}
                onChange={e => set('pic', e.target.value)}
                placeholder="Nama PIC event"
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.pic ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              {errors.pic && <p className="mt-1 text-xs text-red-500">{errors.pic}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nomor Telepon <span className="text-red-500">*</span></label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.phone ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Progress</label>
              <select
                value={form.progress}
                onChange={e => set('progress', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="confirm">Confirm</option>
                <option value="cancel">Cancel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jenis Acara</label>
              <select
                value=""
                onChange={e => {
                  addCategory(e.target.value);
                  e.target.value = '';
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Pilih jenis acara</option>
                {CATEGORIES.filter(category => !form.categories.includes(category)).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.categories.map(category => (
                  <span key={category} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-300">
                    {category}
                    <button type="button" onClick={() => removeCategory(category)} className="rounded-full p-0.5 text-violet-500 transition hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30">
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
                onChange={e => set('priority', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {EVENT_MODELS.map(option => <option key={option.value || 'empty'} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {showModelDetails && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nominal <span className="text-red-500">*</span></label>
                <input value={form.eventNominal} onChange={e => set('eventNominal', e.target.value)} className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.eventNominal ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`} />
                {errors.eventNominal && <p className="mt-1 text-xs text-red-500">{errors.eventNominal}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Keterangan Model Event <span className="text-red-500">*</span></label>
                <input value={form.eventModelNotes} onChange={e => set('eventModelNotes', e.target.value)} className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.eventModelNotes ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`} />
                {errors.eventModelNotes && <p className="mt-1 text-xs text-red-500">{errors.eventModelNotes}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={e => set('keterangan', e.target.value)}
              rows={3}
              placeholder="Tulis status progres atau catatan follow-up event"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Catatan Internal</label>
            <textarea
              value={form.internalNote}
              onChange={e => set('internalNote', e.target.value)}
              rows={3}
              placeholder="Catatan admin internal, tidak ikut dipublish ke event utama"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

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
              {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Draft Event' : 'Tambah Draft Event'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
