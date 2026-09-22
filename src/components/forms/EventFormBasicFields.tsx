import { memo } from 'react';
import type { EventArea, EventItem } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface EventFormBasicFieldsProps {
  dateStr: string;
  dateEnd?: string;
  editingId?: string;
  areaId: string;
  areaOptions: EventArea[];
  conflictEvents: EventItem[];
  overrideAck: boolean;
  onOverrideAck: (v: boolean) => void;
  onAreaChange: (areaId: string, areaName: string | null) => void;
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
  dateEnd,
  editingId,
  areaId,
  areaOptions,
  conflictEvents,
  overrideAck,
  onOverrideAck,
  onAreaChange,
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
          <label htmlFor={`${datalistId}-date`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
            Tanggal <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
          </label>
          <input
            id={`${datalistId}-date`}
            type="date"
            value={dateStr}
            onChange={e => onFieldChange('dateStr', e.target.value)}
            aria-invalid={!!errors.dateStr}
            aria-describedby={errors.dateStr ? dateErrorId : undefined}
            className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 dark:[color-scheme:dark] ${
              errors.dateStr
                ? 'border-red-400 focus:ring-red-100'
                : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'
            }`}
          />
          {errors.dateStr && <p id={dateErrorId} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.dateStr}</p>}
        </div>
        <div>
          <label htmlFor={`${datalistId}-time`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Jam</label>
          <input
            id={`${datalistId}-time`}
            value={jam}
            onChange={e => onFieldChange('jam', e.target.value)}
            placeholder={jamPlaceholder}
            list={`${datalistId}-jam-suggestions`}
            className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
          />
          <datalist id={`${datalistId}-jam-suggestions`}>
            {jamSuggestions.map(item => <option key={item} value={item} />)}
          </datalist>
        </div>
      </div>

      {/* Event Name */}
      <div>
        <label htmlFor={`${datalistId}-name`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
          {isDraft ? 'Nama Event' : 'Nama Acara'} <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
        </label>
        <input
          id={`${datalistId}-name`}
          value={acara}
          onChange={e => onFieldChange('acara', e.target.value)}
          aria-invalid={!!errors.acara}
          aria-describedby={errors.acara ? nameErrorId : undefined}
          placeholder={isDraft ? 'Masukkan nama event yang akan diproses' : 'Masukkan nama acara'}
          className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
            errors.acara
              ? 'border-red-400 focus:ring-red-100'
              : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'
          }`}
        />
        {errors.acara && <p id={nameErrorId} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.acara}</p>}
      </div>

      {/* Area (opsional) — FK ke event_areas untuk deteksi double-booking */}
      <div>
        <label htmlFor={`${datalistId}-area`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
          Area (opsional)
        </label>
        <select
          id={`${datalistId}-area`}
          value={areaId}
          onChange={e => {
            const id = e.target.value;
            const area = areaOptions.find(a => a.id === id) || null;
            onAreaChange(id, area?.name || null);
          }}
          className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
            areaId ? 'border-[var(--wf-accent)]' : 'border-[var(--wf-rule)]'
          }`}
        >
          <option value="">- Pilih area -</option>
          {areaOptions.map(area => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
        {areaId && conflictEvents.length > 0 && (
          <div className="mt-2 rounded-xl border border-[var(--wf-action)]/40 bg-[var(--wf-action)]/10 px-3 py-2 text-xs text-[var(--wf-action)]" role="alert">
            <p className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Perhatian: area ini sudah dipakai {conflictEvents.length} event pada rentang tanggal yang sama:
            </p>
            <ul className="mt-1 list-inside list-disc">
              {conflictEvents.slice(0, 3).map(ev => (
                <li key={ev.id}>{ev.acara} - {ev.dateStr}{ev.dateEnd ? ` s/d ${ev.dateEnd}` : ''}</li>
              ))}
            </ul>
            <label className="mt-2 flex cursor-pointer items-center gap-1.5 font-semibold">
              <input
                type="checkbox"
                checked={overrideAck}
                onChange={e => onOverrideAck(e.target.checked)}
              />
              Tetap simpan meski ada konflik
            </label>
          </div>
        )}
      </div>

      {/* Location */}
      <div>
        <label htmlFor={`${datalistId}-location`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
          Lokasi <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
        </label>
        <input
          id={`${datalistId}-location`}
          value={lokasi}
          onChange={e => onFieldChange('lokasi', e.target.value)}
          aria-invalid={!!errors.lokasi}
          aria-describedby={errors.lokasi ? locationErrorId : undefined}
          placeholder={lokasiPlaceholder}
          list={`${datalistId}-lokasi-suggestions`}
          className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
            errors.lokasi
              ? 'border-red-400 focus:ring-red-100'
              : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'
          }`}
        />
        <datalist id={`${datalistId}-lokasi-suggestions`}>
          {lokasiSuggestions.map(item => <option key={item} value={item} />)}
        </datalist>
        {errors.lokasi && <p id={locationErrorId} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.lokasi}</p>}
      </div>
    </>
  );
});
