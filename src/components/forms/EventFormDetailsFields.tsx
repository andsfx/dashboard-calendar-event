import { memo } from 'react';
import { X } from 'lucide-react';

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
          <label htmlFor={`${datalistId}-org`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">
            Organisasi Terdaftar (opsional)
          </label>
          <select
            id={`${datalistId}-org`}
            value={organizationId || ''}
            onChange={e => onFieldChange('organizationId', e.target.value)}
            className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
          >
            <option value="">- Tanpa organisasi terdaftar -</option>
            {organizationOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
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
          <label htmlFor={`${datalistId}-category`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Jenis Acara</label>
          <select
            id={`${datalistId}-category`}
            value=""
            aria-invalid={!!errors.categories}
            aria-describedby={errors.categories ? categoriesErrorId : undefined}
            onChange={e => {
              onAddCategory(e.target.value);
              e.target.value = '';
            }}
            className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)]"
          >
            <option value="">Pilih jenis acara</option>
            {CATEGORIES.filter(category => !categories.includes(category)).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map(category => (
              <span key={category} className="inline-flex items-center gap-1 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-2.5 py-1 text-xs font-medium text-[var(--wf-ink-muted)]">
                {category}
                <button
                  type="button"
                  onClick={() => onRemoveCategory(category)}
                  className="rounded-full p-0.5 text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-accent-soft)] hover:text-[var(--wf-accent)]"
                  aria-label={`Hapus kategori ${category}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {errors.categories && <p id={categoriesErrorId} className="mt-1 text-xs text-red-700 dark:text-red-300" role="alert">{errors.categories}</p>}
        </div>
        <div>
          <label htmlFor={`${datalistId}-priority`} className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Prioritas</label>
          <select
            id={`${datalistId}-priority`}
            value={priority}
            onChange={e => onFieldChange('priority', e.target.value)}
            className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)]"
          >
            <option value="high">🔴 Tinggi</option>
            <option value="medium">🔵 Sedang</option>
            <option value="low">⚪ Rendah</option>
          </select>
        </div>
      </div>
    </>
  );
});
