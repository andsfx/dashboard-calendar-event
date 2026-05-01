import { FormEvent, ReactNode, useState } from 'react';
import { CheckCircle2, Send, ArrowLeft } from 'lucide-react';
import { submitCommunityRegistration } from '../../utils/supabaseApi';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { OrganizationTypeSelector } from './OrganizationTypeSelector';
import { TypeSpecificFields } from './TypeSpecificFields';
import { type OrganizationType } from '../../types';
import { validateEmail, validatePhone, validateInstagram } from '../../utils/validation';

const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  community: 'Komunitas',
  school: 'Sekolah / Universitas',
  company: 'Perusahaan',
  eo: 'Event Organizer',
  campus: 'Organisasi Kampus',
  government: 'Instansi Pemerintah',
  ngo: 'NGO / Yayasan',
  other: 'Lainnya',
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

interface FormData {
  organizationType: OrganizationType | '';
  organizationName: string;
  communityType: string; // kept for backward compat with community type
  pic: string;
  phone: string;
  email: string;
  instagram: string;
  description: string;
  preferredDate: string;
  typeSpecificData: Record<string, string | number>;
}

const INITIAL_FORM: FormData = {
  organizationType: '',
  organizationName: '',
  communityType: '',
  pic: '',
  phone: '',
  email: '',
  instagram: '',
  description: '',
  preferredDate: '',
  typeSpecificData: {},
};

function RegistrationForm() {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
    // Clear field-specific error when user types
    if (key === 'email' || key === 'phone' || key === 'instagram') {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const handleOrgTypeChange = (type: OrganizationType) => {
    setForm(prev => ({
      ...prev,
      organizationType: type,
      typeSpecificData: {}, // reset type-specific data when type changes
      communityType: '', // reset community type
    }));
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.organizationType) {
      setError('Pilih tipe organisasi terlebih dahulu.');
      return;
    }
    if (!form.organizationName.trim() || !form.pic.trim() || !form.phone.trim()) {
      setError('Lengkapi nama organisasi, PIC, dan nomor telepon ya!');
      return;
    }

    // Validate fields using validation utilities
    const errors: Record<string, string> = {};

    // Validate email (optional field - only validate if provided)
    if (form.email.trim()) {
      const emailResult = validateEmail(form.email);
      if (!emailResult.valid && emailResult.error) {
        errors.email = emailResult.error;
      }
    }

    // Validate phone (required field)
    const phoneResult = validatePhone(form.phone);
    if (!phoneResult.valid && phoneResult.error) {
      errors.phone = phoneResult.error;
    }

    // Validate Instagram (optional field - only validate if provided)
    if (form.instagram.trim()) {
      const instagramResult = validateInstagram(form.instagram);
      if (!instagramResult.valid && instagramResult.error) {
        errors.instagram = instagramResult.error;
      }
    }

    // If there are validation errors, set them and return early
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Mohon perbaiki kesalahan pada form.');
      return;
    }

    // Clear field errors if validation passes
    setFieldErrors({});

    // For community type, communityType comes from typeSpecificData
    const communityType = form.organizationType === 'community'
      ? String(form.typeSpecificData.communitySubType || '')
      : form.organizationType;

    setSubmitting(true);
    try {
      await submitCommunityRegistration({
        communityName: form.organizationName, // backward compat
        communityType,
        pic: form.pic,
        phone: form.phone,
        email: form.email,
        instagram: form.instagram,
        description: form.description,
        preferredDate: form.preferredDate,
        organizationType: form.organizationType,
        organizationName: form.organizationName,
        typeSpecificData: form.typeSpecificData,
      });
      setSubmitted(true);
    } catch {
      setError('Gagal mengirim pendaftaran. Coba lagi nanti.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    const orgType = form.organizationType as OrganizationType;
    const typeLabel = orgType ? (ORG_TYPE_LABELS[orgType] ?? 'Organisasi') : 'Organisasi';
    return (
      <div className="rounded-[2rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Pendaftaran Terkirim!</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
          Terima kasih udah daftar! Tim kami akan review dan hubungi kamu dalam 3-5 hari kerja.
          <br />Sambil nunggu, follow <a href="https://instagram.com/metmalbekasi" target="_blank" rel="noopener noreferrer" className="font-semibold text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">@metmalbekasi</a> buat update terbaru!
        </p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setForm({ ...INITIAL_FORM }); }}
          className={`mt-6 inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 ${focusRing}`}
        >
          Daftar {typeLabel} Lain
        </button>
      </div>
    );
  }

  const inputClass = 'w-full rounded-2xl border border-slate-200/50 bg-[#fffdf9] px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder-slate-500';
  const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

  const showForm = !!form.organizationType;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:bg-slate-800 dark:border-slate-700 xl:p-7"
    >
      {/* Step 1: Organization Type Selector */}
      <OrganizationTypeSelector
        value={form.organizationType}
        onChange={handleOrgTypeChange}
      />

      {/* Step 2: Form Fields (shown after type selection) */}
      {showForm && (
        <div className="mt-6 animate-[fadeIn_0.3s_ease] space-y-4">
          {/* Divider with selected type */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setField('organizationType', '' as OrganizationType)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:text-slate-300"
              title="Ganti tipe"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
              Pendaftaran {form.organizationType ? ORG_TYPE_LABELS[form.organizationType as OrganizationType] : ''}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Organization Name */}
            <div className="sm:col-span-2">
              <label htmlFor="reg-org-name" className={labelClass}>
                {form.organizationType === 'community' ? 'Nama Komunitas' : 'Nama Organisasi'} <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-org-name"
                value={form.organizationName}
                onChange={e => setField('organizationName', e.target.value)}
                placeholder={form.organizationType === 'community' ? 'Nama komunitas' : 'Nama organisasi / lembaga'}
                required
                className={inputClass}
              />
            </div>

            {/* Type-Specific Fields */}
            <TypeSpecificFields
              orgType={form.organizationType as OrganizationType}
              typeSpecificData={form.typeSpecificData}
              onChange={data => setField('typeSpecificData', data)}
              inputClass={inputClass}
              labelClass={labelClass}
            />

            {/* Common Fields */}
            <div>
              <label htmlFor="reg-pic" className={labelClass}>Nama PIC <span className="text-rose-500">*</span></label>
              <input id="reg-pic" value={form.pic} onChange={e => setField('pic', e.target.value)} placeholder="Nama penanggung jawab" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="reg-phone" className={labelClass}>Nomor WhatsApp <span className="text-rose-500">*</span></label>
              <input 
                id="reg-phone" 
                value={form.phone} 
                onChange={e => setField('phone', e.target.value)} 
                placeholder="Nomor WhatsApp" 
                type="tel" 
                autoComplete="tel" 
                required 
                className={inputClass}
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
              />
              {fieldErrors.phone && (
                <p id="phone-error" className="text-red-500 text-sm mt-1" role="alert">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reg-email" className={labelClass}>Email</label>
              <input 
                id="reg-email" 
                value={form.email} 
                onChange={e => setField('email', e.target.value)} 
                placeholder="Email (opsional)" 
                type="email" 
                autoComplete="email" 
                className={inputClass}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-red-500 text-sm mt-1" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reg-instagram" className={labelClass}>Instagram / Media Sosial</label>
              <input 
                id="reg-instagram" 
                value={form.instagram} 
                onChange={e => setField('instagram', e.target.value)} 
                placeholder="@username atau URL" 
                className={inputClass}
                aria-invalid={!!fieldErrors.instagram}
                aria-describedby={fieldErrors.instagram ? 'instagram-error' : undefined}
              />
              {fieldErrors.instagram && (
                <p id="instagram-error" className="text-red-500 text-sm mt-1" role="alert">
                  {fieldErrors.instagram}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reg-date" className={labelClass}>Preferensi Tanggal Event</label>
              <input id="reg-date" type="date" value={form.preferredDate} onChange={e => setField('preferredDate', e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reg-desc" className={labelClass}>Deskripsi / Proposal Event</label>
              <textarea id="reg-desc" value={form.description} onChange={e => setField('description', e.target.value)} rows={4} placeholder="Ceritain tentang rencana event yang mau diadain di Metropolitan Mall Bekasi..." className={`${inputClass} resize-none`} />
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose-600" role="alert">{error}</p>}

      <div className="mt-6 flex flex-col gap-4 border-t border-black/[0.06] dark:border-slate-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">* Wajib diisi. Data kamu aman dan hanya digunakan untuk proses pendaftaran.</p>
        <button
          type="submit"
          disabled={submitting || !form.organizationType}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-60 transition hover:brightness-110 hover:shadow-lg ${focusRing}`}
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Mengirim...' : 'Daftar Sekarang!'}
        </button>
      </div>
    </form>
  );
}

function RevealSection({
  children,
  className = '',
  intensity = 'default',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  intensity?: 'default' | 'strong';
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref as never}
      className={`reveal-on-scroll ${intensity === 'strong' ? 'reveal-strong' : ''} ${isVisible ? 'reveal-visible' : ''} ${className}`}
      {...rest}
    >
      <div className="reveal-stage">{children}</div>
    </section>
  );
}

function eyebrow(label: string) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-600">
      {label}
    </p>
  );
}

export function CommunityRegistrationForm() {
  return (
    <RevealSection id="register" intensity="strong" className="px-4 py-20 sm:px-6">
      <div className="reveal-cluster mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-start">
        <div className="max-w-md">
          {eyebrow('Daftar Sekarang')}
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Yuk, gabung!
          </h2>
          <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-400">
            Isi form di bawah dan ceritain tentang organisasi kamu. Tim kami akan review dan hubungi kamu secepatnya.
          </p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Mau tanya-tanya dulu?{' '}
            <a href="https://wa.me/6281318534823" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
              Chat via WhatsApp
            </a>
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Proses review 3-5 hari kerja</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Semua fasilitas 100% gratis</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Terbuka untuk semua jenis organisasi</p>
            </div>
          </div>
        </div>
        <RegistrationForm />
      </div>
    </RevealSection>
  );
}
