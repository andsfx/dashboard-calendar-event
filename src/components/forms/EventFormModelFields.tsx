import { EventModel } from '../../types';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { NativeSelect } from '../shadcn/native-select';

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
        <Label htmlFor="event-model" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Model Event</Label>
        <NativeSelect
          id="event-model"
          value={eventModel}
          onChange={e => onFieldChange('eventModel', e.target.value)}
          className="w-full"
        >
          {EVENT_MODELS.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
        </NativeSelect>
      </div>

      {showModelDetails && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="event-nominal" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
              Nominal <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <Input
              id="event-nominal"
              required
              value={eventNominal}
              onChange={e => onFieldChange('eventNominal', e.target.value)}
              aria-invalid={!!errors.eventNominal}
              aria-describedby={errors.eventNominal ? 'event-nominal-error' : undefined}
              placeholder="Contoh: 5000000"
              className="w-full"
            />
            {errors.eventNominal && <p id="event-nominal-error" className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.eventNominal}</p>}
          </div>
          <div>
            <Label htmlFor="event-model-notes" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
              Keterangan Model Event <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <Input
              id="event-model-notes"
              required
              value={eventModelNotes}
              onChange={e => onFieldChange('eventModelNotes', e.target.value)}
              aria-invalid={!!errors.eventModelNotes}
              aria-describedby={errors.eventModelNotes ? 'event-model-notes-error' : undefined}
              placeholder="Contoh: sharing revenue / disupport internal"
              className="w-full"
            />
            {errors.eventModelNotes && <p id="event-model-notes-error" className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.eventModelNotes}</p>}
          </div>
        </div>
      )}
    </>
  );
}
