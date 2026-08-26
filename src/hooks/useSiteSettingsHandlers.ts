import { useState, useCallback, useEffect } from 'react';
import { ToastMessage, PhotoAlbum } from '../types';
import { fetchSiteSettings, updateSiteSettings, fetchAlbums } from '../utils/supabaseApi';

type ShowToast = (type: ToastMessage['type'], title: string, message: string) => void;

export type SiteSettingsHandlersDeps = {
  showToast: ShowToast;
  logout: () => Promise<void> | void;
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
  heroImageUrl: string;
  landingAlbums: PhotoAlbum[];
  handleSaveInstagramPosts: (posts: string[]) => Promise<boolean>;
  handleSaveHeroImage: (url: string) => Promise<boolean>;
  handleLogout: () => void;
}

export function useSiteSettingsHandlers(deps: SiteSettingsHandlersDeps): SiteSettingsHandlersResult {
  const { showToast, logout } = deps;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInstagramSettings, setShowInstagramSettings] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<string[]>([]);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [showNewsManager, setShowNewsManager] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [landingAlbums, setLandingAlbums] = useState<PhotoAlbum[]>([]);

  useEffect(() => {
    fetchSiteSettings<string[]>('instagram_posts').then(posts => {
      if (posts && Array.isArray(posts)) setInstagramPosts(posts);
    }).catch(() => {});
    fetchSiteSettings<string>('hero_image').then(url => {
      if (url && typeof url === 'string') setHeroImageUrl(url);
    }).catch(() => {});
    fetchAlbums().then(setLandingAlbums).catch(() => {});
  }, []);

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
    await logout();
    showToast('info', 'Keluar', 'Mode admin dinonaktifkan.');
  }, [logout, showToast]);

  return {
    showLoginModal, setShowLoginModal,
    showInstagramSettings, setShowInstagramSettings,
    instagramPosts,
    showAlbumManager, setShowAlbumManager,
    showNewsManager, setShowNewsManager,
    heroImageUrl, landingAlbums,
    handleSaveInstagramPosts, handleSaveHeroImage,
    handleLogout,
  };
}