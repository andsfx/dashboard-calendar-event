import { memo } from 'react';

interface EventFormBasicFieldsProps {
  dateStr: string;
  jam: string;
  acara: string;
  lokasi: string;
  errors: Record<string, string>;
  jamSuggestions: string[];
  lokasiSuggestions: string[];
  jamPlaceholder: string;
  lokasiPlaceholder: string;
  onFieldChange: (key: string, value: string) => void;
  isDraft?: boolean;
}

export const EventFormBasicFields = memo(function EventFormBasicFields({
  dateStr,
  jam,
  acara,
  lokasi,
  errors,
  jamSuggestions,
  lokasiSuggestions,
  jamPlaceholder,
  lokasiPlaceholder,
  onFieldChange,
  isDraft = false,
}: EventFormBasicFieldsProps) {
  const datalistId = isDraft ? 'draft' : 'event';
  const dateErrorId = `${datalistId}-date-error`;
  const nameErrorId = `${datalistId}-name-error`;
  const locationErrorId = `${datalistId}-location-error`;

  return (
    <>
      {/* Date + Time */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${datalistId}-date`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Tanggal <span className="text-red-500">*</span>
          </label>
          <input
            id={`${datalistId}-date`}
            type="date"
            value={dateStr}
            onChange={e => onFieldChange('dateStr', e.target.value)}
            aria-invalid={!!errors.dateStr}
            aria-describedby={errors.dateStr ? dateErrorId : undefined}
            className={`w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${
              errors.dateStr
                ? 'border-red-400 focus:ring-red-100'
                : 'border-slate-200 focus:border-brand-primary-400 focus:ring-brand-primary-100 dark:border-slate-600'
            }`}
          />
          {errors.dateStr && <p id={dateErrorId} className="mt-1 text-xs text-red-500" role="alert">{errors.dateStr}</p>}
        </div>
        <div>
          <label htmlFor={`${datalistId}-time`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jam</label>
          <input
            id={`${datalistId}-time`}
            value={jam}
            onChange={e => onFieldChange('jam', e.target.value)}
            placeholder={jamPlaceholder}
            list={`${datalistId}-jam-suggestions`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
          <datalist id={`${datalistId}-jam-suggestions`}>
            {jamSuggestions.map(item => <option key={item} value={item} />)}
          </datalist>
        </div>
      </div>

      {/* Event Name */}
      <div>
        <label htmlFor={`${datalistId}-name`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          {isDraft ? 'Nama Event' : 'Nama Acara'} <span className="text-red-500">*</span>
        </label>
        <input
          id={`${datalistId}-name`}
          value={acara}
          onChange={e => onFieldChange('acara', e.target.value)}
          aria-invalid={!!errors.acara}
          aria-describedby={errors.acara ? nameErrorId : undefined}
          placeholder={isDraft ? 'Masukkan nama event yang akan diproses' : 'Masukkan nama acara'}
          className={`w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
            errors.acara
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-brand-primary-400 focus:ring-brand-primary-100 dark:border-slate-600'
          }`}
        />
        {errors.acara && <p id={nameErrorId} className="mt-1 text-xs text-red-500" role="alert">{errors.acara}</p>}
      </div>

      {/* Location */}
      <div>
        <label htmlFor={`${datalistId}-location`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Lokasi <span className="text-red-500">*</span>
        </label>
        <input
          id={`${datalistId}-location`}
          value={lokasi}
          onChange={e => onFieldChange('lokasi', e.target.value)}
          aria-invalid={!!errors.lokasi}
          aria-describedby={errors.lokasi ? locationErrorId : undefined}
          placeholder={lokasiPlaceholder}
          list={`${datalistId}-lokasi-suggestions`}
          className={`w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
            errors.lokasi
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-brand-primary-400 focus:ring-brand-primary-100 dark:border-slate-600'
          }`}
        />
        <datalist id={`${datalistId}-lokasi-suggestions`}>
          {lokasiSuggestions.map(item => <option key={item} value={item} />)}
        </datalist>
        {errors.lokasi && <p id={locationErrorId} className="mt-1 text-xs text-red-500" role="alert">{errors.lokasi}</p>}
      </div>
    </>
  );
});
