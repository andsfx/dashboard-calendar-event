import { useState, useEffect } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { EventItem, EventModel, DayTimeSlot, EventType, RecurrenceRule, RecurrenceFrequency } from '../types';
import { createId, parseDateStrLocal, getDateRange, generateRecurringDates, MONTH_NAMES, createRecurringEvents, getStatus } from '../utils/eventUtils';
import { ModalWrapper } from './ModalWrapper';
import { EventFormBasicFields } from './forms/EventFormBasicFields';
import { EventFormDetailsFields } from './forms/EventFormDetailsFields';
import { EventFormModelFields } from './forms/EventFormModelFields';
import { MultiDayEventFields } from './forms/MultiDayEventFields';
import { RecurringEventFields } from './forms/RecurringEventFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EventItem>) => Promise<boolean>;
  onSaveBatch?: (data: EventItem[]) => Promise<boolean>;
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

function dateToMeta(dateStr: string) {
  const DAY_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
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
  categories: [],
  category: '',
  priority: 'medium',
  eventModel: '',
  eventNominal: '',
  eventModelNotes: '',
  eventType: 'single' as EventType,
  recurrenceFrequency: 'weekly' as RecurrenceFrequency,
  recurrenceDaysOfWeek: [] as number[],
  recurrenceDayOfMonth: 1,
  recurrenceInterval: 7,
  recurrenceEndDate: '',
};

export function EventCrudModal({ isOpen, onClose, onSave, onSaveBatch, editingEvent, events }: Props) {
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
      // Determine eventType from existing event data
      let eventType: EventType = 'single';
      if (editingEvent.isRecurring) {
        // Recurring events are individual instances, edit as single
        eventType = 'single';
      } else if (editingEvent.isMultiDay) {
        eventType = 'multi_day';
      }

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
  }, [editingEvent, isOpen]);

  if (!isOpen) return null;

  const set = (key: string, val: string | boolean | number) => {
    setForm(prev => {
      if (key === 'eventType') {
        const nextType = val as EventType;
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
      const slot = dayTimeSlots[index];
      if (slot) {
        dayTimeSlots[index] = { ...slot, jam };
      }
      return { ...prev, dayTimeSlots };
    });
  };

  const copyFromPreviousDay = (index: number) => {
    if (index === 0) return;
    setForm(prev => {
      const dayTimeSlots = [...prev.dayTimeSlots];
      const currentSlot = dayTimeSlots[index];
      const previousSlot = dayTimeSlots[index - 1];
      if (currentSlot && previousSlot) {
        dayTimeSlots[index] = { ...currentSlot, jam: previousSlot.jam };
      }
      return { ...prev, dayTimeSlots };
    });
  };

  const toggleDayOfWeek = (day: number) => {
    setForm(prev => {
      const days = prev.recurrenceDaysOfWeek.includes(day)
        ? prev.recurrenceDaysOfWeek.filter(d => d !== day)
        : [...prev.recurrenceDaysOfWeek, day].sort();
      return { ...prev, recurrenceDaysOfWeek: days };
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
    if (form.eventType === 'multi_day') {
      if (!form.dateEnd) errs.dateEnd = 'Tanggal selesai wajib diisi untuk rangkaian acara';
      if (form.dateEnd && form.dateStr && form.dateEnd < form.dateStr) {
        errs.dateEnd = 'Tanggal selesai harus >= tanggal mulai';
      }
    }

    // Recurring validation
    if (form.eventType === 'recurring') {
      if (!form.recurrenceEndDate) {
        errs.recurrenceEndDate = 'Tanggal akhir recurring wajib diisi';
      } else if (form.dateStr && form.recurrenceEndDate <= form.dateStr) {
        errs.recurrenceEndDate = 'Tanggal akhir harus setelah tanggal mulai';
      }
      if ((form.recurrenceFrequency === 'weekly' || form.recurrenceFrequency === 'biweekly') && form.recurrenceDaysOfWeek.length === 0) {
        errs.recurrenceDaysOfWeek = 'Pilih minimal 1 hari';
      }
      if (form.recurrenceFrequency === 'custom' && form.recurrenceInterval < 1) {
        errs.recurrenceInterval = 'Interval minimal 1 hari';
      }
    }
    
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const formData = form;

    // Handle recurring events
    if (formData.eventType === 'recurring' && !editingEvent) {
      const rule: RecurrenceRule = {
        frequency: formData.recurrenceFrequency,
        daysOfWeek: formData.recurrenceDaysOfWeek,
        dayOfMonth: formData.recurrenceDayOfMonth,
        interval: formData.recurrenceInterval,
        endDate: formData.recurrenceEndDate,
      };

      const template: Omit<EventItem, 'id' | 'rowIndex' | 'status' | 'dateStr' | 'day' | 'tanggal' | 'month'> = {
        jam: formData.jam,
        acara: formData.acara,
        lokasi: formData.lokasi,
        eo: formData.eo,
        pic: formData.pic,
        phone: formData.phone,
        keterangan: formData.keterangan,
        categories: formData.categories,
        category: formData.categories[0] || 'Umum',
        priority: formData.priority,
        eventModel: formData.eventModel,
        eventNominal: formData.eventNominal,
        eventModelNotes: formData.eventModelNotes,
      };

      const recurringEvents = createRecurringEvents(template, formData.dateStr, rule);
      if (recurringEvents.length === 0) {
        setErrors({ recurrenceEndDate: 'Tidak ada tanggal yang dihasilkan dari aturan ini' });
        return;
      }

      setIsSubmitting(true);
      if (onSaveBatch) {
        const success = await onSaveBatch(recurringEvents);
        if (!success) setIsSubmitting(false);
      } else {
        // Fallback: save one by one
        let allSuccess = true;
        for (const ev of recurringEvents) {
          const success = await onSave(ev);
          if (!success) { allSuccess = false; break; }
        }
        if (!allSuccess) setIsSubmitting(false);
      }
      return;
    }

    // Handle single and multi_day events (existing behavior)
    const normalizedFormData = {
      ...formData,
      categories: formData.categories,
      category: formData.categories[0] || 'Umum',
      isMultiDay: formData.isMultiDay,
      dateEnd: formData.isMultiDay ? formData.dateEnd : undefined,
      dayTimeSlots: formData.isMultiDay ? formData.dayTimeSlots : undefined,
    };
    const meta = formData.dateStr ? dateToMeta(formData.dateStr) : { day: '', tanggal: '', month: '' };
    const now = new Date().toISOString().split('T')[0] ?? '';
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
  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div
        className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
        tabIndex={-1}
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
            aria-label="Tutup"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:px-6">
          <EventFormBasicFields
            dateStr={form.dateStr}
            jam={form.jam}
            acara={form.acara}
            lokasi={form.lokasi}
            errors={errors}
            jamSuggestions={jamSuggestions}
            lokasiSuggestions={lokasiSuggestions}
            jamPlaceholder={jamPlaceholder}
            lokasiPlaceholder={lokasiPlaceholder}
            onFieldChange={set}
          />

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
                    name="eventType"
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
            <MultiDayEventFields
              dateEnd={form.dateEnd}
              dayTimeSlots={form.dayTimeSlots}
              errors={errors}
              jamSuggestions={jamSuggestions}
              jamPlaceholder={jamPlaceholder}
              onDateEndChange={(value) => set('dateEnd', value)}
              onDayTimeSlotChange={setDayTimeSlot}
              onCopyFromPreviousDay={copyFromPreviousDay}
            />
          )}

          {/* Recurring fields */}
          {form.eventType === 'recurring' && (
            <RecurringEventFields
              dateStr={form.dateStr}
              jam={form.jam}
              recurrenceFrequency={form.recurrenceFrequency}
              recurrenceDaysOfWeek={form.recurrenceDaysOfWeek}
              recurrenceDayOfMonth={form.recurrenceDayOfMonth}
              recurrenceInterval={form.recurrenceInterval}
              recurrenceEndDate={form.recurrenceEndDate}
              errors={errors}
              onFieldChange={set}
              onToggleDayOfWeek={toggleDayOfWeek}
            />
          )}

          <EventFormDetailsFields
            eo={form.eo}
            pic={form.pic}
            phone={form.phone}
            categories={form.categories}
            priority={form.priority}
            errors={errors}
            eoSuggestions={eoSuggestions}
            picSuggestions={picSuggestions}
            phoneSuggestions={phoneSuggestions}
            eoPlaceholder={eoPlaceholder}
            picPlaceholder={picPlaceholder}
            phonePlaceholder={phonePlaceholder}
            onFieldChange={set}
            onAddCategory={addCategory}
            onRemoveCategory={removeCategory}
          />

          <EventFormModelFields
            eventModel={form.eventModel}
            eventNominal={form.eventNominal}
            eventModelNotes={form.eventModelNotes}
            errors={errors}
            onFieldChange={set}
          />

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
