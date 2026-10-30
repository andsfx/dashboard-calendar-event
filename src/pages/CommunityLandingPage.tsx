import { useEffect, useRef, useState } from 'react';
import { createIntersectionObserver } from '../utils/intersectionObserver';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/rest';
import { EventItem, PhotoAlbum, EventArea } from '../types';
import { filterUpcomingForMonth } from '../components/community/upcomingFilter';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { CommunityHero } from '../components/community/CommunityHero';
import { CommunityBenefits } from '../components/community/CommunityBenefits';
import { CommunityFacilities } from '../components/community/CommunityFacilities';
import { CommunityEventAreas } from '../components/community/CommunityEventAreas';
import { CommunitySteps } from '../components/community/CommunitySteps';
import { CommunityRegistrationForm } from '../components/community/CommunityRegistrationForm';
import { CommunityFAQ } from '../components/community/CommunityFAQ';
import { CommunitySocialProof } from '../components/community/CommunitySocialProof';
import { CommunityUpcomingEvents } from '../components/community/CommunityUpcomingEvents';
import { CommunityGallery } from '../components/community/CommunityGallery';
import { CommunityNews } from '../components/community/CommunityNews';
import { CommunityContact } from '../components/community/CommunityContact';
import { usePageMeta } from '../utils/pageMeta';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import type { CommunityStats } from '../components/community/communityStats';

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
  instagramPosts?: string[];
  events?: EventItem[];
  onEventDetail?: (ev: EventItem) => void;
  heroImageUrl?: string;
  albums?: PhotoAlbum[];
  areas?: EventArea[];
  isLoading?: boolean;
  stats?: CommunityStats;
}

export function CommunityLandingPage({ isDark, onToggleDark, instagramPosts, events = [], onEventDetail, heroImageUrl, albums = [], areas = [], isLoading = false, stats }: CommunityLandingProps) {
  usePageMeta({
    title: 'Komunitas - Metropolitan Mall Bekasi',
    description: 'Gabung komunitas dan kirim pengajuan event untuk diselenggarakan di Metropolitan Mall Bekasi.',
  });
  const [cachedIgPosts, setCachedIgPosts] = useState<CachedInstagramPost[]>([]);
  /** CTA lengket di ponsel tampil setelah hero terlewati. */
  const [showMobileCta, setShowMobileCta] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setShowMobileCta(!entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    // No IntersectionObserver: keep the sticky CTA reachable rather than
    // silently disappearing.
    if (!observer) {
      setShowMobileCta(true);
      return;
    }

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Tampilkan hanya event di bulan aktif (bulan berjalan), bukan semua event mendatang.
  // P0-3: ongoing selalu tampil; fallback ke event terdekat bila bulan berjalan kosong.
  const now = new Date();
  const activeMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const featuredUpcomingEvents = filterUpcomingForMonth(events, activeMonthKey);

  return (
    <div className="community-landing min-h-screen overflow-x-clip bg-neutral-150 selection:bg-[color-mix(in_srgb,var(--brand-tosca)_20%,white)] selection:text-[var(--brand-tosca-dark)] dark:bg-slate-950 dark:selection:bg-[color-mix(in_srgb,var(--brand-tosca)_35%,black)] dark:selection:text-white">
      <a
        href="#register"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke form pendaftaran
      </a>
      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />
      <main id="konten-utama" tabIndex={-1} className="pb-20 sm:pb-0 outline-none">
        <CommunityHero heroImageUrl={heroImageUrl} stats={stats} events={events} isLoading={isLoading} />
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
        {/* FAQ sengaja tetap di sini. Ia sudah berada persis sebelum jalur
            konversi (galeri → berita → form), jadi pola "jawab keraguan tepat
            sebelum CTA" sudah terpenuhi; menaikkannya ke atas #benefits justru
            akan menggeser proposi nilai (apa yang didapat) ke bawah. */}
        <CommunityFAQ />
        <CommunityGallery albums={albums} instagramPosts={instagramPosts} cachedIgPosts={cachedIgPosts} isLoading={isLoading} />
        <CommunityNews />
        {/* Ajukan event — pipeline EO formal (pola Orchard Road / Scentre) */}
        <section className="px-4 pt-16 pb-4 sm:px-6 sm:pt-24 lg:pt-32">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-start justify-between gap-3 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-white px-6 py-5 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900">
              <div>
                {/* Banner ajakan, bukan judul section: DESIGN.md membatasi heading
                    section ke `text-4xl`–`sm:text-5xl`, dan sebagai heading level 3
                    ia sejajar dengan sub-judul kartu lain di halaman. */}
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">Punya ide event?</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Ajukan acara komunitas atau bisnismu untuk diselenggarakan di Metmal Bekasi.
                </p>
              </div>
              <Link
                to="/ajukan-event"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"
              >
                Ajukan Event
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <CommunityRegistrationForm />
        <CommunityContact />
        {showMobileCta && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/50 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg sm:hidden dark:bg-slate-900/95 dark:border-slate-800">
            <Link
              to="/daftar"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold whitespace-nowrap text-white shadow-lg hover:bg-[var(--brand-tosca-dark)]"
            >
              Daftar Event
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
        <div ref={sentinelRef} className="absolute top-0 h-px w-px" aria-hidden="true" />
      </main>
      <footer className="border-t border-black/5 bg-white px-4 py-16 dark:bg-slate-950 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <LogoMark className="h-auto w-[102px] opacity-90" />
          <div className="flex flex-col gap-2 sm:items-end">
            <Link to="/daftar" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-tosca-dark)] hover:underline dark:text-[var(--brand-tosca-soft)]">
              Daftar Event
            </Link>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
