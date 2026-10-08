import { memo } from 'react';
import { MdChip, MdSelect } from '../md';

const CATEGORIES = ['Bazaar','Festival','Workshop','Kompetisi','Fashion','Seminar','Pameran','Konser','Sosial','Seni','Hiburan','Karir','Produk','Anak','Kuliner','Olahraga','Teknologi','Kesehatan','Umum'];

interface EventFormDetailsFieldsProps {
  eo: string;
  pic: string;
  phone: string;
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  errors: Record<string, string>;
  eoSuggestions: string[];
  picSuggestions?: string[];
  phoneSuggestions?: string[];
  eoPlaceholder: string;
  picPlaceholder?: string;
  phonePlaceholder?: string;
  organizationId?: string;
  organizationOptions?: { id: string; name: string }[];
  onFieldChange: (key: string, value: string) => void;
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
  isDraft?: boolean;
}

export const EventFormDetailsFields = memo(function EventFormDetailsFields({
  eo,
  pic,
  phone,
  categories,
  priority,
  errors,
  eoSuggestions,
  picSuggestions = [],
  phoneSuggestions = [],
  eoPlaceholder,
  picPlaceholder = 'Nama penanggung jawab',
  phonePlaceholder = '08xxxxxxxxxx',
  organizationId,
  organizationOptions = [],
  onFieldChange,
  onAddCategory,
  onRemoveCategory,
  isDraft = false,
}: EventFormDetailsFieldsProps) {
  const datalistId = isDraft ? 'draft' : 'event';
  const picErrorId = `${datalistId}-pic-error`;
  const phoneErrorId = `${datalistId}-phone-error`;
  const categoriesErrorId = `${datalistId}-categories-error`;

  return (
    <>
      {/* EO */}
      <div>
        <label htmlFor={`${datalistId}-eo`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
          {isDraft ? 'Nama EO' : 'Event Organizer (EO)'}
        </label>
        <input
          id={`${datalistId}-eo`}
          value={eo}
          onChange={e => onFieldChange('eo', e.target.value)}
          placeholder={eoPlaceholder}
          list={`${datalistId}-eo-suggestions`}
          className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
        />
        <datalist id={`${datalistId}-eo-suggestions`}>
          {eoSuggestions.map(item => <option key={item} value={item} />)}
        </datalist>
      </div>

      {/* Organisasi (komunitas / EO terdaftar) */}
      {!isDraft && organizationOptions.length > 0 && (
        <div>
          <MdSelect
            id={`${datalistId}-org`}
            value={organizationId || ''}
            onChange={v => onFieldChange('organizationId', v)}
            label="Organisasi Terdaftar (opsional)"
            options={[
              { value: '', label: '- Tanpa organisasi terdaftar -' },
              ...organizationOptions.map(opt => ({ value: opt.id, label: opt.name })),
            ]}
            className="w-full"
          />
        </div>
      )}

      {/* PIC + Phone */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${datalistId}-pic`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
            Penanggung Jawab {isDraft && <><span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span></>}
          </label>
          <input
            id={`${datalistId}-pic`}
            value={pic}
            onChange={e => onFieldChange('pic', e.target.value)}
            aria-invalid={!!errors.pic}
            aria-describedby={errors.pic ? picErrorId : undefined}
            placeholder={picPlaceholder}
            list={picSuggestions.length > 0 ? `${datalistId}-pic-suggestions` : undefined}
            className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
              errors.pic
                ? 'border-red-400 focus:ring-red-100'
                : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'
            }`}
          />
          {picSuggestions.length > 0 && (
            <datalist id={`${datalistId}-pic-suggestions`}>
              {picSuggestions.map(item => <option key={item} value={item} />)}
            </datalist>
          )}
          {errors.pic && <p id={picErrorId} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.pic}</p>}
        </div>
        <div>
          <label htmlFor={`${datalistId}-phone`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
            Nomor {isDraft ? 'Telepon' : 'Handphone'} {isDraft && <><span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span></>}
          </label>
          <input
            id={`${datalistId}-phone`}
            value={phone}
            onChange={e => onFieldChange('phone', e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? phoneErrorId : undefined}
            placeholder={phonePlaceholder}
            list={phoneSuggestions.length > 0 ? `${datalistId}-phone-suggestions` : undefined}
            className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
              errors.phone
                ? 'border-red-400 focus:ring-red-100'
                : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'
            }`}
          />
          {phoneSuggestions.length > 0 && (
            <datalist id={`${datalistId}-phone-suggestions`}>
              {phoneSuggestions.map(item => <option key={item} value={item} />)}
            </datalist>
          )}
          {errors.phone && <p id={phoneErrorId} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.phone}</p>}
        </div>
      </div>

      {/* Categories + Priority */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <MdSelect
            id={`${datalistId}-category`}
            value=""
            onChange={v => onAddCategory(v)}
            label="Jenis Acara"
            error={!!errors.categories}
            options={[
              { value: '', label: 'Pilih jenis acara' },
              ...CATEGORIES.filter(category => !categories.includes(category)).map(c => ({ value: c, label: c })),
            ]}
            className="w-full"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map(category => (
              <MdChip
                key={category}
                label={category}
                removable
                ariaLabel={`Hapus kategori ${category}`}
                onRemove={() => onRemoveCategory(category)}
              />
            ))}
          </div>
          {errors.categories && <p id={categoriesErrorId} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.categories}</p>}
        </div>
        <div>
          <MdSelect
            id={`${datalistId}-priority`}
            value={priority}
            onChange={v => onFieldChange('priority', v)}
            label="Prioritas"
            options={[
              { value: 'high', label: '🔴 Tinggi' },
              { value: 'medium', label: '🔵 Sedang' },
              { value: 'low', label: '⚪ Rendah' },
            ]}
            className="w-full"
          />
        </div>
      </div>
    </>
  );
});
