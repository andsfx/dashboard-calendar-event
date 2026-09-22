import { RecurrenceFrequency, RecurrenceRule } from '../../types';
import { parseDateStrLocal, generateRecurringDates } from '../../utils/eventUtils';

const DAY_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

interface RecurringEventFieldsProps {
  dateStr: string;
  jam: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number;
  recurrenceInterval: number;
  recurrenceEndDate: string;
  errors: Record<string, string>;
  onFieldChange: (key: string, value: string | number) => void;
  onToggleDayOfWeek: (day: number) => void;
  isDraft?: boolean;
}

export function RecurringEventFields({
  dateStr,
  jam,
  recurrenceFrequency,
  recurrenceDaysOfWeek,
  recurrenceDayOfMonth,
  recurrenceInterval,
  recurrenceEndDate,
  errors,
  onFieldChange,
  onToggleDayOfWeek,
  isDraft = false,
}: RecurringEventFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-3">
      {/* Frequency selector */}
      <div>
        <label htmlFor="recurrence-frequency" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Frekuensi</label>
        <select
          id="recurrence-frequency"
          value={recurrenceFrequency}
          onChange={e => onFieldChange('recurrenceFrequency', e.target.value)}
          className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)]"
        >
          <option value="weekly">Setiap minggu</option>
          <option value="biweekly">Setiap 2 minggu</option>
          <option value="monthly">Setiap bulan</option>
          <option value="custom">Custom (setiap N hari)</option>
        </select>
      </div>

      {/* Days of week for weekly/biweekly */}
      {(recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]" id="recurrence-days-label">Hari</label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="recurrence-days-label" aria-describedby={errors.recurrenceDaysOfWeek ? 'recurrence-days-error' : undefined}>
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((day, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleDayOfWeek(idx)}
                aria-pressed={recurrenceDaysOfWeek.includes(idx)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  recurrenceDaysOfWeek.includes(idx)
                    ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                    : 'bg-[var(--wf-board)] border border-[var(--wf-rule)] text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          {errors.recurrenceDaysOfWeek && <p id="recurrence-days-error" className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.recurrenceDaysOfWeek}</p>}
        </div>
      )}

      {/* Day of month for monthly */}
      {recurrenceFrequency === 'monthly' && (
        <div>
          <label htmlFor="recurrence-day-of-month" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Setiap tanggal</label>
          <input
            id="recurrence-day-of-month"
            type="number"
            min={1}
            max={31}
            value={recurrenceDayOfMonth}
            onChange={e => onFieldChange('recurrenceDayOfMonth', e.target.value)}
            className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
          />
        </div>
      )}

      {/* Interval for custom */}
      {recurrenceFrequency === 'custom' && (
        <div>
          <label htmlFor="recurrence-interval" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Setiap berapa hari?</label>
          <input
            id="recurrence-interval"
            type="number"
            min={1}
            value={recurrenceInterval}
            onChange={e => onFieldChange('recurrenceInterval', e.target.value)}
            className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
          />
        </div>
      )}

      {/* End date */}
      <div>
        <label htmlFor="recurrence-end-date" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
          Sampai tanggal <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
        </label>
        <input
          id="recurrence-end-date"
          type="date"
          value={recurrenceEndDate}
          onChange={e => onFieldChange('recurrenceEndDate', e.target.value)}
          aria-invalid={!!errors.recurrenceEndDate || undefined}
          aria-describedby={errors.recurrenceEndDate ? 'recurrence-end-error' : undefined}
          className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 dark:[color-scheme:dark] ${
            errors.recurrenceEndDate
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'
          }`}
        />
        {errors.recurrenceEndDate && <p id="recurrence-end-error" className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.recurrenceEndDate}</p>}
      </div>

      {/* Preview */}
      {(() => {
        if (!dateStr || !recurrenceEndDate) return null;
        const rule: RecurrenceRule = {
          frequency: recurrenceFrequency,
          daysOfWeek: recurrenceDaysOfWeek,
          dayOfMonth: recurrenceDayOfMonth,
          interval: recurrenceInterval,
          endDate: recurrenceEndDate,
        };
        const dates = generateRecurringDates(dateStr, rule);
        if (dates.length === 0) return null;
        
        return (
          <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--wf-accent)]">
              Preview: {dates.length} event akan dibuat{isDraft ? ' saat diterbitkan' : ''}
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {dates.map((dateStr) => {
                const d = parseDateStrLocal(dateStr);
                if (!d) return null;
                const dayName = DAY_ID[d.getDay()];
                return (
                  <div key={dateStr} className="flex items-center justify-between rounded-lg bg-[var(--wf-board-2)] px-3 py-1.5 text-xs">
                    <span className="text-[var(--wf-ink)]">
                      {dayName}, {d.getDate()} {MONTH_ID[d.getMonth()]} {d.getFullYear()}
                    </span>
                    <span className="text-[var(--wf-ink-muted)]">{jam || '-'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
