import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { submitCommunityRegistration } from '../utils/supabaseApi';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,

  Globe,
  Headphones,
  Heart,
  Inbox,
  Lightbulb,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Mic2,
  Moon,
  Music,
  Phone,
  Radio,
  Rocket,
  Send,
  Sparkles,
  SunMedium,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { EventItem, PhotoAlbum } from '../types';
import { CATEGORY_COLORS } from '../utils/eventUtils';
import { CategoryBadges } from './CategoryBadges';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { useScrollReveal } from '../hooks/useScrollReveal';

/* ─── Brand tokens (consistent with PublicLandingPage) ────── */
const BRAND = {
  accent: '#7c6cf2',
  accentSoft: '#9185f7',
  accentWarm: '#f2743e',
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

/* ─── Data ────────────────────────────────────────────────── */
const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string; color: string }> = [
  {
    icon: <Trophy className="h-7 w-7" aria-hidden="true" />,
    title: 'Sponsorship Opportunities',
    desc: 'Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu connect dengan brand dan tenant yang relevan.',
    color: '#f59e0b',
  },
  {
    icon: <Megaphone className="h-7 w-7" aria-hidden="true" />,
    title: 'Marketing Support',
    desc: 'Tim marketing kami bantu promosiin event kamu lewat social media, digital signage, dan channel mall lainnya.',
    color: '#ec4899',
  },
  {
    icon: <Rocket className="h-7 w-7" aria-hidden="true" />,
    title: 'Grow Your Community',
    desc: 'Eksposur ke ribuan pengunjung mall setiap hari. Kesempatan kolaborasi dengan komunitas lain yang udah bergabung.',
    color: '#8b5cf6',
  },
  {
    icon: <Zap className="h-7 w-7" aria-hidden="true" />,
    title: 'Free Venue & Event Tools',
    desc: 'Panggung, sound system, lighting, kursi penonton — semua GRATIS. Kamu tinggal fokus bikin acara yang seru.',
    color: '#10b981',
  },
];

const FACILITIES: Array<{ icon: ReactNode; title: string; detail: string }> = [
  { icon: <Mic2 className="h-6 w-6" aria-hidden="true" />, title: 'Panggung & Backdrop', detail: 'Panggung siap pakai dengan backdrop yang bisa diganti materinya sesuai tema event kamu.' },
  { icon: <Headphones className="h-6 w-6" aria-hidden="true" />, title: 'Sound System 10K Watt', detail: 'Sound system profesional 10.000 watt lengkap dengan operator berpengalaman.' },
  { icon: <Lightbulb className="h-6 w-6" aria-hidden="true" />, title: 'Lighting System', detail: 'Lighting profesional yang bikin panggung kamu makin standout dan memorable.' },
  { icon: <Users className="h-6 w-6" aria-hidden="true" />, title: '50 Kursi Penonton', detail: '50 kursi penonton yang bisa di-arrange sesuai kebutuhan acara kamu.' },
  { icon: <MapPin className="h-6 w-6" aria-hidden="true" />, title: 'Area Lantai 3', detail: 'Lokasi strategis di lantai 3 Metropolitan Mall Bekasi, mudah diakses pengunjung.' },
  { icon: <Heart className="h-6 w-6" aria-hidden="true" />, title: 'Meja Juri', detail: 'Meja juri tersedia untuk kompetisi, audisi, atau ujian kenaikan kelas.' },
];

const STEPS: Array<{ num: string; title: string; desc: string }> = [
  { num: '01', title: 'Daftar & Submit', desc: 'Isi form pendaftaran komunitas. Ceritain siapa kamu dan apa yang mau kamu lakuin.' },
  { num: '02', title: 'Review Tim Mall', desc: 'Tim kami review proposal kamu dan diskusi soal jadwal, kebutuhan, dan konsep acara.' },
  { num: '03', title: 'Konfirmasi & Prep', desc: 'Setelah deal, kita siapin venue dan semua tools yang kamu butuhkan.' },
  { num: '04', title: 'Event Day!', desc: 'Hari H tiba! Kamu fokus bikin acara seru, sisanya biar tim mall yang handle.' },
];

const COMMUNITY_TYPES = [
  'Musik', 'Dance', 'Seni & Kreatif', 'Gaming', 'Olahraga', 'Pendidikan',
  'Fotografi', 'Kuliner', 'Teknologi', 'Sosial', 'Lainnya',
];

const FAQS: Array<[string, string]> = [
  ['Beneran gratis? Nggak ada biaya tersembunyi?', 'Beneran 100% gratis! Panggung, sound system, lighting, kursi — semua disediakan tanpa biaya. Yang perlu kamu siapin cuma konsep acara dan semangat komunitas kamu.'],
  ['Komunitas apa aja yang bisa daftar?', 'Semua jenis komunitas welcome! Musik, dance, seni, gaming, olahraga, pendidikan, dan lainnya. Selama punya konsep acara yang jelas dan positif, kita open.'],
  ['Berapa lama proses review-nya?', 'Biasanya 3-5 hari kerja setelah form diterima. Tim kami akan hubungi PIC untuk diskusi lebih lanjut soal jadwal dan kebutuhan.'],
  ['Bisa request tanggal tertentu?', 'Bisa! Tulis preferensi tanggal di form. Tim kami akan cek ketersediaan dan konfirmasi secepatnya.'],
  ['Apakah bisa kolaborasi dengan komunitas lain?', 'Absolutely! Justru itu salah satu value yang kami tawarkan. Kami bisa bantu connect kamu dengan komunitas lain yang udah bergabung.'],
  ['Apa syarat untuk mendaftar?', 'Kirimkan company profile atau portofolio komunitas beserta proposal event ke email kami. Nggak perlu ribet — yang penting jelas konsep dan tujuannya.'],
];

const IG_POSTS = [
  'https://www.instagram.com/p/DXYxAlQkXrD/',
  'https://www.instagram.com/metmalbekasi/p/DXecp6JEaqt/',
];

/* ─── Helpers ─────────────────────────────────────────────── */
function RevealSection({
  children,
  skeleton,
  className = '',
  as = 'section',
  intensity = 'default',
  ...rest
}: {
  children: ReactNode;
  skeleton?: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  intensity?: 'default' | 'strong';
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal();
  const Tag = as;

  // If skeleton provided and not yet visible, show skeleton instead of reveal-stage
  if (!isVisible && skeleton) {
    return (
      <Tag
        ref={ref as never}
        className={className}
        {...rest}
      >
        <div className="animate-pulse">{skeleton}</div>
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as never}
      className={`reveal-on-scroll ${intensity === 'strong' ? 'reveal-strong' : ''} ${isVisible ? 'reveal-visible' : ''} ${className}`}
      {...rest}
    >
      <div className="reveal-stage">{children}</div>
    </Tag>
  );
}

/* ─── Skeleton Components ─────────────────────────────────── */

function SkeletonGalleryAlbums() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="text-center">
        <div className="mx-auto h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-4 h-9 w-72 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-3 h-4 w-96 max-w-full rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="mt-10">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
              <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-700" />
              <div className="p-3 sm:p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-14">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
              <div className="h-[300px] bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonEventGrid() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="text-center">
        <div className="mx-auto h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-4 h-9 w-80 max-w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-3 h-4 w-96 max-w-full rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl shadow-sm">
            <div className="h-28 bg-slate-200 dark:bg-slate-700" />
            <div className="border border-t-0 border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 rounded-b-2xl">
              <div className="space-y-2">
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
              </div>
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogoMark({ className = '' }: { className?: string }) {
  return <img src={mallLogo} alt="Metropolitan Mall Bekasi" className={className} />;
}

function eyebrow(label: string) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-500">
      {label}
    </p>
  );
}

const NAV_ITEMS = [
  { href: '#benefits', label: 'Keuntungan' },
  { href: '#facilities', label: 'Fasilitas' },
  { href: '#gallery', label: 'Galeri' },
  { href: '#events', label: 'Event' },
  { href: '#how', label: 'Cara Daftar' },
  { href: '#register', label: 'Daftar' },
  { href: '#faq', label: 'FAQ' },
];

/* ─── Registration Form ──────────────────────────────────── */
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

/* ─── Lazy Instagram Embed ────────────────────────────────── */
function LazyInstagramEmbed({ url }: { url: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load Instagram embed script when visible
  useEffect(() => {
    if (!isVisible) return;
    const existing = document.querySelector('script[src*="instagram.com/embed"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    } else if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || hasError) return;
    const timer = setTimeout(() => setTimedOut(true), 30000);
    return () => clearTimeout(timer);
  }, [isVisible, hasError]);

  const embedUrl = url.endsWith('/') ? `${url}embed` : `${url}/embed`;

  return (
    <div ref={containerRef} className="overflow-hidden rounded-2xl border border-black/[0.06] shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:border-slate-700">
      {isVisible && !hasError && !timedOut ? (
        <div className="mx-auto" style={{ maxWidth: 540 }}>
          <iframe
            src={embedUrl}
            className="w-full border-0"
            style={{ minHeight: 600 }}
            loading="lazy"
            title="Instagram post"
            onError={() => setHasError(true)}
          />
        </div>
      ) : (hasError || timedOut) ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[300px] flex-col items-center justify-center bg-[#faf6ef] p-8 text-center dark:bg-slate-800"
        >
          <Globe className="h-10 w-10 text-violet-500 dark:text-violet-400" />
          <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Lihat di Instagram</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">@metmalbekasi</p>
        </a>
      ) : (
        <div className="flex h-[300px] items-center justify-center bg-slate-100 dark:bg-slate-800">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-slate-300 dark:bg-slate-600" />
            <p className="mt-3 text-sm text-slate-400">Memuat Instagram...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InstagramFallbackCard({ url }: { url: string }) {
  return (
    <a
      href={url || 'https://instagram.com/metmalbekasi'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-[#faf6ef] p-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-amber-50 dark:from-violet-900/30 dark:to-amber-900/20">
        <Globe className="h-10 w-10 text-violet-500 dark:text-violet-400" />
      </div>
      <p className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Lihat di Instagram</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">@metmalbekasi</p>
    </a>
  );
}

/* ─── Event Showcase ──────────────────────────────────────── */



function GridCardsView({ events, onDetail }: { events: EventItem[]; onDetail: (ev: EventItem) => void }) {
  const sorted = [...events].sort((a, b) => {
    if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
    if (a.status !== 'ongoing' && b.status === 'ongoing') return 1;
    return a.dateStr.localeCompare(b.dateStr);
  }).slice(0, 6);

  if (sorted.length === 0) return <EmptyEvents />;

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map(ev => {
        const color = CATEGORY_COLORS[ev.category] ?? '#6366f1';
        const isOngoing = ev.status === 'ongoing';
        return (
          <button
            key={ev.id}
            type="button"
            onClick={() => onDetail(ev)}
            aria-label={`${ev.acara} — ${ev.tanggal}`}
            className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl text-left shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 ${focusRing}`}
          >
            {/* Gradient top section — fixed min-height for consistency */}
            <div
              className="relative flex min-h-[120px] flex-1 flex-col justify-between px-5 pb-5 pt-5"
              style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}
            >
              {/* Status badge */}
              <div>
                {isOngoing ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <Radio className="h-3 w-3" aria-hidden="true" /> BERLANGSUNG
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" /> {ev.tanggal}
                  </span>
                )}
              </div>
              <p className="mt-3 text-base font-bold leading-snug text-white line-clamp-2 drop-shadow-sm">{ev.acara}</p>
            </div>
            {/* Bottom section */}
            <div className="border border-t-0 border-slate-200/50 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800 rounded-b-2xl">
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                {ev.jam && <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" aria-hidden="true" /><span>{ev.jam}</span></div>}
                {ev.lokasi && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="line-clamp-1">{ev.lokasi}</span></div>}
                {ev.eo && <div className="flex items-center gap-1.5"><Users className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="line-clamp-1">{ev.eo}</span></div>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-700">
                <CategoryBadges categories={ev.categories} maxVisible={2} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Empty state ──

function EmptyEvents() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 py-14 text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
      <Inbox className="mb-2 h-8 w-8 opacity-40" />
      <p className="text-sm font-medium">Belum ada event mendatang</p>
      <p className="mt-1 text-xs">Cek kembali nanti untuk update terbaru</p>
    </div>
  );
}

// ── Main Showcase ──

function EventShowcase({ events, onDetail, onViewAll }: { events: EventItem[]; onDetail: (ev: EventItem) => void; onViewAll: () => void }) {
  return (
    <>
      <GridCardsView events={events} onDetail={onDetail} />

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onViewAll}
          className={`inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
        >
          <CalendarDays className="h-4 w-4" />
          Lihat Semua Event
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
interface CommunityLandingProps {
  isDark: boolean;
  onToggleDark: () => void;
  onBack: () => void;
  instagramPosts?: string[];
  events?: EventItem[];
  onEventDetail?: (ev: EventItem) => void;
  heroImageUrl?: string;
  albums?: PhotoAlbum[];
}

export function CommunityLandingPage({ isDark, onToggleDark, onBack, instagramPosts, events = [], onEventDetail, heroImageUrl, albums = [] }: CommunityLandingProps) {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsHeaderPinned(window.scrollY > 32);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const headerClassName = isHeaderPinned
    ? 'fixed inset-x-0 top-0 z-50 border-b border-black/6 bg-[#fbfaf7]/96 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-md dark:bg-slate-950/96 dark:text-white dark:border-slate-800'
    : 'absolute inset-x-0 top-0 z-50 text-white';
  const navClassName = isHeaderPinned
    ? 'hidden items-center gap-7 text-[13px] font-medium text-slate-700 dark:text-slate-300 lg:flex'
    : 'hidden items-center gap-7 text-[13px] font-medium text-white/90 lg:flex';
  const utilityButtonClass = isHeaderPinned
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.05)] dark:bg-slate-800 dark:text-white dark:border-slate-700'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)] backdrop-blur-sm';
  const mobilePanelClass = isHeaderPinned
    ? 'mt-3 rounded-[1.6rem] border border-black/6 bg-white/98 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)] lg:hidden dark:bg-slate-900 dark:border-slate-700'
    : 'mt-3 rounded-[1.6rem] border border-white/10 bg-slate-950/46 p-3 shadow-[0_18px_36px_rgba(15,23,42,0.22)] backdrop-blur-md lg:hidden';
  const mobileNavGridClass = isHeaderPinned
    ? 'grid grid-cols-2 gap-2 text-sm font-medium text-slate-700 dark:text-white'
    : 'grid grid-cols-2 gap-2 text-sm font-medium text-white';
  const mobileNavItemClass = isHeaderPinned
    ? 'rounded-xl bg-[#f6f1ea] px-4 py-3 text-center transition hover:bg-[#efe8de] dark:bg-slate-800 dark:hover:bg-slate-700'
    : 'rounded-xl bg-white/8 px-4 py-3 text-center transition hover:bg-white/14';

  return (
    <div className="bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className={headerClassName}>
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            <button onClick={onBack} className={`shrink-0 flex items-center gap-2 ${focusRing}`} aria-label="Kembali ke halaman utama">
              <LogoMark className="h-auto w-[88px] sm:w-[124px]" />
            </button>
            <nav className={navClassName} aria-label="Navigasi utama">
              {NAV_ITEMS.map(item => (
                <a key={item.href} href={item.href} className={`transition hover:opacity-80 ${focusRing}`}>{item.label}</a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={onToggleDark} className={`${utilityButtonClass} ${focusRing}`} aria-label={isDark ? 'Mode terang' : 'Mode gelap'}>
                {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={onBack}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] ${focusRing}`}
                style={{ background: `linear-gradient(135deg, ${BRAND.accent} 0%, ${BRAND.accentSoft} 100%)` }}
              >
                <CalendarDays className="h-4 w-4" /> Event Dashboard
              </button>
              <button
                type="button"
                onClick={() => setMobileNavOpen(prev => !prev)}
                className={`${utilityButtonClass} lg:hidden ${focusRing}`}
                aria-label={mobileNavOpen ? 'Tutup navigasi' : 'Buka navigasi'}
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-out ${mobileNavOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className={mobilePanelClass}>
              <nav className={mobileNavGridClass} aria-label="Navigasi mobile">
                {NAV_ITEMS.map(item => (
                  <a key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} className={`${mobileNavItemClass} ${focusRing}`}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ───────────────────────────────────────────── */}
        <section
          id="hero"
          className="relative min-h-screen lg:max-h-[1000px] overflow-hidden"
        >
          {/* Background: foto + gradient overlay */}
          {heroImageUrl ? (
            <>
              <div className="absolute inset-0">
                <img src={heroImageUrl} alt="" className="h-full w-full object-cover" fetchPriority="high" />
              </div>
              {/* Gradient overlay di atas foto (60-70% opacity) */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(26,5,51,0.75) 0%, rgba(15,23,42,0.65) 40%, rgba(30,27,75,0.70) 70%, rgba(49,46,129,0.60) 100%)' }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0f172a 40%, #1e1b4b 70%, #312e81 100%)' }}
            />
          )}

          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
            <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-orange-500/15 blur-[100px]" />
            <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-[80px]" />
          </div>

          <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
            <RevealSection as="div" className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Metmal Community Space
              </div>

              <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-[5rem]">
                Calling All{' '}
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-violet-400 bg-clip-text text-transparent">
                  Community
                </span>
                !
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
                Lagi cari tempat buat kumpul komunitas? Di Metropolitan Mall Bekasi <strong className="text-white">GRATIS</strong>!
                Venue, sound system, lighting semua udah disiapin. Kamu tinggal fokus bikin komunitas makin hidup.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a
                  href="#register"
                  className={`inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-xl transition hover:brightness-110 hover:shadow-xl ${focusRing}`}
                  style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}
                >
                  Daftar Sekarang
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="#benefits"
                  className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/14 ${focusRing}`}
                >
                  Lihat Benefits
                </a>
              </div>

              {/* Quick stats */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/75">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  </span>
                  <span>100% Gratis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
                    <Music className="h-4 w-4 text-violet-400" aria-hidden="true" />
                  </span>
                  <span>Sound 10K Watt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                    <Users className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  </span>
                  <span>Open for All</span>
                </div>
              </div>
            </RevealSection>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse" aria-hidden="true">
            <ChevronDown className="h-6 w-6 text-white/50" />
          </div>
        </section>

        {/* ─── Benefits ──────────────────────────────────────── */}
        <RevealSection id="benefits" intensity="strong" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              {eyebrow('Kenapa Gabung')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Bukan cuma dikasih space.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                Kamu juga dipush buat berkembang. Dari sponsorship sampai marketing support — semua buat komunitas kamu makin besar.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b, i) => (
                <div
                  key={b.title}
                  className="group rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)] dark:bg-slate-800 dark:border-slate-700"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${b.color}, ${b.color}cc)` }}
                  >
                    {b.icon}
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{b.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ─── Facilities ────────────────────────────────────── */}
        <RevealSection id="facilities" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                {eyebrow('Fasilitas')}
                <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                  Semua udah disiapin.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
                Kamu nggak perlu pusing soal venue dan peralatan. Fokus aja bikin acara yang memorable!
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FACILITIES.map(f => (
                <div
                  key={f.title}
                  className="rounded-[1.75rem] border bg-[#fcfaf6] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{f.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ─── Gallery / Instagram ───────────────────────────── */}
        <RevealSection id="gallery" className="px-4 py-20 sm:px-6" skeleton={<SkeletonGalleryAlbums />}>
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              {eyebrow('Galeri')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Lihat sendiri keseruannya.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                Dokumentasi event dan update terbaru dari Metropolitan Mall Bekasi
              </p>
            </div>

            {/* ── Dokumentasi Event ── */}
            {albums.length > 0 && (
              <div className="mt-10">
                <div className="mb-6 flex items-center justify-center gap-2">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Dokumentasi Event</p>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                  {albums.slice(0, 3).map(album => (
                    <a
                      key={album.id}
                      href={`/gallery/${album.slug}`}
                      className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800 ${focusRing}`}
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-slate-200 dark:bg-slate-700">
                        {album.coverPhotoUrl ? (
                          <img src={album.coverPhotoUrl} alt={album.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-slate-700">
                            <Camera className="h-8 w-8 text-violet-300 dark:text-violet-500" aria-hidden="true" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                          <span className="text-sm font-semibold text-white">Lihat Foto &rarr;</span>
                        </div>
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1 dark:text-white">{album.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                          {album.eventDate && <span>{album.eventDate}</span>}
                          {typeof album.photoCount === 'number' && album.photoCount > 0 && <span>{album.eventDate ? '·' : ''} {album.photoCount} foto</span>}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <a
                    href="/gallery"
                    className={`inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Lihat Semua Gallery
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            )}

            {/* ── Instagram ── */}
            <div className={albums.length > 0 ? 'mt-14' : 'mt-10'}>
              <div className="mb-6 flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Instagram</p>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(instagramPosts && instagramPosts.length > 0
                  ? instagramPosts
                  : IG_POSTS
                ).map((url, idx) => {
                  const trimmedUrl = (url || '').trim();
                  if (!trimmedUrl || !trimmedUrl.includes('instagram.com')) {
                    return <InstagramFallbackCard key={`fallback-${idx}`} url="https://instagram.com/metmalbekasi" />;
                  }
                  return <LazyInstagramEmbed key={trimmedUrl} url={trimmedUrl} />;
                })}
              </div>

              <div className="mt-8 text-center">
                <a
                  href="https://instagram.com/metmalbekasi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  Follow @metmalbekasi
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* ─── Upcoming Events ────────────────────────────────── */}
        {events.length > 0 && onEventDetail && (
          <RevealSection id="events" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6" skeleton={<SkeletonEventGrid />}>
            <div className="mx-auto max-w-7xl">
              <div className="text-center">
                {eyebrow('Agenda Event')}
                <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                  Event yang sedang & akan berlangsung.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                  Lihat jadwal event terbaru di Metropolitan Mall Bekasi. Klik event untuk lihat detail.
                </p>
              </div>
              <EventShowcase
                events={events.filter(e => e.status === 'ongoing' || e.status === 'upcoming')}
                onDetail={onEventDetail}
                onViewAll={onBack}
              />
            </div>
          </RevealSection>
        )}

        {/* ─── How It Works ──────────────────────────────────── */}
        <RevealSection id="how" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              {eyebrow('Cara Daftar')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Gampang banget, cuma 4 langkah.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <div key={s.num} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="absolute right-0 top-10 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-violet-400/40 to-transparent dark:from-violet-500/30 lg:block" />
                  )}
                  <div className="relative rounded-[2rem] border border-slate-200/50 bg-[#fcfaf6] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-violet-500 text-lg font-extrabold text-white">
                      {s.num}
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ─── Registration Form ─────────────────────────────── */}
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

        {/* ─── FAQ ────────────────────────────────────────────── */}
        <RevealSection id="faq" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              {eyebrow('FAQ')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Pertanyaan yang sering muncul.
              </h2>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map(([question, answer], index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={question}
                    className="overflow-hidden rounded-[1.8rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  >
                    <button
                      type="button"
                      id={`community-faq-trigger-${index}`}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6 ${focusRing}`}
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? `community-faq-${index}` : undefined}
                    >
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">{question}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 transition text-violet-500 dark:text-violet-400 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div id={`community-faq-${index}`} role="region" aria-labelledby={`community-faq-trigger-${index}`} className="border-t border-slate-200/50 px-5 py-5 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:text-slate-400 sm:px-6">
                        {answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </RevealSection>

        {/* ─── Contact ───────────────────────────────────────── */}
        <RevealSection className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              {eyebrow('Kontak')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Ada pertanyaan? Hubungi kami!
              </h2>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="https://wa.me/6281318534823"
                target="_blank"
                rel="noopener noreferrer"
                className={`group rounded-[2rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 ${focusRing}`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Phone className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">WhatsApp Andy</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">0813-1853-4823</p>
              </a>

              <a
                href="https://wa.me/6281908142555"
                target="_blank"
                rel="noopener noreferrer"
                className={`group rounded-[2rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 ${focusRing}`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  <Phone className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">WhatsApp Uca</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">0819-0814-2555</p>
              </a>

              <a
                href="mailto:marketing@malmetropolitan.com"
                className={`group rounded-[2rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 ${focusRing}`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Mail className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Email</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">marketing@malmetropolitan.com</p>
              </a>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Telepon kantor: <strong>021-8855555 ext 214</strong> (Senin - Jumat, jam kerja)
              </p>
            </div>
          </div>
        </RevealSection>
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/50 bg-[#fbfaf7] px-4 py-8 text-sm text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-auto w-[102px] opacity-90" />
            <div>
              <p className="font-medium text-slate-700 dark:text-white">Metmal Community Space</p>
              <p className="mt-1">Powered by You — Metropolitan Mall Bekasi</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 text-left sm:items-end sm:text-right">
            <div className="flex items-center gap-3">
              <a href="https://instagram.com/metmalbekasi" target="_blank" rel="noopener noreferrer" className={`transition hover:text-slate-700 dark:hover:text-white ${focusRing}`}>Instagram</a>
              <span>·</span>
              <a href="https://www.threads.net/@metmalbekasi" target="_blank" rel="noopener noreferrer" className={`transition hover:text-slate-700 dark:hover:text-white ${focusRing}`}>Threads</a>
              <span>·</span>
              <a href="https://www.youtube.com/@metmalbekasi" target="_blank" rel="noopener noreferrer" className={`transition hover:text-slate-700 dark:hover:text-white ${focusRing}`}>YouTube</a>
              <span>·</span>
              <a href="https://www.malmetropolitan.com" target="_blank" rel="noopener noreferrer" className={`transition hover:text-slate-700 dark:hover:text-white ${focusRing}`}>Website</a>
            </div>
            <p>© {new Date().getFullYear()} Metropolitan Mall Bekasi — Metland Coloring Life</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
