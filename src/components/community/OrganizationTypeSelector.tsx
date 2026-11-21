import { type KeyboardEvent } from 'react';
import { ORG_TYPE_LABELS } from './organizationTypeLabels';
import { type OrganizationType } from '../../types';
import { Button } from '../shadcn/button';
import { Users, GraduationCap, Building2, PartyPopper, School, Landmark, Heart, MoreHorizontal, Check } from 'lucide-react';

interface OrgTypeOption {
  value: OrganizationType;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'tosca' | 'pink' | 'muted';
}

const TONE_CLASS: Record<OrgTypeOption['tone'], string> = {
  tosca: 'bg-[color-mix(in_srgb,var(--brand-tosca)_14%,white)] text-[var(--brand-tosca-dark)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)] dark:text-[var(--brand-tosca-soft)]',
  pink: 'bg-[color-mix(in_srgb,var(--brand-pink)_14%,white)] text-[var(--brand-pink-600)] dark:bg-[color-mix(in_srgb,var(--brand-pink)_25%,black)] dark:text-[var(--brand-pink-soft)]',
  muted: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]',
};

const ORG_TYPES: OrgTypeOption[] = [
  { value: 'community', description: 'Musik, tari, seni, gim, hobi, dan lainnya', icon: Users, tone: 'tosca' },
  { value: 'school', description: 'Pihak resmi SD, SMP, SMA, dan kampus', icon: GraduationCap, tone: 'tosca' },
  { value: 'company', description: 'Korporat, UMKM, dan usaha rintisan', icon: Building2, tone: 'pink' },
  { value: 'eo', description: 'EO profesional dan lepas', icon: PartyPopper, tone: 'pink' },
  { value: 'campus', description: 'OSIS, BEM, UKM, dan himpunan', icon: School, tone: 'tosca' },
  { value: 'government', description: 'Dinas, kementerian, dan BUMN', icon: Landmark, tone: 'pink' },
  { value: 'ngo', description: 'Nirlaba, sosial, dan kemanusiaan', icon: Heart, tone: 'tosca' },
  { value: 'other', description: 'Tipe organisasi lain', icon: MoreHorizontal, tone: 'muted' },
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
      <p id="organization-type-label" className="text-xs font-semibold text-[var(--wf-ink-muted)]">
        Tipe organisasi <span className="text-rose-700" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
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
            <Button
              id={`organization-type-${opt.value}`}
              key={opt.value}
              type="button"
              variant="ghost"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (!value && index === Math.max(selectedIndex, 0)) ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={event => handleKeyDown(event, index)}
              className={`ui-focus-ring relative flex h-auto flex-col items-center gap-2 whitespace-normal rounded-2xl border-2 p-4 text-center font-normal transition-colors duration-200 motion-reduce:transition-none focus-visible:ring-0 active:translate-y-0 ${
                isSelected
                  ? 'border-[var(--brand-tosca)] bg-[color-mix(in_srgb,var(--brand-tosca)_10%,white)] shadow-md hover:bg-[color-mix(in_srgb,var(--brand-tosca)_10%,white)] dark:border-[var(--brand-tosca-soft)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_20%,black)] dark:hover:bg-[color-mix(in_srgb,var(--brand-tosca)_20%,black)]'
                  : error
                    ? 'border-rose-300 bg-rose-50/60 hover:border-rose-400 hover:bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/20 dark:hover:bg-rose-950/20'
                    : 'border-[var(--wf-rule)] bg-[var(--wf-board)] hover:border-[var(--wf-rule-strong)] hover:bg-[var(--wf-board)] hover:shadow-sm'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS[opt.tone]}`}>
                <Icon className="h-5 w-5 size-5" aria-hidden="true" />
              </div>
              <div>
                <p className={`text-xs font-bold ${
                  isSelected
                    ? opt.tone === 'pink'
                      ? 'text-[var(--brand-pink-600)] dark:text-[var(--brand-pink-soft)]'
                      : 'text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]'
                    : 'text-[var(--wf-ink-muted)]'
                }`}>
                  {ORG_TYPE_LABELS[opt.value]}
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--wf-ink-muted)]">
                  {opt.description}
                </p>
              </div>
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]">
                  <Check className="h-3 w-3 size-3" strokeWidth={3} aria-hidden="true" />
                </div>
              )}
            </Button>
          );
        })}
      </div>
      {value === '' && (
        <p className="text-xs text-[var(--wf-ink-muted)]">
          Pilih salah satu tipe organisasi di atas untuk membuka kolom pengisian data.
        </p>
      )}
      {error && (
        <p id="organization-type-error" className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { ORG_TYPES };
