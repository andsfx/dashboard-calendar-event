import { useEffect } from 'react';
import type { ToastMessage, EventItem, DraftEventItem, AnnualTheme } from '../types';
import { useEventHandlers, type EventHandlersResult } from './useEventHandlers';
import { useDraftHandlers, type DraftHandlersResult } from './useDraftHandlers';
import { useThemeHandlers, type ThemeHandlersResult } from './useThemeHandlers';
import { useLetterHandlers } from './useLetterHandlers';
import { useRegistrationHandlers, type RegistrationHandlersResult } from './useRegistrationHandlers';
import { useSiteSettingsHandlers, type SiteSettingsHandlersResult } from './useSiteSettingsHandlers';

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
    showToast, logout,
    events, addEvent, updateEvent, deleteEvent,
    addRecurringEvents, deleteRecurringSeries,
    addTheme, updateTheme, deleteTheme,
    refreshEvents,
    draftEvents, addDraft, updateDraft, deleteDraft,
    publishDraft, restoreDraft,
    canViewRegistrations, dashboardPath, draftError,
  } = deps;

  const event: EventHandlersResult = useEventHandlers({
    showToast,
    eventsLength: events.length,
    addEvent, updateEvent, deleteEvent,
    addRecurringEvents, deleteRecurringSeries,
  });

  const draft: DraftHandlersResult = useDraftHandlers({
    showToast,
    draftEventsLength: draftEvents.length,
    addDraft, updateDraft, deleteDraft,
    publishDraft, restoreDraft,
    refreshEvents,
  });

  const theme: ThemeHandlersResult = useThemeHandlers({
    showToast,
    addTheme, updateTheme, deleteTheme,
  });

  const letter = useLetterHandlers();

  const reg: RegistrationHandlersResult = useRegistrationHandlers({
    showToast,
    canViewRegistrations, dashboardPath,
    setEditingDraft: draft.setEditingDraft,
    setShowDraftModal: draft.setShowDraftModal,
  });

  const site: SiteSettingsHandlersResult = useSiteSettingsHandlers({
    showToast,
    logout,
  });

  useEffect(() => {
    if (draftError && dashboardPath === '/drafts') {
      showToast('error', 'Gagal memuat draft', draftError);
    }
  }, [dashboardPath, draftError, showToast]);

  return {
    showLoginModal: site.showLoginModal,
    setShowLoginModal: site.setShowLoginModal,
    showInstagramSettings: site.showInstagramSettings,
    setShowInstagramSettings: site.setShowInstagramSettings,
    instagramPosts: site.instagramPosts,
    showAlbumManager: site.showAlbumManager,
    setShowAlbumManager: site.setShowAlbumManager,
    heroImageUrl: site.heroImageUrl,
    landingAlbums: site.landingAlbums,
    showNewsManager: site.showNewsManager,
    setShowNewsManager: site.setShowNewsManager,
    handleSaveInstagramPosts: site.handleSaveInstagramPosts,
    handleSaveHeroImage: site.handleSaveHeroImage,
    handleLogout: site.handleLogout,

    showCrudModal: event.showCrudModal, setShowCrudModal: event.setShowCrudModal,
    showDeleteModal: event.showDeleteModal, setShowDeleteModal: event.setShowDeleteModal,
    showDetailModal: event.showDetailModal, setShowDetailModal: event.setShowDetailModal,
    editingEvent: event.editingEvent, setEditingEvent: event.setEditingEvent,
    deletingEvent: event.deletingEvent, setDeletingEvent: event.setDeletingEvent,
    detailEvent: event.detailEvent, setDetailEvent: event.setDetailEvent,
    initialEventData: event.initialEventData, setInitialEventData: event.setInitialEventData,
    handleAddNew: event.handleAddNew, handleEdit: event.handleEdit,
    handleSave: event.handleSave, handleSaveBatch: event.handleSaveBatch,
    handleDeleteClick: event.handleDeleteClick, handleDeleteConfirm: event.handleDeleteConfirm,
    handleDeleteSeries: event.handleDeleteSeries, handleDetailClick: event.handleDetailClick,

    showDraftModal: draft.showDraftModal, setShowDraftModal: draft.setShowDraftModal,
    showDraftHistory: draft.showDraftHistory, setShowDraftHistory: draft.setShowDraftHistory,
    editingDraft: draft.editingDraft, setEditingDraft: draft.setEditingDraft,
    handleAddDraft: draft.handleAddDraft, handleEditDraft: draft.handleEditDraft,
    handleSaveDraft: draft.handleSaveDraft, handleDeleteDraft: draft.handleDeleteDraft,
    handlePublishDraft: draft.handlePublishDraft,
    handleDraftProgressChange: draft.handleDraftProgressChange,
    handleRestoreDraft: draft.handleRestoreDraft,

    showThemeModal: theme.showThemeModal, setShowThemeModal: theme.setShowThemeModal,
    editingTheme: theme.editingTheme, setEditingTheme: theme.setEditingTheme,
    handleAddTheme: theme.handleAddTheme, handleEditTheme: theme.handleEditTheme,
    handleSaveTheme: theme.handleSaveTheme, handleDeleteTheme: theme.handleDeleteTheme,

    showLetterPickerModal: letter.showLetterPickerModal, setShowLetterPickerModal: letter.setShowLetterPickerModal,
    showLetterModal: letter.showLetterModal, setShowLetterModal: letter.setShowLetterModal,
    letterEvent: letter.letterEvent, setLetterEvent: letter.setLetterEvent,
    handleOpenLetterPicker: letter.handleOpenLetterPicker,
    handleOpenLetter: letter.handleOpenLetter,
    handleSelectLetterEvent: letter.handleSelectLetterEvent,

    communityRegistrations: reg.communityRegistrations, isRegLoading: reg.isRegLoading,
    showRegDetail: reg.showRegDetail, setShowRegDetail: reg.setShowRegDetail,
    selectedRegistration: reg.selectedRegistration, setSelectedRegistration: reg.setSelectedRegistration,
    refreshRegistrations: reg.refreshRegistrations,
    handleRegDetail: reg.handleRegDetail, handleUpdateRegStatus: reg.handleUpdateRegStatus,
    handleCreateEventFromRegistration: reg.handleCreateEventFromRegistration,
  };
}