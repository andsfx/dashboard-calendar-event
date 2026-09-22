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
        <label htmlFor="event-model" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Model Event</label>
        <select
          id="event-model"
          value={eventModel}
          onChange={e => onFieldChange('eventModel', e.target.value)}
          className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)]"
        >
          {EVENT_MODELS.map(option => <option key={option.value || 'empty'} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {showModelDetails && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="event-nominal" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
              Nominal <span className="text-red-600 dark:text-red-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </label>
            <input
              id="event-nominal"
              value={eventNominal}
              onChange={e => onFieldChange('eventNominal', e.target.value)}
              placeholder="Contoh: 5000000"
              aria-invalid={!!errors.eventNominal || undefined}
              aria-describedby={errors.eventNominal ? 'event-nominal-error' : undefined}
              className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
                errors.eventNominal
                  ? 'border-red-400 focus:ring-red-100'
                  : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent)]/20'
              }`}
            />
            {errors.eventNominal && <p id="event-nominal-error" className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.eventNominal}</p>}
          </div>
          <div>
            <label htmlFor="event-model-notes" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
              Keterangan Model Event <span className="text-red-600 dark:text-red-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </label>
            <input
              id="event-model-notes"
              value={eventModelNotes}
              onChange={e => onFieldChange('eventModelNotes', e.target.value)}
              placeholder="Contoh: sharing revenue / disupport internal"
              aria-invalid={!!errors.eventModelNotes || undefined}
              aria-describedby={errors.eventModelNotes ? 'event-model-notes-error' : undefined}
              className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
                errors.eventModelNotes
                  ? 'border-red-400 focus:ring-red-100'
                  : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent)]/20'
              }`}
            />
            {errors.eventModelNotes && <p id="event-model-notes-error" className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.eventModelNotes}</p>}
          </div>
        </div>
      )}
    </>
  );
}
