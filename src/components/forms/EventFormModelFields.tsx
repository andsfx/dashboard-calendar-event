import { EventModel } from '../../types';
import { MdSelect, MdTextField } from '../md';

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
        <MdSelect
          id="event-model"
          value={eventModel}
          onChange={v => onFieldChange('eventModel', v)}
          label="Model Event"
          options={EVENT_MODELS.map(option => ({ value: option.value, label: option.label }))}
          className="w-full"
        />
      </div>

      {showModelDetails && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <MdTextField
              id="event-nominal"
              value={eventNominal}
              onChange={v => onFieldChange('eventNominal', v)}
              label="Nominal"
              required
              error={!!errors.eventNominal}
              errorText={errors.eventNominal}
              placeholder="Contoh: 5000000"
              className="w-full"
            />
          </div>
          <div>
            <MdTextField
              id="event-model-notes"
              value={eventModelNotes}
              onChange={v => onFieldChange('eventModelNotes', v)}
              label="Keterangan Model Event"
              required
              error={!!errors.eventModelNotes}
              errorText={errors.eventModelNotes}
              placeholder="Contoh: sharing revenue / disupport internal"
              className="w-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
