import { useEffect, useMemo, useState } from 'react';
import { Calendar, FileEdit, Save } from 'lucide-react';
import { DraftEventItem, DraftProgress, EventItem, EventModel, DayTimeSlot, EventType, RecurrenceRule, RecurrenceFrequency } from '../types';
import { createId, parseDateStrLocal, getDateRange, generateRecurringDates, MONTH_NAMES } from '../utils/eventUtils';
import { getDraftDateMeta, getDraftSuggestions, getSuggestionPlaceholder } from '../utils/draftUtils';
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
      ...(editingDraft?.id ? { id: editingDraft.id, rowIndex: editingDraft.rowIndex } : { id: createId(), rowIndex: 0 }),
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

  // empty id = prefill create (e.g. dari Registration), not edit
  const isEdit = Boolean(editingDraft?.id);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" ariaLabelledBy="draft-crud-title">
      <div
        className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800"
        tabIndex={-1}
      >
        <ModalHeader
          titleId="draft-crud-title"
          title={isEdit ? 'Edit Draft Event' : 'Tambah Draft Event'}
          subtitle={isEdit && editingDraft ? `Mengubah: ${editingDraft.acara}` : 'Isi data antrian event untuk ditindaklanjuti'}
          icon={<FileEdit />}
          onClose={onClose}
          closeDisabled={isSubmitting}
          closeAriaLabel="Tutup"
        />

        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4 sm:px-6">
          <EventFormBasicFields
            dateStr={form.dateStr}
            jam={form.jam}
            acara={form.acara}
            lokasi={form.lokasi}
            errors={errors}
            jamSuggestions={jamSuggestions}
            lokasiSuggestions={lokasiSuggestions}
            jamPlaceholder={getSuggestionPlaceholder(jamSuggestions, '09:00 - 17:00 / 10:00 - 22:00')}
            lokasiPlaceholder={getSuggestionPlaceholder(lokasiSuggestions, 'Atrium Lt.1 / Hall A / Main Lobby')}
            onFieldChange={set}
            isDraft={true}
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
            <MultiDayEventFields
              dateEnd={form.dateEnd}
              dayTimeSlots={form.dayTimeSlots}
              errors={errors}
              jamSuggestions={jamSuggestions}
              jamPlaceholder={getSuggestionPlaceholder(jamSuggestions, '09:00 - 17:00')}
              onDateEndChange={(value) => set('dateEnd', value)}
              onDayTimeSlotChange={setDayTimeSlot}
              onCopyFromPreviousDay={copyFromPreviousDay}
              isDraft={true}
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
              isDraft={true}
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
            eoPlaceholder={getSuggestionPlaceholder(eoSuggestions, 'Internal MMB / EO Partner / Organizer Event')}
            picPlaceholder="Nama PIC event"
            phonePlaceholder="08xxxxxxxxxx"
            onFieldChange={set}
            onAddCategory={addCategory}
            onRemoveCategory={removeCategory}
            isDraft={true}
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Progress</label>
            <select
              value={form.progress}
              onChange={e => set('progress', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[var(--brand-card)] px-3 py-2 text-sm outline-none transition focus:border-brand-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="draft">Draft</option>
              <option value="confirm">Confirm</option>
              <option value="cancel">Cancel</option>
            </select>
          </div>

          <EventFormModelFields
            eventModel={form.eventModel}
            eventNominal={form.eventNominal}
            eventModelNotes={form.eventModelNotes}
            errors={errors}
            onFieldChange={set}
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={e => set('keterangan', e.target.value)}
              rows={2}
              placeholder="Tulis status progres atau catatan follow-up event"
              className="w-full resize-none rounded-xl border border-slate-200 bg-[var(--brand-card)] px-3 py-2 text-sm outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Catatan Internal</label>
            <textarea
              value={form.internalNote}
              onChange={e => set('internalNote', e.target.value)}
              rows={2}
              placeholder="Catatan admin internal, tidak ikut dipublish ke event utama"
              className="w-full resize-none rounded-xl border border-slate-200 bg-[var(--brand-card)] px-3 py-2 text-sm outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

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
              {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Draft Event' : 'Tambah Draft Event'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
