import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  Headphones,
  Heart,
  Lightbulb,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Mic2,
  Moon,
  Music,
  Phone,
  Rocket,
  Send,
  Sparkles,
  SunMedium,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { useScrollReveal } from '../hooks/useScrollReveal';

/* ─── Brand tokens (consistent with PublicLandingPage) ────── */
const BRAND = {
  accent: '#7c6cf2',
  accentSoft: '#9185f7',
  accentWarm: '#f2743e',
  ink: '#111827',
  inkSoft: '#1f2937',
  paper: '#faf6ef',
  paperSoft: '#f5efe6',
  border: 'rgba(148, 163, 184, 0.18)',
};

/* ─── Data ────────────────────────────────────────────────── */
const BENEFITS: Array<{ icon: ReactNode; title: string; desc: string; color: string }> = [
  {
    icon: <Trophy className="h-7 w-7" />,
    title: 'Sponsorship Opportunities',
    desc: 'Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu connect dengan brand dan tenant yang relevan.',
    color: '#f59e0b',
  },
  {
    icon: <Megaphone className="h-7 w-7" />,
    title: 'Marketing Support',
    desc: 'Tim marketing kami bantu promosiin event kamu lewat social media, digital signage, dan channel mall lainnya.',
    color: '#ec4899',
  },
  {
    icon: <Rocket className="h-7 w-7" />,
    title: 'Grow Your Community',
    desc: 'Eksposur ke ribuan pengunjung mall setiap hari. Kesempatan kolaborasi dengan komunitas lain yang udah bergabung.',
    color: '#8b5cf6',
  },
  {
    icon: <Zap className="h-7 w-7" />,
    title: 'Free Venue & Event Tools',
    desc: 'Panggung, sound system, lighting, kursi penonton — semua GRATIS. Kamu tinggal fokus bikin acara yang seru.',
    color: '#10b981',
  },
];

const FACILITIES: Array<{ icon: ReactNode; title: string; detail: string }> = [
  { icon: <Mic2 className="h-6 w-6" />, title: 'Panggung & Backdrop', detail: 'Panggung siap pakai dengan backdrop yang bisa diganti materinya sesuai tema event kamu.' },
  { icon: <Headphones className="h-6 w-6" />, title: 'Sound System 10K Watt', detail: 'Sound system profesional 10.000 watt lengkap dengan operator berpengalaman.' },
  { icon: <Lightbulb className="h-6 w-6" />, title: 'Lighting System', detail: 'Lighting profesional yang bikin panggung kamu makin standout dan memorable.' },
  { icon: <Users className="h-6 w-6" />, title: '50 Kursi Penonton', detail: '50 kursi penonton yang bisa di-arrange sesuai kebutuhan acara kamu.' },
  { icon: <MapPin className="h-6 w-6" />, title: 'Area Lantai 3', detail: 'Lokasi strategis di lantai 3 Metropolitan Mall Bekasi, mudah diakses pengunjung.' },
  { icon: <Heart className="h-6 w-6" />, title: 'Meja Juri', detail: 'Meja juri tersedia untuk kompetisi, audisi, atau ujian kenaikan kelas.' },
];

const STEPS: Array<{ num: string; title: string; desc: string }> = [
  { num: '01', title: 'Daftar & Submit', desc: 'Isi form pendaftaran komunitas. Ceritain siapa kamu dan apa yang mau kamu lakuin.' },
  { num: '02', title: 'Review Tim Mall', desc: 'Tim kami review proposal kamu dan diskusi soal jadwal, kebutuhan, dan konsep acara.' },
  { num: '03', title: 'Konfirmasi & Prep', desc: 'Setelah deal, kita siapin venue dan semua tools yang kamu butuhkan.' },
  { num: '04', title: 'Event Day! 🎉', desc: 'Hari H tiba! Kamu fokus bikin acara seru, sisanya biar tim mall yang handle.' },
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
  'https://www.instagram.com/metmalbekasi/',
];

/* ─── Helpers ─────────────────────────────────────────────── */
function RevealSection({
  children,
  className = '',
  as = 'section',
  intensity = 'default',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  intensity?: 'default' | 'strong';
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal();
  const Tag = as;
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

function LogoMark({ className = '' }: { className?: string }) {
  return <img src={mallLogo} alt="Metropolitan Mall Bekasi" className={className} />;
}

function eyebrow(label: string) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: BRAND.accent }}>
      {label}
    </p>
  );
}

const NAV_ITEMS = [
  { href: '#benefits', label: 'Benefits' },
  { href: '#facilities', label: 'Fasilitas' },
  { href: '#gallery', label: 'Gallery' },
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
    // For now, log to console. Will integrate with Google Apps Script later.
    console.log('Community registration:', form);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="rounded-[2rem] border p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]" style={{ background: BRAND.paper, borderColor: BRAND.border }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="mt-5 text-2xl font-bold text-slate-900">Pendaftaran Terkirim! 🎉</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Terima kasih udah daftar! Tim kami akan review dan hubungi kamu dalam 3-5 hari kerja.
          <br />Sambil nunggu, follow <a href="https://instagram.com/metmalbekasi" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: BRAND.accent }}>@metmalbekasi</a> buat update terbaru!
        </p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setForm({ communityName: '', communityType: '', pic: '', phone: '', email: '', instagram: '', description: '', preferredDate: '' }); }}
          className="mt-6 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          style={{ borderColor: BRAND.border }}
        >
          Daftar Komunitas Lain
        </button>
      </div>
    );
  }

  const inputClass = 'w-full rounded-2xl border px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-violet-400/40 dark:bg-slate-800 dark:text-white dark:border-slate-700';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] xl:p-7"
      style={{ background: BRAND.paper, borderColor: BRAND.border }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input value={form.communityName} onChange={e => setField('communityName', e.target.value)} placeholder="Nama komunitas *" className={`${inputClass} sm:col-span-2`} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <select value={form.communityType} onChange={e => setField('communityType', e.target.value)} className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }}>
          <option value="">Tipe komunitas *</option>
          {COMMUNITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={form.pic} onChange={e => setField('pic', e.target.value)} placeholder="Nama PIC *" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="Nomor WhatsApp *" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.email} onChange={e => setField('email', e.target.value)} placeholder="Email (opsional)" type="email" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.instagram} onChange={e => setField('instagram', e.target.value)} placeholder="Instagram komunitas (opsional)" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input type="date" value={form.preferredDate} onChange={e => setField('preferredDate', e.target.value)} className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={4} placeholder="Ceritain tentang komunitas kamu dan rencana event yang mau diadain..." className={`${inputClass} resize-none sm:col-span-2`} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
      </div>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      <div className="mt-6 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: BRAND.border }}>
        <p className="max-w-md text-xs leading-6 text-slate-500">* Wajib diisi. Data kamu aman dan hanya digunakan untuk proses pendaftaran.</p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-60 transition hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Mengirim...' : 'Daftar Sekarang!'}
        </button>
      </div>
    </form>
  );
}

/* ─── Instagram Embed ─────────────────────────────────────── */
function InstagramEmbed({ url }: { url: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border shadow-[0_12px_32px_rgba(15,23,42,0.06)]" style={{ borderColor: BRAND.border }}>
      <iframe
        src={`${url}embed`}
        className="w-full border-0"
        style={{ minHeight: 480 }}
        allowTransparency
        scrolling="no"
        title="Instagram post"
        loading="lazy"
      />
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
interface CommunityLandingProps {
  isDark: boolean;
  onToggleDark: () => void;
  onBack: () => void;
}

export function CommunityLandingPage({ isDark, onToggleDark, onBack }: CommunityLandingProps) {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsHeaderPinned(window.scrollY > 32);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load Instagram embed script
  useEffect(() => {
    const existing = document.querySelector('script[src*="instagram.com/embed"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.instgrm) {
      window.instgrm.Embeds.process();
    }
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
            <button onClick={onBack} className="shrink-0 flex items-center gap-2">
              <LogoMark className="h-auto w-[88px] sm:w-[124px]" />
            </button>
            <nav className={navClassName}>
              {NAV_ITEMS.map(item => (
                <a key={item.href} href={item.href} className="transition hover:opacity-80">{item.label}</a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={onToggleDark} className={utilityButtonClass} aria-label={isDark ? 'Mode terang' : 'Mode gelap'}>
                {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
                style={{ background: `linear-gradient(135deg, ${BRAND.accent} 0%, ${BRAND.accentSoft} 100%)` }}
              >
                📅 Event Dashboard
              </button>
              <button
                type="button"
                onClick={() => setMobileNavOpen(prev => !prev)}
                className={`${utilityButtonClass} lg:hidden`}
                aria-label={mobileNavOpen ? 'Tutup navigasi' : 'Buka navigasi'}
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <div className={mobilePanelClass}>
              <nav className={mobileNavGridClass}>
                {NAV_ITEMS.map(item => (
                  <a key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} className={mobileNavItemClass}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* ─── Hero ───────────────────────────────────────────── */}
        <section
          id="hero"
          className="relative min-h-screen overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #1a0533 0%, #0f172a 40%, #1e1b4b 70%, #312e81 100%)`,
          }}
        >
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
                Metmall Community Space
              </div>

              <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-[5rem]">
                Calling All{' '}
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-violet-400 bg-clip-text text-transparent">
                  Community
                </span>
                ! 🚀
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
                Lagi cari tempat buat kumpul komunitas? Di Metmall Bekasi <strong className="text-white">GRATIS</strong>!
                Venue, sound system, lighting — semua udah disiapin. Kamu tinggal fokus bikin komunitas makin hidup. 🤝
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a
                  href="#register"
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-xl transition hover:scale-[1.03] active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}
                >
                  Daftar Sekarang
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="#benefits"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/14"
                >
                  Lihat Benefits
                </a>
              </div>

              {/* Quick stats */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </span>
                  <span>100% Gratis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
                    <Music className="h-4 w-4 text-violet-400" />
                  </span>
                  <span>Sound 10K Watt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                    <Users className="h-4 w-4 text-amber-400" />
                  </span>
                  <span>Open for All</span>
                </div>
              </div>
            </RevealSection>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-6 w-6 text-white/40" />
          </div>
        </section>

        {/* ─── Benefits ──────────────────────────────────────── */}
        <RevealSection id="benefits" intensity="strong" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              {eyebrow('Why Join Us')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Bukan cuma dikasih space. 💪
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                Kamu juga dipush buat berkembang. Dari sponsorship sampai marketing support — semua buat komunitas kamu makin besar.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b, i) => (
                <div
                  key={b.title}
                  className="group rounded-[2rem] border p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)] hover:-translate-y-1 dark:bg-slate-900 dark:border-slate-800"
                  style={{ background: BRAND.paper, borderColor: BRAND.border, animationDelay: `${i * 100}ms` }}
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
                  Semua udah disiapin. ✨
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
                  className="rounded-[1.75rem] border p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] dark:bg-slate-800 dark:border-slate-700"
                  style={{ background: '#fcfaf6', borderColor: BRAND.border }}
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
        <RevealSection id="gallery" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              {eyebrow('Gallery & Social Proof')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Lihat sendiri keseruannya. 📸
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                Follow <a href="https://instagram.com/metmalbekasi" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: BRAND.accent }}>@metmalbekasi</a> buat update event terbaru!
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {IG_POSTS.map(url => (
                <InstagramEmbed key={url} url={url} />
              ))}
            </div>

            <div className="mt-8 text-center">
              <a
                href="https://instagram.com/metmalbekasi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                style={{ borderColor: BRAND.border }}
              >
                <Globe className="h-4 w-4" />
                Lihat Semua di Instagram
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </RevealSection>

        {/* ─── How It Works ──────────────────────────────────── */}
        <RevealSection id="how" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              {eyebrow('Cara Daftar')}
              <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Gampang banget, cuma 4 langkah. 🎯
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <div key={s.num} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="absolute right-0 top-10 hidden h-0.5 w-full translate-x-1/2 lg:block" style={{ background: `linear-gradient(90deg, ${BRAND.accent}40, transparent)` }} />
                  )}
                  <div
                    className="relative rounded-[2rem] border p-6 shadow-[0_12px_28px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700"
                    style={{ background: '#fcfaf6', borderColor: BRAND.border }}
                  >
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold text-white"
                      style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm}, ${BRAND.accent})` }}
                    >
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
                Yuk, gabung! 🙌
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
                Pertanyaan yang sering muncul. 🤔
              </h2>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map(([question, answer], index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={question}
                    className="overflow-hidden rounded-[1.8rem] border shadow-[0_12px_28px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700"
                    style={{ background: '#faf6ef', borderColor: BRAND.border }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                    >
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">{question}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} style={{ color: BRAND.accent }} />
                    </button>
                    {isOpen && (
                      <div className="border-t px-5 py-5 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:px-6" style={{ borderColor: BRAND.border }}>
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
                Ada pertanyaan? Hubungi kami! 📞
              </h2>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="https://wa.me/6281318534823"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-[2rem] border p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 dark:bg-slate-800 dark:border-slate-700"
                style={{ background: BRAND.paper, borderColor: BRAND.border }}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Phone className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">WhatsApp Andy</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">0813-1853-4823</p>
              </a>

              <a
                href="https://wa.me/6281908142555"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-[2rem] border p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 dark:bg-slate-800 dark:border-slate-700"
                style={{ background: BRAND.paper, borderColor: BRAND.border }}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  <Phone className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">WhatsApp Uca</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">0819-0814-2555</p>
              </a>

              <a
                href="mailto:marketing@malmetropolitan.com"
                className="group rounded-[2rem] border p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 dark:bg-slate-800 dark:border-slate-700"
                style={{ background: BRAND.paper, borderColor: BRAND.border }}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Mail className="h-7 w-7" />
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
      <footer className="border-t border-slate-200 bg-[#fbfaf7] px-4 py-8 text-sm text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-auto w-[102px] opacity-90" />
            <div>
              <p className="font-medium text-slate-700 dark:text-white">Metmall Community Space</p>
              <p className="mt-1">Powered by You — Metropolitan Mall Bekasi</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 text-left sm:items-end sm:text-right">
            <div className="flex items-center gap-3">
              <a href="https://instagram.com/metmalbekasi" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-700 dark:hover:text-white">Instagram</a>
              <span>·</span>
              <a href="https://www.threads.net/@metmalbekasi" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-700 dark:hover:text-white">Threads</a>
              <span>·</span>
              <a href="https://www.youtube.com/@metmalbekasi" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-700 dark:hover:text-white">YouTube</a>
              <span>·</span>
              <a href="https://www.malmetropolitan.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-700 dark:hover:text-white">Website</a>
            </div>
            <p>© {new Date().getFullYear()} Metropolitan Mall Bekasi — Metland Coloring Life</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
