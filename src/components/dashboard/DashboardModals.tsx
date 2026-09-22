import { Suspense, lazy } from 'react';
import { AdminLoginModal } from '../AdminLoginModal';
import type { EventItem, DraftEventItem, AnnualTheme, CommunityRegistration, RegistrationStatus, EventArea } from '../../types';

const EventCrudModal = lazy(() => import('../EventCrudModal').then(m => ({ default: m.EventCrudModal })));
const DraftCrudModal = lazy(() => import('../DraftCrudModal').then(m => ({ default: m.DraftCrudModal })));
const AnnualThemeCrudModal = lazy(() => import('../AnnualThemeCrudModal').then(m => ({ default: m.AnnualThemeCrudModal })));
const DeleteConfirmModal = lazy(() => import('../DeleteConfirmModal').then(m => ({ default: m.DeleteConfirmModal })));
const EventDetailModal = lazy(() => import('../EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const CommunityRegistrationDetailModal = lazy(() => import('../CommunityRegistrationDetailModal').then(m => ({ default: m.CommunityRegistrationDetailModal })));
import type { LoginResult } from '../../types/auth';

interface DashboardModalsProps {
  // Login modal
  showLoginModal: boolean;
  onCloseLoginModal: () => void;
  onEmailLogin: (email: string, password: string) => Promise<LoginResult>;

  // CRUD modal
  showCrudModal: boolean;
  onCloseCrudModal: () => void;
  onSave: (data: Partial<EventItem>) => Promise<boolean>;
  onSaveBatch: (evs: EventItem[]) => Promise<boolean>;
  editingEvent: EventItem | null;
  events: EventItem[];
  eventAreas: EventArea[];
  initialEventData?: Partial<EventItem> | null;
  organizationOptions?: { id: string; name: string }[];

  // Draft modal
  showDraftModal: boolean;
  onCloseDraftModal: () => void;
  onSaveDraft: (data: Partial<DraftEventItem>) => Promise<boolean>;
  editingDraft: DraftEventItem | null;
  draftEvents: DraftEventItem[];

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

  // Registration detail modal
  showRegDetail: boolean;
  onCloseRegDetail: () => void;
  selectedRegistration: CommunityRegistration | null;
  onUpdateRegStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
  onCreateEventFromRegistration?: (registration: CommunityRegistration) => void;

  /** Akun demo: modal konten tampil tanpa aksi mutasi. */
  readOnly?: boolean;
}

export function DashboardModals({
  showLoginModal,
  onCloseLoginModal,
  onEmailLogin,
  showCrudModal,
  onCloseCrudModal,
  onSave,
  editingEvent,
  events,
  eventAreas,
  initialEventData,
  organizationOptions = [],
  showDraftModal,
  onCloseDraftModal,
  onSaveDraft,
  editingDraft,
  draftEvents,
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
  showRegDetail,
  onCloseRegDetail,
  selectedRegistration,
  onUpdateRegStatus,
  onCreateEventFromRegistration,
  /** Akun demo: modal konten tampil tanpa aksi mutasi. */
  readOnly = false,
}: DashboardModalsProps) {
  return (
    <>
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={onCloseLoginModal}
        onEmailLogin={onEmailLogin}
      />
      <Suspense fallback={null}>
        {showCrudModal && (
          <EventCrudModal
            isOpen={showCrudModal}
            onClose={onCloseCrudModal}
            onSave={onSave}
            editingEvent={editingEvent}
            events={events}
            eventAreas={eventAreas}
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
            eventAreas={eventAreas}
            draftEvents={draftEvents}
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
        {showRegDetail && (
          <CommunityRegistrationDetailModal
            isOpen={showRegDetail}
            onClose={onCloseRegDetail}
            registration={selectedRegistration}
            onUpdateStatus={onUpdateRegStatus}
            onCreateEvent={onCreateEventFromRegistration}
            readOnly={readOnly}
          />
        )}
      </Suspense>
    </>
  );
}
