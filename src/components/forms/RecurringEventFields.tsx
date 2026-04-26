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
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/30 dark:bg-violet-900/10">
      {/* Frequency selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Frekuensi</label>
        <select
          value={recurrenceFrequency}
          onChange={e => onFieldChange('recurrenceFrequency', e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hari</label>
          <div className="flex flex-wrap gap-2">
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((day, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleDayOfWeek(idx)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  recurrenceDaysOfWeek.includes(idx)
                    ? 'bg-violet-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 dark:bg-slate-600 dark:border-slate-500 dark:text-slate-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          {errors.recurrenceDaysOfWeek && <p className="mt-1 text-xs text-red-500">{errors.recurrenceDaysOfWeek}</p>}
        </div>
      )}

      {/* Day of month for monthly */}
      {recurrenceFrequency === 'monthly' && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Setiap tanggal</label>
          <input
            type="number"
            min={1}
            max={31}
            value={recurrenceDayOfMonth}
            onChange={e => onFieldChange('recurrenceDayOfMonth', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
      )}

      {/* Interval for custom */}
      {recurrenceFrequency === 'custom' && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Setiap berapa hari?</label>
          <input
            type="number"
            min={1}
            value={recurrenceInterval}
            onChange={e => onFieldChange('recurrenceInterval', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
      )}

      {/* End date */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Sampai tanggal <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={recurrenceEndDate}
          onChange={e => onFieldChange('recurrenceEndDate', e.target.value)}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${
            errors.recurrenceEndDate
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
          }`}
        />
        {errors.recurrenceEndDate && <p className="mt-1 text-xs text-red-500">{errors.recurrenceEndDate}</p>}
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
          <div className="rounded-xl border border-violet-300 bg-white p-3 dark:border-violet-700 dark:bg-slate-800/60">
            <p className="mb-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
              Preview: {dates.length} event akan dibuat{isDraft ? ' saat dipublish' : ''}
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {dates.map((dateStr) => {
                const d = parseDateStrLocal(dateStr);
                if (!d) return null;
                const dayName = DAY_ID[d.getDay()];
                return (
                  <div key={dateStr} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-700/40">
                    <span className="text-slate-700 dark:text-slate-200">
                      {dayName}, {d.getDate()} {MONTH_ID[d.getMonth()]} {d.getFullYear()}
                    </span>
                    <span className="text-slate-400">{jam || '–'}</span>
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
