import { useState, useEffect, useRef } from 'react';
import { Save, Calendar, Image, Trash2, Upload } from 'lucide-react';
import { EventItem, EventModel, DayTimeSlot, EventType, RecurrenceRule, RecurrenceFrequency, EventArea } from '../types';
import { parseDateStrLocal, getDateRange, createRecurringEvents, getStatus } from '../utils/eventUtils';
import { findAreaConflicts } from '../utils/areaConflict';
import { uploadToR2 } from '../utils/supabaseApi';
import { ModalWrapper } from './ModalWrapper';
import { ModalHeader } from './ui/ModalHeader';
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
  eventAreas: EventArea[];
  initialData?: Partial<EventItem> | null;
  organizationOptions?: { id: string; name: string }[];
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
  posterUrl: string;
  organizationId: string;
  areaId: string | null;
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
  posterUrl: '',
  organizationId: '',
  areaId: null,
};

export function EventCrudModal({ isOpen, onClose, onSave, onSaveBatch, editingEvent, events, eventAreas, initialData, organizationOptions = [] }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areaId, setAreaId] = useState('');
  const [overrideAck, setOverrideAck] = useState(false);
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState('');
  const posterInputRef = useRef<HTMLInputElement>(null);
  const areaOptionsById = new Map(eventAreas.map(a => [a.id, a]));

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
        organizationId: editingEvent.organizationId || '',
        areaId: editingEvent.areaId || null,
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
        posterUrl: editingEvent.posterUrl || '',
      });
    } else if (initialData) {
      setForm({
        dateStr: initialData.dateStr || '',
        dateEnd: initialData.dateEnd || '',
        isMultiDay: initialData.isMultiDay || false,
        dayTimeSlots: initialData.dayTimeSlots || [],
        jam: initialData.jam || '',
        acara: initialData.acara || '',
        lokasi: initialData.lokasi || '',
        eo: initialData.eo || '',
        pic: initialData.pic || '',
        phone: initialData.phone || '',
        keterangan: initialData.keterangan || '',
        categories: initialData.categories?.length ? initialData.categories : (initialData.category ? [initialData.category] : []),
        category: initialData.category || '',
        priority: initialData.priority || 'medium',
        eventModel: initialData.eventModel || '',
        eventNominal: initialData.eventNominal || '',
        eventModelNotes: initialData.eventModelNotes || '',
        eventType: (initialData.eventType as EventType) || 'single',
        recurrenceFrequency: 'weekly',
        recurrenceDaysOfWeek: [],
        recurrenceDayOfMonth: 1,
        recurrenceInterval: 7,
        recurrenceEndDate: '',
        posterUrl: initialData.posterUrl || '',
        organizationId: initialData.organizationId || '',
        areaId: initialData.areaId || null,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setAreaId(editingEvent?.areaId || initialData?.areaId || '');
    setOverrideAck(false);
    setIsSubmitting(false);
    setPosterError('');
  }, [editingEvent, initialData, isOpen]);

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
      setForm(prev => ({ ...prev, posterUrl: url }));
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : 'Upload gagal. Coba lagi.');
    } finally {
      setPosterUploading(false);
      if (posterInputRef.current) posterInputRef.current.value = '';
    }
  }

  function handleRemovePoster() {
    setForm(prev => ({ ...prev, posterUrl: '' }));
    setPosterError('');
    if (posterInputRef.current) posterInputRef.current.value = '';
  }

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

    // Anti double-booking: blok simpan bila ada konflik area dan belum di-override
    const activeConflicts = findAreaConflicts(areaId, form.dateStr, form.isMultiDay ? form.dateEnd || undefined : undefined, editingEvent?.id, events);
    if (activeConflicts.length > 0 && !overrideAck) return;

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
        organizationId: formData.organizationId || undefined,
        areaId: areaId || null,
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
    // Canonical derive (SPEC §3.3); preserve legacy internal draft flag if editing one
    const finalStatus = editingEvent?.status === 'draft'
      ? 'draft'
      : getStatus(
          formData.dateStr,
          formData.jam || '',
          normalizedFormData.dateEnd,
          normalizedFormData.dayTimeSlots,
        );

    setIsSubmitting(true);
    const success = await onSave({
      ...(editingEvent ? { id: editingEvent.id, rowIndex: editingEvent.rowIndex } : {}),
      ...normalizedFormData,
      ...meta,
      status: finalStatus,
      areaId: areaId || null,
    });
    if (!success) setIsSubmitting(false);
  };

  const isEdit = !!editingEvent;
  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="event-crud-title">
      <div
        className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800"
        tabIndex={-1}
      >
        <ModalHeader
          titleId="event-crud-title"
          title={isEdit ? 'Ubah Acara' : 'Tambah Acara Baru'}
          subtitle={isEdit ? `Mengubah: ${editingEvent.acara}` : 'Isi detail acara di bawah'}
          icon={<Calendar />}
          onClose={onClose}
          closeDisabled={isSubmitting}
          closeAriaLabel="Tutup"
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4 sm:px-6">
          <EventFormBasicFields
            dateStr={form.dateStr}
            dateEnd={form.isMultiDay ? form.dateEnd : undefined}
            editingId={editingEvent?.id}
            areaId={areaId}
            areaOptions={eventAreas.filter(a => a.isActive)}
            conflictEvents={findAreaConflicts(areaId, form.dateStr, form.isMultiDay ? form.dateEnd || undefined : undefined, editingEvent?.id, events)}
            overrideAck={overrideAck}
            onOverrideAck={setOverrideAck}
            onAreaChange={(id, areaName) => {
              setAreaId(id);
              // Autofill lokasi bila kosong atau masih menempel nama area sebelumnya
              const prevArea = areaOptionsById.get(areaId);
              if (areaName && (!form.lokasi.trim() || (prevArea && form.lokasi.trim() === prevArea.name))) {
                set('lokasi', areaName);
              }
            }}
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
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tipe Acara</label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'single', label: 'Acara biasa' },
                { value: 'multi_day', label: 'Rangkaian acara' },
                { value: 'recurring', label: 'Event reguler' },
              ] as const).map(opt => (
                <label key={opt.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  form.eventType === opt.value
                    ? 'border-brand-primary-400 bg-brand-primary-50 text-brand-primary-700 ring-1 ring-brand-primary-200 dark:border-brand-primary-600 dark:bg-brand-primary-900/20 dark:text-brand-primary-300'
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
            organizationId={form.organizationId}
            organizationOptions={organizationOptions}
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
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={e => set('keterangan', e.target.value)}
              rows={2}
              placeholder="Deskripsi singkat tentang acara..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-[var(--brand-card)] px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Poster / Flyer */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Image className="h-3.5 w-3.5 text-emerald-500" />
              Poster / Flyer Event
            </label>
            {form.posterUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[var(--brand-card)] dark:border-slate-700 dark:bg-slate-900">
                <img
                  src={form.posterUrl}
                  alt="Poster acara"
                  className="max-h-48 w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex gap-2 border-t border-slate-200 bg-white/80 p-2 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    disabled={posterUploading}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Ganti
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePoster}
                    disabled={posterUploading}
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => posterInputRef.current?.click()}
                disabled={posterUploading}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-[var(--brand-card)] px-4 py-4 text-slate-400 transition hover:border-emerald-400 hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
              >
                {posterUploading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-500" />
                    <span className="text-xs font-medium">Mengupload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
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
            {posterError && <p className="mt-1 text-xs text-red-500">{posterError}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary-600 py-2 text-sm font-semibold text-white shadow-md shadow-brand-primary-200 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-brand-primary-900/30"
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
