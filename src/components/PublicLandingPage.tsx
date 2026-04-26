import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronDown, Clock, MapPin, Menu, Moon, Send, Shield, SunMedium, Timer, X, Zap } from 'lucide-react';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import heroImage from '../assets/landing/event-hero.jpg';
import atmosphereImage from '../assets/landing/celebration.jpg';
import festivalImage from '../assets/landing/festival-minang.jpg';
import anniversaryImage from '../assets/landing/anniversary.jpg';
import saleImage from '../assets/landing/great-sale.jpg';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { AnnualTheme, EventItem, EventModel, HolidayItem } from '../types';
import { CalendarView } from './CalendarView';
import { QuarterTimeline } from './QuarterTimeline';

export interface PublicEventRequestPayload {
  dateStr: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  categories: string[];
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
}

interface Props {
  isDark: boolean;
  isLoading: boolean;
  events: EventItem[];
  ongoingEvents: EventItem[];
  upcomingEvents: EventItem[];
  themes: AnnualTheme[];
  holidays: HolidayItem[];
  onToggleDark: () => void;
  onAdminClick: () => void;
  onDetail: (event: EventItem) => void;
  onSubmitRequest: (payload: PublicEventRequestPayload) => Promise<boolean>;
}

const BRAND = {
  accent: '#7c6cf2',
  accentSoft: '#9185f7',
  accentWarm: '#f2743e',
};

const FAQS = [
  ['Bagaimana cara mengajukan event?', 'Isi formulir pengajuan, lalu tim mall akan meninjau kebutuhan area, konsep acara, dan tanggal yang diajukan sebelum menghubungi PIC Anda.'],
  ['Apakah semua event langsung tampil di kalender publik?', 'Tidak. Kalender publik hanya menampilkan event yang sudah terkonfirmasi dan siap diumumkan ke pengunjung.'],
  ['Apakah saya bisa meminta area tertentu?', 'Bisa. Tuliskan preferensi area di formulir, lalu tim mall akan menyesuaikan dengan ketersediaan venue dan tema program yang sedang berjalan.'],
];

const CATEGORIES = ['Bazaar', 'Festival', 'Workshop', 'Konser', 'Produk', 'Kuliner', 'Umum'];
const MODELS: Array<{ value: EventModel; label: string }> = [
  { value: '', label: 'Pilih model event' },
  { value: 'free', label: 'Free' },
  { value: 'bayar', label: 'Bayar' },
  { value: 'support', label: 'Support' },
];

const NAV_ITEMS = [
  { href: '#featured', label: 'Agenda' },
  { href: '#calendar', label: 'Kalender' },
  { href: '#themes', label: 'Tema' },
  { href: '#submit', label: 'Pengajuan' },
  { href: '#faq', label: 'FAQ' },
];

const ATMOSPHERE_IMAGES = [
  { src: atmosphereImage, label: 'Atmosfer event', mood: 'Aktivasi komunitas yang membuat area mall terasa hidup sejak pengunjung pertama datang' },
  { src: festivalImage, label: 'Festival tematik', mood: 'Program keluarga dan tenant activation yang cepat menarik perhatian pengunjung' },
  { src: anniversaryImage, label: 'Program musiman', mood: 'Momen perayaan yang memberi alasan baru untuk kembali berkunjung di akhir pekan' },
  { src: saleImage, label: 'Kolaborasi brand', mood: 'Aktivasi tenant yang menghubungkan program panggung dengan traffic ke area belanja' },
];

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
    <Tag ref={ref as never} className={`reveal-on-scroll ${intensity === 'strong' ? 'reveal-strong' : ''} ${isVisible ? 'reveal-visible' : ''} ${className}`} {...rest}>
      <div className="reveal-stage">{children}</div>
    </Tag>
  );
}

function LogoMark({ className = '' }: { className?: string }) {
  return <img src={mallLogo} alt="Metropolitan Mall Bekasi" className={className} />;
}

function eyebrow(label: string, light = false) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${light ? 'text-white/80' : 'text-violet-500 dark:text-violet-400'}`}
    >
      {label}
    </p>
  );
}

function HeroCountdown({ dateStr }: { dateStr: string }) {
  const [diff, setDiff] = useState('');

  useEffect(() => {
    const calc = () => {
      const target = new Date(dateStr).getTime();
      const now = Date.now();
      const ms = target - now;
      if (ms <= 0) { setDiff('Hari ini'); return; }
      const days = Math.floor(ms / 86400000);
      const hrs = Math.floor((ms % 86400000) / 3600000);
      if (days > 0) setDiff(`${days}h ${hrs}j lagi`);
      else {
        const mins = Math.floor((ms % 3600000) / 60000);
        setDiff(`${hrs}j ${mins}m lagi`);
      }
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [dateStr]);

  if (!diff) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 backdrop-blur-sm">
      <Timer className="h-3 w-3" /> {diff}
    </span>
  );
}

function HeroEventCard({ event, onClick }: { event: EventItem; onClick: (ev: EventItem) => void }) {
  const isLive = event.status === 'ongoing';
  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className="group flex w-full items-start gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.07] p-4 text-left backdrop-blur-md transition hover:bg-white/[0.13] hover:border-white/[0.2]"
    >
      <div className="shrink-0 pt-0.5">
        {isLive ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-emerald-300" />
          </span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <CalendarDays className="h-4 w-4 text-white/70" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          {event.status === 'upcoming' && event.dateStr && <HeroCountdown dateStr={event.dateStr} />}
        </div>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug text-white line-clamp-1 group-hover:text-white/95">{event.acara}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/80">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {event.tanggal}{event.jam ? ` | ${event.jam}` : ''}
          </span>
          {event.lokasi && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{event.lokasi}</span>
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/30 transition group-hover:text-white/60 group-hover:translate-x-0.5" />
    </button>
  );
}

function SubmissionForm({ onSubmitRequest }: { onSubmitRequest: (payload: PublicEventRequestPayload) => Promise<boolean> }) {
  const [form, setForm] = useState<PublicEventRequestPayload>({
    dateStr: '',
    jam: '',
    acara: '',
    lokasi: '',
    eo: '',
    pic: '',
    phone: '',
    keterangan: '',
    categories: ['Umum'],
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: keyof PublicEventRequestPayload, value: string | string[]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.acara.trim() || !form.eo.trim() || !form.pic.trim() || !form.phone.trim() || !form.dateStr || !form.lokasi.trim()) {
      setError('Lengkapi nama event, EO, PIC, telepon, tanggal, dan area yang diinginkan.');
      return;
    }
    if ((form.eventModel === 'bayar' || form.eventModel === 'support') && (!form.eventNominal.trim() || !form.eventModelNotes.trim())) {
      setError('Lengkapi nominal dan keterangan model event.');
      return;
    }
    setSubmitting(true);
    const success = await onSubmitRequest(form);
    if (success) {
      setForm({
        dateStr: '',
        jam: '',
        acara: '',
        lokasi: '',
        eo: '',
        pic: '',
        phone: '',
        keterangan: '',
        categories: ['Umum'],
        eventModel: '',
        eventNominal: '',
        eventModelNotes: '',
      });
    }
    setSubmitting(false);
  };

  const inputClass = 'w-full rounded-2xl border border-slate-200/50 bg-[#fffdf9] px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-violet-400 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-500';
  const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:bg-slate-900 dark:border-slate-700 xl:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="submit-acara" className={labelClass}>Nama Event <span className="text-rose-500">*</span></label>
          <input id="submit-acara" value={form.acara} onChange={e => setField('acara', e.target.value)} placeholder="Nama event" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-eo" className={labelClass}>EO / Brand <span className="text-rose-500">*</span></label>
          <input id="submit-eo" value={form.eo} onChange={e => setField('eo', e.target.value)} placeholder="EO / Brand" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-pic" className={labelClass}>PIC <span className="text-rose-500">*</span></label>
          <input id="submit-pic" value={form.pic} onChange={e => setField('pic', e.target.value)} placeholder="PIC" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-phone" className={labelClass}>Nomor Telepon <span className="text-rose-500">*</span></label>
          <input id="submit-phone" type="tel" autoComplete="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="Nomor telepon" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-date" className={labelClass}>Tanggal <span className="text-rose-500">*</span></label>
          <input id="submit-date" type="date" value={form.dateStr} onChange={e => setField('dateStr', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-jam" className={labelClass}>Jam Pelaksanaan</label>
          <input id="submit-jam" value={form.jam} onChange={e => setField('jam', e.target.value)} placeholder="Jam pelaksanaan" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-lokasi" className={labelClass}>Preferensi Area <span className="text-rose-500">*</span></label>
          <input id="submit-lokasi" value={form.lokasi} onChange={e => setField('lokasi', e.target.value)} placeholder="Preferensi area" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-category" className={labelClass}>Kategori</label>
          <select id="submit-category" value={form.categories[0] || 'Umum'} onChange={e => setField('categories', [e.target.value])} className={inputClass}>
            {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="submit-model" className={labelClass}>Model Event</label>
          <select id="submit-model" value={form.eventModel} onChange={e => setField('eventModel', e.target.value)} className={inputClass}>
            {MODELS.map(model => <option key={model.label} value={model.value}>{model.label}</option>)}
          </select>
        </div>
        {(form.eventModel === 'bayar' || form.eventModel === 'support') && (
          <>
            <div>
              <label htmlFor="submit-nominal" className={labelClass}>Nominal <span className="text-rose-500">*</span></label>
              <input id="submit-nominal" value={form.eventNominal} onChange={e => setField('eventNominal', e.target.value)} placeholder="Nominal" className={inputClass} />
            </div>
            <div>
              <label htmlFor="submit-model-notes" className={labelClass}>Keterangan Model <span className="text-rose-500">*</span></label>
              <input id="submit-model-notes" value={form.eventModelNotes} onChange={e => setField('eventModelNotes', e.target.value)} placeholder="Keterangan model" className={inputClass} />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="submit-keterangan" className={labelClass}>Keterangan</label>
          <textarea id="submit-keterangan" value={form.keterangan} onChange={e => setField('keterangan', e.target.value)} rows={5} placeholder="Ringkas konsep event, target pengunjung, dan kebutuhan utama." className={`${inputClass} resize-none`} />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200/50 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400">Setiap pengajuan akan ditinjau tim mall berdasarkan jadwal, area, dan kebutuhan pelaksanaan acara sebelum ditindaklanjuti ke PIC.</p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Mengirim...' : 'Ajukan Event'}
        </button>
      </div>
    </form>
  );
}

export function PublicLandingPage({
  isDark,
  isLoading,
  events,
  ongoingEvents,
  upcomingEvents,
  themes,
  holidays,
  onToggleDark,
  onAdminClick,
  onDetail,
  onSubmitRequest,
}: Props) {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsHeaderPinned(window.scrollY > 32);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeTheme = useMemo(() => themes.find(theme => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    return today >= theme.dateStart && today <= theme.dateEnd;
  }) ?? themes[0] ?? null, [themes]);

  // Deduplicated ongoing + upcoming for hero cards (max 3, mobile max 2 handled via CSS)
  const heroEvents = useMemo(
    () => [...ongoingEvents, ...upcomingEvents]
      .filter((item, index, array) => array.findIndex(other => other.id === item.id) === index)
      .slice(0, 3),
    [ongoingEvents, upcomingEvents]
  );

  // All agenda for the "Semua Agenda Mendatang" section
  const allAgenda = useMemo(
    () => [...ongoingEvents, ...upcomingEvents]
      .filter((item, index, array) => array.findIndex(other => other.id === item.id) === index),
    [ongoingEvents, upcomingEvents]
  );
  const AGENDA_INITIAL_LIMIT = 6;
  const [showAllAgenda, setShowAllAgenda] = useState(false);
  const visibleAgenda = showAllAgenda ? allAgenda : allAgenda.slice(0, AGENDA_INITIAL_LIMIT);

  const partners = useMemo(() => Array.from(new Set(events.map(event => event.eo).filter(Boolean))).slice(0, 8), [events]);
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
    ? 'mt-3 rounded-2xl border border-black/6 bg-white/98 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)] dark:bg-slate-900/98 dark:border-slate-700 lg:hidden mobile-nav-enter'
    : 'mt-3 rounded-2xl border border-white/10 bg-slate-950/46 p-3 shadow-[0_18px_36px_rgba(15,23,42,0.22)] backdrop-blur-md lg:hidden mobile-nav-enter';
  const mobileNavGridClass = isHeaderPinned
    ? 'grid grid-cols-2 gap-2 text-sm font-medium text-slate-700 dark:text-slate-200'
    : 'grid grid-cols-2 gap-2 text-sm font-medium text-white';
  const mobileNavItemClass = isHeaderPinned
    ? 'rounded-xl bg-[#f6f1ea] px-4 py-3 text-center transition hover:bg-[#efe8de] dark:bg-slate-800 dark:hover:bg-slate-700'
    : 'rounded-xl bg-white/8 px-4 py-3 text-center transition hover:bg-white/14';

  return (
    <div className="bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <header className={headerClassName}>
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            <a href="#hero" className="shrink-0">
              <LogoMark className="h-auto w-[88px] sm:w-[124px]" />
            </a>
            <nav className={navClassName} aria-label="Navigasi utama">
              {NAV_ITEMS.map(item => (
                <a key={item.href} href={item.href} className="rounded-lg px-1.5 py-1 transition-colors hover:text-violet-500 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={onToggleDark} className={utilityButtonClass} aria-label={isDark ? 'Mode terang' : 'Mode gelap'}>
                {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button onClick={onAdminClick} className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]" style={{ background: `linear-gradient(135deg, ${BRAND.accent} 0%, ${BRAND.accentSoft} 100%)` }}>
                <Shield className="h-4 w-4" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setMobileNavOpen(prev => !prev)}
                className={`${utilityButtonClass} lg:hidden`}
                aria-label={mobileNavOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                aria-expanded={mobileNavOpen}
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <div className={mobilePanelClass}>
              <nav className={mobileNavGridClass} aria-label="Navigasi mobile">
                {NAV_ITEMS.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`${mobileNavItemClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main>
        <section
          id="hero"
          className="relative min-h-screen overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.68) 0%, rgba(15,23,42,0.48) 30%, rgba(15,23,42,0.22) 60%, rgba(15,23,42,0.32) 100%), linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.18) 20%, rgba(15,23,42,0.22) 56%, rgba(15,23,42,0.42) 100%), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(242,116,62,0.06),transparent_28%),radial-gradient(circle_at_top_right,rgba(124,108,242,0.04),transparent_24%)]" />
          <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-slate-950/34 via-slate-950/10 to-transparent md:w-[40%]" />
          <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-22">
            {/* Left: Headline + CTA */}
            <RevealSection as="div" className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/14 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/76">
                <CalendarDays className="h-3.5 w-3.5 text-orange-300" />
                Agenda Publik
              </div>
              <h1 className="mt-4 max-w-[8.5ch] text-[1.82rem] font-semibold leading-[0.95] text-white sm:max-w-[8ch] sm:text-6xl lg:text-[4.05rem]">
                Kalender acara publik Metropolitan Mall Bekasi.
              </h1>
              <p className="mt-3 max-w-[18rem] text-[14px] leading-6 text-white/76 sm:max-w-[30rem] sm:text-lg sm:leading-7">
                Lihat acara yang sedang berlangsung, agenda akhir pekan, dan pengajuan aktivasi dari satu halaman.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row">
                <a href="#calendar" className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}>
                  Lihat Kalender Event
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#submit" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-6 py-3 text-sm font-semibold text-white">
                  Ajukan Aktivasi
                  <Send className="h-4 w-4" />
                </a>
              </div>
            </RevealSection>

            {/* Right: Upcoming Event Cards */}
            <RevealSection as="div" className="flex flex-col gap-3 lg:self-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75">
                {heroEvents.length > 0 ? `${heroEvents.length} acara terdekat` : 'Agenda terdekat'}
              </p>
              {heroEvents.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {heroEvents.map(ev => (
                    <HeroEventCard key={ev.id} event={ev} onClick={onDetail} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.12] bg-white/[0.07] p-5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                      <CalendarDays className="h-4 w-4 text-white/50" />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Segera hadir</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold leading-snug text-white/85">Jadwal acara berikutnya segera diumumkan.</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">Pantau kalender publik untuk update terbaru mengenai program dan aktivasi di area mall.</p>
                </div>
              )}
            </RevealSection>
          </div>
        </section>

        <RevealSection id="featured" intensity="strong" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                {eyebrow('Agenda Mendatang')}
                <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Semua acara yang akan datang.</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400">
                Daftar lengkap acara yang sedang berlangsung dan akan segera dimulai di area Metropolitan Mall Bekasi.
                {allAgenda.length > 0 && <span className="ml-1 font-medium text-violet-500 dark:text-violet-400">{allAgenda.length} acara tersedia</span>}
              </p>
            </div>

            {allAgenda.length > 0 ? (
              <>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleAgenda.map(ev => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onDetail(ev)}
                      className="group rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)] dark:bg-slate-800 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        {ev.status === 'ongoing' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                            Segera hadir
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{ev.month}</span>
                      </div>
                        <p className="mt-3 text-xl font-semibold leading-tight text-slate-900 line-clamp-2 group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-200">{ev.acara}</p>
                      <div className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{ev.tanggal}{ev.jam ? ` | ${ev.jam}` : ''}</span>
                        </div>
                        {ev.lokasi && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-1">{ev.lokasi}</span>
                          </div>
                        )}
                      </div>
                      {ev.keterangan && (
                        <p className="mt-3 line-clamp-2 border-t border-slate-200/50 pt-3 text-sm leading-6 text-slate-400 dark:border-slate-700 dark:text-slate-500">{ev.keterangan}</p>
                      )}
                      {ev.categories && ev.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {ev.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="rounded-full border border-slate-200/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400">{cat}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {allAgenda.length > AGENDA_INITIAL_LIMIT && (
                  <div className="mt-8 text-center">
                    {showAllAgenda ? (
                      <button
                        type="button"
                        onClick={() => setShowAllAgenda(false)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Tampilkan lebih sedikit
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAllAgenda(true)}
                        className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}
                      >
                        Lihat semua {allAgenda.length} acara
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-10 rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.05)] dark:bg-slate-800 dark:border-slate-700">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-4 text-xl font-semibold text-slate-700 dark:text-white">Belum ada agenda mendatang</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Jadwal acara berikutnya akan segera diumumkan. Pantau kalender publik untuk update terbaru.</p>
                <a href="#calendar" className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}>
                  Lihat Kalender
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </RevealSection>

        <RevealSection id="calendar" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="reveal-cluster mx-auto max-w-7xl space-y-10">
            <div className="rounded-[2.25rem] border border-slate-200/50 bg-[#fcfaf6] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:bg-slate-800 dark:border-slate-700">
              {isLoading ? <div className="h-[32rem] animate-pulse rounded-[1.8rem] bg-slate-200/70 dark:bg-slate-800/70" /> : <CalendarView events={events} holidays={holidays} onDetail={onDetail} />}
            </div>
            <div className="max-w-3xl">
              {eyebrow('Kalender')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Pilih tanggal, lalu temukan acara.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-400">Kalender ini merangkum jadwal panggung, bazaar, program keluarga, dan agenda musiman agar rencana kunjungan lebih mudah disusun dari satu tampilan.</p>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="themes" className="px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:items-start">
            <div className="max-w-md">
              {eyebrow('Tema Tahunan')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Tema tahunan yang sedang berjalan.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-400">Lewat tema tahunan, pengunjung bisa mengenali periode acara yang sedang berjalan, mulai dari musim liburan, momen keluarga, sampai program promo musiman.</p>
              {activeTheme && (
                <div className="mt-8 rounded-[1.75rem] border border-slate-200/50 bg-[#faf6ef] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] dark:bg-slate-800 dark:border-slate-700">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Tema aktif</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{activeTheme.name}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{activeTheme.dateStart} sampai {activeTheme.dateEnd}</p>
                </div>
              )}
            </div>
            <QuarterTimeline themes={themes} />
          </div>
        </RevealSection>

        <RevealSection as="div" className="border-y border-black/5 bg-[#f1ebe2] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              {eyebrow('Suasana Event')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Suasana acara di area mall.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
              {ATMOSPHERE_IMAGES.map((image, index) => (
                <div
                  key={image.label}
                  className="relative overflow-hidden rounded-[2rem] border border-slate-200/50 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-slate-700"
                  style={{
                    minHeight: index === 0 ? 420 : 280,
                    backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.78) 100%), url(${image.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  role="img"
                  aria-label={`${image.label}: ${image.mood}`}
                >
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/80">{image.label}</p>
                    <p className="mt-3 max-w-sm text-2xl font-semibold leading-tight">{image.mood}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection as="div" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                {eyebrow('Mitra')}
                <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Partner di balik setiap acara.</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400">Daftar ini memberi gambaran siapa saja yang pernah membawa program ke area Metropolitan Mall Bekasi dan tampil dalam kalender publik kami.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="rounded-full border border-slate-200/50 bg-[#faf6ef] px-4 py-2.5 font-medium shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700">
                {partners.length > 0 ? `${partners.length} kolaborator acara aktif` : 'Kolaborasi acara lintas EO dan tenant'}
              </div>
              <div className="rounded-full border border-slate-200/50 bg-[#faf6ef] px-4 py-2.5 font-medium shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700">
                EO, tenant, komunitas, dan brand activation
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(partners.length > 0 ? partners : ['Metropolitan Mall Bekasi', 'Community Partner', 'Lifestyle Tenant', 'Creative Event']).map(name => (
                <div key={name} className="rounded-[1.5rem] border border-slate-200/50 bg-[#faf6ef] p-5 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Partner acara</p>
                  <p className="mt-3 text-base font-semibold leading-7 text-slate-900 dark:text-white">{name}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection id="submit" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="reveal-cluster mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div className="max-w-md">
              {eyebrow('Pengajuan Event')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Ajukan event dari sini.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-400">Isi tanggal, area, PIC, dan kebutuhan acara agar tim Metropolitan Mall Bekasi bisa mengecek kecocokan jadwal serta kesiapan area sebelum program ditindaklanjuti.</p>
            </div>
            <SubmissionForm onSubmitRequest={onSubmitRequest} />
          </div>
        </RevealSection>

        <RevealSection id="faq" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              {eyebrow('FAQ')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Pertanyaan yang sering diajukan.</h2>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map(([question, answer], index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={question} className="overflow-hidden rounded-[1.8rem] border border-slate-200/50 bg-[#faf6ef] shadow-[0_12px_28px_rgba(15,23,42,0.04)] dark:bg-slate-800 dark:border-slate-700">
                    <button
                      type="button"
                      id={`faq-trigger-${index}`}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? `faq-answer-${index}` : undefined}
                    >
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">{question}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && <div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-trigger-${index}`} className="border-t border-slate-200/50 px-5 py-5 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:text-slate-400 sm:px-6">{answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </RevealSection>
      </main>

      <footer className="border-t border-slate-200/50 bg-[#fbfaf7] px-4 py-8 text-sm text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-auto w-[102px] opacity-90" />
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Kalender publik Metropolitan Mall Bekasi</p>
              <p className="mt-1">Pantau agenda publik, cari acara akhir pekan, dan ajukan aktivasi baru dari halaman resmi Metropolitan Mall Bekasi.</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p>{ongoingEvents.length} acara berlangsung | {upcomingEvents.length} acara mendatang</p>
            <p className="mt-1">© {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
