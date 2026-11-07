import { useState, useCallback, useEffect } from 'react';
import { ToastMessage, PhotoAlbum, EventArea } from '../types';
import { fetchSiteSettings, updateSiteSettings, fetchAlbums, fetchEventAreas } from '../utils/domainApi';
import { imgUrl } from '../utils/imageOptim';

type ShowToast = (type: ToastMessage['type'], title: string, message: string) => void;

export type SiteSettingsHandlersDeps = {
  showToast: ShowToast;
  logout: () => Promise<{ ok: boolean; error?: string } | void> | void;
};

export interface SiteSettingsHandlersResult {
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  showInstagramSettings: boolean;
  setShowInstagramSettings: (v: boolean) => void;
  instagramPosts: string[];
  showAlbumManager: boolean;
  setShowAlbumManager: (v: boolean) => void;
  showNewsManager: boolean;
  setShowNewsManager: (v: boolean) => void;
  showSponsorManager: boolean;
  setShowSponsorManager: (v: boolean) => void;
  showEventAreaManager: boolean;
  setShowEventAreaManager: (v: boolean) => void;
  heroImageUrl: string;
  landingAlbums: PhotoAlbum[];
  eventAreas: EventArea[];
  /** Muat ulang daftar area (publik, hanya yang aktif) setelah pengelolaan area berubah. */
  refreshEventAreas: () => Promise<void>;
  handleSaveInstagramPosts: (posts: string[]) => Promise<boolean>;
  handleSaveHeroImage: (url: string) => Promise<boolean>;
  handleLogout: () => void;
}

/** Kunci cache localStorage untuk URL hero mentah (repeat-visit). */
const HERO_PREWARM_KEY = 'metmal-hero-prewarm-v1';

/**
 * Mulai unduh gambar hero SEKARANG, di luar siklus render React.
 *
 * Masalah yang ditutup: `<img>` hero di CommunityHero baru punya `src` setelah
 * `fetchSiteSettings('hero_image')` resolve + React render (~1,4 dtk, terukur
 * 2026-11-07). Dengan memuat lewat `new Image()` begitu URL diketahui, unduhan
 * berjalan paralel dengan request lain alih-alih menunggu rantai itu selesai.
 *
 * `w: 1280, q: 78` WAJIB sama dengan `src` hero di CommunityHero.tsx supaya
 * respons yang sudah ter-cache dipakai ulang oleh `<img>` sesungguhnya.
 */
function prewarmHero(url: string): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  const src = imgUrl(url, { w: 1280, q: 78 });
  if (!src) return;
  const img = new Image();
  img.decoding = 'async';
  if ('fetchPriority' in img) img.fetchPriority = 'high';
  img.src = src;
}

function readCachedHeroUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(HERO_PREWARM_KEY) || '';
  } catch {
    return ''; // private mode / storage diblokir
  }
}

function cacheHeroUrl(url: string): void {
  if (typeof window === 'undefined' || !url) return;
  try {
    window.localStorage.setItem(HERO_PREWARM_KEY, url);
  } catch {
    // Storage penuh/diblokir: prewarm tetap jalan, cache jadi best-effort.
  }
}
export function useSiteSettingsHandlers(deps: SiteSettingsHandlersDeps): SiteSettingsHandlersResult {
  const { showToast, logout } = deps;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInstagramSettings, setShowInstagramSettings] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<string[]>([]);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [showNewsManager, setShowNewsManager] = useState(false);
  const [showSponsorManager, setShowSponsorManager] = useState(false);
  const [showEventAreaManager, setShowEventAreaManager] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [landingAlbums, setLandingAlbums] = useState<PhotoAlbum[]>([]);
  const [eventAreas, setEventAreas] = useState<EventArea[]>([]);

  const refreshEventAreas = useCallback(async () => {
    try {
      setEventAreas(await fetchEventAreas());
    } catch {
      // Best-effort: dropdown area tetap memakai daftar terakhir yang valid.
    }
  }, []);

  useEffect(() => {
    fetchSiteSettings<string[]>('instagram_posts').then(posts => {
      if (posts && Array.isArray(posts)) setInstagramPosts(posts);
    }).catch(() => {});

    // Repeat-visit fast path: hangatkan dari cache sembari menunggu setting.
    const cached = readCachedHeroUrl();
    if (cached) prewarmHero(cached);

    fetchSiteSettings<string>('hero_image').then(url => {
      if (url && typeof url === 'string') {
        setHeroImageUrl(url);
        // Mulai unduhan gambar sesegera mungkin — inilah lever LCP.
        prewarmHero(url);
        cacheHeroUrl(url);
      }
    }).catch(() => {});
    fetchAlbums().then(setLandingAlbums).catch(() => {});
    refreshEventAreas();
  }, [refreshEventAreas]);

  const handleSaveInstagramPosts = useCallback(async (posts: string[]) => {
    try {
      await updateSiteSettings('instagram_posts', posts);
      setInstagramPosts(posts);
      showToast('success', 'Instagram diperbarui', 'Link Instagram gallery berhasil disimpan.');
      return true;
    } catch {
      showToast('error', 'Gagal menyimpan', 'Link Instagram belum tersimpan. Coba lagi.');
      return false;
    }
  }, [showToast]);

  const handleSaveHeroImage = useCallback(async (url: string) => {
    try {
      await updateSiteSettings('hero_image', url);
      setHeroImageUrl(url);
      return true;
    } catch {
      showToast('error', 'Gagal menyimpan', 'Hero image belum tersimpan. Coba lagi.');
      return false;
    }
  }, [showToast]);

  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result && !result.ok) {
      showToast('error', 'Gagal keluar', result.error || 'Sesi mungkin masih aktif di server. Coba lagi.');
      return;
    }
    showToast('info', 'Keluar', 'Mode admin dinonaktifkan.');
  }, [logout, showToast]);

  return {
    showLoginModal, setShowLoginModal,
    showInstagramSettings, setShowInstagramSettings,
    instagramPosts,
    showAlbumManager, setShowAlbumManager,
    showNewsManager, setShowNewsManager,
    showSponsorManager, setShowSponsorManager,
    showEventAreaManager, setShowEventAreaManager,
    heroImageUrl, landingAlbums, eventAreas, refreshEventAreas,
    handleSaveInstagramPosts, handleSaveHeroImage,
    handleLogout,
  };
}