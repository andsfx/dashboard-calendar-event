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

export function EventFormBasicFields({
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

  return (
    <>
      {/* Date + Time */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Tanggal <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dateStr}
            onChange={e => onFieldChange('dateStr', e.target.value)}
            className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${
              errors.dateStr
                ? 'border-red-400 focus:ring-red-100'
                : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
            }`}
          />
          {errors.dateStr && <p className="mt-1 text-xs text-red-500">{errors.dateStr}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jam</label>
          <input
            value={jam}
            onChange={e => onFieldChange('jam', e.target.value)}
            placeholder={jamPlaceholder}
            list={`${datalistId}-jam-suggestions`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
          <datalist id={`${datalistId}-jam-suggestions`}>
            {jamSuggestions.map(item => <option key={item} value={item} />)}
          </datalist>
        </div>
      </div>

      {/* Event Name */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          {isDraft ? 'Nama Event' : 'Nama Acara'} <span className="text-red-500">*</span>
        </label>
        <input
          value={acara}
          onChange={e => onFieldChange('acara', e.target.value)}
          placeholder={isDraft ? 'Masukkan nama event yang akan diproses' : 'Masukkan nama acara'}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
            errors.acara
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
          }`}
        />
        {errors.acara && <p className="mt-1 text-xs text-red-500">{errors.acara}</p>}
      </div>

      {/* Location */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Lokasi <span className="text-red-500">*</span>
        </label>
        <input
          value={lokasi}
          onChange={e => onFieldChange('lokasi', e.target.value)}
          placeholder={lokasiPlaceholder}
          list={`${datalistId}-lokasi-suggestions`}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
            errors.lokasi
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
          }`}
        />
        <datalist id={`${datalistId}-lokasi-suggestions`}>
          {lokasiSuggestions.map(item => <option key={item} value={item} />)}
        </datalist>
        {errors.lokasi && <p className="mt-1 text-xs text-red-500">{errors.lokasi}</p>}
      </div>
    </>
  );
}
