import { RecurrenceFrequency, RecurrenceRule } from '../../types';
import { parseDateStrLocal, generateRecurringDates } from '../../utils/eventUtils';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { NativeSelect } from '../shadcn/native-select';
import { Toggle } from '../shadcn/toggle';

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
        <Label htmlFor="recurrence-frequency" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Frekuensi</Label>
        <NativeSelect
          id="recurrence-frequency"
          value={recurrenceFrequency}
          onChange={e => onFieldChange('recurrenceFrequency', e.target.value)}
          className="w-full"
        >
          <option value="weekly">Setiap minggu</option>
          <option value="biweekly">Setiap 2 minggu</option>
          <option value="monthly">Setiap bulan</option>
          <option value="custom">Custom (setiap N hari)</option>
        </NativeSelect>
      </div>

      {/* Days of week for weekly/biweekly */}
      {(recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') && (
        <div>
          <Label className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]" id="recurrence-days-label">Hari</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="recurrence-days-label" aria-describedby={errors.recurrenceDaysOfWeek ? 'recurrence-days-error' : undefined}>
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((day, idx) => (
              <Toggle
                key={idx}
                variant="outline"
                size="sm"
                pressed={recurrenceDaysOfWeek.includes(idx)}
                onPressedChange={() => onToggleDayOfWeek(idx)}
                className="rounded-full px-3 text-[var(--wf-ink-muted)] data-[state=on]:border-[var(--wf-accent)] data-[state=on]:bg-[var(--wf-accent-soft)] data-[state=on]:text-[var(--wf-accent)] aria-pressed:border-[var(--wf-accent)] aria-pressed:bg-[var(--wf-accent-soft)] aria-pressed:text-[var(--wf-accent)]"
              >
                {day}
              </Toggle>
            ))}
          </div>
          {errors.recurrenceDaysOfWeek && <p id="recurrence-days-error" className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.recurrenceDaysOfWeek}</p>}
        </div>
      )}

      {/* Day of month for monthly */}
      {recurrenceFrequency === 'monthly' && (
        <div>
          <Label htmlFor="recurrence-day-of-month" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Setiap tanggal</Label>
          <Input
            id="recurrence-day-of-month"
            type="number"
            value={String(recurrenceDayOfMonth)}
            onChange={e => onFieldChange('recurrenceDayOfMonth', e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {/* Interval for custom */}
      {recurrenceFrequency === 'custom' && (
        <div>
          <Label htmlFor="recurrence-interval" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Setiap berapa hari?</Label>
          <Input
            id="recurrence-interval"
            type="number"
            value={String(recurrenceInterval)}
            onChange={e => onFieldChange('recurrenceInterval', e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {/* End date */}
      <div>
        <Label htmlFor="recurrence-end-date" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
          Sampai tanggal <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
        </Label>
        <Input
          id="recurrence-end-date"
          type="date"
          value={recurrenceEndDate}
          onChange={e => onFieldChange('recurrenceEndDate', e.target.value)}
          aria-invalid={!!errors.recurrenceEndDate || undefined}
          aria-describedby={errors.recurrenceEndDate ? 'recurrence-end-error' : undefined}
          className={`w-full rounded-xl border bg-[var(--wf-board)] h-auto px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 dark:[color-scheme:dark] ${
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
