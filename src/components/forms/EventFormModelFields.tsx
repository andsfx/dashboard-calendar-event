import { EventModel } from '../../types';

const EVENT_MODELS: Array<{ value: EventModel; label: string }> = [
  { value: '', label: 'Pilih model' },
  { value: 'free', label: 'Free' },
  { value: 'bayar', label: 'Bayar' },
  { value: 'support', label: 'Support' },
];

interface EventFormModelFieldsProps {
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
  errors: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
}

export function EventFormModelFields({
  eventModel,
  eventNominal,
  eventModelNotes,
  errors,
  onFieldChange,
}: EventFormModelFieldsProps) {
  const showModelDetails = eventModel === 'bayar' || eventModel === 'support';

  return (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Model Event</label>
        <select
          value={eventModel}
          onChange={e => onFieldChange('eventModel', e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          {EVENT_MODELS.map(option => <option key={option.value || 'empty'} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {showModelDetails && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Nominal <span className="text-red-500">*</span>
            </label>
            <input
              value={eventNominal}
              onChange={e => onFieldChange('eventNominal', e.target.value)}
              placeholder="Contoh: 5000000"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                errors.eventNominal
                  ? 'border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
              }`}
            />
            {errors.eventNominal && <p className="mt-1 text-xs text-red-500">{errors.eventNominal}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Keterangan Model Event <span className="text-red-500">*</span>
            </label>
            <input
              value={eventModelNotes}
              onChange={e => onFieldChange('eventModelNotes', e.target.value)}
              placeholder="Contoh: sharing revenue / disupport internal"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                errors.eventModelNotes
                  ? 'border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
              }`}
            />
            {errors.eventModelNotes && <p className="mt-1 text-xs text-red-500">{errors.eventModelNotes}</p>}
          </div>
        </div>
      )}
    </>
  );
}
