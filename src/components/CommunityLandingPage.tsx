import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Menu, Moon, SunMedium, X, ArrowRight } from 'lucide-react';
import { EventItem, PhotoAlbum } from '../types';
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
import { CommunityContact } from './community/CommunityContact';
import { CommunityEyebrow, RevealSection } from './community/CommunityRevealPrimitives';

const focusRing = 'ui-focus-ring';

function SkeletonEventGrid() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <div className="flex h-[120px] flex-col justify-between bg-slate-200 p-5 dark:bg-slate-700">
            <div className="h-5 w-24 rounded-full bg-slate-300 dark:bg-slate-600" />
            <div className="h-6 w-3/4 rounded bg-slate-300 dark:bg-slate-600" />
          </div>
          <div className="space-y-2 p-5">
            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LogoMark({ className = '' }: { className?: string }) {
  return <img src={mallLogo} alt="Metropolitan Mall Bekasi" className={className} />;
}

interface CachedInstagramPost {
  shortCode?: string;
  postUrl?: string;
  imageUrl?: string;
  caption?: string;
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
}

const NAV_ITEMS = [
  { href: '#upcoming-events', label: 'Upcoming' },
  { href: '#benefits', label: 'Keuntungan' },
  { href: '#facilities', label: 'Fasilitas' },
  { href: '#gallery', label: 'Galeri' },
  { href: '#upcoming-events', label: 'Event' },
  { href: '#how', label: 'Cara Daftar' },
  { href: '#register', label: 'Daftar' },
  { href: '#faq', label: 'FAQ' },
];

export function CommunityLandingPage({ isDark, onToggleDark, onBack, instagramPosts, events = [], onEventDetail, heroImageUrl, albums = [] }: CommunityLandingProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);
  const [cachedIgPosts, setCachedIgPosts] = useState<CachedInstagramPost[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  const featuredUpcomingEvents = events
    .filter(event => event.priority === 'high' && event.status === 'upcoming')
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  const headerClassName = isHeaderPinned
    ? 'fixed inset-x-0 top-0 z-50 border-b border-black/6 bg-neutral-150/96 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-md dark:bg-slate-950/96 dark:text-white dark:border-slate-800'
    : 'absolute inset-x-0 top-0 z-50 text-white';
  const navClassName = isHeaderPinned
    ? 'hidden items-center gap-7 text-[13px] font-medium text-slate-700 dark:text-slate-300 lg:flex'
    : 'hidden items-center gap-7 text-[13px] font-medium text-white/90 lg:flex';
  const utilityButtonClass = isHeaderPinned
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.05)] dark:bg-slate-800 dark:text-white dark:border-slate-700'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)] backdrop-blur-sm';
  const mobilePanelClass = isHeaderPinned
    ? 'mt-3 rounded-[1.6rem] border border-black/6 bg-white/98 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)] lg:hidden dark:bg-slate-900 dark:border-slate-700'
    : 'mt-3 rounded-[1.6rem] border border-white/18 bg-black/15 p-3 shadow-xl backdrop-blur-md lg:hidden';

  return (
    <div className="min-h-screen bg-neutral-150 selection:bg-violet-200 selection:text-violet-900 dark:bg-slate-950 dark:selection:bg-violet-900/40 dark:selection:text-violet-100">
      <header className={`transition-all duration-300 ${headerClassName}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between sm:h-20">
            <button onClick={onBack} className={`group flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${focusRing}`}>
              <LogoMark className="h-auto w-[88px] sm:w-[124px]" />
            </button>
            <nav className={navClassName}>
              {NAV_ITEMS.map((item) => (
                <a key={item.href} href={item.href} className={`transition hover:-translate-y-0.5 ${isHeaderPinned ? 'hover:text-violet-600 dark:hover:text-violet-400' : 'hover:text-white'}`}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onToggleDark} className={`transition-transform hover:scale-105 ${utilityButtonClass} ${focusRing}`} aria-label="Toggle dark mode">
                {isDark ? <SunMedium className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
              <button
                type="button"
                onClick={onBack}
                className={`hidden items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 sm:inline-flex ${focusRing}`}
                style={{ background: 'linear-gradient(135deg, var(--brand-violet) 0%, var(--brand-violet-soft) 100%)' }}
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> Event Dashboard
              </button>
              <a href="#register" className={`hidden items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold transition hover:-translate-y-0.5 sm:flex ${focusRing} ${isHeaderPinned ? 'bg-violet-600 text-white shadow-md hover:bg-violet-700 hover:shadow-lg' : 'bg-white text-slate-900 hover:bg-slate-50'}`}>
                Daftar Sekarang
              </a>
              <button type="button" onClick={() => setMobileNavOpen(!mobileNavOpen)} className={`lg:hidden transition-transform hover:scale-105 ${utilityButtonClass} ${focusRing}`} aria-label="Toggle menu">
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <div className={mobilePanelClass}>
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isHeaderPinned ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800' : 'text-white hover:bg-white/10'}`}>
                    {item.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    onBack();
                  }}
                  className={`mt-1 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${isHeaderPinned ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-white text-slate-900 hover:bg-slate-50'}`}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Event Dashboard
                </button>
                <a
                  href="#register"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${isHeaderPinned ? 'border border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/20' : 'border border-white/30 text-white hover:bg-white/10'}`}
                >
                  Daftar Sekarang
                </a>
              </nav>
            </div>
          )}
        </div>
      </header>
      <a href="#register" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Langsung ke form pendaftaran
      </a>
      <main>
        <CommunityHero heroImageUrl={heroImageUrl} />
        <CommunitySocialProof />
        <CommunityUpcomingEvents events={featuredUpcomingEvents} albums={albums} onDetail={onEventDetail} />
        <CommunityBenefits />
        <CommunityFacilities />
        <CommunitySteps />
        <CommunityFAQ />
        <CommunityRegistrationForm />
        <CommunityGallery albums={albums} instagramPosts={instagramPosts} cachedIgPosts={cachedIgPosts} />
        <CommunityContact />
        {isHeaderPinned && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/50 bg-white/95 px-4 py-3 backdrop-blur-lg sm:hidden dark:bg-slate-900/95 dark:border-slate-800">
            <a href="#register" className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg">
              Daftar Gratis Sekarang
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}
        <div ref={sentinelRef} className="absolute top-0 h-px w-px" aria-hidden="true" />
      </main>
      <footer className="border-t border-black/5 bg-white px-4 py-12 dark:bg-slate-950 dark:border-slate-800 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <LogoMark className="h-auto w-[102px] opacity-90" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
