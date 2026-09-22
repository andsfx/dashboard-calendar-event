import { Copy } from 'lucide-react';
import { DayTimeSlot } from '../../types';
import { parseDateStrLocal } from '../../utils/eventUtils';

const DAY_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

interface MultiDayEventFieldsProps {
  dateEnd: string;
  dayTimeSlots: DayTimeSlot[];
  errors: Record<string, string>;
  jamSuggestions: string[];
  jamPlaceholder: string;
  onDateEndChange: (value: string) => void;
  onDayTimeSlotChange: (index: number, jam: string) => void;
  onCopyFromPreviousDay: (index: number) => void;
  isDraft?: boolean;
}

export function MultiDayEventFields({
  dateEnd,
  dayTimeSlots,
  errors,
  jamSuggestions,
  jamPlaceholder,
  onDateEndChange,
  onDayTimeSlotChange,
  onCopyFromPreviousDay,
  isDraft = false,
}: MultiDayEventFieldsProps) {
  const datalistId = isDraft ? 'draft' : 'event';

  return (
    <div className="space-y-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-3">
      <div>
        <label htmlFor={`${datalistId}-date-end`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
          Tanggal Selesai <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
        </label>
        <input
          id={`${datalistId}-date-end`}
          type="date"
          value={dateEnd}
          onChange={e => onDateEndChange(e.target.value)}
          aria-invalid={!!errors.dateEnd || undefined}
          aria-describedby={errors.dateEnd ? `${datalistId}-date-end-error` : undefined}
          className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 dark:[color-scheme:dark] ${
            errors.dateEnd
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'
          }`}
        />
        {errors.dateEnd && <p id={`${datalistId}-date-end-error`} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.dateEnd}</p>}
      </div>

      {dayTimeSlots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--wf-ink-muted)]">Jam per hari:</p>
          {dayTimeSlots.map((slot, idx) => {
            const date = parseDateStrLocal(slot.date);
            const dayName = date ? DAY_ID[date.getDay()] : '';
            const dayLabel = date ? `${dayName}, ${date.getDate()} ${MONTH_ID[date.getMonth()]}` : slot.date;
            
            return (
              <div key={slot.date} className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={`day-slot-jam-${idx}`} className="mb-1 block text-xs font-medium text-[var(--wf-ink-muted)]">
                    Hari {idx + 1}: {dayLabel}
                  </label>
                  <input
                    id={`day-slot-jam-${idx}`}
                    type="text"
                    value={slot.jam}
                    onChange={e => onDayTimeSlotChange(idx, e.target.value)}
                    placeholder={jamPlaceholder}
                    list={`${datalistId}-jam-suggestions`}
                    className="w-full rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
                  />
                </div>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => onCopyFromPreviousDay(idx)}
                    className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] p-2 text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)]"
                    title="Salin dari hari sebelumnya"
                    aria-label="Salin jam dari hari sebelumnya"
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
  );
}
