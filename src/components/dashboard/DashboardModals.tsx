import { Suspense, lazy } from 'react';
import { AdminLoginModal } from '../AdminLoginModal';
import type { EventItem, DraftEventItem, LetterRequestItem, AnnualTheme, CommunityRegistration, RegistrationStatus } from '../../types';

const EventCrudModal = lazy(() => import('../EventCrudModal').then(m => ({ default: m.EventCrudModal })));
const DraftCrudModal = lazy(() => import('../DraftCrudModal').then(m => ({ default: m.DraftCrudModal })));
const EventLetterPickerModal = lazy(() => import('../EventLetterPickerModal').then(m => ({ default: m.EventLetterPickerModal })));
const DraftLetterModal = lazy(() => import('../DraftLetterModal').then(m => ({ default: m.DraftLetterModal })));
const AnnualThemeCrudModal = lazy(() => import('../AnnualThemeCrudModal').then(m => ({ default: m.AnnualThemeCrudModal })));
const DeleteConfirmModal = lazy(() => import('../DeleteConfirmModal').then(m => ({ default: m.DeleteConfirmModal })));
const EventDetailModal = lazy(() => import('../EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const InstagramSettingsModal = lazy(() => import('../InstagramSettingsModal').then(m => ({ default: m.InstagramSettingsModal })));
const AlbumManagerModal = lazy(() => import('../AlbumManagerModal').then(m => ({ default: m.AlbumManagerModal })));
const CommunityRegistrationDetailModal = lazy(() => import('../CommunityRegistrationDetailModal').then(m => ({ default: m.CommunityRegistrationDetailModal })));

import type { LoginResult } from '../../types/auth';

interface DashboardModalsProps {
  // Login modal
  showLoginModal: boolean;
  onCloseLoginModal: () => void;
  onEmailLogin: (email: string, password: string) => Promise<LoginResult>;
  onLegacyLogin: (password: string) => Promise<LoginResult>;

  // CRUD modal
  showCrudModal: boolean;
  onCloseCrudModal: () => void;
  onSave: (data: Partial<EventItem>) => Promise<boolean>;
  onSaveBatch: (evs: EventItem[]) => Promise<boolean>;
  editingEvent: EventItem | null;
  events: EventItem[];

  // Draft modal
  showDraftModal: boolean;
  onCloseDraftModal: () => void;
  onSaveDraft: (data: Partial<DraftEventItem>) => Promise<boolean>;
  editingDraft: DraftEventItem | null;
  draftEvents: DraftEventItem[];

  // Letter picker modal
  showLetterPickerModal: boolean;
  onCloseLetterPickerModal: () => void;
  publicEvents: EventItem[];
  onSelectLetterEvent: (event: EventItem) => void;

  // Letter modal
  showLetterModal: boolean;
  onCloseLetterModal: () => void;
  letterInitialData: Partial<LetterRequestItem> | null;
  onSubmitLetter: (data: LetterRequestItem) => Promise<boolean>;

  // Theme modal
  showThemeModal: boolean;
  onCloseThemeModal: () => void;
  onSaveTheme: (theme: AnnualTheme) => Promise<boolean>;
  editingTheme: AnnualTheme | null;

  // Delete modal
  showDeleteModal: boolean;
  onCloseDeleteModal: () => void;
  deletingEvent: EventItem | null;
  onDeleteConfirm: () => Promise<boolean>;

  // Detail modal
  showDetailModal: boolean;
  onCloseDetailModal: () => void;
  detailEvent: EventItem | null;
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
  onDeleteSeries?: (groupId: string) => Promise<boolean>;
  isAdmin: boolean;

  // Instagram settings modal
  showInstagramSettings: boolean;
  onCloseInstagramSettings: () => void;
  instagramPosts: string[];
  onSaveInstagramPosts: (posts: string[]) => Promise<boolean>;
  heroImageUrl: string;
  onSaveHeroImage: (url: string) => Promise<boolean>;

  // Album manager modal
  showAlbumManager: boolean;
  onCloseAlbumManager: () => void;
  pastEvents: EventItem[];
  annualThemes: AnnualTheme[];

  // Registration detail modal
  showRegDetail: boolean;
  onCloseRegDetail: () => void;
  selectedRegistration: CommunityRegistration | null;
  onUpdateRegStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
}

export function DashboardModals({
  showLoginModal,
  onCloseLoginModal,
  onEmailLogin,
  onLegacyLogin,
  showCrudModal,
  onCloseCrudModal,
  onSave,
  onSaveBatch,
  editingEvent,
  events,
  showDraftModal,
  onCloseDraftModal,
  onSaveDraft,
  editingDraft,
  draftEvents,
  showLetterPickerModal,
  onCloseLetterPickerModal,
  publicEvents,
  onSelectLetterEvent,
  showLetterModal,
  onCloseLetterModal,
  letterInitialData,
  onSubmitLetter,
  showThemeModal,
  onCloseThemeModal,
  onSaveTheme,
  editingTheme,
  showDeleteModal,
  onCloseDeleteModal,
  deletingEvent,
  onDeleteConfirm,
  showDetailModal,
  onCloseDetailModal,
  detailEvent,
  onEdit,
  onDelete,
  onDeleteSeries,
  isAdmin,
  showInstagramSettings,
  onCloseInstagramSettings,
  instagramPosts,
  onSaveInstagramPosts,
  heroImageUrl,
  onSaveHeroImage,
  showAlbumManager,
  onCloseAlbumManager,
  pastEvents,
  annualThemes,
  showRegDetail,
  onCloseRegDetail,
  selectedRegistration,
  onUpdateRegStatus,
}: DashboardModalsProps) {
  return (
    <>
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={onCloseLoginModal}
        onEmailLogin={onEmailLogin}
        onLegacyLogin={onLegacyLogin}
      />
      <Suspense fallback={null}>
        <EventCrudModal
          isOpen={showCrudModal}
          onClose={onCloseCrudModal}
          onSave={onSave}
          onSaveBatch={onSaveBatch}
          editingEvent={editingEvent}
          events={events}
        />
        <DraftCrudModal
          isOpen={showDraftModal}
          onClose={onCloseDraftModal}
          onSave={onSaveDraft}
          editingDraft={editingDraft}
          events={events}
          draftEvents={draftEvents}
        />
        <EventLetterPickerModal
          isOpen={showLetterPickerModal}
          onClose={onCloseLetterPickerModal}
          events={publicEvents}
          onSelect={onSelectLetterEvent}
        />
        <DraftLetterModal
          isOpen={showLetterModal}
          onClose={onCloseLetterModal}
          initialData={letterInitialData}
          onSubmit={onSubmitLetter}
        />
        <AnnualThemeCrudModal
          isOpen={showThemeModal}
          onClose={onCloseThemeModal}
          onSave={onSaveTheme}
          editingTheme={editingTheme}
        />
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          event={deletingEvent}
          onClose={onCloseDeleteModal}
          onConfirm={onDeleteConfirm}
        />
        <EventDetailModal
          isOpen={showDetailModal}
          event={detailEvent}
          onClose={onCloseDetailModal}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeleteSeries={onDeleteSeries}
          events={events}
          isAdmin={isAdmin}
        />
        <InstagramSettingsModal
          isOpen={showInstagramSettings}
          onClose={onCloseInstagramSettings}
          posts={instagramPosts}
          onSave={onSaveInstagramPosts}
          heroImageUrl={heroImageUrl}
          onSaveHeroImage={onSaveHeroImage}
        />
        <AlbumManagerModal
          isOpen={showAlbumManager}
          onClose={onCloseAlbumManager}
          pastEvents={pastEvents}
          annualThemes={annualThemes}
        />
        <CommunityRegistrationDetailModal
          isOpen={showRegDetail}
          onClose={onCloseRegDetail}
          registration={selectedRegistration}
          onUpdateStatus={onUpdateRegStatus}
        />
      </Suspense>
    </>
  );
}
