import { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { List, Kanban, Clock4, Radio, Clock3, ArrowLeft } from 'lucide-react';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { ToastContainer } from './components/ToastContainer';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { DashboardStats } from './components/dashboard/DashboardStats';
import { DashboardShell } from './components/dashboard/DashboardShell';
import { DashboardModals } from './components/dashboard/DashboardModals';
import { CommandCenterSummary } from './components/dashboard/CommandCenterSummary';
import { getAllowedDashboardPaths, getDefaultDashboardPath, getDefaultAppPath } from './components/dashboard/dashboardNavigation';
import { useEvents } from './hooks/useEvents';
import { useDraftEvents } from './hooks/useDraftEvents';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { usePermission } from './hooks/usePermission';
import { useDashboardHandlers } from './hooks/useDashboardHandlers';
import { ViewMode } from './types';

import mallLogo from './assets/brand/LOGOMETMAL2016-01.svg';

const CommunityLandingPage = lazy(() => import('./components/CommunityLandingPage').then(m => ({ default: m.CommunityLandingPage })));
const EventsLandingPage = lazy(() => import('./components/EventsLandingPage').then(m => ({ default: m.EventsLandingPage })));
const GalleryIndexPage = lazy(() => import('./components/GalleryIndexPage').then(m => ({ default: m.GalleryIndexPage })));
const GalleryAlbumPage = lazy(() => import('./components/GalleryAlbumPage').then(m => ({ default: m.GalleryAlbumPage })));
const PublicLetterViewer = lazy(() => import('./components/PublicLetterViewer').then(m => ({ default: m.PublicLetterViewer })));
const CommunityRegistrationSection = lazy(() => import('./components/CommunityRegistrationSection').then(m => ({ default: m.CommunityRegistrationSection })));

const VIEW_TABS: Array<{ key: ViewMode; label: string; icon: React.ReactNode }> = [
  { key: 'table',    label: 'Tabel',    icon: <List    className="h-3.5 w-3.5" /> },
  { key: 'calendar', label: 'Kalender', icon: <List className="h-3.5 w-3.5" /> },
  { key: 'kanban',   label: 'Kanban',   icon: <Kanban  className="h-3.5 w-3.5" /> },
  { key: 'timeline', label: 'Timeline', icon: <Clock4  className="h-3.5 w-3.5" /> },
];

const FeaturedEvents = lazy(() => import('./components/FeaturedEvents').then(m => ({ default: m.FeaturedEvents })));
const QuarterTimeline = lazy(() => import('./components/QuarterTimeline').then(m => ({ default: m.QuarterTimeline })));
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const EventDetailModal = lazy(() => import('./components/EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const AdminDraftSection = lazy(() => import('./components/AdminDraftSection').then(m => ({ default: m.AdminDraftSection })));
const SurveyPage = lazy(() => import('./components/survey/SurveyPage'));
const SurveyDashboard = lazy(() => import('./components/survey/SurveyDashboard').then(m => ({ default: m.SurveyDashboard })));
const TenantSurveyPage = lazy(() => import('./components/survey/TenantSurveyPage'));
const TenantSurveyResultsPage = lazy(() => import('./components/survey/TenantSurveyResultsPage'));
const TenantSurveyPublicPage = lazy(() => import('./components/survey/TenantSurveyPublicPage'));
const TenantSurveyEventPicker = lazy(() => import('./components/survey/TenantSurveyEventPicker'));
const UserManagement = lazy(() => import('./components/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ActivityLog = lazy(() => import('./components/admin/ActivityLog').then(m => ({ default: m.ActivityLog })));
const AnalyticsDashboard = lazy(() => import('./components/admin/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const DashboardViewsSection = lazy(() => import('./components/DashboardViewsSection').then(m => ({ default: m.DashboardViewsSection })));

function SectionFallback({ height = 'h-32' }: { height?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 ${height}`} />;
}

function RedirectToTenantSurveyResults() {
  return <Navigate to="/tenant-survey-results" replace />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = location.pathname.replace('/dashboard', '') || '/';

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
    return dark;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const auth = useAuth();
  const permissions = usePermission(auth.user, auth.isLegacy);
  const isAdmin = permissions.canViewDashboard;
  const { toasts, showToast, removeToast } = useToast();
  const {
    events, filteredEvents,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    activeMonth, setActiveMonth,
    addEvent, updateEvent, deleteEvent,
    addRecurringEvents, deleteRecurringSeries,
    addTheme, updateTheme, deleteTheme,
    annualThemes,
    holidays,
    isLoading,
    error,
    refreshEvents,
  } = useEvents();
  const {
    draftEvents,
    activeDrafts,
    draftHistory,
    isLoading: isDraftLoading,
    error: draftError,
    addDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    restoreDraft,
  } = useDraftEvents(isAdmin);

  const toggleDark = useCallback(() => {
    setIsDark(v => {
      const next = !v;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const {
    showLoginModal, setShowLoginModal,
    showCrudModal, setShowCrudModal,
    showDraftModal, setShowDraftModal,
    showLetterPickerModal, setShowLetterPickerModal,
    showLetterModal, setShowLetterModal,
    showDeleteModal, setShowDeleteModal,
    showDetailModal, setShowDetailModal,
    showDraftHistory, setShowDraftHistory,
    showThemeModal, setShowThemeModal,
    editingEvent, setEditingEvent,
    editingDraft, setEditingDraft,
    editingTheme, setEditingTheme,
    letterEvent, setLetterEvent,
    deletingEvent, setDeletingEvent,
    detailEvent, setDetailEvent,
    showInstagramSettings, setShowInstagramSettings,
    instagramPosts,
    showAlbumManager, setShowAlbumManager,
    heroImageUrl,
    landingAlbums,
    communityRegistrations,
    isRegLoading,
    showRegDetail, setShowRegDetail,
    selectedRegistration, setSelectedRegistration,
    initialEventData, setInitialEventData,
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
  } = useDashboardHandlers({
    showToast,
    logout: auth.logout,
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
    canViewRegistrations: permissions.canViewRegistrations,
    dashboardPath,
    draftError,
  });

  const publicEvents = useMemo(() => events.filter(e => e.status !== 'draft'), [events]);
  const visibleEvents = useMemo(() => filteredEvents.filter(e => isAdmin || e.status !== 'draft'), [filteredEvents, isAdmin]);
  const ongoingEvents = useMemo(
    () => (isAdmin ? visibleEvents : publicEvents).filter(e => e.status === 'ongoing'),
    [isAdmin, visibleEvents, publicEvents]
  );
  const upcomingEvents = useMemo(
    () => (isAdmin ? visibleEvents : publicEvents).filter(e => e.status === 'upcoming'),
    [isAdmin, visibleEvents, publicEvents]
  );
  const visibleCategories = useMemo(() => {
    const source = isAdmin ? events : publicEvents;
    const normalized = source
      .flatMap(e => e.categories)
      .flatMap(category => String(category || '').split(/[|,]/))
      .map(category => category.trim())
      .filter(Boolean);
    return ['Semua', ...new Set(normalized)];
  }, [isAdmin, events, publicEvents]);
  const visibleMonths = useMemo(() => {
    const source = isAdmin ? events : publicEvents;
    return ['Semua', ...new Set(source.map(e => e.month))];
  }, [isAdmin, events, publicEvents]);
  const visibleStats = useMemo(() => {
    const source = isAdmin ? events : publicEvents;
    return {
      total: source.length,
      ongoing: source.filter(e => e.status === 'ongoing').length,
      upcoming: source.filter(e => e.status === 'upcoming').length,
      past: source.filter(e => e.status === 'past').length,
    };
  }, [isAdmin, events, publicEvents]);
  const availableViewTabs = useMemo(
    () => isAdmin ? VIEW_TABS : VIEW_TABS.filter(tab => tab.key !== 'calendar' && tab.key !== 'kanban'),
    [isAdmin]
  );
  const publicSectionItems = useMemo(
    () => [
      ...((ongoingEvents.length > 0 || upcomingEvents.length > 0) ? [{ id: 'featured', label: 'Segera Hadir' }] : []),
      { id: 'summary', label: 'Ringkasan' },
      { id: 'calendar', label: 'Kalender' },
      { id: 'views', label: 'Daftar Acara' },
      { id: 'themes', label: 'Tema Tahunan' },
    ],
    [ongoingEvents.length, upcomingEvents.length]
  );
  const allowedDashboardPaths = useMemo(() => new Set(getAllowedDashboardPaths(permissions)), [permissions]);
  const defaultDashboardPath = useMemo(() => getDefaultDashboardPath(permissions), [permissions]);
  useEffect(() => {
    if (!isAdmin && activeFilter === 'draft') {
      setActiveFilter('Semua');
    }
  }, [isAdmin, activeFilter, setActiveFilter]);

  useEffect(() => {
    if (!isAdmin && (viewMode === 'calendar' || viewMode === 'kanban')) {
      setViewMode('table');
    }
  }, [isAdmin, viewMode]);

  useEffect(() => {
    if (!isAdmin && activePriority !== 'Semua') {
      setActivePriority('Semua');
    }
  }, [isAdmin, activePriority, setActivePriority]);

  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory('Semua');
    }
  }, [visibleCategories, activeCategory, setActiveCategory]);

  useEffect(() => {
    if (!visibleMonths.includes(activeMonth)) {
      setActiveMonth('Semua');
    }
  }, [visibleMonths, activeMonth, setActiveMonth]);

  useEffect(() => {
    if (isLoading) return;

    // TR-only: never stay inside dashboard chrome â€” send to standalone results
    if (permissions.isTenantRelation && !permissions.canEditEvents) {
      if (location.pathname.startsWith('/dashboard')) {
        navigate('/tenant-survey-results', { replace: true });
      }
      return;
    }

    if (!location.pathname.startsWith('/dashboard')) return;
    // Guest may stay on /dashboard (public schedule + login). Admin-only path guard after auth.
    if (!permissions.canViewDashboard) return;
    if (!allowedDashboardPaths.has(dashboardPath)) {
      const dest = getDefaultAppPath(permissions);
      navigate(dest, { replace: true });
    }
  }, [allowedDashboardPaths, dashboardPath, defaultDashboardPath, isLoading, location.pathname, navigate, permissions]);

  return (
    <Routes>
      {/* Community Landing Page â€” default route */}
      <Route path="/" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <CommunityLandingPage
            isDark={isDark}
            onToggleDark={toggleDark}
            onBack={() => navigate('/events')}
            instagramPosts={instagramPosts}
            events={publicEvents}
            onEventDetail={handleDetailClick}
            heroImageUrl={heroImageUrl}
            albums={landingAlbums}
          />
          <Suspense fallback={null}>
            <EventDetailModal
              isOpen={showDetailModal}
              event={detailEvent}
              onClose={() => { setShowDetailModal(false); setDetailEvent(null); }}
              events={events}
            />
          </Suspense>
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </Suspense>
      } />

      {/* Public event schedule landing â€” no dashboard chrome */}
      <Route path="/events" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <EventsLandingPage
            isDark={isDark}
            onToggleDark={toggleDark}
            events={publicEvents}
            holidays={holidays}
            albums={landingAlbums}
            isLoading={isLoading}
            onDetail={handleDetailClick}
          />
          <Suspense fallback={null}>
            <EventDetailModal
              isOpen={showDetailModal}
              event={detailEvent}
              onClose={() => { setShowDetailModal(false); setDetailEvent(null); }}
              events={events}
            />
          </Suspense>
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </Suspense>
      } />

      {/* Gallery pages */}
      <Route path="/gallery" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <GalleryIndexPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      <Route path="/gallery/:slug" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <GalleryAlbumPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />

      {/* Survey â€” standalone page */}
      <Route path="/survey/:eventId" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <SurveyPage />
        </Suspense>
      } />

      {/* Public Tenant Self-Assessment â€” standalone, no auth required */}
      <Route path="/tenant-survey" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <div className="ui-dashboard-page min-h-screen dark:bg-slate-950">
            <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
              {/* Header with logo + back button */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto" />
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                     Evaluasi Tenant
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-brand-primary-600 dark:text-slate-400 dark:hover:text-brand-primary-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
              </div>

              {/* Main card */}
              <div className="ui-dashboard-surface overflow-hidden">
                {/* Card header */}
                <div className="border-b border-slate-100 bg-gradient-to-r from-brand-primary-50/50 to-transparent px-6 py-5 dark:border-slate-700 dark:from-brand-primary-950/30">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Evaluasi Dampak Event
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Pilih event di bawah untuk mengisi survei tenant dan bantu kami memahami dampak event terhadap gerai Anda.
                  </p>
                </div>

                {/* Card body */}
                <div className="px-6 py-5">
                  <TenantSurveyEventPicker />
                </div>
              </div>

              {/* Footer */}
              <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
                &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
              </p>
            </div>
          </div>
        </Suspense>
      } />
      <Route path="/tenant-survey/:eventId" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <TenantSurveyPublicPage />
        </Suspense>
      } />

      {/* Public Letter Viewer â€” shareable link */}
      <Route path="/letter/:id" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <PublicLetterViewer />
        </Suspense>
      } />

      {/* Tenant survey results â€” public (rate-limited APIs, no login) */}
      <Route path="/tenant-survey-results" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <div className="ui-dashboard-page min-h-screen dark:bg-slate-950">
            <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
                  <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
                  <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 sm:inline">
                    Tenant Relation
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(auth.isAuthenticated || auth.isLegacy) && (
                    <>
                      {(auth.user?.display_name || auth.isLegacy) && (
                        <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 dark:border-slate-600 dark:bg-slate-800/70 sm:flex">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary-100 text-[10px] font-bold text-brand-primary-700 dark:bg-brand-primary-900/50 dark:text-brand-primary-300">
                            {(auth.user?.display_name || 'A').charAt(0).toUpperCase()}
                          </span>
                          <span className="max-w-[120px] truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            {auth.user?.display_name || 'Admin'}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="ui-focus-ring rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Keluar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-3 py-3 pb-16 sm:px-4 sm:py-6 sm:pb-12">
              <TenantSurveyResultsPage
                events={events}
                canExport={permissions.canExportTenantSurveyAnalytics}
                publicMode
              />
            </div>

            <ToastContainer toasts={toasts} onRemove={removeToast} />
          </div>
        </Suspense>
      } />

      {/* Legacy dashboard path â†’ standalone */}
      <Route path="/dashboard/tenant-survey-results" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <RedirectToTenantSurveyResults />
        </Suspense>
      } />

      {/* Dashboard routes â€” chrome in DashboardShell; sections stay here */}
      <Route path="/dashboard/*" element={
    <DashboardShell
      isAdmin={isAdmin}
      isLoading={isLoading}
      isDark={isDark}
      onToggleDark={toggleDark}
      onLogout={handleLogout}
      user={auth.user}
      isSuperadmin={auth.isSuperadmin}
      isLegacy={auth.isLegacy}
      permissions={permissions}
      onOpenInstagramSettings={() => setShowInstagramSettings(true)}
      onOpenAlbumManager={() => setShowAlbumManager(true)}
      onOpenLetterPicker={handleOpenLetterPicker}
      onLoginClick={() => setShowLoginModal(true)}
      ongoingCount={visibleStats.ongoing}
      upcomingCount={visibleStats.upcoming}
      publicSectionItems={publicSectionItems}
      modals={
      <DashboardModals
        showLoginModal={showLoginModal}
        onCloseLoginModal={() => setShowLoginModal(false)}
        onEmailLogin={auth.login}
        onLegacyLogin={auth.legacyLogin}
        showCrudModal={showCrudModal}
        onCloseCrudModal={() => { setShowCrudModal(false); setEditingEvent(null); setInitialEventData(null); }}
        onSave={handleSave}
        onSaveBatch={handleSaveBatch}
        editingEvent={editingEvent}
        events={events}
        showDraftModal={showDraftModal}
        onCloseDraftModal={() => { setShowDraftModal(false); setEditingDraft(null); }}
        onSaveDraft={handleSaveDraft}
        editingDraft={editingDraft}
        draftEvents={draftEvents}
        showLetterPickerModal={showLetterPickerModal}
        onCloseLetterPickerModal={() => setShowLetterPickerModal(false)}
        publicEvents={publicEvents}
        onSelectLetterEvent={handleSelectLetterEvent}
        showLetterModal={showLetterModal}
        onCloseLetterModal={() => { setShowLetterModal(false); setLetterEvent(null); }}
        letterEvent={letterEvent}
        showThemeModal={showThemeModal}
        onCloseThemeModal={() => { setShowThemeModal(false); setEditingTheme(null); }}
        onSaveTheme={handleSaveTheme}
        editingTheme={editingTheme}
        showDeleteModal={showDeleteModal}
        onCloseDeleteModal={() => { setShowDeleteModal(false); setDeletingEvent(null); }}
        deletingEvent={deletingEvent}
        onDeleteConfirm={handleDeleteConfirm}
        showDetailModal={showDetailModal}
        onCloseDetailModal={() => { setShowDetailModal(false); setDetailEvent(null); }}
        detailEvent={detailEvent}
        onEdit={permissions.canEditEvents ? handleEdit : undefined}
        onDelete={permissions.canDeleteEvents ? handleDeleteClick : undefined}
        onDeleteSeries={permissions.canDeleteEvents ? handleDeleteSeries : undefined}
        isAdmin={isAdmin}
        showInstagramSettings={showInstagramSettings}
        onCloseInstagramSettings={() => setShowInstagramSettings(false)}
        instagramPosts={instagramPosts}
        onSaveInstagramPosts={handleSaveInstagramPosts}
        heroImageUrl={heroImageUrl}
        onSaveHeroImage={handleSaveHeroImage}
        showAlbumManager={showAlbumManager}
        onCloseAlbumManager={() => setShowAlbumManager(false)}
        pastEvents={events.filter(e => e.status === 'past')}
        annualThemes={annualThemes}
        showRegDetail={showRegDetail}
        onCloseRegDetail={() => { setShowRegDetail(false); setSelectedRegistration(null); }}
        selectedRegistration={selectedRegistration}
        onUpdateRegStatus={handleUpdateRegStatus}
        onCreateEventFromRegistration={handleCreateEventFromRegistration}
        initialEventData={initialEventData}
      />
      }
      toasts={<ToastContainer toasts={toasts} onRemove={removeToast} />}
    >
          {/* Header */}
          <DashboardHeader
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddNew={permissions.canEditEvents ? handleAddNew : undefined}
          />

          {/* 1. Overview â€” Stat Cards (paling penting, pertama dilihat) */}
          {isAdmin && dashboardPath === '/' && (
            <section id="overview" className="scroll-mt-20 space-y-6">
              <DashboardStats stats={visibleStats} />
              <CommandCenterSummary
                totalEvents={visibleStats.total}
                upcomingEvents={visibleStats.upcoming}
                ongoingEvents={visibleStats.ongoing}
                activeDrafts={activeDrafts}
                annualThemes={annualThemes}
                communityRegistrations={communityRegistrations}
                permissions={permissions}
                isSuperadmin={auth.isSuperadmin}
              />
            </section>
          )}

          {/* 2. Featured Events â€” yang sedang/akan berlangsung */}
          {isAdmin && dashboardPath === '/' && (ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
            <div className="space-y-4 sm:space-y-5">
              {ongoingEvents.length > 0 && (
                <Suspense fallback={<SectionFallback height="h-40" />}>
                  <FeaturedEvents
                    events={ongoingEvents}
                    title="Sedang Berlangsung"
                    accent="brand-primary"
                    icon={<Radio className="h-4 w-4 animate-pulse text-brand-primary-500" />}
                    onDetail={handleDetailClick}
                  />
                </Suspense>
              )}
              {upcomingEvents.length > 0 && (
                <Suspense fallback={<SectionFallback height="h-40" />}>
                  <FeaturedEvents
                    events={upcomingEvents.slice(0, 3)}
                    title="Segera Dimulai"
                    accent="amber"
                    icon={<Clock3 className="h-4 w-4 text-amber-500" />}
                    onDetail={handleDetailClick}
                  />
                </Suspense>
              )}
            </div>
          )}

          {/* 3. Draft Queue â€” event yang perlu di-review/publish */}
          {permissions.canEditEvents && dashboardPath === '/drafts' && (
            <section id="draft-section" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Antrian Draft</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Kelola draft event sebelum dipublikasikan
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-64" />}>
                <AdminDraftSection
                  activeDrafts={activeDrafts}
                  draftHistory={draftHistory}
                  draftError={draftError}
                  isDraftLoading={isDraftLoading}
                  showDraftHistory={showDraftHistory}
                  setShowDraftHistory={setShowDraftHistory}
                  onAddDraft={handleAddDraft}
                  onEditDraft={handleEditDraft}
                  onDeleteDraft={handleDeleteDraft}
                  onPublishDraft={handlePublishDraft}
                  onDraftProgressChange={handleDraftProgressChange}
                  onRestoreDraft={handleRestoreDraft}
                />
              </Suspense>
            </section>
          )}

          {/* 4. Community Registrations â€” pendaftaran masuk */}
          {permissions.canViewRegistrations && dashboardPath === '/registrations' && (
            <section id="registrations" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pendaftaran Community</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Kelola permintaan pendaftaran dari community
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <CommunityRegistrationSection
                  registrations={communityRegistrations}
                  isLoading={isRegLoading}
                  onDetail={handleRegDetail}
                />
              </Suspense>
            </section>
          )}

          {/* 5. Tema Tahunan â€” perencanaan jangka panjang */}
          {permissions.canManageThemes && dashboardPath === '/themes' && (
            <section id="themes" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tema Tahunan</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Kelola tema dan perencanaan tahunan
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <QuarterTimeline themes={annualThemes} isAdmin onAddTheme={permissions.canManageThemes ? handleAddTheme : undefined} onEditTheme={permissions.canManageThemes ? handleEditTheme : undefined} onDeleteTheme={permissions.canManageThemes ? handleDeleteTheme : undefined} />
              </Suspense>
            </section>
          )}

        {/* Public: 1. Featured Events â€” sedang berlangsung / segera dimulai */}
        {!isAdmin && (ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
          <section id="featured" className="space-y-4 scroll-mt-32 sm:space-y-5">
            {ongoingEvents.length > 0 && (
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <FeaturedEvents
                  events={ongoingEvents}
                  title="Sedang Berlangsung"
                  accent="brand-primary"
                  icon={<Radio className="h-4 w-4 animate-pulse text-brand-primary-500" />}
                  onDetail={handleDetailClick}
                />
              </Suspense>
            )}
            {upcomingEvents.length > 0 && (
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <FeaturedEvents
                  events={upcomingEvents.slice(0, 3)}
                  title="Segera Dimulai"
                  accent="amber"
                  icon={<Clock3 className="h-4 w-4 text-amber-500" />}
                  onDetail={handleDetailClick}
                />
              </Suspense>
            )}
          </section>
        )}

        {/* Public: 2. Ringkasan â€” stat cards */}
        {!isAdmin && (
          <section id="summary" className="scroll-mt-32">
            <DashboardStats stats={visibleStats} />
          </section>
        )}

        {/* Public: 3. Kalender Event */}
        {!isAdmin && (
          <section id="calendar" className="space-y-3 scroll-mt-32">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Kalender Event</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lihat semua event publik dalam tampilan kalender.</p>
            </div>
            <Suspense fallback={<SectionFallback height="h-[28rem]" />}>
              <CalendarView events={publicEvents} holidays={holidays} onDetail={handleDetailClick} />
            </Suspense>
          </section>
        )}

        {/* 6. Jadwal Event â€” tabel/kalender/kanban/timeline */}
        {((isAdmin && dashboardPath === '/events') || (!isAdmin && dashboardPath === '/')) && (
        <section id="views" className="scroll-mt-20">
          {isAdmin && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Jadwal Event</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Kelola semua event dalam berbagai tampilan
              </p>
            </div>
          )}
          <Suspense fallback={<SectionFallback height="h-80" />}>
            <DashboardViewsSection
              viewMode={viewMode}
              availableViewTabs={availableViewTabs}
              setViewMode={setViewMode}
              isAdmin={isAdmin}
              visibleEvents={visibleEvents}
              visibleStats={{ total: visibleStats.total }}
              holidays={holidays}
              error={error}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              activePriority={activePriority}
              setActivePriority={setActivePriority}
              activeMonth={activeMonth}
              setActiveMonth={setActiveMonth}
              visibleCategories={visibleCategories}
              visibleMonths={visibleMonths}
              onEdit={permissions.canEditEvents ? handleEdit : undefined}
              onDelete={permissions.canDeleteEvents ? handleDeleteClick : undefined}
              onDetail={handleDetailClick}
            />
          </Suspense>
        </section>
        )}

        {/* 7. Analytics â€” statistik lanjutan */}
          {permissions.canViewSurvey && dashboardPath === '/analytics' && (
            <section id="category-chart" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analitik</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Analisis tren dan statistik event
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-80" />}>
                <AnalyticsDashboard events={events} />
              </Suspense>
            </section>
          )}

        {/* 8. Survey Kepuasan â€” admin only */}
        {permissions.canViewSurvey && dashboardPath === '/survey' && (
          <section id="survey-section" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Survey Kepuasan</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Kelola survey dan feedback dari peserta event
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <SurveyDashboard events={events.map(e => ({ id: e.id, acara: e.acara, status: e.status }))} />
            </Suspense>
          </section>
        )}

        {/* 8b. Tenant Self-Assessment â€” admin + eo_tenant (ops) */}
        {(permissions.canEditEvents || permissions.isEoTenant) && dashboardPath === '/tenant-surveys' && (
          <section id="tenant-surveys-section" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Evaluasi Tenant</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Evaluasi mandiri dari EO/Tenant untuk setiap event yang telah dilaksanakan
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <TenantSurveyPage events={events} isAdmin={permissions.canEditEvents} />
            </Suspense>
          </section>
        )}

        {/* 9. User Management â€” superadmin only */}
        {permissions.canManageUsers && dashboardPath === '/users' && (
          <section id="user-management" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Pengguna</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Kelola user dan permission (Superadmin only)
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <UserManagement />
            </Suspense>
          </section>
        )}

        {/* 10. Activity Log â€” admin + superadmin */}
        {permissions.canViewActivityLog && dashboardPath === '/activity-log' && (
          <section id="activity-log" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log Aktivitas</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Audit trail dari semua aktivitas sistem
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <ActivityLog />
            </Suspense>
          </section>
        )}

        {/* Public: 5. Tema Tahunan â€” paling bawah */}
        {!isAdmin && (
          <section id="themes" className="scroll-mt-32">
            <Suspense fallback={<SectionFallback height="h-40" />}>
              <QuarterTimeline themes={annualThemes} />
            </Suspense>
          </section>
        )}
    </DashboardShell>
      } />
    </Routes>
  );
}
