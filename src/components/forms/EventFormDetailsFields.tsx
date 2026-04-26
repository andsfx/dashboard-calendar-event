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
  onFieldChange,
  onAddCategory,
  onRemoveCategory,
  isDraft = false,
}: EventFormDetailsFieldsProps) {
  const datalistId = isDraft ? 'draft' : 'event';

  return (
    <>
      {/* EO */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          {isDraft ? 'Nama EO' : 'Event Organizer (EO)'}
        </label>
        <input
          value={eo}
          onChange={e => onFieldChange('eo', e.target.value)}
          placeholder={eoPlaceholder}
          list={`${datalistId}-eo-suggestions`}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
        <datalist id={`${datalistId}-eo-suggestions`}>
          {eoSuggestions.map(item => <option key={item} value={item} />)}
        </datalist>
      </div>

      {/* PIC + Phone */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Penanggung Jawab {isDraft && <span className="text-red-500">*</span>}
          </label>
          <input
            value={pic}
            onChange={e => onFieldChange('pic', e.target.value)}
            placeholder={picPlaceholder}
            list={picSuggestions.length > 0 ? `${datalistId}-pic-suggestions` : undefined}
            className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
              errors.pic
                ? 'border-red-400 focus:ring-red-100'
                : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
            }`}
          />
          {picSuggestions.length > 0 && (
            <datalist id={`${datalistId}-pic-suggestions`}>
              {picSuggestions.map(item => <option key={item} value={item} />)}
            </datalist>
          )}
          {errors.pic && <p className="mt-1 text-xs text-red-500">{errors.pic}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Nomor {isDraft ? 'Telepon' : 'Handphone'} {isDraft && <span className="text-red-500">*</span>}
          </label>
          <input
            value={phone}
            onChange={e => onFieldChange('phone', e.target.value)}
            placeholder={phonePlaceholder}
            list={phoneSuggestions.length > 0 ? `${datalistId}-phone-suggestions` : undefined}
            className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
              errors.phone
                ? 'border-red-400 focus:ring-red-100'
                : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'
            }`}
          />
          {phoneSuggestions.length > 0 && (
            <datalist id={`${datalistId}-phone-suggestions`}>
              {phoneSuggestions.map(item => <option key={item} value={item} />)}
            </datalist>
          )}
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
        </div>
      </div>

      {/* Categories + Priority */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jenis Acara</label>
          <select
            value=""
            onChange={e => {
              onAddCategory(e.target.value);
              e.target.value = '';
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="">Pilih jenis acara</option>
            {CATEGORIES.filter(category => !categories.includes(category)).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map(category => (
              <span key={category} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-300">
                {category}
                <button
                  type="button"
                  onClick={() => onRemoveCategory(category)}
                  className="rounded-full p-0.5 text-violet-500 transition hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30"
                  aria-label={`Hapus kategori ${category}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {errors.categories && <p className="mt-1 text-xs text-red-500">{errors.categories}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Prioritas</label>
          <select
            value={priority}
            onChange={e => onFieldChange('priority', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
