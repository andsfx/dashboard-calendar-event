import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronDown, Menu, Moon, Send, Shield, SunMedium, X } from 'lucide-react';
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
  ink: '#111827',
  inkSoft: '#1f2937',
  paper: '#faf6ef',
  paperSoft: '#f5efe6',
  border: 'rgba(148, 163, 184, 0.18)',
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
      className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${light ? 'text-white/72' : 'text-slate-500'}`}
      style={{ color: light ? undefined : BRAND.accent }}
    >
      {label}
    </p>
  );
}

function meta(event: EventItem) {
  return `${event.day}, ${event.tanggal}${event.jam ? ` | ${event.jam}` : ''}`;
}

function shortMeta(event: EventItem) {
  return `${event.tanggal}${event.jam ? ` | ${event.jam}` : ''}`;
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

  const inputClass = 'w-full rounded-2xl border px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] xl:p-7"
      style={{ background: BRAND.paper, borderColor: BRAND.border }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input value={form.acara} onChange={e => setField('acara', e.target.value)} placeholder="Nama event" className={`${inputClass} sm:col-span-2`} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.eo} onChange={e => setField('eo', e.target.value)} placeholder="EO / Brand" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.pic} onChange={e => setField('pic', e.target.value)} placeholder="PIC" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="Nomor telepon" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input type="date" value={form.dateStr} onChange={e => setField('dateStr', e.target.value)} className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.jam} onChange={e => setField('jam', e.target.value)} placeholder="Jam pelaksanaan" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <input value={form.lokasi} onChange={e => setField('lokasi', e.target.value)} placeholder="Preferensi area" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
        <select value={form.categories[0] || 'Umum'} onChange={e => setField('categories', [e.target.value])} className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }}>
          {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
        </select>
        <select value={form.eventModel} onChange={e => setField('eventModel', e.target.value)} className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }}>
          {MODELS.map(model => <option key={model.label} value={model.value}>{model.label}</option>)}
        </select>
        {(form.eventModel === 'bayar' || form.eventModel === 'support') && (
          <>
            <input value={form.eventNominal} onChange={e => setField('eventNominal', e.target.value)} placeholder="Nominal" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
            <input value={form.eventModelNotes} onChange={e => setField('eventModelNotes', e.target.value)} placeholder="Keterangan model" className={inputClass} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
          </>
        )}
        <textarea value={form.keterangan} onChange={e => setField('keterangan', e.target.value)} rows={5} placeholder="Ringkas konsep event, target pengunjung, dan kebutuhan utama." className={`${inputClass} resize-none sm:col-span-2`} style={{ background: '#fffdf9', borderColor: BRAND.border }} />
      </div>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      <div className="mt-6 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: BRAND.border }}>
        <p className="max-w-xl text-sm leading-7 text-slate-600">Setiap pengajuan akan ditinjau tim mall berdasarkan jadwal, area, dan kebutuhan pelaksanaan acara sebelum ditindaklanjuti ke PIC.</p>
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
    const today = new Date().toISOString().split('T')[0];
    return today >= theme.dateStart && today <= theme.dateEnd;
  }) ?? themes[0] ?? null, [themes]);

  const spotlight = ongoingEvents[0] ?? upcomingEvents[0] ?? events[0] ?? null;
  const featuredList = useMemo(
    () => [...ongoingEvents, ...upcomingEvents].filter((item, index, array) => array.findIndex(other => other.id === item.id) === index).slice(0, 3),
    [ongoingEvents, upcomingEvents]
  );
  const featuredRail = featuredList.length > 0
    ? featuredList
    : [
        {
          id: 'placeholder-1',
          month: 'APR',
          status: 'upcoming' as const,
          acara: 'Jadwal acara berikutnya segera diumumkan',
          tanggal: 'Pantau kalender publik',
          jam: '',
          lokasi: 'Area event utama Metropolitan Mall Bekasi',
        },
        {
          id: 'placeholder-2',
          month: 'APR',
          status: 'upcoming' as const,
          acara: 'Program keluarga akhir pekan sedang disiapkan',
          tanggal: 'Informasi tampil menyusul',
          jam: '',
          lokasi: 'Atrium dan area pendukung',
        },
        {
          id: 'placeholder-3',
          month: 'APR',
          status: 'upcoming' as const,
          acara: 'Kolaborasi tenant dan aktivasi brand akan segera hadir',
          tanggal: 'Lihat pembaruan berikutnya',
          jam: '',
          lokasi: 'Metropolitan Mall Bekasi',
        },
      ];
  const partners = useMemo(() => Array.from(new Set(events.map(event => event.eo).filter(Boolean))).slice(0, 8), [events]);
  const headerClassName = isHeaderPinned
    ? 'fixed inset-x-0 top-0 z-50 border-b border-black/6 bg-[#fbfaf7]/96 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-md'
    : 'absolute inset-x-0 top-0 z-50 text-white';
  const navClassName = isHeaderPinned
    ? 'hidden items-center gap-7 text-[13px] font-medium text-slate-700 lg:flex'
    : 'hidden items-center gap-7 text-[13px] font-medium text-white/90 lg:flex';
  const utilityButtonClass = isHeaderPinned
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.05)]'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)] backdrop-blur-sm';
  const mobilePanelClass = isHeaderPinned
    ? 'mt-3 rounded-[1.6rem] border border-black/6 bg-white/98 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)] lg:hidden'
    : 'mt-3 rounded-[1.6rem] border border-white/10 bg-slate-950/46 p-3 shadow-[0_18px_36px_rgba(15,23,42,0.22)] backdrop-blur-md lg:hidden';
  const mobileNavGridClass = isHeaderPinned
    ? 'grid grid-cols-2 gap-2 text-sm font-medium text-slate-700'
    : 'grid grid-cols-2 gap-2 text-sm font-medium text-white';
  const mobileNavItemClass = isHeaderPinned
    ? 'rounded-xl bg-[#f6f1ea] px-4 py-3 text-center transition hover:bg-[#efe8de]'
    : 'rounded-xl bg-white/8 px-4 py-3 text-center transition hover:bg-white/14';

  return (
    <div className="bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <header className={headerClassName}>
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            <a href="#hero" className="shrink-0">
              <LogoMark className="h-auto w-[88px] sm:w-[124px]" />
            </a>
            <nav className={navClassName}>
              {NAV_ITEMS.map(item => (
                <a key={item.href} href={item.href}>
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
              <nav className={mobileNavGridClass}>
                {NAV_ITEMS.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={mobileNavItemClass}
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
            backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.64) 0%, rgba(15,23,42,0.4) 28%, rgba(15,23,42,0.1) 58%, rgba(15,23,42,0.16) 100%), linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.16) 18%, rgba(15,23,42,0.18) 54%, rgba(15,23,42,0.34) 100%), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(242,116,62,0.06),transparent_28%),radial-gradient(circle_at_top_right,rgba(124,108,242,0.04),transparent_24%)]" />
          <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-slate-950/34 via-slate-950/10 to-transparent md:w-[40%]" />
          <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-7xl items-center px-4 py-14 sm:px-6 sm:py-18 lg:py-22">
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
          </div>
        </section>

        <RevealSection id="featured" intensity="strong" className="px-4 py-20 sm:px-6">
          <div className="reveal-cluster mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.62fr_1.38fr] lg:items-start">
            <div className="max-w-md">
              {eyebrow('Agenda Pekan Ini')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Sorotan acara minggu ini.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">Sorotan utama kami tampilkan lebih besar, lalu agenda berikutnya disusun sebagai rail singkat agar pengunjung bisa cepat memilih acara yang ingin didatangi.</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
              <button
                type="button"
                onClick={() => spotlight && onDetail(spotlight)}
                className="group relative overflow-hidden rounded-[2.4rem] text-left text-white shadow-[0_20px_56px_rgba(15,23,42,0.08)]"
                style={{
                  minHeight: 540,
                  backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.08) 0%, rgba(17,24,39,0.78) 100%), url(${festivalImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/12 to-transparent transition duration-500 group-hover:from-slate-950/70" />
                <div className="relative flex h-full flex-col justify-end p-8 sm:p-10">
                  <div className="max-w-[24rem] rounded-[1.75rem] bg-slate-950/54 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.24)] backdrop-blur-[4px] sm:p-6">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/68">Sorotan utama akhir pekan</p>
                    <p className="mt-4 max-w-md text-3xl font-semibold leading-tight sm:text-[2.3rem]">
                    {spotlight?.acara || 'Acara akhir pekan berikutnya segera hadir di area utama mall'}
                    </p>
                    <p className="mt-4 max-w-lg text-sm leading-7 text-white/74">
                    {spotlight?.keterangan || 'Pantau program yang paling ramai diperbincangkan pengunjung, lengkap dengan waktu tampil dan lokasi pelaksanaannya.'}
                    </p>
                    <div className="mt-6 flex flex-col gap-2 text-sm text-white/76 sm:flex-row sm:flex-wrap sm:gap-4">
                      <span>{spotlight ? meta(spotlight) : 'Jadwal acara segera diumumkan'}</span>
                      <span>{spotlight?.lokasi || 'Atrium dan area event utama'}</span>
                    </div>
                  </div>
                </div>
              </button>
              <div className="rounded-[2rem] border border-black/8 bg-white/92 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="space-y-1">
                  {featuredRail.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => 'day' in item && onDetail(item)}
                      className="flex w-full items-start gap-4 rounded-[1.5rem] px-4 py-5 text-left transition hover:bg-slate-50"
                    >
                      <div className="w-14 shrink-0 pt-1 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: BRAND.accent }}>
                          {item.month}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{String(index + 1).padStart(2, '0')}</p>
                      </div>
                      <div className="min-w-0 flex-1 border-l border-black/6 pl-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                          {item.status === 'ongoing' ? 'Sedang berlangsung' : 'Segera hadir'}
                        </p>
                        <p className="mt-2 text-xl font-semibold leading-tight text-slate-900">{item.acara}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{'day' in item ? shortMeta(item) : item.tanggal}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{item.lokasi || 'Area event Metropolitan Mall Bekasi'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="calendar" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 sm:px-6">
          <div className="reveal-cluster mx-auto max-w-7xl space-y-10">
            <div className="rounded-[2.25rem] border p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]" style={{ background: '#fcfaf6', borderColor: BRAND.border }}>
              {isLoading ? <div className="h-[32rem] animate-pulse rounded-[1.8rem] bg-slate-200/70 dark:bg-slate-800/70" /> : <CalendarView events={events} holidays={holidays} onDetail={onDetail} />}
            </div>
            <div className="max-w-3xl">
              {eyebrow('Kalender')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Pilih tanggal, lalu temukan acara.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">Kalender ini merangkum jadwal panggung, bazaar, program keluarga, dan agenda musiman agar rencana kunjungan lebih mudah disusun dari satu tampilan.</p>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="themes" className="px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:items-start">
            <div className="max-w-md">
              {eyebrow('Tema Tahunan')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Tema tahunan yang sedang berjalan.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">Lewat tema tahunan, pengunjung bisa mengenali periode acara yang sedang berjalan, mulai dari musim liburan, momen keluarga, sampai program promo musiman.</p>
              {activeTheme && (
                <div className="mt-8 rounded-[1.75rem] border p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]" style={{ background: '#faf6ef', borderColor: BRAND.border }}>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Tema aktif</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{activeTheme.name}</p>
                  <p className="mt-2 text-sm text-slate-500">{activeTheme.dateStart} sampai {activeTheme.dateEnd}</p>
                </div>
              )}
            </div>
            <QuarterTimeline themes={themes} />
          </div>
        </RevealSection>

        <RevealSection as="div" className="border-y border-black/5 bg-[#f1ebe2] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              {eyebrow('Suasana Event')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Suasana acara di area mall.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
              {ATMOSPHERE_IMAGES.map((image, index) => (
                <div
                  key={image.label}
                  className="relative overflow-hidden rounded-[2rem] border shadow-[0_16px_42px_rgba(15,23,42,0.06)]"
                  style={{
                    minHeight: index === 0 ? 420 : 280,
                    borderColor: BRAND.border,
                    backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.72) 100%), url(${image.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/68">{image.label}</p>
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
                <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Partner di balik setiap acara.</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600">Daftar ini memberi gambaran siapa saja yang pernah membawa program ke area Metropolitan Mall Bekasi dan tampil dalam kalender publik kami.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
              <div className="rounded-full border px-4 py-2.5 font-medium shadow-[0_10px_24px_rgba(15,23,42,0.04)]" style={{ background: '#faf6ef', borderColor: BRAND.border }}>
                {partners.length > 0 ? `${partners.length} kolaborator acara aktif` : 'Kolaborasi acara lintas EO dan tenant'}
              </div>
              <div className="rounded-full border px-4 py-2.5 font-medium shadow-[0_10px_24px_rgba(15,23,42,0.04)]" style={{ background: '#faf6ef', borderColor: BRAND.border }}>
                EO, tenant, komunitas, dan brand activation
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(partners.length > 0 ? partners : ['Metropolitan Mall Bekasi', 'Community Partner', 'Lifestyle Tenant', 'Creative Event']).map(name => (
                <div key={name} className="rounded-[1.5rem] border p-5 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.04)]" style={{ background: '#faf6ef', borderColor: BRAND.border }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Partner acara</p>
                  <p className="mt-3 text-base font-semibold leading-7 text-slate-900">{name}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection id="submit" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 sm:px-6">
          <div className="reveal-cluster mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div className="max-w-md">
              {eyebrow('Pengajuan Event')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Ajukan event dari sini.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">Isi tanggal, area, PIC, dan kebutuhan acara agar tim Metropolitan Mall Bekasi bisa mengecek kecocokan jadwal serta kesiapan area sebelum program ditindaklanjuti.</p>
            </div>
            <SubmissionForm onSubmitRequest={onSubmitRequest} />
          </div>
        </RevealSection>

        <RevealSection id="faq" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              {eyebrow('FAQ')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Pertanyaan yang sering diajukan.</h2>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map(([question, answer], index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={question} className="overflow-hidden rounded-[1.8rem] border shadow-[0_12px_28px_rgba(15,23,42,0.04)]" style={{ background: '#faf6ef', borderColor: BRAND.border }}>
                    <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6">
                      <span className="text-lg font-semibold text-slate-900">{question}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} style={{ color: BRAND.accent }} />
                    </button>
                    {isOpen && <div className="border-t px-5 py-5 text-sm leading-7 text-slate-600 sm:px-6" style={{ borderColor: BRAND.border }}>{answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </RevealSection>
      </main>

      <footer className="border-t border-slate-200 bg-[#fbfaf7] px-4 py-8 text-sm text-slate-500 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-auto w-[102px] opacity-90" />
            <div>
              <p className="font-medium text-slate-700">Kalender publik Metropolitan Mall Bekasi</p>
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
