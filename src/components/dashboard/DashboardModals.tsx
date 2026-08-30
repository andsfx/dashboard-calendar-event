import { Suspense, lazy } from 'react';
import { AdminLoginModal } from '../AdminLoginModal';
import type { EventItem, DraftEventItem, LetterRequestItem, AnnualTheme, CommunityRegistration, RegistrationStatus } from '../../types';

const EventCrudModal = lazy(() => import('../EventCrudModal').then(m => ({ default: m.EventCrudModal })));
const DraftCrudModal = lazy(() => import('../DraftCrudModal').then(m => ({ default: m.DraftCrudModal })));
const EventLetterPickerModal = lazy(() => import('../EventLetterPickerModal').then(m => ({ default: m.EventLetterPickerModal })));
const LetterGenerator = lazy(() => import('../LetterGenerator').then(m => ({ default: m.LetterGenerator })));
const AnnualThemeCrudModal = lazy(() => import('../AnnualThemeCrudModal').then(m => ({ default: m.AnnualThemeCrudModal })));
const DeleteConfirmModal = lazy(() => import('../DeleteConfirmModal').then(m => ({ default: m.DeleteConfirmModal })));
const EventDetailModal = lazy(() => import('../EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const InstagramSettingsModal = lazy(() => import('../InstagramSettingsModal').then(m => ({ default: m.InstagramSettingsModal })));
const AlbumManagerModal = lazy(() => import('../AlbumManagerModal').then(m => ({ default: m.AlbumManagerModal })));
const NewsManagerModal = lazy(() => import('../NewsManagerModal').then(m => ({ default: m.NewsManagerModal })));
const SponsorManagerModal = lazy(() => import('../SponsorManagerModal').then(m => ({ default: m.SponsorManagerModal })));
const CommunityRegistrationDetailModal = lazy(() => import('../CommunityRegistrationDetailModal').then(m => ({ default: m.CommunityRegistrationDetailModal })));
const EventAreaManagerModal = lazy(() => import('../EventAreaManagerModal').then(m => ({ default: m.EventAreaManagerModal })));
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
  initialEventData?: Partial<EventItem> | null;
  organizationOptions?: { id: string; name: string }[];

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

  // Letter generator modal
  showLetterModal: boolean;
  onCloseLetterModal: () => void;
  letterEvent: EventItem | null;

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
  showNewsManager: boolean;
  onCloseNewsManager: () => void;
  showSponsorManager: boolean;
  onCloseSponsorManager: () => void;
  showEventAreaManager: boolean;
  onCloseEventAreaManager: () => void;

  // Registration detail modal
  showRegDetail: boolean;
  onCloseRegDetail: () => void;
  selectedRegistration: CommunityRegistration | null;
  onUpdateRegStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
  onCreateEventFromRegistration?: (registration: CommunityRegistration) => void;
}

export function DashboardModals({
  showLoginModal,
  onCloseLoginModal,
  onEmailLogin,
  onLegacyLogin,
  showCrudModal,
  onCloseCrudModal,
  onSave,
  editingEvent,
  events,
  initialEventData,
  organizationOptions = [],
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
  letterEvent,
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
  showNewsManager,
  onCloseNewsManager,
  showSponsorManager,
  onCloseSponsorManager,
  showEventAreaManager,
  onCloseEventAreaManager,
  showRegDetail,
  onCloseRegDetail,
  selectedRegistration,
  onUpdateRegStatus,
  onCreateEventFromRegistration,
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
        {showCrudModal && (
          <EventCrudModal
            isOpen={showCrudModal}
            onClose={onCloseCrudModal}
            onSave={onSave}
            editingEvent={editingEvent}
            events={events}
            initialData={initialEventData}
            organizationOptions={organizationOptions}
          />
        )}
        {showDraftModal && (
          <DraftCrudModal
            isOpen={showDraftModal}
            onClose={onCloseDraftModal}
            onSave={onSaveDraft}
            editingDraft={editingDraft}
            events={events}
            draftEvents={draftEvents}
          />
        )}
        {showLetterPickerModal && (
          <EventLetterPickerModal
            isOpen={showLetterPickerModal}
            onClose={onCloseLetterPickerModal}
            events={publicEvents}
            onSelect={onSelectLetterEvent}
          />
        )}
        {showLetterModal && (
          <LetterGenerator
            isOpen={showLetterModal}
            onClose={onCloseLetterModal}
            event={letterEvent}
          />
        )}
        {showThemeModal && (
          <AnnualThemeCrudModal
            isOpen={showThemeModal}
            onClose={onCloseThemeModal}
            onSave={onSaveTheme}
            editingTheme={editingTheme}
          />
        )}
        {showDeleteModal && (
          <DeleteConfirmModal
            isOpen={showDeleteModal}
            event={deletingEvent}
            onClose={onCloseDeleteModal}
            onConfirm={onDeleteConfirm}
          />
        )}
        {showDetailModal && (
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
        )}
        {showInstagramSettings && (
          <InstagramSettingsModal
            isOpen={showInstagramSettings}
            onClose={onCloseInstagramSettings}
            posts={instagramPosts}
            onSave={onSaveInstagramPosts}
            heroImageUrl={heroImageUrl}
            onSaveHeroImage={onSaveHeroImage}
          />
        )}
        {showAlbumManager && (
          <AlbumManagerModal
            isOpen={showAlbumManager}
            onClose={onCloseAlbumManager}
            pastEvents={pastEvents}
            annualThemes={annualThemes}
          />
        )}
        {showNewsManager && (
          <NewsManagerModal
            isOpen={showNewsManager}
            onClose={onCloseNewsManager}
          />
        )}
        {showSponsorManager && (
          <SponsorManagerModal
            isOpen={showSponsorManager}
            onClose={onCloseSponsorManager}
          />
        )}
        {showEventAreaManager && (
          <EventAreaManagerModal
            isOpen={showEventAreaManager}
            onClose={onCloseEventAreaManager}
          />
        )}
        {showRegDetail && (
          <CommunityRegistrationDetailModal
            isOpen={showRegDetail}
            onClose={onCloseRegDetail}
            registration={selectedRegistration}
            onUpdateStatus={onUpdateRegStatus}
            onCreateEvent={onCreateEventFromRegistration}
          />
        )}
      </Suspense>
    </>
  );
}
