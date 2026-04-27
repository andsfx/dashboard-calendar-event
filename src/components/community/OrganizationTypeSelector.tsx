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
  { value: 'community', label: 'Komunitas', description: 'Musik, dance, seni, gaming, dll', icon: Users, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { value: 'school', label: 'Sekolah / Universitas', description: 'SD, SMP, SMA, Perguruan Tinggi', icon: GraduationCap, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'company', label: 'Perusahaan', description: 'Corporate, UMKM, startup', icon: Building2, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'eo', label: 'Event Organizer', description: 'EO profesional & freelance', icon: PartyPopper, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'campus', label: 'Organisasi Kampus', description: 'BEM, UKM, Himpunan', icon: School, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
  { value: 'government', label: 'Instansi Pemerintah', description: 'Dinas, kementerian, BUMN', icon: Landmark, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'ngo', label: 'NGO / Yayasan', description: 'Non-profit, sosial, kemanusiaan', icon: Heart, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  { value: 'other', label: 'Lainnya', description: 'Tipe organisasi lain', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
];

interface Props {
  value: OrganizationType | '';
  onChange: (type: OrganizationType) => void;
}

export function OrganizationTypeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        Tipe Organisasi <span className="text-rose-500">*</span>
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ORG_TYPES.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all duration-200 ${
                isSelected
                  ? 'border-violet-500 bg-violet-50 shadow-md dark:border-violet-400 dark:bg-violet-950/30'
                  : 'border-slate-200/60 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${opt.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-xs font-bold ${isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200'}`}>
                  {opt.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                  {opt.description}
                </p>
              </div>
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Export for use in admin views
export { ORG_TYPES };
export type { OrgTypeOption };
