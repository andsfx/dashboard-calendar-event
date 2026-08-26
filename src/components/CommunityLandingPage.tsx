import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Menu, Moon, SunMedium, X, ArrowRight } from 'lucide-react';
import { EventItem, PhotoAlbum } from '../types';
import { filterUpcomingForMonth } from './community/upcomingFilter';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { CommunityHero } from './community/CommunityHero';
import { CommunityBenefits } from './community/CommunityBenefits';
import { CommunityFacilities } from './community/CommunityFacilities';
import { CommunitySteps } from './community/CommunitySteps';
import { CommunityRegistrationForm } from './community/CommunityRegistrationForm';
import { CommunityFAQ } from './community/CommunityFAQ';
import { CommunitySocialProof } from './community/CommunitySocialProof';
import { CommunityUpcomingEvents } from './community/CommunityUpcomingEvents';
import { CommunityGallery } from './community/CommunityGallery';
import { CommunityNews } from './community/CommunityNews';
import { CommunityContact } from './community/CommunityContact';

const focusRing = 'ui-focus-ring';

function LogoMark({ className = '' }: { className?: string }) {
  return <img src={mallLogo} alt="Metropolitan Mall Bekasi" className={className} />;
}

interface CachedInstagramPost {
  shortCode?: string;
  postUrl?: string;
  imageUrl?: string;
  caption?: string;
}

interface CommunityStats {
  completed: number;
  total: number;
  organizers: number;
}

interface CommunityLandingProps {
  isDark: boolean;
  onToggleDark: () => void;
  onBack: () => void;
  instagramPosts?: string[];
  events?: EventItem[];
  onEventDetail?: (ev: EventItem) => void;
  heroImageUrl?: string;
  albums?: PhotoAlbum[];
  isLoading?: boolean;
  stats?: CommunityStats;
}

const NAV_ITEMS = [
  { href: '#upcoming-events', label: 'Event' },
  { href: '#benefits', label: 'Keuntungan' },
  { href: '#how', label: 'Cara Daftar' },
  { href: '#faq', label: 'FAQ' },
  { href: '#gallery', label: 'Galeri' },
  { href: '#news', label: 'Berita' },
  { href: '/tenants', label: 'Tenant' },
  { href: '#register', label: 'Daftar' },
  { href: '#contact', label: 'Kontak' },
] as const;
export function CommunityLandingPage({ isDark, onToggleDark, onBack, instagramPosts, events = [], onEventDetail, heroImageUrl, albums = [], isLoading = false, stats }: CommunityLandingProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);
  const [cachedIgPosts, setCachedIgPosts] = useState<CachedInstagramPost[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobilePanelFirstLinkRef = useRef<HTMLAnchorElement | null>(null);

  const closeMobileNav = () => {
    setMobileNavOpen(false);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    fetch('/api/instagram-sync')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
          setCachedIgPosts(data.posts);
        }
      })
      .catch(() => { /* silent fail */ });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsHeaderPinned(!entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    mobilePanelFirstLinkRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileNav();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  // Tampilkan hanya event di bulan aktif (bulan berjalan), bukan semua event mendatang.
  // P0-3: ongoing selalu tampil; fallback ke event terdekat bila bulan berjalan kosong.
  const now = new Date();
  const activeMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const featuredUpcomingEvents = filterUpcomingForMonth(events, activeMonthKey);

  const headerClassName = isHeaderPinned
    ? 'fixed inset-x-0 top-0 z-50 border-b border-black/6 bg-neutral-150/96 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-md dark:bg-slate-950/96 dark:text-white dark:border-slate-800'
    : 'absolute inset-x-0 top-0 z-50 text-white';
  const navClassName = isHeaderPinned
    ? 'hidden items-center gap-7 text-[13px] font-medium text-slate-700 dark:text-slate-300 lg:flex'
    : 'hidden items-center gap-7 text-[13px] font-medium text-white/90 lg:flex';
  const utilityButtonClass = isHeaderPinned
    ? 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.05)] dark:bg-slate-800 dark:text-white dark:border-slate-700 sm:h-9 sm:w-9'
    : 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:h-9 sm:w-9';
  const mobilePanelClass = isHeaderPinned
    ? 'mt-3 rounded-[1.6rem] border border-black/6 bg-white/98 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)] lg:hidden dark:bg-slate-900 dark:border-slate-700'
    : 'mt-3 rounded-[1.6rem] border border-white/18 bg-black/15 p-3 shadow-xl backdrop-blur-md lg:hidden';

  return (
    <div className="community-landing min-h-screen bg-neutral-150 selection:bg-[color-mix(in_srgb,var(--brand-tosca)_20%,white)] selection:text-[var(--brand-tosca-dark)] dark:bg-slate-950 dark:selection:bg-[color-mix(in_srgb,var(--brand-tosca)_35%,black)] dark:selection:text-white">
      <header className={`transition-colors duration-200 ${headerClassName}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between sm:h-20">
            <a href="#hero" className={`group flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${focusRing}`}>
              <LogoMark className="h-auto w-[88px] sm:w-[124px]" />
            </a>
            <nav className={navClassName} aria-label="Navigasi utama">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap transition ${isHeaderPinned ? 'hover:text-[var(--brand-tosca)] dark:hover:text-[var(--brand-tosca-soft)]' : 'hover:text-white'}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onToggleDark} className={`${utilityButtonClass} ${focusRing}`} aria-label="Toggle dark mode">
                {isDark ? <SunMedium className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
              <button
                type="button"
                onClick={onBack}
                className={`hidden items-center gap-2 rounded-full border px-3.5 py-2.5 text-[13px] font-medium transition sm:inline-flex ${focusRing} ${
                  isHeaderPinned
                    ? 'border-black/10 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
                    : 'border-white/30 bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> Event Schedule
              </button>
              <a
                href="#register"
                className={`hidden items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition sm:inline-flex ${focusRing} ${
                  isHeaderPinned
                    ? 'border-black/10 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
                    : 'border-white/30 bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                Daftar Sekarang
              </a>
              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                ref={menuButtonRef}
                className={`lg:hidden ${utilityButtonClass} ${focusRing}`}
                aria-label={mobileNavOpen ? 'Tutup menu' : 'Buka menu'}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav-panel"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <div id="mobile-nav-panel" className={mobilePanelClass}>
              <nav className="flex flex-col gap-1" aria-label="Navigasi mobile">
                {NAV_ITEMS.map((item, idx) => (
                  <a
                    key={item.href}
                    href={item.href}
                    ref={idx === 0 ? mobilePanelFirstLinkRef : undefined}
                    onClick={() => setMobileNavOpen(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isHeaderPinned ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800' : 'text-white hover:bg-white/10'}`}
                  >
                    {item.label}
                  </a>
                ))}
                <a
                  href="#register"
                  onClick={() => setMobileNavOpen(false)}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-tosca-600)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-tosca-dark)]"
                >
                  Daftar Sekarang
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    onBack();
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    isHeaderPinned
                      ? 'border-black/10 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
                      : 'border-white/30 text-white hover:bg-white/10'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Event Schedule
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>
      <a
        href="#register"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke form pendaftaran
      </a>
      <main className="pb-20 sm:pb-0">
        <CommunityHero heroImageUrl={heroImageUrl} stats={stats} isLoading={isLoading} />
        <CommunitySocialProof totalEvents={stats?.total} totalCompleted={stats?.completed} totalOrganizers={stats?.organizers} isLoading={isLoading} />
        <CommunityUpcomingEvents events={featuredUpcomingEvents} albums={albums} onDetail={onEventDetail} isLoading={isLoading} />
        <CommunityBenefits />
        <CommunityFacilities />
        <CommunitySteps />
        <CommunityFAQ />
        <CommunityGallery albums={albums} instagramPosts={instagramPosts} cachedIgPosts={cachedIgPosts} isLoading={isLoading} />
        <CommunityNews />
        <CommunityContact />
        {isHeaderPinned && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/50 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg sm:hidden dark:bg-slate-900/95 dark:border-slate-800">
            <a
              href="#register"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold whitespace-nowrap text-white shadow-lg hover:bg-[var(--brand-tosca-dark)]"
            >
              Daftar Gratis Sekarang
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
        <div ref={sentinelRef} className="absolute top-0 h-px w-px" aria-hidden="true" />
      </main>
      <footer className="border-t border-black/5 bg-white px-4 py-12 dark:bg-slate-950 dark:border-slate-800 sm:px-6 sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <LogoMark className="h-auto w-[102px] opacity-90" />
          <div className="flex flex-col gap-2 sm:items-end">
            <a href="#register" className="text-sm font-semibold text-[var(--brand-tosca-dark)] hover:underline dark:text-[var(--brand-tosca-soft)]">
              Daftar event komunitas
            </a>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
