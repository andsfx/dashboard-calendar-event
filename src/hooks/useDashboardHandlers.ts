import { useState, useCallback, useEffect } from 'react';
import {
  DraftEventItem,
  EventItem,
  LetterRequestItem,
  AnnualTheme,
  CommunityRegistration,
  RegistrationStatus,
  ToastMessage,
} from '../types';
import { createId, parseDateStrLocal, MONTH_NAMES } from '../utils/eventUtils';
import {
  createLetterRequest,
  fetchSiteSettings,
  updateSiteSettings,
  fetchCommunityRegistrations,
  updateRegistrationStatus,
  fetchAlbums,
} from '../utils/supabaseApi';
import type { PhotoAlbum } from '../types';

type ShowToast = (type: ToastMessage['type'], title: string, message: string) => void;

export type DashboardHandlersDeps = {
  showToast: ShowToast;
  logout: () => Promise<void> | void;
  events: EventItem[];
  addEvent: (event: EventItem) => Promise<boolean>;
  updateEvent: (event: EventItem) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  addRecurringEvents: (events: EventItem[]) => Promise<boolean>;
  deleteRecurringSeries: (groupId: string) => Promise<boolean>;
  addTheme: (theme: AnnualTheme) => Promise<boolean>;
  updateTheme: (theme: AnnualTheme) => Promise<boolean>;
  deleteTheme: (id: string) => Promise<boolean>;
  refreshEvents: () => Promise<void> | void;
  draftEvents: DraftEventItem[];
  addDraft: (draft: DraftEventItem) => Promise<boolean>;
  updateDraft: (draft: DraftEventItem) => Promise<boolean>;
  deleteDraft: (id: string) => Promise<boolean>;
  publishDraft: (id: string) => Promise<boolean>;
  restoreDraft: (id: string) => Promise<boolean>;
  canViewRegistrations: boolean;
  dashboardPath: string;
  draftError: string | null;
};

export function useDashboardHandlers(deps: DashboardHandlersDeps) {
  const {
    showToast,
    logout,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    addRecurringEvents,
    deleteRecurringSeries,
    addTheme,
    updateTheme,
    deleteTheme,
    refreshEvents,
    draftEvents,
    addDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    restoreDraft,
    canViewRegistrations,
    dashboardPath,
    draftError,
  } = deps;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCrudModal, setShowCrudModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showLetterPickerModal, setShowLetterPickerModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDraftHistory, setShowDraftHistory] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftEventItem | null>(null);
  const [editingTheme, setEditingTheme] = useState<AnnualTheme | null>(null);
  const [letterEvent, setLetterEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [showInstagramSettings, setShowInstagramSettings] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<string[]>([]);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [landingAlbums, setLandingAlbums] = useState<PhotoAlbum[]>([]);
  const [communityRegistrations, setCommunityRegistrations] = useState<CommunityRegistration[]>([]);
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [showRegDetail, setShowRegDetail] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<CommunityRegistration | null>(null);
  const [initialEventData, setInitialEventData] = useState<Partial<EventItem> | null>(null);

  const refreshRegistrations = useCallback(async (showError = true) => {
    if (!canViewRegistrations) return;
    setIsRegLoading(true);
    try {
      const regs = await fetchCommunityRegistrations();
      setCommunityRegistrations(regs);
      setSelectedRegistration(prev => (prev ? (regs.find(r => r.id === prev.id) ?? prev) : null));
    } catch {
      if (showError) {
        showToast('error', 'Gagal memuat', 'Data pendaftaran belum berhasil dimuat. Coba refresh halaman.');
      }
    } finally {
      setIsRegLoading(false);
    }
  }, [canViewRegistrations, showToast]);

  useEffect(() => {
    if (canViewRegistrations && dashboardPath === '/registrations') {
      refreshRegistrations();
    }
  }, [dashboardPath, canViewRegistrations, refreshRegistrations]);

  useEffect(() => {
    if (draftError && dashboardPath === '/drafts') {
      showToast('error', 'Gagal memuat draft', draftError);
    }
  }, [dashboardPath, draftError, showToast]);

  useEffect(() => {
    fetchSiteSettings<string[]>('instagram_posts').then(posts => {
      if (posts && Array.isArray(posts)) setInstagramPosts(posts);
    }).catch(() => {});
    fetchSiteSettings<string>('hero_image').then(url => {
      if (url && typeof url === 'string') setHeroImageUrl(url);
    }).catch(() => {});
    fetchAlbums().then(setLandingAlbums).catch(() => {});
  }, []);

  const handleRegDetail = useCallback((reg: CommunityRegistration) => {
    setSelectedRegistration(reg);
    setShowRegDetail(true);
  }, []);

  const handleUpdateRegStatus = useCallback(async (id: string, status: RegistrationStatus, adminNote: string) => {
    try {
      await updateRegistrationStatus(id, status, adminNote);
      await refreshRegistrations();
      showToast('success', 'Status diperbarui', `Pendaftaran berhasil diubah ke ${status}.`);
      return true;
    } catch {
      showToast('error', 'Gagal memperbarui', 'Status pendaftaran belum berubah.');
      return false;
    }
  }, [refreshRegistrations, showToast]);

  const handleCreateEventFromRegistration = useCallback((registration: CommunityRegistration) => {
    const dateStr = registration.preferredDate || '';
    const dateMeta = dateStr ? (() => {
      const DAY_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const d = parseDateStrLocal(dateStr);
      if (!d) return { day: '', tanggal: '', month: '' };
      return {
        day: DAY_ID[d.getDay()] || '',
        tanggal: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        month: MONTH_NAMES[d.getMonth()] || '',
      };
    })() : { day: '', tanggal: '', month: '' };

    const prefillData: Partial<EventItem> = {
      acara: registration.organizationName || registration.communityName,
      lokasi: '',
      eo: registration.organizationName || registration.communityName,
      pic: registration.pic,
      phone: registration.phone,
      keterangan: registration.description || '',
      dateStr,
      day: dateMeta.day,
      tanggal: dateMeta.tanggal,
      month: dateMeta.month,
      jam: '',
      categories: [],
      category: 'Umum',
      priority: 'medium',
      eventModel: 'free',
    };

    setInitialEventData(prefillData);
    setEditingEvent(null);
    setShowCrudModal(true);
    showToast('info', 'Buat Event', 'Form event telah diisi dengan data pendaftaran. Silakan lengkapi dan simpan.');
  }, [showToast]);

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

  const handleAddNew = useCallback(() => {
    setEditingEvent(null);
    setInitialEventData(null);
    setShowCrudModal(true);
  }, []);

  const handleEdit = useCallback((ev: EventItem) => {
    setEditingEvent(ev);
    setShowCrudModal(true);
  }, []);

  const handleAddDraft = useCallback(() => {
    setEditingDraft(null);
    setShowDraftModal(true);
  }, []);

  const handleEditDraft = useCallback((draft: DraftEventItem) => {
    setEditingDraft(draft);
    setShowDraftModal(true);
  }, []);

  const handleOpenLetterPicker = useCallback(() => {
    setShowLetterPickerModal(true);
  }, []);

  const handleAddTheme = useCallback(() => {
    setEditingTheme(null);
    setShowThemeModal(true);
  }, []);

  const handleEditTheme = useCallback((theme: AnnualTheme) => {
    setEditingTheme(theme);
    setShowThemeModal(true);
  }, []);

  const handleSaveTheme = useCallback(async (theme: AnnualTheme) => {
    const success = theme.sheetRow
      ? await updateTheme(theme)
      : await addTheme(theme);

    if (success) {
      setShowThemeModal(false);
      setEditingTheme(null);
      showToast('success', theme.sheetRow ? 'Tema diperbarui' : 'Tema ditambahkan', 'Perubahan tema tahunan sudah tersimpan.');
      return true;
    }

    showToast('error', 'Gagal menyimpan tema', 'Perubahan tema tahunan belum berhasil disimpan.');
    return false;
  }, [addTheme, updateTheme, showToast]);

  const handleDeleteTheme = useCallback(async (theme: AnnualTheme) => {
    if (!theme.id) return;
    const confirmed = window.confirm(`Hapus tema tahunan "${theme.name}"?`);
    if (!confirmed) return;

    const success = await deleteTheme(theme.id);
    if (success) {
      showToast('success', 'Tema dihapus', `"${theme.name}" telah dihapus.`);
    } else {
      showToast('error', 'Gagal menghapus tema', 'Tema tahunan belum berhasil dihapus.');
    }
  }, [deleteTheme, showToast]);

  const handleOpenLetter = useCallback((event: EventItem) => {
    setLetterEvent(event);
    setShowLetterModal(true);
  }, []);

  const handleSelectLetterEvent = useCallback((event: EventItem) => {
    setShowLetterPickerModal(false);
    handleOpenLetter(event);
  }, [handleOpenLetter]);

  const handleDeleteClick = useCallback((ev: EventItem) => {
    setDeletingEvent(ev);
    setShowDeleteModal(true);
  }, []);

  const handleDetailClick = useCallback((ev: EventItem) => {
    setDetailEvent(ev);
    setShowDetailModal(true);
  }, []);

  const handleSave = useCallback(async (data: Partial<EventItem>) => {
    let success = false;

    if (editingEvent) {
      success = await updateEvent({ ...editingEvent, ...data } as EventItem);
      if (success) showToast('success', 'Berhasil diperbarui!', `"${data.acara}" telah diperbarui.`);
      else showToast('error', 'Gagal memperbarui', 'Perubahan belum tersimpan. Silakan coba lagi.');
    } else {
      const newEv: EventItem = {
        ...data as EventItem,
        id: createId(),
        rowIndex: events.length + 1,
        status: data.status || 'upcoming',
      };
      success = await addEvent(newEv);
      if (success) showToast('success', 'Acara ditambahkan!', `"${data.acara}" berhasil ditambahkan.`);
      else showToast('error', 'Gagal menambahkan', 'Acara belum tersimpan. Silakan periksa koneksi lalu coba lagi.');
    }

    if (success) {
      setShowCrudModal(false);
      setEditingEvent(null);
      setInitialEventData(null);
    }

    return success;
  }, [editingEvent, events.length, addEvent, updateEvent, showToast]);

  const handleSaveBatch = useCallback(async (evs: EventItem[]) => {
    const success = await addRecurringEvents(evs);
    if (success) showToast('success', 'Event reguler ditambahkan!', `${evs.length} event berhasil dibuat.`);
    else showToast('error', 'Gagal menambahkan', 'Event reguler belum tersimpan. Silakan coba lagi.');
    if (success) {
      setShowCrudModal(false);
      setEditingEvent(null);
      setInitialEventData(null);
    }
    return success;
  }, [addRecurringEvents, showToast]);

  const handleDeleteSeries = useCallback(async (groupId: string) => {
    const success = await deleteRecurringSeries(groupId);
    if (success) showToast('success', 'Rangkaian dihapus!', 'Seluruh event dalam rangkaian telah dihapus.');
    else showToast('error', 'Gagal menghapus', 'Rangkaian belum berhasil dihapus.');
    setShowDetailModal(false);
    setDetailEvent(null);
    return success;
  }, [deleteRecurringSeries, showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingEvent) return false;
    const success = await deleteEvent(deletingEvent.id);
    if (success) showToast('success', 'Acara dihapus!', `"${deletingEvent.acara}" telah dihapus.`);
    setDeletingEvent(null);
    setShowDeleteModal(false);
    if (!success) showToast('error', 'Gagal menghapus', 'Acara belum berhasil dihapus.');
    return success;
  }, [deletingEvent, deleteEvent, showToast]);

  const handleSaveDraft = useCallback(async (data: Partial<DraftEventItem>) => {
    let success = false;

    if (editingDraft) {
      success = await updateDraft({ ...editingDraft, ...data } as DraftEventItem);
      if (success) showToast('success', 'Draft diperbarui', `"${data.acara}" berhasil diperbarui.`);
      else showToast('error', 'Gagal memperbarui draft', 'Perubahan draft belum tersimpan.');
    } else {
      const newDraft: DraftEventItem = {
        ...data as DraftEventItem,
        id: createId(),
        rowIndex: draftEvents.length + 1,
        progress: data.progress || 'draft',
        published: false,
        publishedAt: '',
        deleted: false,
        deletedAt: '',
      };
      success = await addDraft(newDraft);
      if (success) showToast('success', 'Draft ditambahkan', `"${data.acara}" masuk ke queue aktif.`);
      else showToast('error', 'Gagal menambahkan draft', 'Draft event belum tersimpan.');
    }

    if (success) {
      setShowDraftModal(false);
      setEditingDraft(null);
    }

    return success;
  }, [editingDraft, draftEvents.length, addDraft, updateDraft, showToast]);

  const handleDeleteDraft = useCallback(async (draft: DraftEventItem) => {
    if (!window.confirm(`Hapus draft event "${draft.acara}"?`)) return;
    const success = await deleteDraft(draft.id);
    if (success) showToast('success', 'Draft dipindahkan ke riwayat', `"${draft.acara}" ditandai sebagai dihapus.`);
    else showToast('error', 'Gagal menghapus draft', 'Draft event belum terhapus.');
  }, [deleteDraft, showToast]);

  const handlePublishDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.progress !== 'confirm') {
      showToast('warning', 'Belum bisa dipublish', 'Draft harus berstatus confirm sebelum dipublish.');
      return;
    }
    if (!window.confirm(`Publish draft event "${draft.acara}" ke schedule utama?`)) return;

    const success = await publishDraft(draft.id);
    if (success) {
      await refreshEvents();
      showToast('success', 'Draft dipublish', `"${draft.acara}" sudah masuk ke schedule utama.`);
    } else {
      showToast('error', 'Gagal publish draft', 'Publish ke schedule utama belum berhasil.');
    }
  }, [publishDraft, refreshEvents, showToast]);

  const handleDraftProgressChange = useCallback(async (draft: DraftEventItem, progress: DraftEventItem['progress']) => {
    const success = await updateDraft({ ...draft, progress });
    if (success) {
      showToast('success', 'Progress diperbarui', `Draft "${draft.acara}" sekarang berstatus ${progress}.`);
    } else {
      showToast('error', 'Gagal memperbarui progress', 'Progress draft belum berubah.');
    }
  }, [updateDraft, showToast]);

  const handleRestoreDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.published) {
      showToast('warning', 'Tidak bisa dipulihkan', 'Draft yang sudah dipublish tidak dapat dipulihkan.');
      return;
    }
    if (!window.confirm(`Pulihkan draft event "${draft.acara}" ke queue aktif?`)) return;

    const success = await restoreDraft(draft.id);
    if (success) {
      showToast('success', 'Draft dipulihkan', `"${draft.acara}" kembali ke queue aktif.`);
    } else {
      showToast('error', 'Gagal memulihkan draft', 'Draft event belum berhasil dipulihkan.');
    }
  }, [restoreDraft, showToast]);

  const handleSubmitLetter = useCallback(async (data: LetterRequestItem) => {
    try {
      await createLetterRequest(data);
      showToast('success', 'Permintaan surat dikirim', 'Data berhasil masuk ke workflow Google Form dan AutoCrat akan membuat dokumennya otomatis.');
      return true;
    } catch (error) {
      console.error('Letter request error:', error);
      showToast('error', 'Gagal mengirim surat', 'Data surat belum berhasil dikirim ke Google Form. Periksa koneksi lalu coba lagi.');
      return false;
    }
  }, [showToast]);

  return {
    showLoginModal,
    setShowLoginModal,
    showCrudModal,
    setShowCrudModal,
    showDraftModal,
    setShowDraftModal,
    showLetterPickerModal,
    setShowLetterPickerModal,
    showLetterModal,
    setShowLetterModal,
    showDeleteModal,
    setShowDeleteModal,
    showDetailModal,
    setShowDetailModal,
    showDraftHistory,
    setShowDraftHistory,
    showThemeModal,
    setShowThemeModal,
    editingEvent,
    setEditingEvent,
    editingDraft,
    setEditingDraft,
    editingTheme,
    setEditingTheme,
    letterEvent,
    setLetterEvent,
    deletingEvent,
    setDeletingEvent,
    detailEvent,
    setDetailEvent,
    showInstagramSettings,
    setShowInstagramSettings,
    instagramPosts,
    showAlbumManager,
    setShowAlbumManager,
    heroImageUrl,
    landingAlbums,
    communityRegistrations,
    isRegLoading,
    showRegDetail,
    setShowRegDetail,
    selectedRegistration,
    setSelectedRegistration,
    initialEventData,
    setInitialEventData,
    refreshRegistrations,
    handleRegDetail,
    handleUpdateRegStatus,
    handleCreateEventFromRegistration,
    handleSaveInstagramPosts,
    handleSaveHeroImage,
    handleLogout,
    handleAddNew,
    handleEdit,
    handleAddDraft,
    handleEditDraft,
    handleOpenLetterPicker,
    handleAddTheme,
    handleEditTheme,
    handleSaveTheme,
    handleDeleteTheme,
    handleOpenLetter,
    handleSelectLetterEvent,
    handleDeleteClick,
    handleDetailClick,
    handleSave,
    handleSaveBatch,
    handleDeleteSeries,
    handleDeleteConfirm,
    handleSaveDraft,
    handleDeleteDraft,
    handlePublishDraft,
    handleDraftProgressChange,
    handleRestoreDraft,
    handleSubmitLetter,
  };
}
