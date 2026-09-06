import { ChangeEvent, FormEvent, useState } from 'react';
import { CheckCircle2, Send, ArrowLeft, Paperclip, FileText, X } from 'lucide-react';
import { submitCommunityRegistration, uploadRegistrationAttachment, type RegistrationProposalUpload } from '../../utils/supabaseApi';
import { RevealSection } from './CommunityRevealPrimitives';
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

const focusRing = 'ui-focus-ring';

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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

export function RegistrationForm() {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proposalFile, setProposalFile] = useState<File | null>(null);

  const MAX_PROPOSAL_SIZE = 20 * 1024 * 1024; // 20 MB
  const PROPOSAL_ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const handleProposalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) { setProposalFile(null); setError(''); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!PROPOSAL_ALLOWED_TYPES.includes(file.type) || !['pdf', 'doc', 'docx'].includes(ext)) {
      setProposalFile(null);
      setError('Format file belum didukung. Gunakan PDF atau Word.');
      return;
    }
    if (file.size > MAX_PROPOSAL_SIZE) {
      setProposalFile(null);
      setError('Ukuran file melebihi batas. Maksimal 20MB.');
      return;
    }
    setProposalFile(file);
    setError('');
  };

  const removeProposalFile = () => {
    setProposalFile(null);
    setError('');
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleOrgTypeChange = (type: OrganizationType) => {
    setForm(prev => ({
      ...prev,
      organizationType: type,
      typeSpecificData: {}, // reset type-specific data when type changes
      communityType: '', // reset community type
    }));
    setError('');
    setFieldErrors(prev => {
      if (!prev.organizationType) return prev;
      const updated = { ...prev };
      delete updated.organizationType;
      return updated;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate fields using validation utilities
    const errors: Record<string, string> = {};

    if (!form.organizationType) {
      errors.organizationType = 'Pilih tipe organisasi terlebih dahulu.';
    }

    if (!form.organizationName.trim()) {
      errors.organizationName = `${form.organizationType === 'community' ? 'Nama komunitas' : 'Nama organisasi'} wajib diisi.`;
    } else if (form.organizationName.trim().length < 3) {
      errors.organizationName = `${form.organizationType === 'community' ? 'Nama komunitas' : 'Nama organisasi'} terlalu pendek (minimal 3 karakter).`;
    } else if (form.organizationName.trim().length > 200) {
      errors.organizationName = `${form.organizationType === 'community' ? 'Nama komunitas' : 'Nama organisasi'} terlalu panjang (maksimal 200 karakter).`;
    }

    if (!form.pic.trim()) {
      errors.pic = 'Nama PIC wajib diisi.';
    }

    if (!form.phone.trim()) {
      errors.phone = 'Nomor WhatsApp wajib diisi.';
    }

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
      setError('Periksa kolom yang ditandai, lalu kirim ulang.');
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
      let proposal: RegistrationProposalUpload | undefined;
      if (proposalFile) {
        try {
          proposal = await uploadRegistrationAttachment(proposalFile);
        } catch (uploadErr) {
          setError(uploadErr instanceof Error ? uploadErr.message : 'Gagal mengunggah file. Coba lagi.');
          setSubmitting(false);
          return;
        }
      }
      await submitCommunityRegistration({
        communityName: form.organizationName,
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
        proposalFileUrl: proposal?.fileUrl,
        proposalFileName: proposal?.fileName,
        proposalFileSize: proposal?.fileSize,
      });
      setSubmitted(true);
    } catch {
      setError('Gagal mengirim pendaftaran. Coba lagi nanti.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const orgType = form.organizationType as OrganizationType;
    const typeLabel = orgType ? (ORG_TYPE_LABELS[orgType] ?? 'Organisasi') : 'Organisasi';
    return (
      <div className="ui-campaign-card p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
          <CheckCircle2 className="h-8 w-8 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
        </div>
        <h3 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Pendaftaran Terkirim!</h3>
        <p className="mt-3 text-sm leading-7 ui-text-secondary">
          Terima kasih sudah mendaftar! Tim kami akan mereview dan menghubungi kamu segera.
          <br />Sambil menunggu, ikuti <a href="https://instagram.com/metmalbekasi" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--brand-tosca-dark)] hover:underline dark:text-[var(--brand-tosca-soft)]">@metmalbekasi</a> untuk update terbaru!
        </p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setForm({ ...INITIAL_FORM }); }}
          className={`mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 ${focusRing}`}
        >
          Daftar {typeLabel} Lain
        </button>
      </div>
    );
  }

  const inputClass = 'w-full rounded-2xl border border-slate-200/80 bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder-slate-500';
  const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

  const showForm = !!form.organizationType;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="ui-campaign-card p-5 xl:p-7"
    >
      {/* Step 1: Organization Type Selector */}
      <OrganizationTypeSelector
        value={form.organizationType}
        onChange={handleOrgTypeChange}
        error={fieldErrors.organizationType}
      />

      {/* Step 2: Form Fields (shown after type selection) */}
      {showForm && (
        <div className="mt-6 animate-[fadeIn_0.3s_ease] space-y-4">
          {/* Divider with selected type */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setField('organizationType', '' as OrganizationType)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
              title="Ganti tipe"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <p className="text-xs font-semibold text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]">
              Pendaftaran {form.organizationType ? ORG_TYPE_LABELS[form.organizationType as OrganizationType] : ''}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Organization Name */}
            <div className="sm:col-span-2">
              <label htmlFor="reg-org-name" className={labelClass}>
                {form.organizationType === 'community' ? 'Nama Komunitas' : 'Nama Organisasi'} <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-org-name"
                value={form.organizationName}
                onChange={e => setField('organizationName', e.target.value)}
                placeholder={form.organizationType === 'community' ? 'Nama komunitas' : 'Nama organisasi / lembaga'}
                required
                className={inputClass}
                aria-invalid={!!fieldErrors.organizationName}
                aria-describedby={fieldErrors.organizationName ? 'organization-name-error' : undefined}
              />
              {fieldErrors.organizationName && (
                <p id="organization-name-error" className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {fieldErrors.organizationName}
                </p>
              )}
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
              <label htmlFor="reg-pic" className={labelClass}>Nama PIC <span className="text-rose-600">*</span></label>
              <input id="reg-pic" value={form.pic} onChange={e => setField('pic', e.target.value)} placeholder="Nama penanggung jawab" required className={inputClass} aria-invalid={!!fieldErrors.pic} aria-describedby={fieldErrors.pic ? 'pic-error' : undefined} />
              {fieldErrors.pic && (
                <p id="pic-error" className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {fieldErrors.pic}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reg-phone" className={labelClass}>Nomor WhatsApp <span className="text-rose-600">*</span></label>
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
                <p id="phone-error" className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">
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
                <p id="email-error" className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">
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
                <p id="instagram-error" className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {fieldErrors.instagram}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reg-date" className={labelClass}>Preferensi Tanggal Event</label>
              <input id="reg-date" type="date" min={todayIso()} value={form.preferredDate} onChange={e => setField('preferredDate', e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reg-desc" className={labelClass}>Deskripsi / Proposal Event</label>
              <textarea id="reg-desc" value={form.description} onChange={e => setField('description', e.target.value)} rows={4} placeholder="Ceritain tentang rencana event yang mau diadain di Metropolitan Mall Bekasi..." className={`${inputClass} resize-none`} />
            </div>
            {/* Proposal / Company Profile Upload (optional) */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Lampiran Proposal / Company Profile (opsional)</label>
              <input
                id="reg-proposal"
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={handleProposalChange}
              />
              {proposalFile ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-100 px-4 py-3 dark:border-slate-600 dark:bg-slate-700">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
                    <span className="truncate text-sm text-slate-800 dark:text-white">{proposalFile.name}</span>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-300">{(proposalFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeProposalFile}
                    className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
                    aria-label="Hapus file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('reg-proposal')?.click()}
                  className={`flex w-full items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-100/60 px-4 py-3 text-sm text-slate-600 transition hover:border-[var(--brand-tosca)] hover:text-slate-800 dark:border-slate-500 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:border-[var(--brand-tosca-soft)] dark:hover:text-white ${focusRing}`}
                >
                  <Paperclip className="h-4 w-4" />
                  Pilih file
                </button>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">PDF atau Word (doc/docx), maksimal 20MB</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p>}

      <div className="mt-6 flex flex-col gap-4 border-t border-[var(--border-subtle)] dark:border-slate-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-6 text-slate-600 dark:text-slate-300">* Wajib diisi. Data kamu aman dan hanya digunakan untuk proses pendaftaran.</p>
        <button
          type="submit"
          disabled={submitting}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--brand-tosca-dark)] disabled:opacity-60 motion-reduce:transition-none ${focusRing}`}
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
        </button>
      </div>
    </form>
  );
}

export function CommunityRegistrationForm() {
  return (
    <RevealSection id="register" intensity="strong" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-start">
        <div className="max-w-md">
          <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Daftarkan Komunitas Kamu
          </h2>
          <p className="mt-5 text-sm leading-7 ui-text-secondary">
            Isi form di bawah buat daftarin komunitas kamu. Tim kami bakal review dan hubungi kamu secepatnya.
          </p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Mau bertanya dulu?{' '}
            <a href="https://wa.me/6281318534823" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              Chat via WhatsApp
            </a>
          </p>
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cara mengisi form pendaftaran event</h3>
            <ol className="mt-3 space-y-2.5 text-sm leading-6 ui-text-secondary">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] text-xs font-bold text-[var(--brand-tosca)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)] dark:text-[var(--brand-tosca-soft)]">1</span>
                Pilih tipe organisasi kamu di bagian atas form.
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] text-xs font-bold text-[var(--brand-tosca)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)] dark:text-[var(--brand-tosca-soft)]">2</span>
                Lengkapi data organisasi dan PIC. Kalau ada proposal atau company profile, lampirkan filenya (opsional, PDF atau Word maksimal 20MB).
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] text-xs font-bold text-[var(--brand-tosca)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)] dark:text-[var(--brand-tosca-soft)]">3</span>
                Kirim pendaftaran, tim kami akan review dan hubungi kamu lewat WhatsApp.
              </li>
            </ol>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
              </div>
              <p className="text-sm leading-6 ui-text-secondary">Pendaftaran direview oleh tim kami</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
              </div>
              <p className="text-sm leading-6 ui-text-secondary">Fasilitas 100% gratis untuk komunitas</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
              </div>
              <p className="text-sm leading-6 ui-text-secondary">Terbuka untuk semua jenis komunitas</p>
            </div>
          </div>
        </div>
        <RegistrationForm />
      </div>
    </RevealSection>
  );
}
