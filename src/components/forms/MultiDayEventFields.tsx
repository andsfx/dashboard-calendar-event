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
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/30 dark:bg-violet-900/10">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Tanggal Selesai <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={dateEnd}
          onChange={e => onDateEndChange(e.target.value)}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${
            errors.dateEnd
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
          }`}
        />
        {errors.dateEnd && <p className="mt-1 text-xs text-red-500">{errors.dateEnd}</p>}
      </div>

      {dayTimeSlots.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Jam per hari:</p>
          {dayTimeSlots.map((slot, idx) => {
            const date = parseDateStrLocal(slot.date);
            const dayName = date ? DAY_ID[date.getDay()] : '';
            const dayLabel = date ? `${dayName}, ${date.getDate()} ${MONTH_ID[date.getMonth()]}` : slot.date;
            
            return (
              <div key={slot.date} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Hari {idx + 1}: {dayLabel}
                  </label>
                  <input
                    type="text"
                    value={slot.jam}
                    onChange={e => onDayTimeSlotChange(idx, e.target.value)}
                    placeholder={jamPlaceholder}
                    list={`${datalistId}-jam-suggestions`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-500 dark:bg-slate-600 dark:text-white"
                  />
                </div>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => onCopyFromPreviousDay(idx)}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500"
                    title="Salin dari hari sebelumnya"
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
