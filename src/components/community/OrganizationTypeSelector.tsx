import { type KeyboardEvent } from 'react';
import { type OrganizationType } from '../../types';
import { Users, GraduationCap, Building2, PartyPopper, School, Landmark, Heart, MoreHorizontal } from 'lucide-react';

interface OrgTypeOption {
  value: OrganizationType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // tailwind bg class
}

const ORG_TYPES: OrgTypeOption[] = [
  { value: 'community', label: 'Komunitas', description: 'Musik, dance, seni, gaming, dll', icon: Users, color: 'bg-brand-primary-100 text-brand-primary-600 dark:bg-brand-primary-900/30 dark:text-brand-primary-400' },
  { value: 'school', label: 'Sekolah / Universitas', description: 'SD, SMP, SMA, Perguruan Tinggi', icon: GraduationCap, color: 'bg-brand-primary-50 text-brand-primary-700 dark:bg-brand-primary-950/30 dark:text-brand-primary-300' },
  { value: 'company', label: 'Perusahaan', description: 'Corporate, UMKM, startup', icon: Building2, color: 'bg-brand-secondary-50 text-brand-secondary-700 dark:bg-brand-secondary-950/30 dark:text-brand-secondary-300' },
  { value: 'eo', label: 'Event Organizer', description: 'EO profesional & freelance', icon: PartyPopper, color: 'bg-brand-secondary-100 text-brand-secondary-600 dark:bg-brand-secondary-900/30 dark:text-brand-secondary-400' },
  { value: 'campus', label: 'Organisasi Kampus', description: 'BEM, UKM, Himpunan', icon: School, color: 'bg-brand-primary-200 text-brand-primary-700 dark:bg-brand-primary-800/30 dark:text-brand-primary-300' },
  { value: 'government', label: 'Instansi Pemerintah', description: 'Dinas, kementerian, BUMN', icon: Landmark, color: 'bg-brand-secondary-200 text-brand-secondary-700 dark:bg-brand-secondary-800/30 dark:text-brand-secondary-300' },
  { value: 'ngo', label: 'NGO / Yayasan', description: 'Non-profit, sosial, kemanusiaan', icon: Heart, color: 'bg-brand-primary-300 text-brand-primary-600 dark:bg-brand-primary-700/30 dark:text-brand-primary-400' },
  { value: 'other', label: 'Lainnya', description: 'Tipe organisasi lain', icon: MoreHorizontal, color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800/30 dark:text-neutral-300' },
];

interface Props {
  value: OrganizationType | '';
  onChange: (type: OrganizationType) => void;
  error?: string;
}

export function OrganizationTypeSelector({ value, onChange, error }: Props) {
  const selectedIndex = ORG_TYPES.findIndex(opt => opt.value === value);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const lastIndex = ORG_TYPES.length - 1;
    let nextIndex = index;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    const nextOption = ORG_TYPES[nextIndex];
    if (!nextOption) return;

    onChange(nextOption.value);
    requestAnimationFrame(() => {
      document.getElementById(`organization-type-${nextOption.value}`)?.focus();
    });
  };

  return (
    <div className="space-y-3">
      <p id="organization-type-label" className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
        Tipe Organisasi <span className="text-rose-500">*</span>
      </p>
      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
        role="radiogroup"
        aria-labelledby="organization-type-label"
        aria-describedby={error ? 'organization-type-error' : undefined}
        aria-required="true"
      >
        {ORG_TYPES.map((opt, index) => {
          const Icon = opt.icon;
          const isSelected = value === opt.value;
          return (
            <button
              id={`organization-type-${opt.value}`}
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (!value && index === Math.max(selectedIndex, 0)) ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={event => handleKeyDown(event, index)}
              className={`ui-focus-ring group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all duration-200 motion-reduce:transition-none ${
                isSelected
                  ? 'border-brand-primary-500 bg-brand-primary-50 shadow-md dark:border-brand-primary-400 dark:bg-brand-primary-950/30'
                  : error
                    ? 'border-rose-300 bg-rose-50/60 hover:border-rose-400 dark:border-rose-800 dark:bg-rose-950/20'
                    : 'border-neutral-200/60 bg-white hover:border-neutral-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none ${opt.color}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className={`text-xs font-bold ${isSelected ? 'text-brand-primary-700 dark:text-brand-primary-300' : 'text-neutral-700 dark:text-neutral-200'}`}>
                  {opt.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-neutral-500 dark:text-neutral-400">
                  {opt.description}
                </p>
              </div>
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary-500 text-white">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p id="organization-type-error" className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Export for use in admin views
export { ORG_TYPES };
export type { OrgTypeOption };
