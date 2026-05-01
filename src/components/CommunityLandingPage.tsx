import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Clock,
  Globe,
  Inbox,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Radio,
  SunMedium,
  Users,
  X,
} from 'lucide-react';
import { EventItem, PhotoAlbum } from '../types';
import { CATEGORY_COLORS } from '../utils/eventUtils';
import { CategoryBadges } from './CategoryBadges';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { CommunityHero } from './community/CommunityHero';
import { CommunityBenefits } from './community/CommunityBenefits';
import { CommunityFacilities } from './community/CommunityFacilities';
import { CommunitySteps } from './community/CommunitySteps';
import { CommunityRegistrationForm } from './community/CommunityRegistrationForm';
import { CommunityFAQ } from './community/CommunityFAQ';
import { thumbUrl } from '../utils/imageOptim';

/* ─── Brand tokens (consistent with PublicLandingPage) ────── */
const BRAND = {
  accent: '#7c6cf2',
  accentSoft: '#9185f7',
  accentWarm: '#f2743e',
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

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
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-600">
      {label}
    </p>
  );
}

function StatBadge({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 sm:text-3xl">{number}</span>
      <span className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 leading-tight">{label}</span>
    </div>
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
      (entries) => { const entry = entries[0]; if (entry?.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
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
    const timer = setTimeout(() => setTimedOut(true), 10000);
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

const NAV_ITEMS = [
  { href: '#benefits', label: 'Keuntungan' },
  { href: '#facilities', label: 'Fasilitas' },
  { href: '#gallery', label: 'Galeri' },
  { href: '#events', label: 'Event' },
  { href: '#how', label: 'Cara Daftar' },
  { href: '#register', label: 'Daftar' },
  { href: '#faq', label: 'FAQ' },
];

export function CommunityLandingPage({ isDark, onToggleDark, onBack, instagramPosts, events = [], onEventDetail, heroImageUrl, albums = [] }: CommunityLandingProps) {
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

      {/* Skip to register */}
      <a href="#register" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Langsung ke form pendaftaran
      </a>

      <main>
        <CommunityHero heroImageUrl={heroImageUrl} />

        {/* ─── Social Proof Strip ─────────────────────────────── */}
        <RevealSection className="border-b border-black/5 bg-white px-4 py-10 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="mx-auto max-w-7xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
              Dipercaya oleh komunitas di Bekasi
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <StatBadge number="100+" label="Event Terlaksana" />
              <StatBadge number="50+" label="Komunitas Bergabung" />
              <StatBadge number="10,000+" label="Total Pengunjung" />
            </div>
          </div>
        </RevealSection>

        <CommunityBenefits />
        <CommunityFacilities />
        <CommunitySteps />
        <CommunityFAQ />
        <CommunityRegistrationForm />

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
                          <img src={thumbUrl(album.coverPhotoUrl)} alt={album.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
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
        {/* Sticky Mobile CTA */}
        {isHeaderPinned && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/50 bg-white/95 px-4 py-3 backdrop-blur-lg sm:hidden dark:bg-slate-900/95 dark:border-slate-800">
            <a href="#register" className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg">
              Daftar Gratis Sekarang
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/50 bg-[#fbfaf7] px-4 py-8 pb-20 sm:pb-8 text-sm text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 sm:px-6">
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
