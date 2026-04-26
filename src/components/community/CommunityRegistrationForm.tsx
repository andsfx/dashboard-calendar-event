import { FormEvent, ReactNode, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { submitCommunityRegistration } from '../../utils/supabaseApi';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const COMMUNITY_TYPES = [
  'Musik', 'Dance', 'Seni & Kreatif', 'Gaming', 'Olahraga', 'Pendidikan',
  'Fotografi', 'Kuliner', 'Teknologi', 'Sosial', 'Lainnya',
];

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

interface CommunityFormData {
  communityName: string;
  communityType: string;
  pic: string;
  phone: string;
  email: string;
  instagram: string;
  description: string;
  preferredDate: string;
}

function RegistrationForm() {
  const [form, setForm] = useState<CommunityFormData>({
    communityName: '',
    communityType: '',
    pic: '',
    phone: '',
    email: '',
    instagram: '',
    description: '',
    preferredDate: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (key: keyof CommunityFormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.communityName.trim() || !form.pic.trim() || !form.phone.trim() || !form.communityType) {
      setError('Lengkapi nama komunitas, tipe, PIC, dan nomor telepon ya!');
      return;
    }
    setSubmitting(true);
    try {
      await submitCommunityRegistration(form);
      setSubmitted(true);
    } catch {
      setError('Gagal mengirim pendaftaran. Coba lagi nanti.');
    }
    setSubmitting(false);
  };

  if (submitted) {
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
          onClick={() => { setSubmitted(false); setForm({ communityName: '', communityType: '', pic: '', phone: '', email: '', instagram: '', description: '', preferredDate: '' }); }}
          className={`mt-6 inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 ${focusRing}`}
        >
          Daftar Komunitas Lain
        </button>
      </div>
    );
  }

  const inputClass = 'w-full rounded-2xl border border-slate-200/50 bg-[#fffdf9] px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder-slate-500';
  const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:bg-slate-800 dark:border-slate-700 xl:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="reg-community" className={labelClass}>Nama Komunitas <span className="text-rose-500">*</span></label>
          <input id="reg-community" value={form.communityName} onChange={e => setField('communityName', e.target.value)} placeholder="Nama komunitas" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-type" className={labelClass}>Tipe Komunitas <span className="text-rose-500">*</span></label>
          <select id="reg-type" value={form.communityType} onChange={e => setField('communityType', e.target.value)} required className={inputClass}>
            <option value="">Pilih tipe</option>
            {COMMUNITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="reg-pic" className={labelClass}>Nama PIC <span className="text-rose-500">*</span></label>
          <input id="reg-pic" value={form.pic} onChange={e => setField('pic', e.target.value)} placeholder="Nama PIC" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-phone" className={labelClass}>Nomor WhatsApp <span className="text-rose-500">*</span></label>
          <input id="reg-phone" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="Nomor WhatsApp" type="tel" autoComplete="tel" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-email" className={labelClass}>Email</label>
          <input id="reg-email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="Email (opsional)" type="email" autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-instagram" className={labelClass}>Instagram Komunitas</label>
          <input id="reg-instagram" value={form.instagram} onChange={e => setField('instagram', e.target.value)} placeholder="@username atau URL" className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-date" className={labelClass}>Preferensi Tanggal Event</label>
          <input id="reg-date" type="date" value={form.preferredDate} onChange={e => setField('preferredDate', e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg-desc" className={labelClass}>Deskripsi</label>
          <textarea id="reg-desc" value={form.description} onChange={e => setField('description', e.target.value)} rows={4} placeholder="Ceritain tentang komunitas kamu dan rencana event yang mau diadain..." className={`${inputClass} resize-none`} />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-rose-600" role="alert">{error}</p>}
      <div className="mt-6 flex flex-col gap-4 border-t border-black/[0.06] dark:border-slate-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">* Wajib diisi. Data kamu aman dan hanya digunakan untuk proses pendaftaran.</p>
        <button
          type="submit"
          disabled={submitting}
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
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-500">
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
            Isi form di bawah dan ceritain tentang komunitas kamu. Tim kami akan review dan hubungi kamu secepatnya.
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
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Terbuka untuk semua jenis komunitas</p>
            </div>
          </div>
        </div>
        <RegistrationForm />
      </div>
    </RevealSection>
  );
}
