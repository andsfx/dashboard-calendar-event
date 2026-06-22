import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Menu, Moon, Shield, SunMedium, X } from 'lucide-react';
import atmosphereImage from '../assets/landing/celebration.jpg';
import festivalImage from '../assets/landing/festival-minang.jpg';
import anniversaryImage from '../assets/landing/anniversary.jpg';
import saleImage from '../assets/landing/great-sale.jpg';
import { AnnualTheme, EventItem, EventModel, HolidayItem } from '../types';
import { QuarterTimeline } from './QuarterTimeline';
import { RevealSection, LogoMark, eyebrow } from './PublicShared';
import { PublicHero } from './PublicHero';
import { PublicEventGrid } from './PublicEventGrid';
import { PublicSubmissionForm } from './PublicSubmissionForm';
import { PublicFooter } from './PublicFooter';

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
  accent: 'var(--color-brand-primary)',
  accentSoft: 'var(--color-brand-primary-400)',
  accentWarm: 'var(--color-brand-secondary)',
};

const FAQS = [
  ['Bagaimana cara mengajukan event?', 'Isi formulir pengajuan, lalu tim mall akan meninjau kebutuhan area, konsep acara, dan tanggal yang diajukan sebelum menghubungi PIC Anda.'],
  ['Apakah semua event langsung tampil di kalender publik?', 'Tidak. Kalender publik hanya menampilkan event yang sudah terkonfirmasi dan siap diumumkan ke pengunjung.'],
  ['Apakah saya bisa meminta area tertentu?', 'Bisa. Tuliskan preferensi area di formulir, lalu tim mall akan menyesuaikan dengan ketersediaan venue dan tema program yang sedang berjalan.'],
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
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return today >= theme.dateStart && today <= theme.dateEnd;
  }) ?? themes[0] ?? null, [themes]);

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
        <PublicHero ongoingEvents={ongoingEvents} upcomingEvents={upcomingEvents} themes={themes} isDark={isDark} onDetail={onDetail} />

        <PublicEventGrid events={events} ongoingEvents={ongoingEvents} upcomingEvents={upcomingEvents} isLoading={isLoading} holidays={holidays} onDetail={onDetail} />

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

        <PublicSubmissionForm onSubmitRequest={onSubmitRequest} />

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

      <PublicFooter ongoingEvents={ongoingEvents} upcomingEvents={upcomingEvents} />
    </div>
  );
}
