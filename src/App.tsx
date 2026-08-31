import { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { ToastContainer } from './components/ToastContainer';
import type { DashboardPageAuth, DashboardPageEvents, DashboardPageDrafts, DashboardPageFilters, DashboardPageView, DashboardPageHandlers, DashboardPageModalState, DashboardPageModalData, DashboardPageRegistrations, DashboardPageSiteSettings } from './components/dashboard/DashboardPage';
import { getAllowedDashboardPaths, getDefaultDashboardPath, getDefaultAppPath } from './components/dashboard/dashboardNavigation';
import { useEvents } from './hooks/useEvents';
import { useDraftEvents } from './hooks/useDraftEvents';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { usePermission } from './hooks/usePermission';
import { useDashboardHandlers } from './hooks/useDashboardHandlers';
import { ViewMode } from './types';

import mallLogo from './assets/brand/LOGOMETMAL2016-01.svg';
import PrototypeLandingMetmalV1 from './pages/prototype-landing-metmal-v1';

const PresentationDeck = lazy(() => import('./pages/presentation-deck'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const GraphifyLanding = lazy(() => import('./pages/GraphifyLanding'));
const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const EventDetailModal = lazy(() => import('./components/EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const AdminLoginPage = lazy(() => import('./components/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));

const CommunityLandingPage = lazy(() => import('./components/CommunityLandingPage').then(m => ({ default: m.CommunityLandingPage })));
const EventsLandingPage = lazy(() => import('./components/EventsLandingPage').then(m => ({ default: m.EventsLandingPage })));
const GalleryIndexPage = lazy(() => import('./components/GalleryIndexPage').then(m => ({ default: m.GalleryIndexPage })));
const GalleryAlbumPage = lazy(() => import('./components/GalleryAlbumPage').then(m => ({ default: m.GalleryAlbumPage })));
const NewsIndexPage = lazy(() => import('./components/NewsIndexPage').then(m => ({ default: m.NewsIndexPage })));
const NewsArticlePage = lazy(() => import('./components/NewsArticlePage').then(m => ({ default: m.NewsArticlePage })));
const SponsorLandingPage = lazy(() => import('./components/SponsorLandingPage').then(m => ({ default: m.SponsorLandingPage })));
const TenantDirectoryPage = lazy(() => import('./components/TenantDirectoryPage').then(m => ({ default: m.TenantDirectoryPage })));
const CommunityDirectoryPage = lazy(() => import('./components/CommunityDirectoryPage').then(m => ({ default: m.CommunityDirectoryPage })));
const RegistrationPage = lazy(() => import('./components/RegistrationPage').then(m => ({ default: m.RegistrationPage })));
const SurveyPage = lazy(() => import('./components/survey/SurveyPage'));
const PublicLetterViewer = lazy(() => import('./components/PublicLetterViewer').then(m => ({ default: m.PublicLetterViewer })));
const TenantSurveyPublicPage = lazy(() => import('./components/survey/TenantSurveyPublicPage'));
const TenantSurveyEventPicker = lazy(() => import('./components/survey/TenantSurveyEventPicker'));
const TenantSurveyResultsPage = lazy(() => import('./components/survey/TenantSurveyResultsPage'));
function RedirectToTenantSurveyResults() {
  return <Navigate to="/tenant-survey-results" replace />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = location.pathname.replace('/dashboard', '') || '/';

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved === 'dark';
    if (dark) document.documentElement.classList.add('dark');
    return dark;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const auth = useAuth();
  const permissions = usePermission(auth.user, auth.isLegacy);
  const isAdmin = permissions.canViewDashboard;
  const canSeeInternalSchedule = permissions.canEditEvents;
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
  } = useEvents({ realtime: location.pathname.startsWith('/dashboard') });
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
  } = useDraftEvents(canSeeInternalSchedule);

  const toggleDark = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    const commit = () => {
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      setIsDark(next);
    };
    const vt = (document as any).startViewTransition;
    if (typeof vt === 'function') {
      Promise.resolve(vt.call(document, commit)).catch(() => commit());
    } else {
      commit();
    }
  }, [setIsDark]);

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
    showNewsManager, setShowNewsManager,
    showSponsorManager, setShowSponsorManager,
    showEventAreaManager, setShowEventAreaManager,
    landingAlbums,
    eventAreas,
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
  const communityStats = useMemo(() => {
    const completed = publicEvents.filter(e => e.status === 'past').length;
    const total = publicEvents.length;
    const organizers = new Set(publicEvents.map(e => e.pic.trim()).filter(Boolean)).size;
    return { completed, total, organizers };
  }, [publicEvents]);
  const visibleEvents = useMemo(
    () => filteredEvents.filter(e => canSeeInternalSchedule || e.status !== 'draft'),
    [filteredEvents, canSeeInternalSchedule]
  );
  const scheduleSource = canSeeInternalSchedule ? visibleEvents : publicEvents;
  const ongoingEvents = useMemo(() => scheduleSource.filter(e => e.status === 'ongoing'), [scheduleSource]);
  const upcomingEvents = useMemo(() => scheduleSource.filter(e => e.status === 'upcoming'), [scheduleSource]);
  const visibleCategories = useMemo(() => {
    const source = canSeeInternalSchedule ? events : publicEvents;
    const normalized = source.flatMap(e => e.categories).flatMap(c => String(c || '').split(/[|,]/)).map(c => c.trim()).filter(Boolean);
    return ['Semua', ...new Set(normalized)];
  }, [canSeeInternalSchedule, events, publicEvents]);
  const visibleMonths = useMemo(() => {
    const source = canSeeInternalSchedule ? events : publicEvents;
    return ['Semua', ...new Set(source.map(e => e.month))];
  }, [canSeeInternalSchedule, events, publicEvents]);
  const visibleStats = useMemo(() => {
    const source = canSeeInternalSchedule ? events : publicEvents;
    return { total: source.length, ongoing: source.filter(e => e.status === 'ongoing').length, upcoming: source.filter(e => e.status === 'upcoming').length, past: source.filter(e => e.status === 'past').length };
  }, [canSeeInternalSchedule, events, publicEvents]);

  const publicSectionItems = useMemo(() => [
    ...((ongoingEvents.length > 0 || upcomingEvents.length > 0) ? [{ id: 'featured', label: 'Segera Hadir' }] : []),
    { id: 'summary', label: 'Ringkasan' },
    { id: 'calendar', label: 'Kalender' },
    { id: 'views', label: 'Daftar Acara' },
    { id: 'themes', label: 'Tema Tahunan' },
  ], [ongoingEvents.length, upcomingEvents.length]);
  const allowedDashboardPaths = useMemo(() => new Set(getAllowedDashboardPaths(permissions)), [permissions]);
  const defaultDashboardPath = useMemo(() => getDefaultDashboardPath(permissions), [permissions]);

  useEffect(() => { if (!canSeeInternalSchedule && activeFilter === 'draft') setActiveFilter('Semua'); }, [canSeeInternalSchedule, activeFilter, setActiveFilter]);
  useEffect(() => { if (!permissions.canEditEvents && (viewMode === 'calendar' || viewMode === 'kanban')) setViewMode('table'); }, [permissions.canEditEvents, viewMode]);
  useEffect(() => { if (!isAdmin && activePriority !== 'Semua') setActivePriority('Semua'); }, [isAdmin, activePriority, setActivePriority]);
  useEffect(() => { if (!visibleCategories.includes(activeCategory)) setActiveCategory('Semua'); }, [visibleCategories, activeCategory, setActiveCategory]);
  useEffect(() => { if (!visibleMonths.includes(activeMonth)) setActiveMonth('Semua'); }, [visibleMonths, activeMonth, setActiveMonth]);

  useEffect(() => {
    if (isLoading) return;
    if (permissions.isTenantRelation && !permissions.canEditEvents) {
      if (location.pathname.startsWith('/dashboard')) navigate('/tenant-survey-results', { replace: true });
      return;
    }
    if (!location.pathname.startsWith('/dashboard')) return;
    if (!permissions.canViewDashboard) return;
    if (!allowedDashboardPaths.has(dashboardPath)) {
      navigate(getDefaultAppPath(permissions), { replace: true });
    }
  }, [allowedDashboardPaths, dashboardPath, defaultDashboardPath, isLoading, location.pathname, navigate, permissions]);

  // ─── Build sub-props for DashboardPage ───────────────────────
  const dpAuth: DashboardPageAuth = { user: auth.user, isSuperadmin: auth.isSuperadmin, isLegacy: auth.isLegacy, login: auth.login, legacyLogin: auth.legacyLogin };
  const dpEvents: DashboardPageEvents = { events, publicEvents, visibleEvents, visibleStats, ongoingEvents, upcomingEvents, holidays, annualThemes, error };
  const dpDrafts: DashboardPageDrafts = { activeDrafts, draftHistory, draftEvents, isDraftLoading, draftError };
  const dpFilters: DashboardPageFilters = { searchQuery, setSearchQuery, activeFilter, setActiveFilter, activeCategory, setActiveCategory, activePriority, setActivePriority, activeMonth, setActiveMonth, visibleCategories, visibleMonths };
  const dpView: DashboardPageView = { viewMode, setViewMode };
  const dpHandlers: DashboardPageHandlers = { handleLogout, handleAddNew, handleEdit, handleAddDraft, handleEditDraft, handleOpenLetterPicker, handleAddTheme, handleEditTheme, handleSaveTheme, handleDeleteTheme, handleSelectLetterEvent, handleDeleteClick, handleDetailClick, handleSave, handleSaveBatch, handleDeleteSeries, handleDeleteConfirm, handleSaveDraft, handleDeleteDraft, handlePublishDraft, handleDraftProgressChange, handleRestoreDraft, handleUpdateRegStatus, handleCreateEventFromRegistration, handleSaveInstagramPosts, handleSaveHeroImage, handleRegDetail };
  const dpModalState: DashboardPageModalState = { showLoginModal, setShowLoginModal, showCrudModal, setShowCrudModal, showDraftModal, setShowDraftModal, showLetterPickerModal, setShowLetterPickerModal, showLetterModal, setShowLetterModal, showDeleteModal, setShowDeleteModal, showDetailModal, setShowDetailModal, showDraftHistory, setShowDraftHistory, showThemeModal, setShowThemeModal };
  const dpModalData: DashboardPageModalData = { editingEvent, setEditingEvent, editingDraft, setEditingDraft, editingTheme, setEditingTheme, letterEvent, setLetterEvent, deletingEvent, setDeletingEvent, detailEvent, setDetailEvent, initialEventData, setInitialEventData };
  const dpRegistrations: DashboardPageRegistrations = { communityRegistrations, isRegLoading, showRegDetail, setShowRegDetail, selectedRegistration, setSelectedRegistration };
  const dpSiteSettings: DashboardPageSiteSettings = { instagramPosts, heroImageUrl, landingAlbums, showInstagramSettings, setShowInstagramSettings, showAlbumManager, setShowAlbumManager, showNewsManager, setShowNewsManager, showSponsorManager, setShowSponsorManager, showEventAreaManager, setShowEventAreaManager };
  return (
    <Routes>
      {/* Community Landing Page */}
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
            areas={eventAreas}
            isLoading={isLoading}
            stats={communityStats}
          />
          <EventDetailModal
            isOpen={showDetailModal}
            event={detailEvent}
            onClose={() => { setShowDetailModal(false); setDetailEvent(null); }}
            events={events}
          />
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </Suspense>
      } />

      {/* Graphify landing clone */}
      <Route path="/graphify" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <GraphifyLanding />
        </Suspense>
      } />

      {/* Public event schedule landing */}
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
          <EventDetailModal
            isOpen={showDetailModal}
            event={detailEvent}
            onClose={() => { setShowDetailModal(false); setDetailEvent(null); }}
            events={events}
          />
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

      {/* News / Blog pages */}
      <Route path="/news" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <NewsIndexPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      <Route path="/news/:slug" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <NewsArticlePage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      {/* Sponsorship landing */}
      <Route path="/sponsor" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <SponsorLandingPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      {/* Tenant directory — publik */}
      <Route path="/tenants" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <TenantDirectoryPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      {/* Pendaftaran organisasi — halaman publik khusus */}
      <Route path="/daftar" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <RegistrationPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      <Route path="/community" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <CommunityDirectoryPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      {/* Survey — standalone page */}
      <Route path="/survey/:eventId" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <SurveyPage />
        </Suspense>
      } />

      {/* Public Tenant Self-Assessment */}
      <Route path="/tenant-survey" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <div className="ui-dashboard-page min-h-screen dark:bg-slate-950">
            <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto" />
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Evaluasi Tenant</span>
                </div>
                <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-brand-primary-600 dark:text-slate-400 dark:hover:text-brand-primary-400">
                  <ArrowLeft className="h-4 w-4" />Kembali
                </button>
              </div>
              <div className="ui-dashboard-surface overflow-hidden">
                <div className="border-b border-slate-100 bg-gradient-to-r from-brand-primary-50/50 to-transparent px-6 py-5 dark:border-slate-700 dark:from-brand-primary-950/30">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">Evaluasi Dampak Event</h1>
                  <p className="mt-1 text-sm ui-text-muted">Pilih event di bawah untuk mengisi survei tenant dan bantu kami memahami dampak event terhadap gerai Anda.</p>
                </div>
                <div className="px-6 py-5"><TenantSurveyEventPicker /></div>
              </div>
              <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life</p>
            </div>
          </div>
        </Suspense>
      } />
      <Route path="/tenant-survey/:eventId" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <TenantSurveyPublicPage />
        </Suspense>
      } />

      {/* Public Letter Viewer */}
      <Route path="/letter/:id" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <PublicLetterViewer />
        </Suspense>
      } />

      {/* Tenant survey results — public */}
      <Route path="/tenant-survey-results" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <div className="ui-dashboard-page min-h-screen dark:bg-slate-950">
            <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
                  <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
                  <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Tenant Relation</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(auth.isAuthenticated || auth.isLegacy) && (
                    <>
                      {(auth.user?.display_name || auth.isLegacy) && (
                        <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 dark:border-slate-600 dark:bg-slate-800/70 sm:flex">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary-100 text-[10px] font-bold text-brand-primary-700 dark:bg-brand-primary-900/50 dark:text-brand-primary-300">{(auth.user?.display_name || 'A').charAt(0).toUpperCase()}</span>
                          <span className="max-w-[120px] truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{auth.user?.display_name || 'Admin'}</span>
                        </div>
                      )}
                      <button type="button" onClick={handleLogout} className="ui-focus-ring rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Keluar</button>
                    </>
                  )}
                </div>
              </div>
            </header>
            <div className="mx-auto max-w-7xl px-3 py-3 pb-16 sm:px-4 sm:py-6 sm:pb-12">
              <TenantSurveyResultsPage events={events} canExport={permissions.canExportTenantSurveyAnalytics} publicMode />
            </div>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
          </div>
        </Suspense>
      } />

      {/* Legacy dashboard path → redirect ke /tenant-survey-results */}
      <Route path="/dashboard/tenant-survey-results" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <RedirectToTenantSurveyResults />
        </Suspense>
      } />

      {/* Dashboard routes */}
      <Route path="/dashboard/*" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={isAdmin} />}>
          {isAdmin ? (
            <DashboardPage
              isAdmin={isAdmin}
              isLoading={isLoading}
              permissions={permissions}
              canSeeInternalSchedule={canSeeInternalSchedule}
              isDark={isDark}
              onToggleDark={toggleDark}
              dashboardPath={dashboardPath}
              publicSectionItems={publicSectionItems}
              toasts={toasts}
              removeToast={removeToast}
              auth={dpAuth}
              events={dpEvents}
              drafts={dpDrafts}
              filters={dpFilters}
              view={dpView}
              handlers={dpHandlers}
              modalState={dpModalState}
              modalData={dpModalData}
              registrations={dpRegistrations}
              siteSettings={dpSiteSettings}
            />
          ) : (
            <AdminLoginPage
              onEmailLogin={auth.login}
              onLegacyLogin={auth.legacyLogin}
            />
          )}
        </Suspense>
      } />

      {/* PROTOTYPE: throwaway landing variant */}
      <Route path="/prototype-landing-v1" element={<PrototypeLandingMetmalV1 />} />

      {/* Presentation deck */}
      <Route path="/presentasi" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <PresentationDeck />
        </Suspense>
      } />

      {/* Catch-all 404 — cegah blank page untuk URL tak dikenal */}
      <Route path="*" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <NotFoundPage />
        </Suspense>
      } />
    </Routes>
  );
}