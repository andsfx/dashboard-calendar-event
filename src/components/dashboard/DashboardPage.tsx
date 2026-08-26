import { Suspense, lazy } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { List, Kanban, Clock4, CalendarDays, Radio, Clock3 } from 'lucide-react';
import type { AuthUser, LoginResult } from '../../types/auth';
import type { Permissions } from '../../hooks/usePermission';
import type { EventItem, DraftEventItem, AnnualTheme, HolidayItem, ViewMode, CommunityRegistration, ToastMessage, PhotoAlbum, EventStatus, RegistrationStatus } from '../../types';
import type { SectionNavItem } from '../SectionNav';
import { DashboardShell } from './DashboardShell';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStats } from './DashboardStats';
import { CommandCenterSummary } from './CommandCenterSummary';
import { DashboardModals } from './DashboardModals';
import { ToastContainer } from '../ToastContainer';
import { ViewToggle } from './ViewToggle';

const VIEW_TABS: Array<{ key: ViewMode; label: string; icon: ReactNode }> = [
  { key: 'table',    label: 'Tabel',    icon: <List         className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  { key: 'calendar', label: 'Kalender', icon: <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  { key: 'kanban',   label: 'Kanban',   icon: <Kanban       className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  { key: 'timeline', label: 'Timeline', icon: <Clock4       className="h-3.5 w-3.5" strokeWidth={1.5} /> },
];

/** Gate calendar + kanban tabs to editors — mirrors the HTML prototype view-toggle roles. */
export function getAvailableViewTabs(canEditEvents: boolean): Array<{ key: ViewMode; label: string; icon: ReactNode }> {
  return canEditEvents
    ? VIEW_TABS
    : VIEW_TABS.filter(tab => tab.key !== 'calendar' && tab.key !== 'kanban');
}

const FeaturedEvents = lazy(() => import('../FeaturedEvents').then(m => ({ default: m.FeaturedEvents })));
const QuarterTimeline = lazy(() => import('../QuarterTimeline').then(m => ({ default: m.QuarterTimeline })));
const CalendarView = lazy(() => import('../CalendarView').then(m => ({ default: m.CalendarView })));
const AdminDraftSection = lazy(() => import('../AdminDraftSection').then(m => ({ default: m.AdminDraftSection })));
const CommunityRegistrationSection = lazy(() => import('../CommunityRegistrationSection').then(m => ({ default: m.CommunityRegistrationSection })));
const DashboardViewsSection = lazy(() => import('../DashboardViewsSection').then(m => ({ default: m.DashboardViewsSection })));
const AnalyticsDashboard = lazy(() => import('../admin/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const SurveyDashboard = lazy(() => import('../survey/SurveyDashboard').then(m => ({ default: m.SurveyDashboard })));
const TenantSurveyPage = lazy(() => import('../survey/TenantSurveyPage'));
const UserManagement = lazy(() => import('../admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ActivityLog = lazy(() => import('../admin/ActivityLog').then(m => ({ default: m.ActivityLog })));

function SectionFallback({ height = 'h-32' }: { height?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 ${height}`} />;
}

// ─── Props ───────────────────────────────────────────────────────

export interface DashboardPageAuth {
  user: AuthUser | null;
  isSuperadmin: boolean;
  isLegacy: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  legacyLogin: (password: string) => Promise<LoginResult>;
}

export interface DashboardPageEvents {
  events: EventItem[];
  publicEvents: EventItem[];
  visibleEvents: EventItem[];
  visibleStats: { total: number; ongoing: number; upcoming: number; past: number };
  ongoingEvents: EventItem[];
  upcomingEvents: EventItem[];
  holidays: HolidayItem[];
  annualThemes: AnnualTheme[];
  error: string | null;
}

export interface DashboardPageDrafts {
  activeDrafts: DraftEventItem[];
  draftHistory: DraftEventItem[];
  draftEvents: DraftEventItem[];
  isDraftLoading: boolean;
  draftError: string | null;
}

export interface DashboardPageFilters {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeFilter: EventStatus | 'Semua';
  setActiveFilter: (v: EventStatus | 'Semua') => void;
  activeCategory: string;
  setActiveCategory: (v: string) => void;
  activePriority: string;
  setActivePriority: (v: string) => void;
  activeMonth: string;
  setActiveMonth: (v: string) => void;
  visibleCategories: string[];
  visibleMonths: string[];
}

export interface DashboardPageView {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

export interface DashboardPageHandlers {
  handleLogout: () => void;
  handleAddNew: () => void;
  handleEdit: (ev: EventItem) => void;
  handleAddDraft: () => void;
  handleEditDraft: (draft: DraftEventItem) => void;
  handleOpenLetterPicker: () => void;
  handleAddTheme: () => void;
  handleEditTheme: (theme: AnnualTheme) => void;
  handleSaveTheme: (theme: AnnualTheme) => Promise<boolean>;
  handleDeleteTheme: (theme: AnnualTheme) => void;
  handleUpdateRegStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
  handleSelectLetterEvent: (event: EventItem) => void;
  handleDeleteClick: (ev: EventItem) => void;
  handleDetailClick: (ev: EventItem) => void;
  handleSave: (data: Partial<EventItem>) => Promise<boolean>;
  handleSaveBatch: (evs: EventItem[]) => Promise<boolean>;
  handleDeleteSeries: (groupId: string) => Promise<boolean>;
  handleDeleteConfirm: () => Promise<boolean>;
  handleSaveDraft: (data: Partial<DraftEventItem>) => Promise<boolean>;
  handleDeleteDraft: (draft: DraftEventItem) => void;
  handlePublishDraft: (draft: DraftEventItem) => void;
  handleDraftProgressChange: (draft: DraftEventItem, progress: DraftEventItem['progress']) => void;
  handleRestoreDraft: (draft: DraftEventItem) => void;
  handleCreateEventFromRegistration: (registration: CommunityRegistration) => void;
  handleSaveInstagramPosts: (posts: string[]) => Promise<boolean>;
  handleSaveHeroImage: (url: string) => Promise<boolean>;
  handleRegDetail: (reg: CommunityRegistration) => void;
}

export interface DashboardPageModalState {
  showLoginModal: boolean;           setShowLoginModal: (v: boolean) => void;
  showCrudModal: boolean;            setShowCrudModal: (v: boolean) => void;
  showDraftModal: boolean;           setShowDraftModal: (v: boolean) => void;
  showLetterPickerModal: boolean;    setShowLetterPickerModal: (v: boolean) => void;
  showLetterModal: boolean;          setShowLetterModal: (v: boolean) => void;
  showDeleteModal: boolean;          setShowDeleteModal: (v: boolean) => void;
  showDetailModal: boolean;          setShowDetailModal: (v: boolean) => void;
  showDraftHistory: boolean;         setShowDraftHistory: React.Dispatch<React.SetStateAction<boolean>>;
  showThemeModal: boolean;           setShowThemeModal: (v: boolean) => void;
}

export interface DashboardPageModalData {
  editingEvent: EventItem | null;           setEditingEvent: (v: EventItem | null) => void;
  editingDraft: DraftEventItem | null;       setEditingDraft: (v: DraftEventItem | null) => void;
  editingTheme: AnnualTheme | null;          setEditingTheme: (v: AnnualTheme | null) => void;
  letterEvent: EventItem | null;             setLetterEvent: (v: EventItem | null) => void;
  deletingEvent: EventItem | null;           setDeletingEvent: (v: EventItem | null) => void;
  detailEvent: EventItem | null;             setDetailEvent: (v: EventItem | null) => void;
  initialEventData: Partial<EventItem> | null; setInitialEventData: (v: Partial<EventItem> | null) => void;
}

export interface DashboardPageRegistrations {
  communityRegistrations: CommunityRegistration[];
  isRegLoading: boolean;
  showRegDetail: boolean;                   setShowRegDetail: (v: boolean) => void;
  selectedRegistration: CommunityRegistration | null; setSelectedRegistration: (v: CommunityRegistration | null) => void;
}

export interface DashboardPageSiteSettings {
  instagramPosts: string[];
  heroImageUrl: string;
  landingAlbums: PhotoAlbum[];
  showInstagramSettings: boolean;  setShowInstagramSettings: (v: boolean) => void;
  showAlbumManager: boolean;       setShowAlbumManager: (v: boolean) => void;
  showNewsManager: boolean;        setShowNewsManager: (v: boolean) => void;
  showSponsorManager: boolean;     setShowSponsorManager: (v: boolean) => void;
}

export interface DashboardPageProps {
  isAdmin: boolean;
  isLoading: boolean;
  permissions: Permissions;
  canSeeInternalSchedule: boolean;
  isDark: boolean;
  onToggleDark: () => void;
  dashboardPath: string;
  publicSectionItems: SectionNavItem[];
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  auth: DashboardPageAuth;
  events: DashboardPageEvents;
  drafts: DashboardPageDrafts;
  filters: DashboardPageFilters;
  view: DashboardPageView;
  handlers: DashboardPageHandlers;
  modalState: DashboardPageModalState;
  modalData: DashboardPageModalData;
  registrations: DashboardPageRegistrations;
  siteSettings: DashboardPageSiteSettings;
}

// ─── Component ───────────────────────────────────────────────────

export function DashboardPage({
  isAdmin, isLoading, permissions, canSeeInternalSchedule,
  isDark, onToggleDark, dashboardPath, publicSectionItems,
  toasts, removeToast,
  auth, events, drafts, filters, view,
  handlers, modalState, modalData, registrations, siteSettings,
}: DashboardPageProps) {
  const availableViewTabs = getAvailableViewTabs(permissions.canEditEvents);
  return (
    <DashboardShell
      isAdmin={isAdmin}
      isLoading={isLoading}
      isDark={isDark}
      onToggleDark={onToggleDark}
      onLogout={handlers.handleLogout}
      user={auth.user}
      isSuperadmin={auth.isSuperadmin}
      isLegacy={auth.isLegacy}
      permissions={permissions}
      onOpenInstagramSettings={() => siteSettings.setShowInstagramSettings(true)}
      onOpenAlbumManager={() => siteSettings.setShowAlbumManager(true)}
      onOpenNewsManager={() => siteSettings.setShowNewsManager(true)}
      onOpenSponsorManager={() => siteSettings.setShowSponsorManager(true)}
      onOpenLetterPicker={handlers.handleOpenLetterPicker}
      onLoginClick={() => modalState.setShowLoginModal(true)}
      ongoingCount={events.visibleStats.ongoing}
      upcomingCount={events.visibleStats.upcoming}
      publicSectionItems={publicSectionItems}
      modals={
        <DashboardModals
          showLoginModal={modalState.showLoginModal}
          onCloseLoginModal={() => modalState.setShowLoginModal(false)}
          onEmailLogin={auth.login}
          onLegacyLogin={auth.legacyLogin}
          showCrudModal={modalState.showCrudModal}
          onCloseCrudModal={() => { modalState.setShowCrudModal(false); modalData.setEditingEvent(null); modalData.setInitialEventData(null); }}
          onSave={handlers.handleSave}
          onSaveBatch={handlers.handleSaveBatch}
          editingEvent={modalData.editingEvent}
          events={events.events}
          showDraftModal={modalState.showDraftModal}
          onCloseDraftModal={() => { modalState.setShowDraftModal(false); modalData.setEditingDraft(null); }}
          onSaveDraft={handlers.handleSaveDraft}
          editingDraft={modalData.editingDraft}
          draftEvents={drafts.draftEvents}
          showLetterPickerModal={modalState.showLetterPickerModal}
          onCloseLetterPickerModal={() => modalState.setShowLetterPickerModal(false)}
          publicEvents={events.publicEvents}
          onSelectLetterEvent={handlers.handleSelectLetterEvent}
          showLetterModal={modalState.showLetterModal}
          onCloseLetterModal={() => { modalState.setShowLetterModal(false); modalData.setLetterEvent(null); }}
          letterEvent={modalData.letterEvent}
          showThemeModal={modalState.showThemeModal}
          onCloseThemeModal={() => { modalState.setShowThemeModal(false); modalData.setEditingTheme(null); }}
          onSaveTheme={handlers.handleSaveTheme}
          editingTheme={modalData.editingTheme}
          showDeleteModal={modalState.showDeleteModal}
          onCloseDeleteModal={() => { modalState.setShowDeleteModal(false); modalData.setDeletingEvent(null); }}
          deletingEvent={modalData.deletingEvent}
          onDeleteConfirm={handlers.handleDeleteConfirm}
          showDetailModal={modalState.showDetailModal}
          onCloseDetailModal={() => { modalState.setShowDetailModal(false); modalData.setDetailEvent(null); }}
          detailEvent={modalData.detailEvent}
          onEdit={permissions.canEditEvents ? handlers.handleEdit : undefined}
          onDelete={permissions.canDeleteEvents ? handlers.handleDeleteClick : undefined}
          onDeleteSeries={permissions.canDeleteEvents ? handlers.handleDeleteSeries : undefined}
          isAdmin={isAdmin}
          showInstagramSettings={siteSettings.showInstagramSettings}
          onCloseInstagramSettings={() => siteSettings.setShowInstagramSettings(false)}
          instagramPosts={siteSettings.instagramPosts}
          onSaveInstagramPosts={handlers.handleSaveInstagramPosts}
          heroImageUrl={siteSettings.heroImageUrl}
          onSaveHeroImage={handlers.handleSaveHeroImage}
          onCloseAlbumManager={() => siteSettings.setShowAlbumManager(false)}
          showAlbumManager={siteSettings.showAlbumManager}
          showNewsManager={siteSettings.showNewsManager}
          onCloseNewsManager={() => siteSettings.setShowNewsManager(false)}
          showSponsorManager={siteSettings.showSponsorManager}
          onCloseSponsorManager={() => siteSettings.setShowSponsorManager(false)}
          pastEvents={events.events.filter(e => e.status === 'past')}
          annualThemes={events.annualThemes}
          showRegDetail={registrations.showRegDetail}
          onCloseRegDetail={() => { registrations.setShowRegDetail(false); registrations.setSelectedRegistration(null); }}
          selectedRegistration={registrations.selectedRegistration}
          onUpdateRegStatus={handlers.handleUpdateRegStatus}
          initialEventData={modalData.initialEventData}
        />
      }
      toasts={<ToastContainer toasts={toasts} onRemove={removeToast} />}
    >
      <DashboardHeader
        isAdmin={isAdmin}
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        onAddNew={permissions.canEditEvents ? handlers.handleAddNew : undefined}
      />

      {/* 1. Overview */}
      {isAdmin && dashboardPath === '/' && (
        <section id="overview" className="scroll-mt-20 space-y-6">
          <DashboardStats stats={events.visibleStats} />
          <CommandCenterSummary
            totalEvents={events.visibleStats.total}
            upcomingEvents={events.visibleStats.upcoming}
            ongoingEvents={events.visibleStats.ongoing}
            activeDrafts={drafts.activeDrafts}
            annualThemes={events.annualThemes}
            communityRegistrations={registrations.communityRegistrations}
            permissions={permissions}
            isSuperadmin={auth.isSuperadmin}
          />
        </section>
      )}

      {/* 2. Jadwal Event — admin landing & dedicated route (prototype order: header → stats → command center → jadwal) */}
      {isAdmin && (dashboardPath === '/' || dashboardPath === '/events') && (
        <section id="views" className="scroll-mt-20">
          {isAdmin && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Jadwal Event</h2>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Kelola semua event dalam berbagai tampilan</p>
              </div>
              <ViewToggle
                tabs={availableViewTabs}
                viewMode={view.viewMode}
                onSelect={view.setViewMode}
                panelId={`dashboard-panel-${view.viewMode}`}
              />
            </div>
          )}
          <Suspense fallback={<SectionFallback height="h-80" />}>
            <DashboardViewsSection
              viewMode={view.viewMode}
              isAdmin={isAdmin}
              showInternalDraftFilter={canSeeInternalSchedule}
              canUseCalendarKanban={permissions.canEditEvents}
              canExportSchedulePdf={permissions.canExport}
              visibleEvents={events.visibleEvents}
              visibleStats={{ total: events.visibleStats.total }}
              holidays={events.holidays}
              error={events.error}
              searchQuery={filters.searchQuery}
              setSearchQuery={filters.setSearchQuery}
              activeFilter={filters.activeFilter}
              setActiveFilter={filters.setActiveFilter}
              activeCategory={filters.activeCategory}
              setActiveCategory={filters.setActiveCategory}
              activePriority={filters.activePriority}
              setActivePriority={filters.setActivePriority}
              activeMonth={filters.activeMonth}
              setActiveMonth={filters.setActiveMonth}
              visibleCategories={filters.visibleCategories}
              visibleMonths={filters.visibleMonths}
              onEdit={permissions.canEditEvents ? handlers.handleEdit : undefined}
              onDelete={permissions.canDeleteEvents ? handlers.handleDeleteClick : undefined}
              onDetail={handlers.handleDetailClick}
            />
          </Suspense>
        </section>
      )}


      {/* 3. Draft Queue */}
      {permissions.canEditEvents && dashboardPath === '/drafts' && (
        <section id="draft-section" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Antrian Draft</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Kelola draft event sebelum dipublikasikan</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-64" />}>
            <AdminDraftSection
              activeDrafts={drafts.activeDrafts}
              draftHistory={drafts.draftHistory}
              draftError={drafts.draftError}
              isDraftLoading={drafts.isDraftLoading}
              showDraftHistory={modalState.showDraftHistory}
              setShowDraftHistory={modalState.setShowDraftHistory}
              onAddDraft={handlers.handleAddDraft}
              onEditDraft={handlers.handleEditDraft}
              onDeleteDraft={handlers.handleDeleteDraft}
              onPublishDraft={handlers.handlePublishDraft}
              onDraftProgressChange={handlers.handleDraftProgressChange}
              onRestoreDraft={handlers.handleRestoreDraft}
            />
          </Suspense>
        </section>
      )}

      {/* 4. Community Registrations */}
      {permissions.canViewRegistrations && dashboardPath === '/registrations' && (
        <section id="registrations" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Pendaftaran Community</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Kelola permintaan pendaftaran dari community</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-40" />}>
            <CommunityRegistrationSection registrations={registrations.communityRegistrations} isLoading={registrations.isRegLoading} onDetail={handlers.handleRegDetail} />
          </Suspense>
        </section>
      )}

      {/* 5. Tema Tahunan — admin */}
      {permissions.canManageThemes && dashboardPath === '/themes' && (
        <section id="themes" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Tema Tahunan</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Kelola tema dan perencanaan tahunan</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-40" />}>
            <QuarterTimeline themes={events.annualThemes} isAdmin onAddTheme={permissions.canManageThemes ? handlers.handleAddTheme : undefined} onEditTheme={permissions.canManageThemes ? handlers.handleEditTheme : undefined} onDeleteTheme={permissions.canManageThemes ? handlers.handleDeleteTheme : undefined} />
          </Suspense>
        </section>
      )}

      {/* Public: 1. Featured Events */}
      {!isAdmin && (events.ongoingEvents.length > 0 || events.upcomingEvents.length > 0) && (
        <section id="featured" className="space-y-4 scroll-mt-32 sm:space-y-5">
          {events.ongoingEvents.length > 0 && (
            <Suspense fallback={<SectionFallback height="h-40" />}>
              <FeaturedEvents events={events.ongoingEvents} title="Sedang Berlangsung" accent="brand-primary" icon={<Radio className="h-4 w-4 animate-pulse text-brand-primary-500" />} onDetail={handlers.handleDetailClick} />
            </Suspense>
          )}
          {events.upcomingEvents.length > 0 && (
            <Suspense fallback={<SectionFallback height="h-40" />}>
              <FeaturedEvents events={events.upcomingEvents.slice(0, 3)} title="Segera Dimulai" accent="amber" icon={<Clock3 className="h-4 w-4 text-amber-500" />} onDetail={handlers.handleDetailClick} />
            </Suspense>
          )}
        </section>
      )}

      {/* Public: 2. Ringkasan */}
      {!isAdmin && (
        <section id="summary" className="scroll-mt-32">
          <DashboardStats stats={events.visibleStats} />
        </section>
      )}

      {/* Public: 3. Kalender Event */}
      {!isAdmin && (
        <section id="calendar" className="space-y-3 scroll-mt-32">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Kalender Event</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Lihat semua event publik dalam tampilan kalender.</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-[28rem]" />}>
            <CalendarView events={events.publicEvents} holidays={events.holidays} onDetail={handlers.handleDetailClick} />
          </Suspense>
        </section>
      )}

      {/* Public: Jadwal Event (landing) */}
      {!isAdmin && dashboardPath === '/' && (
        <section id="views" className="scroll-mt-20">
          <div className="mb-4 flex justify-end">
            <ViewToggle
              tabs={availableViewTabs}
              viewMode={view.viewMode}
              onSelect={view.setViewMode}
              panelId={`dashboard-panel-${view.viewMode}`}
            />
          </div>
          <Suspense fallback={<SectionFallback height="h-80" />}>
            <DashboardViewsSection
              viewMode={view.viewMode}
              isAdmin={isAdmin}
              showInternalDraftFilter={canSeeInternalSchedule}
              canUseCalendarKanban={permissions.canEditEvents}
              canExportSchedulePdf={permissions.canExport}
              visibleEvents={events.visibleEvents}
              visibleStats={{ total: events.visibleStats.total }}
              holidays={events.holidays}
              error={events.error}
              searchQuery={filters.searchQuery}
              setSearchQuery={filters.setSearchQuery}
              activeFilter={filters.activeFilter}
              setActiveFilter={filters.setActiveFilter}
              activeCategory={filters.activeCategory}
              setActiveCategory={filters.setActiveCategory}
              activePriority={filters.activePriority}
              setActivePriority={filters.setActivePriority}
              activeMonth={filters.activeMonth}
              setActiveMonth={filters.setActiveMonth}
              visibleCategories={filters.visibleCategories}
              visibleMonths={filters.visibleMonths}
              onEdit={permissions.canEditEvents ? handlers.handleEdit : undefined}
              onDelete={permissions.canDeleteEvents ? handlers.handleDeleteClick : undefined}
              onDetail={handlers.handleDetailClick}
            />
          </Suspense>
        </section>
      )}

      {/* 7. Analytics */}
      {permissions.canViewSurvey && dashboardPath === '/analytics' && (
        <section id="category-chart" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Analitik</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Analisis tren dan statistik event</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-80" />}>
            <AnalyticsDashboard events={events.events} />
          </Suspense>
        </section>
      )}

      {/* 8. Survey Kepuasan */}
      {permissions.canViewSurvey && dashboardPath === '/survey' && (
        <section id="survey-section" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Survey Kepuasan</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Kelola Survey Kepuasan (pengunjung/organizer) per event</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-48" />}>
            <SurveyDashboard events={events.events.map(e => ({ id: e.id, acara: e.acara, status: e.status }))} />
          </Suspense>
        </section>
      )}

      {/* 8b. Tenant Self-Assessment */}
      {(permissions.canEditEvents || permissions.isEoTenant) && dashboardPath === '/tenant-surveys' && (
        <section id="tenant-surveys-section" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Evaluasi Tenant</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Self-assessment tenant/gerai per event (terpisah dari Survey Kepuasan)</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-48" />}>
            <TenantSurveyPage events={events.events} isAdmin={permissions.canEditEvents} />
          </Suspense>
        </section>
      )}

      {/* 9. User Management */}
      {permissions.canManageUsers && dashboardPath === '/users' && (
        <section id="user-management" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Manajemen Pengguna</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Kelola user dan permission (Superadmin only)</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-48" />}>
            <UserManagement />
          </Suspense>
        </section>
      )}

      {/* 10. Activity Log */}
      {permissions.canViewActivityLog && dashboardPath === '/activity-log' && (
        <section id="activity-log" className="scroll-mt-20">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Log Aktivitas</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Audit trail dari semua aktivitas sistem</p>
          </div>
          <Suspense fallback={<SectionFallback height="h-48" />}>
            <ActivityLog />
          </Suspense>
        </section>
      )}

      {/* Public: 5. Tema Tahunan */}
      {!isAdmin && (
        <section id="themes" className="scroll-mt-32">
          <Suspense fallback={<SectionFallback height="h-40" />}>
            <QuarterTimeline themes={events.annualThemes} />
          </Suspense>
        </section>
      )}
    </DashboardShell>
  );
}