import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Menu, Moon, SunMedium, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/rest';
import { EventItem, PhotoAlbum, EventArea } from '../types';
import { filterUpcomingForMonth } from './community/upcomingFilter';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { CommunityHero } from './community/CommunityHero';
import { CommunityBenefits } from './community/CommunityBenefits';
import { CommunityFacilities } from './community/CommunityFacilities';
import { CommunityEventAreas } from './community/CommunityEventAreas';
import { CommunitySteps } from './community/CommunitySteps';
import { CommunityRegistrationForm } from './community/CommunityRegistrationForm';
import { CommunityFAQ } from './community/CommunityFAQ';
import { CommunitySocialProof } from './community/CommunitySocialProof';
import { CommunityUpcomingEvents } from './community/CommunityUpcomingEvents';
import { CommunityGallery } from './community/CommunityGallery';
import { CommunityNews } from './community/CommunityNews';
import { CommunityContact } from './community/CommunityContact';
import { usePageMeta } from '../utils/pageMeta';
import { NavDropdown, type NavDropdownItem } from './nav/NavDropdown';
import type { CommunityStats } from './community/communityStats';

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

interface CommunityLandingProps {
  isDark: boolean;
  onToggleDark: () => void;
  onBack: () => void;
  instagramPosts?: string[];
  events?: EventItem[];
  onEventDetail?: (ev: EventItem) => void;
  heroImageUrl?: string;
  albums?: PhotoAlbum[];
  areas?: EventArea[];
  isLoading?: boolean;
  stats?: CommunityStats;
}

/** Satu entri navigasi header: link langsung, atau dropdown berkategori. */
type NavEntry =
  | { kind: 'link'; label: string; href: string }
  | { kind: 'menu'; label: string; items: NavDropdownItem[] };

/**
 * Navigasi utama halaman komunitas — 4 entri top-level (sebelumnya 11 link
 * horizontal). `Event` & `Kontak` tetap link langsung; sisanya dikelompokkan
 * per kategori. Anchor `#...` scroll in-page; `/tenants` & `/pameran` navigasi
 * react-router (`route: true`).
 */
const NAV_ENTRIES: NavEntry[] = [
  { kind: 'link', label: 'Event', href: '#upcoming-events' },
  {
    kind: 'menu',
    label: 'Program',
    items: [
      { label: 'Keuntungan', href: '#benefits' },
      { label: 'Area & Fasilitas', href: '#areas' },
      { label: 'Cara Daftar', href: '#how' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    kind: 'menu',
    label: 'Jelajahi',
    items: [
      { label: 'Galeri', href: '#gallery' },
      { label: 'Berita', href: '#news' },
      { label: 'Tenant', href: '/tenants', route: true },
      { label: 'Pameran', href: '/pameran', route: true },
      { label: 'Sponsor', href: '/sponsor', route: true },
      { label: 'Dokumentasi', href: '/docs', route: true },
    ],
  },
  { kind: 'link', label: 'Kontak', href: '#contact' },
];

/** Turunan NAV_ENTRIES untuk panel mobile: tiap kategori jadi satu section berjudul. */
const MOBILE_NAV_GROUPS: Array<{ heading: string | null; items: NavDropdownItem[] }> =
  NAV_ENTRIES.map((entry) =>
    entry.kind === 'menu'
      ? { heading: entry.label, items: entry.items }
      : { heading: null, items: [{ label: entry.label, href: entry.href }] },
  );

export function CommunityLandingPage({ isDark, onToggleDark, onBack, instagramPosts, events = [], onEventDetail, heroImageUrl, albums = [], areas = [], isLoading = false, stats }: CommunityLandingProps) {
  usePageMeta({
    title: 'Komunitas - Metropolitan Mall Bekasi',
    description: 'Gabung komunitas dan kirim pengajuan event untuk digelar di Metropolitan Mall Bekasi.',
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  /** Label dropdown desktop yang terbuka — satu saja pada satu waktu. */
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
    // GET /api/v1/instagram → data: { posts } (cache publik site_settings).
    apiGet<{ posts: CachedInstagramPost[] }>('/instagram')
      .then(data => {
        if (Array.isArray(data?.posts) && data.posts.length > 0) {
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
    ? 'mt-3 rounded-3xl border border-black/6 bg-white/98 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)] lg:hidden dark:bg-slate-900 dark:border-slate-700'
    : 'mt-3 rounded-3xl border border-white/18 bg-black/15 p-3 shadow-xl backdrop-blur-md lg:hidden';

  return (
    <div className="community-landing min-h-screen overflow-x-clip bg-neutral-150 selection:bg-[color-mix(in_srgb,var(--brand-tosca)_20%,white)] selection:text-[var(--brand-tosca-dark)] dark:bg-slate-950 dark:selection:bg-[color-mix(in_srgb,var(--brand-tosca)_35%,black)] dark:selection:text-white">
      <a
        href="#register"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke form pendaftaran
      </a>
      <header className={`transition-colors duration-200 ${headerClassName}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between sm:h-20">
            <a href="#hero" className={`group flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${focusRing}`}>
              <LogoMark className="h-auto w-[88px] sm:w-[124px]" />
            </a>
            <nav className={navClassName} aria-label="Navigasi utama">
              {NAV_ENTRIES.map((entry) =>
                entry.kind === 'link' ? (
                  <a
                    key={entry.href}
                    href={entry.href}
                    className={`whitespace-nowrap rounded-full px-2 py-2 transition-colors ${focusRing} ${isHeaderPinned ? 'hover:text-[var(--brand-tosca)] dark:hover:text-[var(--brand-tosca-soft)]' : 'hover:text-white'}`}
                  >
                    {entry.label}
                  </a>
                ) : (
                  <NavDropdown
                    key={entry.label}
                    label={entry.label}
                    items={entry.items}
                    pinned={isHeaderPinned}
                    open={openMenu === entry.label}
                    onOpenChange={(next) => setOpenMenu(next ? entry.label : null)}
                  />
                ),
              )}
            </nav>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onToggleDark} className={`${utilityButtonClass} ${focusRing}`} aria-label={isDark ? 'Mode terang' : 'Mode gelap'}>
                {isDark ? <SunMedium className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
              <button
                type="button"
                onClick={onBack}
                className={`hidden items-center gap-2 rounded-full border px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition sm:inline-flex ${focusRing} ${
                  isHeaderPinned
                    ? 'border-black/10 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
                    : 'border-white/30 bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> Jadwal Event
              </button>
              <a
                href="/daftar"
                className={`hidden items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition sm:inline-flex ${focusRing} ${
                  isHeaderPinned
                    ? 'border-black/10 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
                    : 'border-white/30 bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                Daftar Event
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
              <nav className="flex flex-col gap-3" aria-label="Navigasi mobile">
                {MOBILE_NAV_GROUPS.map((group, groupIdx) => (
                  <div key={group.heading ?? `direct-${groupIdx}`} className="flex flex-col gap-1">
                    {group.heading && (
                      <p
                        className={`px-4 pt-1 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] ${
                          isHeaderPinned ? 'text-slate-500 dark:text-slate-400' : 'text-white/70'
                        }`}
                      >
                        {group.heading}
                      </p>
                    )}
                    {group.items.map((item, itemIdx) => {
                      const isFirst = groupIdx === 0 && itemIdx === 0;
                      const itemClass = `rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                        isHeaderPinned
                          ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          : 'text-white hover:bg-white/10'
                      }`;
                      return item.route ? (
                        <Link
                          key={item.href}
                          to={item.href}
                          ref={isFirst ? mobilePanelFirstLinkRef : undefined}
                          onClick={() => setMobileNavOpen(false)}
                          className={itemClass}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <a
                          key={item.href}
                          href={item.href}
                          ref={isFirst ? mobilePanelFirstLinkRef : undefined}
                          onClick={() => setMobileNavOpen(false)}
                          className={itemClass}
                        >
                          {item.label}
                        </a>
                      );
                    })}
                  </div>
                ))}
                <a
                  href="/daftar"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-tosca-600)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-tosca-dark)]"
                >
                  Daftar Event
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
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Jadwal Event
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>
      <main id="konten-utama" tabIndex={-1} className="pb-20 sm:pb-0 outline-none">
        <CommunityHero heroImageUrl={heroImageUrl} stats={stats} isLoading={isLoading} />
        <CommunitySocialProof totalEvents={stats?.total} totalCompleted={stats?.completed} totalOrganizers={stats?.organizers} isLoading={isLoading} />
        <CommunityUpcomingEvents events={featuredUpcomingEvents} albums={albums} onDetail={onEventDetail} isLoading={isLoading} />
        <CommunityBenefits />
        <CommunityFacilities />
        {/* Anchor `#areas` harus stabil: CommunityEventAreas mengembalikan null
            saat tidak ada area aktif, sehingga link nav "Area & Fasilitas" jadi
            anchor mati. Wrapper ini selalu membawa id + scroll offset; saat
            section benar-benar dirender, anchor resolve ke wrapper (bukan dobel id). */}
        <div id="areas" tabIndex={-1} className="scroll-mt-28 outline-none">
          <CommunityEventAreas areas={areas} isLoading={isLoading} />
        </div>
        <CommunitySteps />
        <CommunityFAQ />
        <CommunityGallery albums={albums} instagramPosts={instagramPosts} cachedIgPosts={cachedIgPosts} isLoading={isLoading} />
        <CommunityNews />
        {/* Ajukan event — pipeline EO formal (pola Orchard Road / Scentre) */}
        <section className="px-4 pt-16 pb-4 sm:px-6 sm:pt-24 lg:pt-32">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-start justify-between gap-3 rounded-[1.5rem] border border-[var(--border-subtle)] bg-white px-6 py-5 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Punya ide event?</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Ajukan acara komunitas atau bisnismu untuk diselenggarakan di Metmal Bekasi.
                </p>
              </div>
              <Link
                to="/ajukan-event"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"
              >
                Ajukan Event
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <CommunityRegistrationForm />
        <CommunityContact />
        {isHeaderPinned && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/50 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg sm:hidden dark:bg-slate-900/95 dark:border-slate-800">
            <a
              href="/daftar"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold whitespace-nowrap text-white shadow-lg hover:bg-[var(--brand-tosca-dark)]"
            >
              Daftar Event
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
        <div ref={sentinelRef} className="absolute top-0 h-px w-px" aria-hidden="true" />
      </main>
      <footer className="border-t border-black/5 bg-white px-4 py-16 dark:bg-slate-950 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <LogoMark className="h-auto w-[102px] opacity-90" />
          <div className="flex flex-col gap-2 sm:items-end">
            <a href="/daftar" className="text-sm font-semibold text-[var(--brand-tosca-dark)] hover:underline dark:text-[var(--brand-tosca-soft)]">
              Daftar Event
            </a>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
